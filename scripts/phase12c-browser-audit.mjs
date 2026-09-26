import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { dentalFindingRules, normalizeDentalSurfaces } from '../assets/js/data/dental-reference.js';
import { getDentalChartViewModel, validateDentalChartRuntime } from '../assets/js/data/dental-chart.js';
import { addDentalFinding, updateDentalFinding } from '../assets/js/data/dental-chart-workflows.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';

const root = resolve('.'), port = 4197, baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase12c');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const accounts = { daniel: 'daniel.mugisha@pearlsmiledental.test', cashier: 'brian.cashier@pearlsmiledental.test' };
const actor = { role: 'Dentist', userId: 'U002', branchId: 'BR-MAIN', name: 'Dr. Daniel Mugisha' };
const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = value => JSON.stringify(value);
const stateCounts = state => Object.fromEntries(['treatmentPlans', 'treatmentPlanItems', 'proceduresPerformed', 'prescriptions', 'invoices', 'payments', 'receipts', 'appointments', 'queueEntries', 'clinicalEncounters'].map(key => [key, state[key].length]));
const currentFor = (state, patientId, toothCode) => state.dentalChartEntries.filter(entry => entry.patientId === patientId && entry.toothCode === toothCode && entry.status === 'active');
const labelsFor = (state, patientId, toothCode) => currentFor(state, patientId, toothCode).map(entry => entry.label).sort();
const surfacesFor = (state, entryId) => state.dentalChartEntrySurfaces.filter(surface => surface.dentalChartEntryId === entryId).map(surface => surface.surfaceCode);
const expectRejectWithoutMutation = (state, input, label) => {
  const before = snapshot(state); let rejected = false;
  try { addDentalFinding({ state, ...input, actor }); } catch { rejected = true; }
  assert(rejected, `${label} was accepted.`); assert(snapshot(state) === before, `${label} was not atomic.`);
};

const canonical = createCanonicalDemoState();
const staticIntegrity = validateDentalChartRuntime(canonical), phase5Integrity = validateCanonicalDemoState(canonical);
assert(staticIntegrity.valid && phase5Integrity.valid, `Canonical validation failed: ${[...staticIntegrity.errors, ...phase5Integrity.errors].join(' | ')}`);
assert(staticIntegrity.summary.permanent === 32 && staticIntegrity.summary.primary === 20 && staticIntegrity.summary.total === 52 && staticIntegrity.summary.duplicateCodes === 0, 'FDI definition totals failed.');
const quadrantCodes = quadrant => canonical.toothDefinitions.filter(tooth => tooth.quadrant === quadrant).map(tooth => tooth.code);
assert(snapshot(quadrantCodes(1)) === snapshot(['11','12','13','14','15','16','17','18']), 'Permanent quadrant 1 definitions failed.');
assert(snapshot(quadrantCodes(2)) === snapshot(['21','22','23','24','25','26','27','28']), 'Permanent quadrant 2 definitions failed.');
assert(snapshot(quadrantCodes(3)) === snapshot(['31','32','33','34','35','36','37','38']), 'Permanent quadrant 3 definitions failed.');
assert(snapshot(quadrantCodes(4)) === snapshot(['41','42','43','44','45','46','47','48']), 'Permanent quadrant 4 definitions failed.');
assert(snapshot(quadrantCodes(5)) === snapshot(['51','52','53','54','55']) && snapshot(quadrantCodes(6)) === snapshot(['61','62','63','64','65']) && snapshot(quadrantCodes(7)) === snapshot(['71','72','73','74','75']) && snapshot(quadrantCodes(8)) === snapshot(['81','82','83','84','85']), 'Primary quadrant definitions failed.');
assert(canonical.toothDefinitions.find(tooth => tooth.code === '15').dentition === 'permanent' && canonical.toothDefinitions.find(tooth => tooth.code === '75').dentition === 'primary', 'Permanent/primary tooth identity failed.');

