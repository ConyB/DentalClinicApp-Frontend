import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateDentalChartRuntime } from '../assets/js/data/dental-chart.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';

const root = resolve('.');
const port = 4195;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase12a');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const accounts = {
  admin: 'grace.admin@pearlsmiledental.test',
  daniel: 'daniel.mugisha@pearlsmiledental.test',
  sarah: 'sarah.nakanwagi@pearlsmiledental.test',
  receptionist: 'lydia.reception@pearlsmiledental.test',
  cashier: 'brian.cashier@pearlsmiledental.test'
};
const viewports = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }];
const assert = (value, message) => { if (!value) throw new Error(message); };
const canonical = createCanonicalDemoState();
const chartIntegrity = validateDentalChartRuntime(canonical);
const canonicalIntegrity = validateCanonicalDemoState(canonical);
assert(chartIntegrity.valid && canonicalIntegrity.valid, `Static integrity failed: ${[...chartIntegrity.errors, ...canonicalIntegrity.errors].join(' | ')}`);

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
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); });
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async (page, email = accounts.daniel) => {
  await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
};
const openChart = async (page, patientId) => { await page.goto(`${baseUrl}/app.html#/patients/${patientId}/dental-chart`, { waitUntil: 'networkidle' }); await page.locator('.dental-chart').waitFor(); };
const selectTooth = async (page, code) => { const tooth = page.locator(`[data-tooth-code="${code}"]`); await tooth.click(); return page.locator('.dental-chart__selected'); };
const text = page => page.locator('body').innerText();
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const stateSnapshot = page => page.evaluate(() => { const state = window.DentalAppDev.getState(); return JSON.stringify(Object.fromEntries(['dentalChartEntries', 'dentalChartEntrySurfaces', 'treatmentPlans', 'treatmentPlanItems', 'treatmentPlanItemSurfaces', 'proceduresPerformed', 'clinicalEncounters', 'prescriptions', 'invoices', 'payments', 'receipts'].map(key => [key, state[key]]))); });
const dirty = page => page.evaluate(() => window.DentalAppDev.getDirtySources());
const codes = async (page, arch) => page.locator(`.odontogram__arch--${arch} .odontogram-tooth__number`).allTextContents();
const assertSelectedContains = async (page, code, required, forbidden = []) => {
  const panel = await selectTooth(page, code);
  const content = await panel.innerText();
  required.forEach(value => assert(content.includes(value), `Tooth ${code} detail missing ${value}: ${content}`));
  forbidden.forEach(value => assert(!content.includes(value), `Tooth ${code} detail incorrectly contains ${value}: ${content}`));
  assert(await page.locator(`[data-tooth-code="${code}"]`).getAttribute('aria-pressed') === 'true', `Tooth ${code} selected state missing.`);
};

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });

