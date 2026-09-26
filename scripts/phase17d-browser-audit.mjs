import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4221;
const base = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase17d');
const accounts = [
  ['Clinic Administrator', 'grace.admin@pearlsmiledental.test'],
  ['Dentist (Daniel)', 'daniel.mugisha@pearlsmiledental.test'],
  ['Dentist (Sarah)', 'sarah.nakanwagi@pearlsmiledental.test'],
  ['Receptionist', 'lydia.reception@pearlsmiledental.test'],
  ['Cashier', 'brian.cashier@pearlsmiledental.test']
];
const phase17Routes = ['reports', 'users', 'clinic-settings', 'profile'];
const viewports = [
  { width: 1440, height: 900 }, { width: 1366, height: 768 },
  { width: 1280, height: 720 }, { width: 1024, height: 768 },
  { width: 390, height: 844 }
];
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], missingAssets: [], apiRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, base).pathname.replace(/^\/+/, '')) || 'index.html';
  const file = normalize(join(root, pathname));
  if (file !== root && !file.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(`${request.url()}: ${request.failure()?.errorText || 'failed'}`));
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.apiRequests.push(request.url()); });
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) findings.missingAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async (page, email) => {
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  const toast = page.getByRole('button', { name: 'Dismiss notification' });
  if (await toast.count()) await toast.first().click();
};
const assertWorkspace = async (page, role, route) => {
  const main = page.locator('#main-content');
  const text = await main.innerText();
  const expectedTitle = await page.evaluate(async value => (await import('/assets/js/core/router.js')).router.title(value), route);
  assert(await page.title() === `${expectedTitle} | Pearl Smile Dental Clinic`, `${role} / ${route}: browser title is wrong or stale.`);
  assert(await main.getByRole('heading', { level: 1 }).count() === 1, `${role} / ${route}: primary workspace heading is missing or duplicated.`);
  assert(text.trim().length > 15, `${role} / ${route}: empty workspace.`);
  assert(!/Page Not Found|Access Denied|Workspace unavailable|This module will be implemented in a later approved phase|implementation begins in Phase 6|Frontend foundation initialized/i.test(text), `${role} / ${route}: dead route, denial, or placeholder.`);
  assert(!/nullnull|undefinedundefined|nullundefined|undefinednull|\[object Object\]|(?:^|\s)(?:null|undefined|NaN)(?=$|\s|[.,:;!?])/m.test(text), `${role} / ${route}: invalid visible data artifact.`);
  assert(!/Ã‚|Ãƒ|Ã¢|ï¿½|�/.test(text), `${role} / ${route}: visible encoding artifact.`);
  const stray = await main.evaluate(node => [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim()).map(child => child.textContent.trim()));
  assert(stray.length === 0, `${role} / ${route}: stray root text node (${stray.join('|')}).`);
  assert((await page.locator('.shell-nav__item.is-active').count()) === 1, `${role} / ${route}: active sidebar item missing or duplicated.`);
  assert((await page.locator('.shell-sidebar .shell-nav__item[href="#/' + route + '"]').count()) === 1, `${role} / ${route}: visible sidebar link missing or duplicated.`);
  assert((await page.evaluate(() => window.DentalAppDev.getDirtySources())).length === 0, `${role} / ${route}: navigation unexpectedly marked a form dirty.`);
};

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const sweep = {};
  for (const [role, email] of accounts) {
    const context = await browser.newContext({ viewport: viewports[0] });
    const page = await context.newPage();
    page.setDefaultTimeout(7_000);
    observe(page);
    await login(page, email);
    const routes = await page.locator('.shell-sidebar .shell-nav__item').evaluateAll(links => links.map(link => link.getAttribute('href')?.replace(/^#\//, '')).filter(Boolean));
    assert(routes.length && new Set(routes).size === routes.length, `${role}: empty or duplicate sidebar destinations.`);
    assert(phase17Routes.filter(route => route !== 'users').every(route => routes.includes(route)), `${role}: required Phase 17 destinations missing.`);
    assert(routes.includes('users') === (role === 'Clinic Administrator'), `${role}: Users & Staff navigation visibility is wrong.`);
    if (role === 'Clinic Administrator') {
      const iconChecks = await page.evaluate(() => {
        const icon = selector => document.querySelector(selector)?.getAttribute('data-lucide');
        return {
          patients: icon('.shell-nav__item[href="#/patients"] svg'),
          profile: icon('.shell-nav__item[href="#/profile"] svg'),
          clinical: icon('.shell-nav__group summary svg'),
          settings: icon('.shell-nav__item[href="#/clinic-settings"] svg'),
          invoices: icon('.shell-nav__item[href="#/billing/invoices"] svg'),
          payments: icon('.shell-nav__item[href="#/billing/payments"] svg'),
          receipts: icon('.shell-nav__item[href="#/billing/receipts"] svg'),
          outstanding: icon('.shell-nav__item[href="#/outstanding-balances"] svg'),
          reports: icon('.shell-nav__item[href="#/reports"] svg'),
          account: Object.fromEntries([...document.querySelectorAll('details.dropdown [role="menuitem"]')].map(item => [item.textContent.trim(), item.querySelector('svg')?.getAttribute('data-lucide')]))
        };
      });
      for (const [key, expected] of Object.entries({ patients: 'users-round', profile: 'circle-user-round', clinical: 'stethoscope', settings: 'settings', invoices: 'file-text', payments: 'credit-card', receipts: 'receipt-text', outstanding: 'circle-dollar-sign', reports: 'chart-no-axes-column' })) assert(iconChecks[key] === expected, `${key}: rendered sidebar icon is ${iconChecks[key]}, expected ${expected}.`);
      assert(iconChecks.account.Profile === 'circle-user-round' && iconChecks.account['Change Password'] === 'key-round' && iconChecks.account.Logout === 'logout', 'Account menu icon mapping or destinations are incorrect.');
    }
    for (const route of routes) {
      await page.goto(`${base}/app.html#/dashboard`, { waitUntil: 'networkidle' });
      const link = page.locator(`.shell-sidebar .shell-nav__item[href="#/${route}"]`);
      await link.evaluate(node => { const group = node.closest('details'); if (group) group.open = true; });
      await link.click();
      await page.waitForURL(`${base}/app.html#/${route}`);
      await page.locator(`.shell-sidebar .shell-nav__item.is-active[href="#/${route}"]`).waitFor();
      await assertWorkspace(page, role, route);
    }
    sweep[role] = routes;
    if (role === 'Clinic Administrator') {
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const route of phase17Routes) {
          await page.goto(`${base}/app.html#/${route}`, { waitUntil: 'networkidle' });
          await assertWorkspace(page, role, route);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth || document.querySelector('.shell-workspace').scrollWidth > document.querySelector('.shell-workspace').clientWidth);
          assert(!overflow, `${route}: global horizontal overflow at ${viewport.width}px.`);
        }
      }
      await page.setViewportSize(viewports[0]);
      await page.goto(`${base}/app.html#/users`, { waitUntil: 'networkidle' });
      const search = page.getByRole('searchbox', { name: 'Search users by name, ID, email, or phone' });
      await search.focus();
      for (const character of 'Miriam') {
        await page.keyboard.type(character);
        assert(await search.evaluate(input => document.activeElement === input), 'Users search lost focus during sequential typing.');
      }
      assert(await search.inputValue() === 'Miriam' && (await page.locator('.data-table tbody').innerText()).includes('Miriam Achieng'), 'Sequential Users search did not retain input or filter results.');
      const before = await page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
      await page.goto(`${base}/app.html#/reports`, { waitUntil: 'networkidle' });
      for (const type of ['patients', 'appointments', 'clinical', 'finance', 'recalls']) await page.locator('#report-type').selectOption(type);
      assert(await page.evaluate(() => JSON.stringify(window.DentalAppDev.getState())) === before, 'Report switching mutated shared state.');
      await page.goto(`${base}/app.html#/clinic-settings`, { waitUntil: 'networkidle' });
      assert(await page.locator('#settings-duration').inputValue() === '30', 'Canonical appointment duration is not 30 minutes.');
      await page.goto(`${base}/app.html#/profile`, { waitUntil: 'networkidle' });
      assert(await page.getByLabel('Full name').inputValue() === 'Grace Namutebi', 'Profile did not resolve the current administrator.');
      assert(await page.locator('input[name="role"], input[name="status"], input[name="userId"]').count() === 0, 'Profile exposed protected account fields.');
      await page.goto(`${base}/app.html#/phase17d-invalid-route`, { waitUntil: 'networkidle' });
      const invalidRouteText = await page.locator('#main-content').innerText();
      assert(await page.title() === 'Page Not Found | Pearl Smile Dental Clinic' && invalidRouteText.includes('Page Not Found') && !invalidRouteText.includes('Full name') && !invalidRouteText.includes('Grace Namutebi'), 'Invalid route did not show a fresh, privacy-safe not-found state.');
      await page.goto(`${base}/app.html#/dashboard`, { waitUntil: 'networkidle' });
      await page.setViewportSize({ width: 1366, height: 768 });
      const sidebar = await page.locator('.shell-sidebar').evaluate(node => {
        node.querySelectorAll('.shell-nav__group').forEach(group => { group.open = true; });
        const nav = node.querySelector('.shell-nav');
        const before = nav.scrollTop;
        nav.scrollTop = nav.scrollHeight;
        const scrollButton = getComputedStyle(nav, '::-webkit-scrollbar-button');
        return { footer: node.querySelector('.shell-sidebar__footer')?.innerText, navScrollable: nav.scrollHeight > nav.clientHeight, scrollMoved: nav.scrollTop > before, scrollbarWidth: getComputedStyle(nav).scrollbarWidth, scrollButtonDisplay: scrollButton.display, scrollButtonWidth: scrollButton.width, overflow: getComputedStyle(nav).overflowY, sidebarOverflow: getComputedStyle(node).overflow };
      });
      assert(sidebar.footer === 'Kampala Main Branch' && sidebar.navScrollable && sidebar.scrollMoved && sidebar.scrollbarWidth === 'thin' && (sidebar.scrollButtonDisplay === 'none' || sidebar.scrollButtonWidth === '0px') && sidebar.overflow === 'auto' && sidebar.sidebarOverflow === 'hidden', `Sidebar scroll behavior or branch footer regressed: ${JSON.stringify(sidebar)}`);
    }
    await context.close();
  }
  // Exercise the missing-renderer guard in an isolated test DOM; the expected diagnostic is asserted separately.
  const fallbackContext = await browser.newContext();
  const fallbackPage = await fallbackContext.newPage();
  const expectedDiagnostics = [];
  fallbackPage.on('console', event => { if (event.type() === 'error') expectedDiagnostics.push(event.text()); });
  await login(fallbackPage, accounts[0][1]);
  const fallbackText = await fallbackPage.evaluate(async () => {
    const { renderShell } = await import('/assets/js/components/shell.js');
    const root = document.createElement('div');
    renderShell({ root, route: 'reports', isKnown: () => true, role: 'Clinic Administrator', mainContent: null, appState: window.DentalAppDev.getState() });
    return root.textContent;
  });
  assert(fallbackText.includes('Workspace unavailable') && !fallbackText.includes('implemented in a later approved phase'), 'A missing renderer masqueraded as an implemented module.');
  assert(expectedDiagnostics.length === 1 && expectedDiagnostics[0] === 'No workspace content for route: reports', `Missing-renderer diagnostic was absent or unexpected: ${expectedDiagnostics.join(' | ')}`);
  await fallbackContext.close();
  assert(!Object.values(findings).some(items => items.length), `Browser console/network findings: ${JSON.stringify(findings)}`);
  const result = { status: 'pass', sweep, iconography: 'semantic sidebar and account-menu mappings verified', sidebar: 'independently scrollable with thin scrollbar and branch footer', shellFallback: { validRoutes: 'pass', invalidRoute: 'Page Not Found without stale profile data', missingRenderer: 'Workspace unavailable with explicit diagnostic' }, responsive: viewports.map(({ width, height }) => `${width}x${height}`), findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