const conditionCodes = canonical.dentalConditions.map(condition => condition.code), conditionLabels = canonical.dentalConditions.map(condition => condition.name);
assert(conditionCodes.length === 18 && new Set(conditionCodes).size === conditionCodes.length && new Set(conditionLabels).size === conditionLabels.length, 'Condition catalogue uniqueness failed.');
assert(conditionCodes.every(code => dentalFindingRules[code]?.accessibilityLabel && ['surface', 'whole_tooth', 'either'].includes(dentalFindingRules[code].surfaceMode)), 'Condition catalogue rule coverage failed.');
assert(snapshot(canonical.toothSurfaceDefinitions.posterior.map(surface => surface.code)) === snapshot(['M','D','B','L','O']), 'Posterior surface definitions failed.');
assert(snapshot(canonical.toothSurfaceDefinitions.anterior.map(surface => surface.code)) === snapshot(['M','D','F','L','I']), 'Anterior surface definitions failed.');
const tooth16 = canonical.toothDefinitions.find(tooth => tooth.code === '16');
assert(normalizeDentalSurfaces(tooth16, ['O','M']).join('') === 'MO' && normalizeDentalSurfaces(tooth16, ['O','D']).join('') === 'DO' && normalizeDentalSurfaces(tooth16, ['D','O','M']).join('') === 'MOD', 'Surface normalization failed.');

assert(labelsFor(canonical, 'P001', '36').join('|') === ['Crown', 'Root Canal Treated'].join('|'), 'Amina Crown + RCT failed.');
assert(labelsFor(canonical, 'P001', '46').includes('Missing') && !labelsFor(canonical, 'P001', '46').includes('Extracted'), 'Amina Missing failed.');
assert(labelsFor(canonical, 'P004', '46').includes('Extracted') && !labelsFor(canonical, 'P004', '46').includes('Missing'), 'Samuel Extracted failed.');
assert(['14','24','34','44'].every(code => labelsFor(canonical, 'P003', code).includes('Healthy / No Recorded Abnormality')) && currentFor(canonical, 'P003', '15').length === 0, 'Explicit Healthy / No Record failed.');
assert(surfacesFor(canonical, 'CHART-001').join('') === 'MO' && surfacesFor(canonical, 'CHART-002').join('') === 'O', 'Amina canonical surfaces failed.');
const aminaChartModel = getDentalChartViewModel(canonical, 'P001', 'permanent');
assert(canonical.treatmentPlanItems.some(item => item.toothCode === '26') && !aminaChartModel.history.entries.some(entry => entry.entryType === 'PLANNED_TREATMENT') && aminaChartModel.history.planned.some(item => item.toothCode === '26'), 'Amina planned/current separation failed.');

const selectorState = createCanonicalDemoState(), selectorBefore = snapshot(selectorState);
getDentalChartViewModel(selectorState, 'P001', 'permanent'); getDentalChartViewModel(selectorState, 'P013', 'primary');
assert(snapshot(selectorState) === selectorBefore, 'Dental chart selectors mutated source state.');

const mutationState = createCanonicalDemoState(), downstreamBefore = snapshot(stateCounts(mutationState));
const domainBefore = snapshot(Object.fromEntries(['treatmentPlans','treatmentPlanItems','proceduresPerformed','prescriptions','invoices','payments','receipts','appointments','queueEntries','clinicalEncounters'].map(key => [key, mutationState[key]])));
const addResult = addDentalFinding({ state: mutationState, patientId: 'P001', toothCode: '27', conditionCode: 'CARIES', surfaces: ['O','M'], notes: '<img src=x onerror=alert(1)>', actor });
assert(addResult.entry.id === 'CHART-032' && addResult.entry.patientId === 'P001' && addResult.entry.toothCode === '27' && addResult.surfaces.join('') === 'MO', 'Permanent runtime add failed.');
assert(mutationState.auditLogs.filter(event => event.entityId === addResult.entry.id && event.actionCode === 'DENTAL_CHART_ENTRY_CREATED').length === 1, 'Add audit cardinality failed.');
const updateResult = updateDentalFinding({ state: mutationState, entryId: addResult.entry.id, conditionCode: 'RESTORATION', surfaces: ['D','O'], notes: 'Updated', actor });
assert(updateResult.entry.id === addResult.entry.id && updateResult.surfaces.join('') === 'DO' && mutationState.dentalChartEntries.filter(entry => entry.id === addResult.entry.id).length === 1, 'Runtime edit identity failed.');
assert(mutationState.auditLogs.filter(event => event.entityId === addResult.entry.id && event.actionCode === 'DENTAL_CHART_ENTRY_UPDATED_DRAFT').length === 1, 'Update audit cardinality failed.');
assert(snapshot(stateCounts(mutationState)) === downstreamBefore && snapshot(Object.fromEntries(['treatmentPlans','treatmentPlanItems','proceduresPerformed','prescriptions','invoices','payments','receipts','appointments','queueEntries','clinicalEncounters'].map(key => [key, mutationState[key]]))) === domainBefore, 'Dental mutation changed a downstream domain.');
expectRejectWithoutMutation(mutationState, { patientId: 'P001', toothCode: '99', conditionCode: 'CARIES', surfaces: ['O'] }, 'Invalid tooth');
expectRejectWithoutMutation(mutationState, { patientId: 'P001', toothCode: '25', conditionCode: 'UNSUPPORTED', surfaces: ['O'] }, 'Invalid condition');
expectRejectWithoutMutation(mutationState, { patientId: 'P001', toothCode: '11', conditionCode: 'CARIES', surfaces: ['O'] }, 'Invalid surface');
expectRejectWithoutMutation(mutationState, { patientId: 'P001', toothCode: '25', conditionCode: 'CARIES', surfaces: [] }, 'Missing surface');
expectRejectWithoutMutation(mutationState, { patientId: 'P001', toothCode: '25', conditionCode: 'MISSING', surfaces: ['O'] }, 'Whole-tooth surface');
expectRejectWithoutMutation(mutationState, { patientId: 'P001', toothCode: '27', conditionCode: 'RESTORATION', surfaces: ['O','D'] }, 'Duplicate finding');
const primaryResult = addDentalFinding({ state: mutationState, patientId: 'P013', toothCode: '74', conditionCode: 'CARIES', surfaces: ['O'], actor });
assert(primaryResult.entry.toothCode === '74' && mutationState.toothDefinitions.find(tooth => tooth.code === primaryResult.entry.toothCode).dentition === 'primary', 'Primary runtime add failed.');
assert(validateDentalChartRuntime(mutationState).valid, 'Post-mutation runtime integrity failed.');