try {
  const primaryContext = await browser.newContext({ viewport: viewports[0] });
  const page = await primaryContext.newPage(); observe(page); await login(page); await openChart(page, 'P001');
  assert(await page.title() === 'Dental Chart | Pearl Smile Dental Clinic', `Privacy-safe title failed: ${await page.title()}`);
  assert(!page.url().includes('Amina') && !page.url().includes('Caries'), 'URL exposed patient name or diagnosis.');
  assert(JSON.stringify(await codes(page, 'upper')) === JSON.stringify(['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28']), 'Permanent upper FDI order is incorrect.');
  assert(JSON.stringify(await codes(page, 'lower')) === JSON.stringify(['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38']), 'Permanent lower FDI order is incorrect.');
  assert(await page.locator('.odontogram-tooth').count() === 32, 'Permanent chart did not render 32 teeth.');
  const before = await stateSnapshot(page);
  await assertSelectedContains(page, '26', ['Caries', 'O', 'Composite Filling - Single Surface', 'TP-000301']);
  await assertSelectedContains(page, '36', ['Root Canal Treated', 'Crown']);
  await assertSelectedContains(page, '46', ['Missing'], ['Extracted']);
  await assertSelectedContains(page, '27', ['No recorded findings.'], ['Healthy / No Recorded Abnormality']);
  const tooth26 = page.locator('[data-tooth-code="26"]');
  const tooth26Label = await tooth26.getAttribute('aria-label');
  assert(tooth26Label.toLowerCase().includes('caries on occlusal surface') && tooth26Label.includes('1 planned treatment'), `Amina 26 accessible label is incomplete: ${tooth26Label}`);
  assert(await page.locator('[data-tooth-code="36"] .odontogram-tooth__marker').count() === 2, 'Amina 36 did not preserve multiple markers.');
  await page.getByRole('button', { name: 'Primary Dentition' }).click();
  assert(await page.locator('.odontogram-tooth').count() === 20 && (await page.locator('.dental-chart__selected').innerText()).includes('No tooth selected'), 'Dentition switch did not clear selection or render 20 teeth.');
  assert(!(await dirty(page)).length && await stateSnapshot(page) === before, 'Read-only selection or dentition switch mutated state/dirty sources.');
  await page.getByRole('button', { name: 'Permanent Dentition' }).click();
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  assert(await page.locator('#header-notification-panel').isVisible(), 'Notification popover regressed on chart.');
  await page.keyboard.press('Escape');
  assert(await page.locator('.shell-footer svg.footer-heart').count() === 1, 'Footer Lucide heart regressed.');
  await primaryContext.close();

  const patients = [
    ['P002', [['36', ['Root Canal Treated', 'Crown']], ['47', ['Restoration', 'O']]]],
    ['P003', [['14', ['Healthy / No Recorded Abnormality']], ['15', ['No recorded findings.']]]],
    ['P004', [['46', ['Extracted']], ['47', ['Caries', 'O']], ['16', ['Restoration', 'O']]]],
    ['P005', [['21', ['Fractured', 'Porcelain Crown', 'TP-000302']]]],
    ['P006', [['16', ['Restoration', 'MO']], ['26', ['Restoration', 'DO']], ['36', ['Restoration', 'O']], ['45', ['Restoration', 'O']]]],
    ['P010', [['11', ['Missing']], ['12', ['Missing']], ['21', ['Missing']], ['22', ['Missing']], ['36', ['Restoration', 'O']]]]
  ];
  for (const [patientId, toothChecks] of patients) {
    const context = await browser.newContext({ viewport: viewports[0] }); const scoped = await context.newPage(); observe(scoped); await login(scoped); await openChart(scoped, patientId);
    for (const [code, required] of toothChecks) await assertSelectedContains(scoped, code, required, code === '46' && patientId === 'P004' ? ['Missing'] : []);
    await context.close();
  }

  const mercyContext = await browser.newContext({ viewport: viewports[0] }); const mercy = await mercyContext.newPage(); observe(mercy); await login(mercy); await openChart(mercy, 'P013');
  assert(await mercy.locator('.odontogram--primary').count() === 1 && await mercy.locator('.odontogram-tooth').count() === 20, 'Mercy did not default to Primary dentition.');
  assert(JSON.stringify(await codes(mercy, 'upper')) === JSON.stringify(['55','54','53','52','51','61','62','63','64','65']), 'Primary upper FDI order is incorrect.');
  assert(JSON.stringify(await codes(mercy, 'lower')) === JSON.stringify(['85','84','83','82','81','71','72','73','74','75']), 'Primary lower FDI order is incorrect.');
  await assertSelectedContains(mercy, '75', ['Caries', 'O', 'Composite Filling - Single Surface', 'TP-000304']);
  await assertSelectedContains(mercy, '84', ['Restoration', 'O']);
  await assertSelectedContains(mercy, '64', ['Healthy / No Recorded Abnormality']);
  await mercy.goto(`${baseUrl}/app.html#/patients/P001/dental-chart`, { waitUntil: 'networkidle' });
  assert(await mercy.locator('.odontogram--permanent').count() === 1 && (await mercy.locator('.dental-chart__selected').innerText()).includes('No tooth selected') && !(await text(mercy)).includes('Mercy Ayaa'), 'Patient switch retained Mercy chart state.');
  await mercy.goto(`${baseUrl}/app.html#/patients/P002/dental-chart`, { waitUntil: 'networkidle' });
  await mercy.goto(`${baseUrl}/app.html#/patients/P001/dental-chart`, { waitUntil: 'networkidle' });
  assert((await text(mercy)).includes('Amina Nakato') && !(await text(mercy)).includes('Peter Okello'), 'Amina/Peter switch retained stale chart state.');
  await mercy.goto(`${baseUrl}/app.html#/patients/P999/dental-chart`, { waitUntil: 'networkidle' });
  assert((await text(mercy)).includes('Patient Not Found') && await mercy.locator('.odontogram').count() === 0, 'Invalid patient did not render a safe blank not-found state.');
  await mercyContext.close();

  for (const [role, email, allowed] of [['Admin', accounts.admin, true], ['Dr. Daniel', accounts.daniel, true], ['Dr. Sarah', accounts.sarah, true], ['Receptionist', accounts.receptionist, false], ['Cashier', accounts.cashier, false]]) {
    const context = await browser.newContext({ viewport: viewports[0] }); const scoped = await context.newPage(); observe(scoped); await login(scoped, email); await scoped.goto(`${baseUrl}/app.html#/patients/P001/dental-chart`, { waitUntil: 'networkidle' }); const body = await text(scoped);
    if (allowed) assert(await scoped.locator('.odontogram').count() === 1 && body.includes('Caries'), `${role} did not receive authorized chart access.`);
    else assert(body.includes('Access Denied') && await scoped.locator('.odontogram, [data-tooth-code]').count() === 0 && !body.includes('Penicillin') && !body.includes('Caries'), `${role} received Dental Chart PHI.`);
    const roleTitle = await scoped.title();
    assert(allowed ? roleTitle === 'Dental Chart | Pearl Smile Dental Clinic' : roleTitle === 'Access Denied | Pearl Smile Dental Clinic', `${role} received an unsafe title: ${roleTitle}`);
    await context.close();
  }

  const profileContext = await browser.newContext({ viewport: viewports[0] }); const profile = await profileContext.newPage(); observe(profile); await login(profile, accounts.admin); await profile.goto(`${baseUrl}/app.html#/patients/P001`, { waitUntil: 'networkidle' });
  const summaryCard = profile.locator('.card', { hasText: 'Dental Chart Summary' });
  assert(await summaryCard.count() === 1 && (await summaryCard.innerText()).includes('Tooth 26'), 'Phase 8 Patient Profile Dental Chart Summary regressed.');
  await summaryCard.getByRole('button', { name: 'View Full Dental Chart' }).click(); await profile.waitForURL('**/patients/P001/dental-chart');
  await profile.locator('.odontogram').waitFor();
  assert(await profile.locator('.odontogram').count() === 1, 'Patient Profile full-chart entry point failed.');
  await profileContext.close();

  const guardContext = await browser.newContext({ viewport: viewports[0] }); const guard = await guardContext.newPage(); observe(guard); await login(guard); await guard.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' });
  await guard.getByRole('button', { name: 'Start Clinical Encounter' }).click(); await guard.locator('#encounter-chiefComplaint').fill('Unsaved odontogram handoff');
  assert((await dirty(guard)).includes('clinical-encounter'), 'Clinical encounter did not become dirty.');
  await guard.getByRole('button', { name: 'View Dental Chart' }).click();
  const discard = guard.getByRole('dialog', { name: 'Discard encounter changes?' }); assert(await discard.count() === 1, 'Clinical → Dental Chart dirty guard did not open.');
  await discard.getByRole('button', { name: 'Cancel' }).click(); assert(guard.url().includes('/clinical'), 'Cancelling dirty navigation left Clinical.');
  await guard.getByRole('button', { name: 'View Dental Chart' }).click(); await discard.getByRole('button', { name: 'Discard Changes' }).click(); await guard.waitForURL('**/patients/P001/dental-chart');
  await guard.locator('.odontogram').waitFor();
  const guardDirty = await dirty(guard), guardChartCount = await guard.locator('.odontogram').count();
  assert(!guardDirty.length && guardChartCount === 1, `Discard did not hand off to a clean Dental Chart: dirty=${JSON.stringify(guardDirty)} chart=${guardChartCount} url=${guard.url()}`);
  await guardContext.close();

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport }); const responsive = await context.newPage(); observe(responsive); await login(responsive); await openChart(responsive, 'P001');
    assert(await noOverflow(responsive), `Global overflow at ${viewport.width}px.`);
    assert(await responsive.locator('.odontogram-tooth').count() === 32, `Chart incomplete at ${viewport.width}px.`);
    await assertSelectedContains(responsive, '26', ['Caries', 'Composite Filling']);
    const scroller = await responsive.locator('.odontogram__scroll').evaluate(node => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, overflowX: getComputedStyle(node).overflowX }));
    if (viewport.width <= 1024) assert(scroller.scrollWidth > scroller.clientWidth && ['auto', 'scroll'].includes(scroller.overflowX), `Local chart scroll missing at ${viewport.width}px: ${JSON.stringify(scroller)}`);
    if (viewport.width === 1440) { await responsive.getByRole('button', { name: 'Toggle navigation' }).click(); assert(await noOverflow(responsive), 'Collapsed sidebar caused chart overflow.'); }
    if ([1440, 1366, 1024, 390].includes(viewport.width)) await responsive.screenshot({ path: join(outputDir, `amina-${viewport.width}.png`), fullPage: true });
    const body = await text(responsive); assert(!/[ÃƒÃ‚]|Ã¢(?:â‚¬|â„¢|Å“)|Ã¯Â¿Â½|ï¿½/.test(body), `Encoding artifact at ${viewport.width}px.`);
    await context.close();
  }

  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', chartIntegrity, canonicalIntegrity, viewports, roles: ['Clinic Administrator', 'Dr. Daniel', 'Dr. Sarah', 'Receptionist', 'Cashier'], canonicalPatients: ['Amina', 'Peter', 'Joan', 'Samuel', 'Esther', 'Isaac', 'Joseph', 'Mercy'], findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, chartIntegrity, canonicalIntegrity, findings }, null, 2));
  console.error(error.stack || error.message); process.exitCode = 1;
} finally { await browser.close(); await new Promise(done => server.close(done)); }
