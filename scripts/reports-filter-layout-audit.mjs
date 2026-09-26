import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4231;
const baseUrl = `http://127.0.0.1:${port}`;
const accounts = {
  'Clinic Administrator': 'grace.admin@pearlsmiledental.test',
  Dentist: 'daniel.mugisha@pearlsmiledental.test',
  Receptionist: 'lydia.reception@pearlsmiledental.test',
  Cashier: 'brian.cashier@pearlsmiledental.test'
};
const viewports = [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 }
];
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  const file = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try {
    response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end('Not Found');
  }
});
const observe = page => {
  page.on('console', event => {
    if (event.type() === 'error') findings.consoleErrors.push(event.text());
    if (event.type() === 'warning') findings.warnings.push(event.text());
  });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
};
const login = async (page, email) => {
  await page.goto(`${baseUrl}/app.html`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  await page.goto(`${baseUrl}/app.html#/reports`, { waitUntil: 'networkidle' });
};
const selectLongestReport = async page => {
  const option = await page.locator('#report-type option').evaluateAll(options => options.map(item => ({ value: item.value, label: item.textContent.trim() })).sort((a, b) => b.label.length - a.label.length)[0]);
  await page.locator('#report-type').selectOption(option.value);
  await page.locator('.reports-workspace__heading h2').filter({ hasText: option.label }).waitFor();
  return option;
};
const layout = page => page.locator('.reports-filter-bar').evaluate(toolbar => {
  const type = toolbar.querySelector('#report-type');
  const dates = [...toolbar.querySelectorAll('input[type="date"]')];
  const payment = toolbar.querySelector('#report-payment-method');
  const reset = toolbar.querySelector(':scope > .button');
  const style = getComputedStyle(type);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = style.font;
  const label = type.selectedOptions[0].textContent.trim();
  const requiredWidth = context.measureText(label).width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 24;
  const rect = node => node ? node.getBoundingClientRect() : null;
  return {
    label,
    requiredWidth,
    type: rect(type),
    dates: dates.map(rect),
    payment: rect(payment),
    reset: rect(reset),
    fieldTops: [...toolbar.querySelectorAll('.field')].map(node => rect(node).top),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  };
});

await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: viewports[0] });
  const page = await context.newPage();
  observe(page);
  await login(page, accounts['Clinic Administrator']);
  const before = await page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/app.html#/reports`, { waitUntil: 'networkidle' });
    await page.locator('#report-type').selectOption('finance');
    await page.locator('#report-payment-method').waitFor();
    const result = await layout(page);
    assert(result.label === 'Collections & Outstanding Balances', `Wrong finance label at ${viewport.width}px.`);
    assert(result.type.width >= result.requiredWidth, `Report Type clips at ${viewport.width}px: ${result.type.width}px available, ${result.requiredWidth}px required.`);
    assert(result.dates.every(date => date.width >= 144), `A date control is too narrow at ${viewport.width}px.`);
    assert(result.payment.width >= 176, `Payment Method is too narrow at ${viewport.width}px.`);
    assert(viewport.width <= 768 || result.reset.width < result.type.width, `Reset is not content-width at ${viewport.width}px.`);
    assert(!result.overflow, `Global horizontal overflow at ${viewport.width}px.`);
    if (viewport.width === 390) assert(new Set(result.fieldTops).size === result.fieldTops.length, 'Mobile report controls are not vertically stacked.');
  }
  const after = await page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
  assert(after === before && (await page.evaluate(() => window.DentalAppDev.getDirtySources())).length === 0, 'Layout audit changed business state.');
  await context.close();

  for (const [role, email] of Object.entries(accounts)) {
    const roleContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const rolePage = await roleContext.newPage();
    observe(rolePage);
    await login(rolePage, email);
    const longest = await selectLongestReport(rolePage);
    const result = await layout(rolePage);
    assert(result.label === longest.label && result.type.width >= result.requiredWidth, `${role} longest report option clips.`);
    assert(!result.overflow, `${role} Reports workspace overflows.`);
    await roleContext.close();
  }
  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  console.log(JSON.stringify({ status: 'pass', viewports, roles: Object.keys(accounts), findings }, null, 2));
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