for (const corrupt of [
  state => { state.dentalChartEntries[0].organizationId = 'OTHER'; },
  state => { state.dentalChartEntries[0].recordedByUserId = 'U004'; },
  state => { state.dentalChartEntrySurfaces.push({ ...state.dentalChartEntrySurfaces[0], id: 'CHART-SURFACE-999' }); }
]) { const invalid = createCanonicalDemoState(); corrupt(invalid); assert(!validateDentalChartRuntime(invalid).valid, 'Runtime validator accepted corrupted chart state.'); }

const server = createServer(async (request, response) => {
  const path = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!path.startsWith(root)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[extname(path)] || 'application/octet-stream' }); response.end(await readFile(path)); }
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
  if (reset) await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click(); await page.waitForURL('**/app.html#/dashboard');
};
const openChart = async (page, patientId) => { await page.goto(`${baseUrl}/app.html#/patients/${patientId}/dental-chart`, { waitUntil: 'networkidle' }); await page.locator('.dental-chart').waitFor(); };
const selectTooth = async (page, code) => { await page.locator(`[data-tooth-code="${code}"]`).click(); return page.locator('.dental-chart__selected'); };
const dismissWelcome = async page => { const button = page.getByRole('button', { name: 'Dismiss notification' }); if (await button.count()) await button.click(); };

