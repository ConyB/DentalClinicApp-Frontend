import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateDentalChartRuntime } from '../assets/js/data/dental-chart.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';

const root = resolve('.'), port = 4196, baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase12b');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const accounts = { admin: 'grace.admin@pearlsmiledental.test', daniel: 'daniel.mugisha@pearlsmiledental.test', sarah: 'sarah.nakanwagi@pearlsmiledental.test', receptionist: 'lydia.reception@pearlsmiledental.test', cashier: 'brian.cashier@pearlsmiledental.test' };
const viewports = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }];
const assert = (value, message) => { if (!value) throw new Error(message); };
const canonical = createCanonicalDemoState(), staticChartIntegrity = validateDentalChartRuntime(canonical), staticCanonicalIntegrity = validateCanonicalDemoState(canonical);
assert(staticChartIntegrity.valid && staticCanonicalIntegrity.valid, `Static validation failed: ${[...staticChartIntegrity.errors, ...staticCanonicalIntegrity.errors].join(' | ')}`);

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
const login = async (page, email = accounts.daniel, reset = true) => {
  await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' });
  if (reset) await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click(); await page.waitForURL('**/app.html#/dashboard');
};
const openChart = async (page, patientId) => { await page.goto(`${baseUrl}/app.html#/patients/${patientId}/dental-chart`, { waitUntil: 'networkidle' }); await page.locator('.dental-chart').waitFor(); };
const selectTooth = async (page, code) => { await page.locator(`[data-tooth-code="${code}"]`).click(); return page.locator('.dental-chart__selected'); };
const state = page => page.evaluate(() => window.DentalAppDev.getState());
const dirty = page => page.evaluate(() => window.DentalAppDev.getDirtySources());
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const counts = data => Object.fromEntries(['treatmentPlans', 'proceduresPerformed', 'prescriptions', 'invoices', 'payments', 'receipts'].map(key => [key, data[key].length]));
const openAdd = async (page, toothCode) => { await selectTooth(page, toothCode); await page.getByRole('button', { name: `Add Finding — Tooth ${toothCode}` }).click(); return page.getByRole('dialog', { name: `Add Finding — Tooth ${toothCode}` }); };
const chooseSurface = async (dialog, name) => dialog.getByRole('checkbox', { name: `${name} surface` }).check();

