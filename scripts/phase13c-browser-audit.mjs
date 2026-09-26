import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.'), port = 4200, baseUrl = `http://127.0.0.1:${port}`, outputDir = join(root, 'tests', 'audits', 'output', 'phase13c');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const server = createServer(async (request, response) => {
  const file = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); } catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => { page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); }); page.on('pageerror', error => findings.pageErrors.push(error.message)); page.on('requestfailed', request => findings.failedRequests.push(request.url())); page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); }); page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); }); };
const login = async page => { await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' }); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' }); await page.locator('#email').fill('daniel.mugisha@pearlsmiledental.test'); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click(); await page.waitForURL('**/app.html#/dashboard'); };
const openPlan = async (page, patientId) => { await page.goto(`${baseUrl}/app.html#/patients/${patientId}/treatment-plans/workspace`, { waitUntil: 'networkidle' }); await page.locator('.treatment-plan').waitFor(); };
const noGlobalOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

await mkdir(outputDir, { recursive: true }); await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await context.newPage(); observe(page); await login(page);
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' }); if (await dismiss.count()) await dismiss.click();
  const canonicalState = await page.evaluate(() => window.DentalAppDev.getState());
  const financeBaseline = JSON.stringify({ invoices: canonicalState.invoices, payments: canonicalState.payments, receipts: canonicalState.receipts, prescriptions: canonicalState.prescriptions });

  await openPlan(page, 'P005');
  const esther = await page.locator('.treatment-plan__detail').innerText();
  assert(esther.includes('Porcelain Crown') && esther.includes('UGX 850,000') && esther.includes('Proposed') && await page.getByRole('button', { name: 'Record Procedure', exact: true }).count() === 0, 'Esther proposed crown is incorrectly eligible for procedure recording.');
  await openPlan(page, 'P013');
  const mercy = await page.locator('.treatment-plan__detail').innerText();
  assert(canonicalState.toothDefinitions.find(tooth => tooth.code === '75')?.dentition === 'primary' && mercy.includes('75') && mercy.includes('Composite Filling') && mercy.includes('O'), 'Mercy primary-dentition plan does not render correctly.');

  for (const [patientId, expected] of [['P001', 'Amina Nakato'], ['P004', 'Samuel Kato'], ['P002', 'Peter Okello'], ['P013', 'Mercy Ayaa'], ['P001', 'Amina Nakato']]) { await openPlan(page, patientId); const content = await page.locator('.treatment-plan').innerText(); assert(content.includes(expected), `Patient switch did not recompute the treatment-plan context for ${patientId}.`); }
  await page.goto(`${baseUrl}/app.html#/patients/P999/treatment-plans/workspace`, { waitUntil: 'networkidle' }); await page.getByText('Patient Not Found').waitFor(); assert(!(await page.locator('body').innerText()).includes('Amina Nakato'), 'Invalid plan route leaked a stale patient context.');
  await page.goto(`${baseUrl}/app.html#/patients/P001/dental-chart`, { waitUntil: 'networkidle' }); const chartText = await page.locator('.dental-chart').innerText(); assert(chartText.includes('Caries') && chartText.includes('Planned') && chartText.includes('26'), 'Amina finding and planned overlay are not separately rendered.');
  await page.goto(`${baseUrl}/app.html#/waiting-room`, { waitUntil: 'networkidle' }); assert(await page.locator('.waiting-room__workspace').count() === 1 && await noGlobalOverflow(page), 'Waiting Room or its layout regressed.');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) { await page.setViewportSize(viewport); await openPlan(page, 'P001'); assert(await noGlobalOverflow(page), `Treatment Plan has global horizontal overflow at ${viewport.width}px.`); assert(await page.locator('.treatment-plan').count() === 1, `Treatment Plan workspace is absent at ${viewport.width}px.`); if (viewport.width === 390) { assert(!(await page.locator('.app-shell').evaluate(shell => shell.classList.contains('app-shell--mobile-open'))), 'Mobile navigation was unexpectedly open after route rendering.'); await page.screenshot({ path: join(outputDir, 'treatment-plans-390.png') }); } }
  const after = await page.evaluate(() => window.DentalAppDev.getState()); assert(JSON.stringify({ invoices: after.invoices, payments: after.payments, receipts: after.receipts, prescriptions: after.prescriptions }) === financeBaseline, 'Read-only Phase 13C browser checks changed finance or prescriptions.');
  await context.close(); assert(!Object.values(findings).some(records => records.length), JSON.stringify(findings));
  const result = { status: 'pass', browser: 'chromium/playwright available', canonicalCrossClinicalViews: 'Amina, Esther, Mercy, Samuel, Peter pass', patientSwitchAndPrivacy: 'pass', plannedOverlay: 'pass', shellAndWaitingRoomRegression: 'pass', responsive: '1440×900, 1366×768, 1280×720, 1024×768, 390×844 pass', findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} catch (error) { await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2)); console.error(error.stack || error.message); process.exitCode = 1; }
finally { await browser.close(); await new Promise(done => server.close(done)); }