await mkdir(outputDir, { recursive: true }); await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await context.newPage(); observe(page);
  await login(page, accounts.daniel); await dismissWelcome(page); await openChart(page, 'P001');
  await selectTooth(page, '26'); assert((await page.locator('.dental-chart__selected').innerText()).includes('Caries'), 'Amina selection failed.');
  await openChart(page, 'P013'); assert(await page.locator('.odontogram--primary').count() === 1 && (await page.locator('.dental-chart__selected').innerText()).includes('No tooth selected'), 'Mercy patient switch leaked selection/dentition.');
  await selectTooth(page, '75'); assert((await page.locator('.dental-chart__selected').innerText()).includes('Caries'), 'Mercy selection failed.');
  await openChart(page, 'P002'); assert(await page.locator('.odontogram--permanent').count() === 1 && (await page.locator('.dental-chart__selected').innerText()).includes('No tooth selected'), 'Peter patient switch leaked selection/dentition.');
  await openChart(page, 'P001'); assert((await page.locator('.dental-chart__selected').innerText()).includes('No tooth selected'), 'Amina return retained stale selection.');
  await page.goto(`${baseUrl}/app.html#/patients/P999/dental-chart`, { waitUntil: 'networkidle' });
  assert((await page.locator('body').innerText()).includes('Patient Not Found') && await page.locator('.odontogram, [data-tooth-code]').count() === 0 && !(await page.locator('body').innerText()).includes('Amina Namusoke'), 'Invalid patient route leaked stale PHI.');

  await openChart(page, 'P001'); await selectTooth(page, '27'); await page.getByRole('button', { name: 'Add Finding — Tooth 27' }).click();
  let dialog = page.getByRole('dialog', { name: 'Add Finding — Tooth 27' }); await dialog.getByLabel('Condition / Finding').selectOption('CARIES');
  assert((await page.evaluate(() => window.DentalAppDev.getDirtySources())).includes('odontogram'), 'Add form did not mark the dedicated dirty source.');
  await page.keyboard.press('Escape'); let discard = page.getByRole('dialog', { name: 'Discard dental finding changes?' }); await discard.getByRole('button', { name: 'Cancel' }).click();
  assert(await dialog.isVisible() && (await page.evaluate(() => window.DentalAppDev.getDirtySources())).includes('odontogram'), 'Dirty Escape silently discarded the form.');
  await page.locator('.overlay').click({ position: { x: 2, y: 2 } }); await discard.getByRole('button', { name: 'Cancel' }).click();
  assert(await dialog.isVisible(), 'Dirty backdrop silently discarded the form.');
  await page.locator('a[href="#/dashboard"]').first().evaluate(link => link.click()); await discard.getByRole('button', { name: 'Cancel' }).click();
  assert(page.url().includes('/dental-chart') && await dialog.isVisible(), 'Dashboard dirty-navigation Stay failed.');
  await page.locator('.global-patient-search input').evaluate(input => { input.value = 'Mercy'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.getByRole('option', { name: /View Mercy/ }).evaluate(link => link.click()); await discard.getByRole('button', { name: 'Cancel' }).click();
  assert(page.url().includes('/patients/P001/dental-chart') && await dialog.isVisible(), 'Patient-switch dirty-navigation Stay failed.');
  await page.locator('.patient-context').getByRole('button', { name: 'Clinical Workspace' }).evaluate(button => button.click()); await discard.getByRole('button', { name: 'Discard Changes' }).click();
  await page.waitForURL('**/patients/P001/clinical'); assert(!(await page.evaluate(() => window.DentalAppDev.getDirtySources())).includes('odontogram'), 'Clinical navigation did not discard only the Odontogram source.');

  await openChart(page, 'P001'); await selectTooth(page, '27'); await page.getByRole('button', { name: 'Add Finding — Tooth 27' }).click();
  dialog = page.getByRole('dialog', { name: 'Add Finding — Tooth 27' }); await dialog.getByLabel('Condition / Finding').selectOption('CARIES');
  for (const name of ['Distal surface', 'Occlusal surface', 'Mesial surface']) await dialog.getByRole('checkbox', { name }).check();
  await dialog.getByRole('button', { name: 'Save Finding' }).click(); await page.getByText('Dental finding recorded.').waitFor();
  assert((await page.locator('.dental-chart__selected').innerText()).includes('MOD'), 'Browser MOD normalization failed.');
  const browserState = await page.evaluate(() => window.DentalAppDev.getState()); const runtime = browserState.dentalChartEntries.find(entry => entry.patientId === 'P001' && entry.toothCode === '27' && entry.conceptCode === 'CARIES');
  assert(runtime && normalizeDentalSurfaces(tooth16, surfacesFor(browserState, runtime.id)).join('') === 'MOD', 'Persisted MOD surfaces failed.');

  await page.locator('.shell-header .dropdown__trigger[aria-label="Account menu"]').click(); await page.getByRole('menuitem', { name: 'Logout' }).click(); await page.waitForURL('**/index.html?signed-out');
  await login(page, accounts.cashier, false); await page.goto(`${baseUrl}/app.html#/patients/P001/dental-chart`, { waitUntil: 'networkidle' });
  const deniedBody = await page.locator('body').innerText(); assert(deniedBody.includes('Access Denied') && await page.locator('.odontogram, [data-tooth-code], .dental-chart__finding').count() === 0 && !deniedBody.includes('Caries'), 'Role-session leakage exposed chart PHI.');
  await context.close();

  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', staticIntegrity, phase5Integrity, conditions: conditionCodes.length, runtimePermanentId: addResult.entry.id, runtimePrimaryId: primaryResult.entry.id, normalizedSurfaces: { MO: 'MO', DO: 'DO', MOD: 'MOD' }, patientSwitchSequence: ['P001','P013','P002','P001'], roleSessionLeakage: 'pass', findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, staticIntegrity, phase5Integrity, findings }, null, 2)); console.error(error.stack || error.message); process.exitCode = 1;
} finally { await browser.close(); await new Promise(done => server.close(done)); }