await mkdir(outputDir, { recursive: true }); await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
let runtimeFindingId = null;
try {
  const context = await browser.newContext({ viewport: viewports[0] }); const page = await context.newPage(); observe(page); await login(page); await openChart(page, 'P001');
  const canonicalBody = await page.locator('body').innerText();
  ['Tooth 16 · Restoration / Filling', 'Tooth 26 · Caries', 'Tooth 36 · Root Canal Treated', 'Tooth 36 · Crown', 'Tooth 46 · Missing', 'TP-000301'].forEach(value => assert(canonicalBody.includes(value), `Canonical Amina chart missing ${value}.`));
  const beforeState = await state(page), beforeCounts = counts(beforeState), beforePlans = JSON.stringify(beforeState.treatmentPlans), beforeProcedures = JSON.stringify(beforeState.proceduresPerformed);

  assert(!(await dirty(page)).length, 'Chart opened dirty.'); await selectTooth(page, '27'); assert(!(await dirty(page)).length, 'Tooth selection marked chart dirty.');
  await selectTooth(page, '26'); assert(await page.getByRole('button', { name: 'Edit Caries on tooth 26' }).count() === 0, 'Completed historical encounter finding exposed routine Edit.');
  let dialog = await openAdd(page, '27'); assert(!(await dirty(page)).length, 'Opening Add Finding marked chart dirty.');
  await dialog.getByLabel('Condition / Finding').selectOption('CARIES'); assert((await dirty(page)).includes('odontogram'), 'Condition selection did not mark odontogram dirty.');
  const entriesBeforeValidation = (await state(page)).dentalChartEntries.length;
  await dialog.getByRole('button', { name: 'Save Finding' }).click();
  await dialog.getByText('Select at least one applicable tooth surface.').waitFor();
  assert((await state(page)).dentalChartEntries.length === entriesBeforeValidation && (await dirty(page)).includes('odontogram'), 'Missing-surface validation mutated or cleaned state.');
  await chooseSurface(dialog, 'Mesial'); await chooseSurface(dialog, 'Occlusal');
  const unsafeNote = '<img src=x onerror="window.__chartXss=true"> Runtime note'; await dialog.getByLabel('Short Clinical Note').fill(unsafeNote);
  await dialog.getByRole('button', { name: 'Save Finding' }).evaluate(button => { button.click(); button.click(); });
  await page.getByText('Dental finding recorded.').waitFor();
  let current = await state(page); const runtimeEntries = current.dentalChartEntries.filter(entry => entry.patientId === 'P001' && entry.toothCode === '27' && entry.conceptCode === 'CARIES');
  assert(runtimeEntries.length === 1, 'Double save created duplicate findings.'); runtimeFindingId = runtimeEntries[0].id;
  assert(/^CHART-\d{3,}$/.test(runtimeFindingId), `Runtime finding ID is invalid: ${runtimeFindingId}`);
  assert(JSON.stringify(current.dentalChartEntrySurfaces.filter(surface => surface.dentalChartEntryId === runtimeFindingId).map(surface => surface.surfaceCode)) === JSON.stringify(['M', 'O']), 'Surfaces were not normalized structurally.');
  assert(!(await dirty(page)).includes('odontogram'), 'Successful save did not clear odontogram dirty source.');
  let selected = await page.locator('.dental-chart__selected').innerText(); assert(selected.includes('Caries') && selected.includes('MO') && selected.includes(unsafeNote), 'Selected Tooth did not update after add.');
  assert(await page.locator('.dental-chart__finding-note img').count() === 0 && !await page.evaluate(() => Boolean(window.__chartXss)), 'Finding notes executed raw HTML.');
  const addEvents = current.auditLogs.filter(event => event.entityId === runtimeFindingId && event.actionCode === 'DENTAL_CHART_ENTRY_CREATED'); assert(addEvents.length === 1 && addEvents[0].actorUserId === 'U002' && !Number.isNaN(Date.parse(addEvents[0].occurredAt)), 'Add audit event metadata is invalid.');
  assert(JSON.stringify(counts(current)) === JSON.stringify(beforeCounts) && JSON.stringify(current.treatmentPlans) === beforePlans && JSON.stringify(current.proceduresPerformed) === beforeProcedures, 'Finding add mutated another clinical/finance domain.');

  await page.reload({ waitUntil: 'networkidle' }); await selectTooth(page, '27'); selected = await page.locator('.dental-chart__selected').innerText(); assert(selected.includes(unsafeNote), 'Runtime finding did not survive refresh.');
  await page.goto(`${baseUrl}/app.html#/patients/P001`, { waitUntil: 'networkidle' }); const profileSummary = page.locator('.card', { hasText: 'Dental Chart Summary' }); assert((await profileSummary.innerText()).includes('Tooth 27'), 'Patient Profile summary did not receive runtime finding.');
  await openChart(page, 'P001'); await selectTooth(page, '27'); await page.getByRole('button', { name: 'Edit Caries on tooth 27' }).click(); dialog = page.getByRole('dialog', { name: 'Edit Finding — Tooth 27' });
  assert(!(await dirty(page)).length, 'Opening Edit Finding marked chart dirty.'); await dialog.getByLabel('Condition / Finding').selectOption('RESTORATION'); await dialog.getByLabel('Short Clinical Note').fill('Corrected runtime note');
  await dialog.getByRole('button', { name: 'Save Finding Changes' }).click(); await page.getByText('Dental finding updated.').waitFor();
  current = await state(page); const edited = current.dentalChartEntries.filter(entry => entry.id === runtimeFindingId);
  assert(edited.length === 1 && edited[0].conceptCode === 'RESTORATION' && edited[0].patientId === 'P001' && edited[0].toothCode === '27', 'Edit failed identity/relationship preservation.');
  const updateEvents = current.auditLogs.filter(event => event.entityId === runtimeFindingId && event.actionCode === 'DENTAL_CHART_ENTRY_UPDATED_DRAFT'); assert(updateEvents.length === 1 && updateEvents[0].metadata.oldValues.conceptCode === 'CARIES' && updateEvents[0].metadata.newValues.conceptCode === 'RESTORATION', 'Update audit event count/history is invalid.');

  dialog = await openAdd(page, '27'); await dialog.getByLabel('Condition / Finding').selectOption('RESTORATION'); await chooseSurface(dialog, 'Mesial'); await chooseSurface(dialog, 'Occlusal'); await dialog.getByRole('button', { name: 'Save Finding' }).click();
  await dialog.getByText('An active matching finding already exists').waitFor(); assert((await state(page)).dentalChartEntries.filter(entry => entry.patientId === 'P001' && entry.toothCode === '27' && entry.conceptCode === 'RESTORATION').length === 1, 'Duplicate validation failed.');
  await dialog.getByRole('button', { name: 'Cancel' }).click(); let confirmation = page.getByRole('dialog', { name: 'Discard dental finding changes?' }); await confirmation.getByRole('button', { name: 'Cancel' }).click(); assert((await dirty(page)).includes('odontogram') && await dialog.isVisible(), 'Dirty Stay behavior failed.');
  await dialog.getByRole('button', { name: 'Cancel' }).click(); await confirmation.getByRole('button', { name: 'Discard Changes' }).click(); assert(!(await dirty(page)).includes('odontogram'), 'Dirty Discard did not clear only odontogram source.');

  dialog = await openAdd(page, '28'); await dialog.getByLabel('Condition / Finding').selectOption('UNERUPTED');
  assert(await dialog.getByRole('checkbox').evaluateAll(items => items.every(item => item.disabled)), 'Whole-tooth finding left surfaces enabled.'); await dialog.getByRole('button', { name: 'Save Finding' }).click();
  current = await state(page); const whole = current.dentalChartEntries.find(entry => entry.patientId === 'P001' && entry.toothCode === '28' && entry.conceptCode === 'UNERUPTED'); assert(whole && !current.dentalChartEntrySurfaces.some(surface => surface.dentalChartEntryId === whole.id), 'Whole-tooth finding stored meaningless surfaces.');

  const boundary = await page.evaluate(async () => {
    const { state } = await import('./assets/js/core/state.js'); const actor = { role: 'Dentist', userId: 'U002', branchId: 'BR-MAIN' }; const results = {};
    for (const [key, input] of Object.entries({ invalidTooth: { patientId: 'P001', toothCode: '99', conditionCode: 'CARIES', surfaces: ['O'] }, invalidCondition: { patientId: 'P001', toothCode: '15', conditionCode: 'MADE_UP', surfaces: ['O'] }, invalidSurface: { patientId: 'P001', toothCode: '11', conditionCode: 'CARIES', surfaces: ['O'] }, wholeToothSurface: { patientId: 'P001', toothCode: '15', conditionCode: 'MISSING', surfaces: ['O'] }, healthyConflict: { patientId: 'P001', toothCode: '26', conditionCode: 'HEALTHY', surfaces: [] }, missingConflict: { patientId: 'P001', toothCode: '26', conditionCode: 'MISSING', surfaces: [] }, extractedConflict: { patientId: 'P001', toothCode: '26', conditionCode: 'EXTRACTED', surfaces: [] }, ownership: { patientId: 'P002', toothCode: '15', conditionCode: 'CARIES', surfaces: ['O'] } })) { try { state.addDentalFinding({ ...input, actor }); results[key] = 'accepted'; } catch (error) { results[key] = error.message; } }
    return results;
  });
  Object.entries(boundary).forEach(([key, value]) => assert(value !== 'accepted', `Store boundary accepted ${key}.`));

  await openChart(page, 'P001'); dialog = await openAdd(page, '25'); await dialog.getByLabel('Condition / Finding').selectOption('CARIES'); await chooseSurface(dialog, 'Occlusal');
  await page.evaluate(async () => { const { dirtyState } = await import('./assets/js/core/dirty-state.js'); dirtyState.markUnsavedChanges('clinical-encounter'); dirtyState.markUnsavedChanges('medical-history'); });
  await dialog.getByRole('button', { name: 'Save Finding' }).click(); const remainingDirty = await dirty(page); assert(!remainingDirty.includes('odontogram') && remainingDirty.includes('clinical-encounter') && remainingDirty.includes('medical-history'), `Finding save cleared another dirty source: ${remainingDirty}`);
  await page.evaluate(async () => { const { dirtyState } = await import('./assets/js/core/dirty-state.js'); dirtyState.clearUnsavedChanges('clinical-encounter'); });
  assert(JSON.stringify(await dirty(page)) === JSON.stringify(['medical-history']), 'Independent dirty-source clearing failed.');
  await page.evaluate(async () => { const { dirtyState } = await import('./assets/js/core/dirty-state.js'); dirtyState.clearUnsavedChanges('medical-history'); });

  const runtimeValidation = await page.evaluate(async () => { const { validateDentalChartRuntime } = await import('./assets/js/data/dental-chart.js'); const { validateCanonicalDemoState } = await import('./assets/js/data/integrity.js'); const state = window.DentalAppDev.getState(); return { chart: validateDentalChartRuntime(state), canonical: validateCanonicalDemoState(state) }; });
  assert(runtimeValidation.chart.valid && runtimeValidation.canonical.valid, `Runtime integrity failed: ${JSON.stringify(runtimeValidation)}`);
  await context.close();

  const encounterContext = await browser.newContext({ viewport: viewports[0] }); const encounterPage = await encounterContext.newPage(); observe(encounterPage); await login(encounterPage); await encounterPage.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' });
  await encounterPage.getByRole('button', { name: 'Start Clinical Encounter' }).click(); const encounterId = (await state(encounterPage)).clinicalEncounters.find(encounter => encounter.patientId === 'P001' && encounter.status === 'DRAFT')?.id;
  await encounterPage.getByRole('button', { name: 'View Dental Chart' }).click(); await encounterPage.waitForURL('**/patients/P001/dental-chart'); dialog = await openAdd(encounterPage, '25'); await dialog.getByLabel('Condition / Finding').selectOption('CARIES'); await chooseSurface(dialog, 'Occlusal'); await dialog.getByRole('button', { name: 'Save Finding' }).click();
  const encounterFinding = (await state(encounterPage)).dentalChartEntries.find(entry => entry.patientId === 'P001' && entry.toothCode === '25' && entry.conceptCode === 'CARIES'); assert(encounterFinding?.encounterId === encounterId && encounterFinding.sourceType === 'encounter' && encounterFinding.recordedByUserId === 'U002', 'Active encounter/Dentist relationship was not persisted.'); await encounterContext.close();

  const mercyContext = await browser.newContext({ viewport: viewports[0] }); const mercy = await mercyContext.newPage(); observe(mercy); await login(mercy); await openChart(mercy, 'P013');
  dialog = await openAdd(mercy, '74'); await dialog.getByLabel('Condition / Finding').selectOption('CARIES'); await chooseSurface(dialog, 'Occlusal'); await dialog.getByRole('button', { name: 'Save Finding' }).click();
  let mercyState = await state(mercy); const mercyRuntime = mercyState.dentalChartEntries.find(entry => entry.patientId === 'P013' && entry.toothCode === '74' && entry.conceptCode === 'CARIES'); assert(mercyRuntime, 'Primary-dentition runtime finding was not saved.'); await mercy.reload({ waitUntil: 'networkidle' }); await selectTooth(mercy, '74'); assert((await mercy.locator('.dental-chart__selected').innerText()).includes('Caries'), 'Primary finding did not persist visually.'); await mercyContext.close();

  for (const [label, email, patientId, editable, denied] of [['Admin', accounts.admin, 'P001', false, false], ['Daniel/Amina', accounts.daniel, 'P001', true, false], ['Daniel/Peter', accounts.daniel, 'P002', false, false], ['Sarah/Peter', accounts.sarah, 'P002', true, false], ['Receptionist', accounts.receptionist, 'P001', false, true], ['Cashier', accounts.cashier, 'P001', false, true]]) {
    const roleContext = await browser.newContext({ viewport: viewports[0] }); const scoped = await roleContext.newPage(); observe(scoped); await login(scoped, email); await scoped.goto(`${baseUrl}/app.html#/patients/${patientId}/dental-chart`, { waitUntil: 'networkidle' });
    if (denied) await scoped.getByText('Access Denied', { exact: true }).waitFor(); else await scoped.locator('.dental-chart').waitFor();
    const body = await scoped.locator('body').innerText();
    if (denied) assert(body.includes('Access Denied') && await scoped.locator('.odontogram, [data-tooth-code]').count() === 0, `${label} received chart PHI.`);
    else { await selectTooth(scoped, patientId === 'P002' ? '15' : '27'); assert((await scoped.getByRole('button', { name: /Add Finding/ }).count() > 0) === editable, `${label} mutation-control visibility is incorrect.`); }
    await roleContext.close();
  }

  const navigationContext = await browser.newContext({ viewport: viewports[0] }); const navigation = await navigationContext.newPage(); observe(navigation); await login(navigation); await openChart(navigation, 'P001');
  dialog = await openAdd(navigation, '27'); await dialog.getByLabel('Condition / Finding').selectOption('CARIES');
  await navigation.locator('.patient-context').getByRole('button', { name: 'Patient Profile' }).evaluate(button => button.click()); confirmation = navigation.getByRole('dialog', { name: 'Discard dental finding changes?' }); await confirmation.getByRole('button', { name: 'Cancel' }).click();
  assert(navigation.url().includes('/dental-chart') && (await dirty(navigation)).includes('odontogram'), 'Navigation Stay behavior failed.');
  await navigation.locator('.patient-context').getByRole('button', { name: 'Patient Profile' }).evaluate(button => button.click()); await confirmation.getByRole('button', { name: 'Discard Changes' }).click(); await navigation.waitForURL('**/patients/P001'); assert(!(await dirty(navigation)).includes('odontogram'), 'Navigation discard failed.');
  await openChart(navigation, 'P001'); dialog = await openAdd(navigation, '27'); await dialog.getByLabel('Condition / Finding').selectOption('CARIES');
  await navigation.locator('.shell-header .dropdown__trigger[aria-label="Account menu"]').evaluate(button => button.click()); await navigation.getByRole('menuitem', { name: 'Logout' }).evaluate(button => button.click());
  let logoutConfirm = navigation.getByRole('dialog', { name: 'Unsaved changes' }); await logoutConfirm.getByRole('button', { name: 'Cancel' }).click(); assert(navigation.url().includes('/dental-chart'), 'Logout Cancel discarded the active session.');
  await navigation.locator('.shell-header .dropdown__trigger[aria-label="Account menu"]').evaluate(button => button.click()); await navigation.getByRole('menuitem', { name: 'Logout' }).evaluate(button => button.click()); await logoutConfirm.getByRole('button', { name: 'Sign Out' }).click(); await navigation.waitForURL('**/index.html?signed-out');
  await navigationContext.close();

  const reverseContext = await browser.newContext({ viewport: viewports[0] }); const reverse = await reverseContext.newPage(); observe(reverse); await login(reverse, accounts.daniel); await reverse.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' });
  await reverse.getByRole('button', { name: 'Start Clinical Encounter' }).click(); await reverse.locator('#encounter-chiefComplaint').fill('Reverse dirty-source test'); await reverse.evaluate(async () => { const { dirtyState } = await import('./assets/js/core/dirty-state.js'); dirtyState.markUnsavedChanges('odontogram'); });
  await reverse.getByRole('button', { name: 'Save Draft' }).click(); const reverseDirty = await dirty(reverse); assert(!reverseDirty.includes('clinical-encounter') && reverseDirty.includes('odontogram'), `Encounter save cleared odontogram dirty source: ${reverseDirty}`); await reverseContext.close();

  const keyboardContext = await browser.newContext({ viewport: viewports[0] }); const keyboard = await keyboardContext.newPage(); observe(keyboard); await login(keyboard); await openChart(keyboard, 'P001');
  const keyboardTooth = keyboard.locator('[data-tooth-code="27"]'); await keyboardTooth.focus(); await keyboard.keyboard.press('Enter'); const addButton = keyboard.getByRole('button', { name: 'Add Finding — Tooth 27' }); await addButton.focus(); await keyboard.keyboard.press('Enter'); dialog = keyboard.getByRole('dialog', { name: 'Add Finding — Tooth 27' });
  const conditionSelect = dialog.getByLabel('Condition / Finding'); await conditionSelect.focus(); await conditionSelect.selectOption('CARIES'); const mesial = dialog.getByRole('checkbox', { name: 'Mesial surface' }); await mesial.focus(); await keyboard.keyboard.press('Space'); const keyboardSave = dialog.getByRole('button', { name: 'Save Finding' }); await keyboardSave.focus(); await keyboard.keyboard.press('Enter');
  await keyboard.getByText('Dental finding recorded.').waitFor(); assert((await keyboard.locator('.dental-chart__selected').innerText()).includes('Caries'), 'Keyboard finding workflow failed.');
  await selectTooth(keyboard, '28'); const add28 = keyboard.getByRole('button', { name: 'Add Finding — Tooth 28' }); await add28.click(); dialog = keyboard.getByRole('dialog', { name: 'Add Finding — Tooth 28' }); const closeButton = dialog.getByRole('button', { name: 'Close modal' }); await closeButton.focus(); await keyboard.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' }); assert(await add28.evaluate(button => document.activeElement === button), 'Modal close did not return focus to its trigger.'); await keyboardContext.close();

  for (const viewport of viewports) {
    const responsiveContext = await browser.newContext({ viewport }); const responsive = await responsiveContext.newPage(); observe(responsive); await login(responsive); await openChart(responsive, 'P001'); dialog = await openAdd(responsive, '27'); await dialog.getByLabel('Condition / Finding').selectOption('CARIES');
    const welcomeDismiss = responsive.getByRole('button', { name: 'Dismiss notification' }); if (await welcomeDismiss.count()) { await welcomeDismiss.click(); await responsive.locator('.toast').waitFor({ state: 'detached' }); }
    assert(await noOverflow(responsive), `Global overflow at ${viewport.width}px.`); assert(await dialog.getByRole('button', { name: 'Save Finding' }).isVisible(), `Save action clipped at ${viewport.width}px.`);
    const box = await dialog.boundingBox(); assert(box && box.y >= 0 && box.y + box.height <= viewport.height, `Finding modal does not fit viewport at ${viewport.width}px: ${JSON.stringify(box)}`);
    const targets = await dialog.getByRole('checkbox').evaluateAll(items => items.map(item => item.closest('label').getBoundingClientRect().height)); assert(targets.every(height => height >= 44), `Surface touch target too small at ${viewport.width}px.`);
    await responsive.screenshot({ path: join(outputDir, `finding-form-${viewport.width}.png`), fullPage: false });
    const body = await responsive.locator('body').innerText(); assert(!/[ÃƒÆ’Ãƒâ€š]|ÃƒÂ¢(?:Ã¢â€šÂ¬|Ã¢â€žÂ¢|Ã…â€œ)|ÃƒÂ¯Ã‚Â¿Ã‚Â½|Ã¯Â¿Â½/.test(body), `Encoding artifact at ${viewport.width}px.`);
    await dialog.getByRole('button', { name: 'Cancel' }).click(); await responsiveContext.close();
  }

  const resetContext = await browser.newContext({ viewport: viewports[0] }); const reset = await resetContext.newPage(); observe(reset); await login(reset); await openChart(reset, 'P001');
  dialog = await openAdd(reset, '27'); await dialog.getByLabel('Condition / Finding').selectOption('CARIES'); await chooseSurface(dialog, 'Occlusal'); await dialog.getByRole('button', { name: 'Save Finding' }).click();
  await reset.evaluate(() => window.DentalAppDev.resetDemoData()); await reset.reload({ waitUntil: 'networkidle' }); const resetState = await state(reset);
  assert(resetState.dentalChartEntries.length === canonical.dentalChartEntries.length && !resetState.dentalChartEntries.some(entry => entry.id === runtimeFindingId) && !(await dirty(reset)).length, 'Demo reset did not remove runtime findings/dirty state.');
  const resetIntegrity = { chart: validateDentalChartRuntime(resetState), canonical: validateCanonicalDemoState(resetState) }; assert(resetIntegrity.chart.valid && resetIntegrity.canonical.valid, 'Reset canonical integrity failed.'); await resetContext.close();

  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', staticChartIntegrity, staticCanonicalIntegrity, runtimeFindingId, viewports, testedRoles: ['Clinic Administrator', 'Dr. Daniel', 'Dr. Sarah', 'Receptionist', 'Cashier'], findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, staticChartIntegrity, staticCanonicalIntegrity, findings }, null, 2)); console.error(error.stack || error.message); process.exitCode = 1;
} finally { await browser.close(); await new Promise(done => server.close(done)); }
