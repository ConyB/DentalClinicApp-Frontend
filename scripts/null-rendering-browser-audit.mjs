import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4231;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'null-rendering');
const accounts = {
  administrator: 'grace.admin@pearlsmiledental.test',
  dentist: 'daniel.mugisha@pearlsmiledental.test',
  receptionist: 'lydia.reception@pearlsmiledental.test',
  cashier: 'brian.cashier@pearlsmiledental.test'
};
const routeSets = {
  administrator: [
    'dashboard', 'patients', 'patients/P001', 'patients/P013', 'patients/P001/appointments', 'patients/P013/appointments', 'appointments', 'waiting-room',
    'clinical/encounters', 'patients/P001/clinical', 'patients/P013/clinical',
    'patients/P001/dental-chart', 'patients/P013/dental-chart', 'patients/P001/clinical-history', 'patients/P013/clinical-history',
    'treatment-plans', 'patients/P001/treatment-plans', 'patients/P013/treatment-plans', 'patients/P001/treatment-plans/workspace', 'procedures',
    'patients/P001/prescriptions', 'patients/P001/documents', 'patients/P013/documents',
    'patients/P001/billing', 'patients/P013/billing', 'billing/invoices', 'billing/payments', 'billing/receipts', 'outstanding-balances',
    'patients/P001/recalls', 'patients/P013/recalls', 'recalls', 'reports', 'users', 'clinic-settings', 'profile'
  ],
  dentist: [
    'dashboard', 'patients', 'patients/P001', 'patients/P013', 'patients/P001/appointments', 'patients/P013/appointments', 'appointments', 'waiting-room',
    'clinical/encounters', 'clinical/encounters/ENC-000201', 'patients/P001/clinical', 'patients/P013/clinical',
    'patients/P001/dental-chart', 'patients/P013/dental-chart', 'patients/P001/clinical-history', 'patients/P013/clinical-history',
    'treatment-plans', 'patients/P001/treatment-plans', 'patients/P013/treatment-plans', 'patients/P001/treatment-plans/workspace', 'procedures', 'prescriptions',
    'patients/P001/prescriptions', 'patients/P001/documents', 'patients/P013/documents',
    'patients/P001/billing', 'patients/P013/billing', 'patients/P001/recalls', 'patients/P013/recalls', 'recalls', 'reports', 'clinic-settings', 'profile'
  ],
  receptionist: ['dashboard', 'patients', 'patients/P001', 'patients/P013', 'patients/P001/appointments', 'patients/P013/appointments', 'patients/P001/treatment-plans', 'patients/P013/treatment-plans', 'patients/P001/billing', 'patients/P013/billing', 'patients/P001/recalls', 'patients/P013/recalls', 'appointments', 'waiting-room', 'recalls', 'reports', 'clinic-settings', 'profile'],
  cashier: ['dashboard', 'patients', 'patients/P001', 'patients/P013', 'patients/P001/appointments', 'patients/P013/appointments', 'patients/P001/treatment-plans', 'patients/P013/treatment-plans', 'patients/P001/billing', 'patients/P013/billing', 'patients/P001/recalls', 'patients/P013/recalls', 'billing/invoices', 'billing/payments', 'billing/receipts', 'outstanding-balances', 'reports', 'clinic-settings', 'profile']
};
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const invalidPattern = /nullnull|undefinedundefined|nullundefined|undefinednull|\[object Object\]|(?:^|\s)(?:null|undefined|NaN)(?=$|\s|[.,:;!?])/m;

const server = createServer(async (request, response) => {
  const file = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); });
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async (page, email) => {
  await page.goto(`${baseUrl}/app.html`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.count()) await dismiss.click();
};
const inspectRoute = async (page, role, route) => {
  await page.goto(`${baseUrl}/app.html#/${route}`, { waitUntil: 'networkidle' });
  await page.locator('#main-content').waitFor();
  const result = await page.locator('.app-shell').evaluate((shell, source) => {
    const main = shell.querySelector('#main-content');
    const visibleText = main?.innerText || '';
    const attributes = [...shell.querySelectorAll('[aria-label], [title]')].flatMap(node => [node.getAttribute('aria-label'), node.getAttribute('title')]).filter(Boolean);
    const invalid = new RegExp(source, 'm');
    return {
      visibleMatch: visibleText.match(invalid)?.[0]?.trim() || '',
      attributeMatch: attributes.find(value => invalid.test(value)) || '',
      accessDenied: visibleText.includes('Access Denied'),
      title: document.title
    };
  }, invalidPattern.source);
  assert(!result.accessDenied, `${role} route ${route} unexpectedly rendered Access Denied.`);
  assert(!result.visibleMatch, `${role} route ${route} rendered invalid visible text: ${result.visibleMatch}`);
  assert(!result.attributeMatch, `${role} route ${route} rendered an invalid accessible attribute: ${result.attributeMatch}`);
  assert(!invalidPattern.test(result.title), `${role} route ${route} rendered an invalid browser title: ${result.title}`);
};

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
const audited = {};
try {
  for (const [role, routes] of Object.entries(routeSets)) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    observe(page);
    await login(page, accounts[role]);
    for (const route of routes) await inspectRoute(page, role, route);
    if (role === 'administrator') {
      const footerlessOverlay = await page.evaluate(async source => {
        const [{ openDrawer }, { element }] = await Promise.all([import('/assets/js/components/overlays.js'), import('/assets/js/components/dom.js')]);
        const instance = openDrawer({ title: 'Optional footer audit', content: element('p', { text: 'Footer omitted intentionally.' }), dismissible: false });
        const invalid = new RegExp(source, 'm');
        const result = { invalidText: instance.element.innerText.match(invalid)?.[0]?.trim() || '', footerCount: instance.element.querySelectorAll('.drawer__footer').length, strayText: [...instance.element.querySelector('.drawer').childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()).map(node => node.textContent.trim()) };
        instance.close();
        return result;
      }, invalidPattern.source);
      assert(!footerlessOverlay.invalidText && footerlessOverlay.footerCount === 0 && footerlessOverlay.strayText.length === 0, `Footerless overlay rendered an optional-value artifact: ${JSON.stringify(footerlessOverlay)}`);
    }
    audited[role] = routes;
    await context.close();
  }
  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', tokens: ['nullnull', 'undefinedundefined', 'nullundefined', 'undefinednull', '[object Object]', 'NaN', 'standalone null', 'standalone undefined'], audited, findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, audited, findings }, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
