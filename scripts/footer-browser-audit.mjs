import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4193;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'footer-fix');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [] };
const viewports = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }];
const assert = (value, message) => { if (!value) throw new Error(message); };

const server = createServer(async (request, response) => {
  const path = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!path.startsWith(root)) return response.writeHead(403).end();
  try {
    const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[extname(path)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': mime });
    response.end(await readFile(path));
  } catch { response.writeHead(404).end('Not Found'); }
});

const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};

const assertFooter = async (page, selector, label) => {
  const footer = page.locator(selector);
  assert(await footer.count() === 1, `${label} footer is missing or duplicated.`);
  assert(await footer.locator('svg.footer-heart.lucide-icon').count() === 1, `${label} Lucide heart did not render once.`);
  assert(await footer.locator('i[data-lucide], svg svg').count() === 0, `${label} retained an uninitialized or nested icon.`);
  const details = await footer.evaluate(node => {
    const icon = node.querySelector('.footer-heart');
    const hidden = node.querySelector('.visually-hidden');
    const style = getComputedStyle(node);
    const iconStyle = getComputedStyle(icon);
    return {
      text: node.textContent.replace(/\s+/g, ' ').trim(),
      visibleText: [...node.children].filter(child => !child.classList.contains('visually-hidden') && child.tagName !== 'svg').map(child => child.textContent.trim()).join(' '),
      hiddenText: hidden?.textContent.trim(),
      iconAriaHidden: icon?.getAttribute('aria-hidden'),
      iconWidth: iconStyle.width,
      iconHeight: iconStyle.height,
      iconColor: iconStyle.color,
      display: style.display,
      alignItems: style.alignItems,
      justifyContent: style.justifyContent,
      gap: style.gap
    };
  });
  assert(details.text === 'Developed with love by BaCorn Tech', `${label} accessible sentence is incorrect: ${details.text}`);
  assert(details.visibleText === 'Developed with by BaCorn Tech', `${label} visible footer wording is incorrect: ${details.visibleText}`);
  assert(details.hiddenText === 'love' && details.iconAriaHidden === 'true', `${label} accessibility treatment is incorrect.`);
  assert(details.iconWidth === '14px' && details.iconHeight === '14px', `${label} heart is not 14px.`);
  assert(details.display === 'flex' && details.alignItems === 'center' && details.justifyContent === 'center' && details.gap !== 'normal', `${label} alignment or spacing is incorrect.`);
  assert(Boolean(details.iconColor), `${label} heart has no computed brand color.`);
};

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    observe(page);
    await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
    await page.locator('.login-footer svg.footer-heart').waitFor();
    await assertFooter(page, '.login-footer', `Login ${viewport.width}`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `Login overflow at ${viewport.width}px.`);
    const loginBounds = await page.locator('.login-footer').boundingBox();
    assert(loginBounds && loginBounds.x >= 0 && loginBounds.x + loginBounds.width <= viewport.width, `Login footer clipped at ${viewport.width}px.`);
    if (viewport.width === 1440 || viewport.width === 390) await page.screenshot({ path: join(outputDir, `login-${viewport.width}.png`), fullPage: true });

    await page.locator('#email').fill('daniel.mugisha@pearlsmiledental.test');
    await page.locator('#password').fill('Demo@123');
    await Promise.all([page.waitForURL('**/app.html#/dashboard'), page.locator('#login-form button[type=submit]').click()]);
    for (const route of ['dashboard', 'patients', 'waiting-room', 'patients/P001/clinical']) {
      await page.goto(`${baseUrl}/app.html#/${route}`, { waitUntil: 'networkidle' });
      await assertFooter(page, '.shell-footer', `App ${route} ${viewport.width}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `App overflow on ${route} at ${viewport.width}px.`);
      const documentScroll = await page.evaluate(() => ({ scrollHeight: document.scrollingElement.scrollHeight, clientHeight: document.scrollingElement.clientHeight }));
      if (viewport.width >= 1024) assert(documentScroll.scrollHeight <= documentScroll.clientHeight + 1, `Competing body scrollbar on ${route} at ${viewport.width}px: ${JSON.stringify(documentScroll)}`);
    }
    const shell = await page.evaluate(() => ({
      footerPosition: getComputedStyle(document.querySelector('.shell-footer')).position,
      bodyScroll: document.body.scrollHeight > innerHeight + 1,
      workspaceOverflow: getComputedStyle(document.querySelector('.shell-workspace')).overflowY,
      sidebarPosition: getComputedStyle(document.querySelector('.shell-sidebar')).position
    }));
    assert(!['fixed', 'sticky', 'absolute'].includes(shell.footerPosition), `App footer left normal flow at ${viewport.width}px.`);
    if (viewport.width >= 1024) assert(!shell.bodyScroll && shell.workspaceOverflow === 'auto', `Desktop workspace scrolling regressed at ${viewport.width}px.`);
    else assert(shell.workspaceOverflow === 'visible', 'Mobile workspace scrolling regressed.');
    if (viewport.width === 1440 || viewport.width === 390) await page.screenshot({ path: join(outputDir, `app-${viewport.width}.png`), fullPage: true });
    const body = await page.locator('body').innerText();
    assert(!/[ÃÂ]|â(?:€|™|œ)|ï¿½|�/.test(body), `Encoding artifact found at ${viewport.width}px.`);
    await context.close();
  }

  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', viewports, routes: ['Login', 'Dashboard', 'Patients', 'Waiting Room', 'Clinical'], findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2));
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
