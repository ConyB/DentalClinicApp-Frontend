import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.'), port = 4198, baseUrl = `http://127.0.0.1:${port}`, outputDir = join(root, 'tests', 'audits', 'output', 'phase13a');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const accounts = { dentist: 'daniel.mugisha@pearlsmiledental.test', administrator: 'grace.admin@pearlsmiledental.test', receptionist: 'lydia.reception@pearlsmiledental.test', cashier: 'brian.cashier@pearlsmiledental.test' };
const assert = (value, message) => { if (!value) throw new Error(message); };

const server = createServer(async (request, response) => {
  const file = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); });
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async (page, email, reset = true) => {
  await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(shouldReset => { if (shouldReset) localStorage.clear(); sessionStorage.clear(); }, reset);
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
};
const openPlan = async (page, patientId) => { await page.goto(`${baseUrl}/app.html#/patients/${patientId}/treatment-plans/workspace`, { waitUntil: 'networkidle' }); await page.locator('.treatment-plan').waitFor(); };
const dismissWelcome = async page => { const button = page.getByRole('button', { name: 'Dismiss notification' }); if (await button.count()) await button.click(); };

await mkdir(outputDir, { recursive: true }); await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await context.newPage(); observe(page);
  await login(page, accounts.dentist); await dismissWelcome(page); await openPlan(page, 'P001');
  assert(await page.getByRole('button', { name: 'Create Treatment Plan' }).count() === 1, 'Dentist cannot create a plan.');
  await page.getByRole('button', { name: 'Create Treatment Plan' }).click();
  let dialog = page.getByRole('dialog', { name: 'Create Treatment Plan' }); await dialog.getByLabel('Plan Note').fill('Browser audited treatment plan.'); await dialog.getByRole('button', { name: 'Create Plan' }).click();
  await page.getByText('Treatment plan created.').waitFor();
  await page.getByRole('button', { name: 'Add Treatment' }).click();
  dialog = page.getByRole('dialog', { name: /Add Treatment/ }); await dialog.getByLabel('Service').selectOption('SERVICE-RES-001'); await dialog.getByLabel('FDI Tooth').selectOption('27'); await dialog.getByRole('checkbox', { name: 'Occlusal surface' }).check(); await dialog.getByRole('button', { name: 'Add Treatment' }).click();
  await page.getByText('Treatment added to plan.').waitFor(); assert((await page.locator('.treatment-plan__detail').innerText()).includes('UGX 120,000'), 'Catalogue amount is not shown.');
  await page.getByRole('button', { name: 'Present Plan' }).click(); await page.getByText('Treatment plan presented.').waitFor(); await page.getByRole('button', { name: 'Accept', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Accept treatment?' }); await dialog.getByRole('button', { name: 'Accept Treatment' }).click(); await page.getByText('Treatment accepted.').waitFor();
  const runtime = await page.evaluate(() => window.DentalAppDev.getState()); const plan = runtime.treatmentPlans.find(item => item.id === 'TP-000305'), item = runtime.treatmentPlanItems.find(candidate => candidate.treatmentPlanId === plan?.id);
  assert(plan?.status === 'ACCEPTED' && item?.acceptanceStatus === 'ACCEPTED' && item?.lineTotal === 120000, 'Rendered lifecycle did not persist valid plan state.');
  assert(!runtime.proceduresPerformed.some(record => record.treatmentPlanItemId === item.id) && !runtime.invoices.some(record => record.treatmentPlanId === plan.id), 'Plan lifecycle created a downstream record.');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) { await page.setViewportSize(viewport); await openPlan(page, 'P001'); assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `Global horizontal overflow at ${viewport.width}px.`); }

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' }); await login(page, accounts.administrator, false); await openPlan(page, 'P001');
  assert(await page.getByRole('button', { name: 'Create Treatment Plan' }).count() === 0 && await page.getByRole('button', { name: 'Add Treatment' }).count() === 0 && await page.getByRole('button', { name: 'Accept', exact: true }).count() === 0, 'Administrator has treatment-plan mutation controls.');
  for (const [role, email] of [['Receptionist', accounts.receptionist], ['Cashier', accounts.cashier]]) { await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' }); await login(page, email, false); await page.goto(`${baseUrl}/app.html#/patients/P001/treatment-plans/workspace`, { waitUntil: 'networkidle' }); const body = await page.locator('body').innerText(); assert(body.includes('Access Denied') && await page.locator('.treatment-plan').count() === 0 && !body.includes('UGX 120,000'), `${role} direct route exposed workspace data.`); }
  await context.close();
  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', roles: { dentist: 'create / present / accept pass', administrator: 'read-only pass', receptionist: 'workspace denied pass', cashier: 'workspace denied pass' }, lifecycle: 'pass', responsive: '1440, 1366, 1024, 390 pass', console: findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} catch (error) { await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2)); console.error(error.stack || error.message); process.exitCode = 1; }
finally { await browser.close(); await new Promise(done => server.close(done)); }
