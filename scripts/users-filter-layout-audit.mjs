import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4222;
const base = `http://127.0.0.1:${port}`;
const output = join(root, 'tests', 'audits', 'output', 'users-filter-layout');
const assert = (value, message) => { if (!value) throw new Error(message); };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const findings = { consoleErrors: [], warnings: [], pageErrors: [], failedRequests: [], failedAssets: [], apiRequests: [] };

const server = createServer(async (request, response) => {
  const file = normalize(join(root, decodeURIComponent(new URL(request.url, base).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try {
    response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});

const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.apiRequests.push(request.url()); });
};

const userSearch = page => page.getByRole('searchbox', { name: 'Search users by name, ID, email, or phone' });
const clearUserSearch = page => page.locator('.users-workspace .search-control button[aria-label="Clear search"]');
const reset = page => page.getByRole('button', { name: 'Reset' }).click();

await mkdir(output, { recursive: true });
await new Promise(resolveListen => server.listen(port, '127.0.0.1', resolveListen));
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  observe(page);
  page.setDefaultTimeout(5_000);
  await page.goto(`${base}/app.html`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${base}/index.html`);
  await page.locator('#email').fill('grace.admin@pearlsmiledental.test');
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  const toast = page.getByRole('button', { name: 'Dismiss notification' });
  if (await toast.count()) { await toast.click(); await toast.waitFor({ state: 'detached' }); }
  await page.goto(`${base}/app.html#/users`);

  assert(await userSearch(page).getAttribute('placeholder') === 'Search name, user ID, or email...', 'Users placeholder is incorrect.');
  assert(await page.locator('.shell-header .search-control input').getAttribute('placeholder') === 'Search patient by name, number or phone…', 'Global header search placeholder changed.');
  assert(await page.locator('.users-workspace .search-control > [aria-hidden="true"]').count() === 1, 'Users search icon is missing.');
  assert(await page.locator('.users-workspace .search-control button[aria-label="Clear search"]').count() === 1, 'Accessible clear-search action is missing.');
  assert(await page.getByLabel('Role').count() === 1 && await page.getByLabel('Status').count() === 1, 'Role or Status label is missing.');

  for (const [term, expected] of [['Grace Namutebi', 'Grace Namutebi'], ['U005', 'Brian Ssemanda'], ['sarah.nakanwagi@pearlsmiledental.test', 'Dr. Sarah Nakanwagi'], ['700 555 104', 'Lydia Akello']]) {
    await userSearch(page).fill(term);
    assert((await page.locator('.data-table tbody').innerText()).includes(expected), `Search did not match ${term}.`);
    await clearUserSearch(page).click();
  }
  await page.getByLabel('Role').selectOption('receptionist');
  assert((await page.locator('.data-table tbody').innerText()).includes('Lydia Akello'), 'Role filter failed.');
  await page.getByLabel('Status').selectOption('inactive');
  const combined = await page.locator('.data-table tbody').innerText();
  assert(combined.includes('Miriam Achieng') && !combined.includes('Lydia Akello'), 'Combined Role/Status filters failed.');
  await reset(page);
  assert((await page.locator('.data-table tbody tr').count()) === 6 && await page.getByLabel('Role').inputValue() === '' && await page.getByLabel('Status').inputValue() === '' && await userSearch(page).inputValue() === '', 'Reset did not restore all Users filters.');

  const pagination = page.getByRole('navigation', { name: 'Pagination' });
  assert((await pagination.innerText()).includes('Showing 1–6 of 6') && await pagination.getByRole('button', { name: 'Previous' }).isDisabled() && await pagination.getByRole('button', { name: 'Next' }).isDisabled(), 'Pagination baseline changed.');
  await page.getByRole('button', { name: 'Add User' }).click();
  const addDialog = page.getByRole('dialog', { name: 'Add User' });
  assert(await addDialog.isVisible(), 'Add User no longer opens.');
  await addDialog.getByRole('button', { name: 'Close modal' }).click();
  await page.locator('.data-table .dropdown summary').first().click();
  await page.getByRole('menuitem', { name: 'View user details' }).click();
  const details = page.locator('.drawer[role="complementary"]');
  assert(await details.isVisible(), 'More Actions no longer opens user details.');
  await details.getByRole('button', { name: 'Close', exact: true }).click();

  const layouts = {};
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/app.html#/users`);
    if (viewport.width <= 992) await page.waitForFunction(() => document.querySelector('.shell-sidebar')?.getBoundingClientRect().right <= 0);
    const metrics = await page.evaluate(() => {
      const box = selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }; };
      const input = document.querySelector('.users-workspace .search-control input');
      const style = getComputedStyle(input);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = style.font;
      const placeholderWidth = context.measureText(input.placeholder).width;
      const inputTextWidth = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const search = box('.users-workspace .search-control');
      const role = box('#user-role-filter');
      const status = box('#user-status-filter');
      const resetButton = box('.users-workspace .filter-bar > .button');
      return { search, role, status, reset: resetButton, placeholderWidth, inputTextWidth, placeholderFits: inputTextWidth >= placeholderWidth, documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, globalSearchWidth: document.querySelector('.shell-header .search-control input')?.getBoundingClientRect().width || 0 };
    });
    const key = `${viewport.width}x${viewport.height}`;
    layouts[key] = metrics;
    assert(metrics.documentOverflow <= 0, `Global horizontal overflow at ${key}.`);
    assert(metrics.placeholderFits, `Users placeholder is clipped at ${key}: ${JSON.stringify(metrics)}`);
    assert(metrics.search.left >= 0 && metrics.search.right <= viewport.width && metrics.role.right <= viewport.width && metrics.status.right <= viewport.width && metrics.reset.right <= viewport.width, `A Users filter is clipped at ${key}.`);
    if (viewport.width >= 1280) {
      assert(metrics.search.width >= metrics.role.width * 1.45 && metrics.search.width >= metrics.status.width * 1.7, `Search is not the dominant desktop control at ${key}.`);
      assert(Math.abs(metrics.search.bottom - metrics.role.bottom) < 1 && Math.abs(metrics.role.bottom - metrics.status.bottom) < 1, `Desktop controls do not align at ${key}.`);
    } else if (viewport.width === 1024) {
      assert(metrics.search.width > metrics.role.width && metrics.search.width > metrics.status.width && metrics.search.bottom < metrics.role.top, '1024px filter reflow is incorrect.');
    } else {
      assert(metrics.search.bottom < metrics.role.top && metrics.role.bottom < metrics.status.top && metrics.status.bottom < metrics.reset.top, 'Mobile filters are not vertically stacked.');
    }
    if (viewport.width === 1366 || viewport.width === 390) await page.screenshot({ path: join(output, `users-filter-${viewport.width}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${base}/app.html#/users`);
  await userSearch(page).fill('Grace');
  const clearSpacing = await page.evaluate(() => { const input = document.querySelector('.users-workspace .search-control input').getBoundingClientRect(), clear = document.querySelector('.users-workspace .search-control button').getBoundingClientRect(), icon = document.querySelector('.users-workspace .search-control > [aria-hidden="true"]').getBoundingClientRect(); return { iconGap: input.left - icon.right, clearGap: clear.left - input.right }; });
  assert(clearSpacing.iconGap > 0 && clearSpacing.clearGap >= 0, `Search icon or clear action overlaps the input: ${JSON.stringify(clearSpacing)}`);
  await userSearch(page).focus();
  assert(await userSearch(page).evaluate(node => node.matches(':focus-visible')), 'Users search lacks keyboard focus visibility.');

  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  console.log(JSON.stringify({ status: 'pass', placeholder: 'Search name, user ID, or email...', layouts, filters: 'search/role/status/combined/reset', actions: 'pagination/add/more-actions', globalHeaderSearch: 'unchanged', findings }, null, 2));
  await context.close();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
