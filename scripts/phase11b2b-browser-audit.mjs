import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4188;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase11b2b');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const accounts = {
  admin: 'grace.admin@pearlsmiledental.test',
  daniel: 'daniel.mugisha@pearlsmiledental.test',
  sarah: 'sarah.nakanwagi@pearlsmiledental.test',
  receptionist: 'lydia.reception@pearlsmiledental.test',
  cashier: 'brian.cashier@pearlsmiledental.test'
};

const assert = (value, message) => { if (!value) throw new Error(message); };
const server = createServer(async (request, response) => {
  const path = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!path.startsWith(root)) return response.writeHead(403).end();
  try {
    const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[extname(path)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': mime });
    response.end(await readFile(path));
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
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); });
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};

const login = async (page, email = accounts.daniel) => {
  await page.goto(`${baseUrl}/app.html`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
};

const openAminaDraft = async page => {
  await page.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' });
  if (await page.getByRole('button', { name: 'Start Clinical Encounter' }).count()) {
    await page.getByRole('button', { name: 'Start Clinical Encounter' }).click();
  }
};

const getState = page => page.evaluate(() => window.DentalAppDev.getState());
const getDirtySources = page => page.evaluate(() => window.DentalAppDev.getDirtySources());
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const currentAminaEncounter = state => state.clinicalEncounters.find(item => item.appointmentId === 'APT-000103');
const downstreamCounts = state => ['dentalChartEntries', 'treatmentPlans', 'proceduresPerformed', 'prescriptions', 'invoices', 'payments', 'receipts'].map(key => state[key].length);

const cancelDirtyNavigation = async (page, action, expectedValue) => {
  await action();
  const dialog = page.getByRole('dialog', { name: 'Discard encounter changes?' });
  assert(await dialog.count() === 1, 'Dirty navigation confirmation did not open.');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  assert(page.url().includes('#/patients/P001/clinical'), 'Cancel navigation left the Clinical workspace.');
  assert(await page.locator('#encounter-chiefComplaint').inputValue() === expectedValue, 'Cancel navigation lost the unsaved Encounter value.');
  assert((await getDirtySources(page)).includes('clinical-encounter'), 'Cancel navigation cleared the Encounter dirty source.');
};

await mkdir(outputDir, { recursive: true });
await new Promise(resolveListen => server.listen(port, '127.0.0.1', resolveListen));
const browser = await chromium.launch({ headless: true });

try {
  // Draft permissiveness, accessible validation, multi-context dirty state, atomic completion, and reload stability.
  const primaryContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await primaryContext.newPage();
  observe(page);
  await login(page);
  await openAminaDraft(page);

  const initialState = await getState(page);
  const initialEncounter = currentAminaEncounter(initialState);
  assert(initialEncounter?.status === 'DRAFT', 'Amina runtime Draft was not created.');
  const immutableIdentity = [initialEncounter.id, initialEncounter.encounterNumber, initialEncounter.patientId, initialEncounter.appointmentId, initialEncounter.dentistUserId, initialEncounter.createdAt];

  await page.locator('#encounter-chiefComplaint').fill('Partial complaint');
  assert((await getDirtySources(page)).includes('clinical-encounter'), 'Encounter edit did not mark its dirty source.');
  await page.getByRole('button', { name: 'Save Draft' }).click();
  let state = await getState(page);
  let encounter = currentAminaEncounter(state);
  assert(encounter.id === initialEncounter.id && encounter.status === 'DRAFT' && encounter.chiefComplaint === 'Partial complaint' && !encounter.examinationNotes, 'Permissive Draft save failed or created a duplicate Encounter.');
  assert(!(await getDirtySources(page)).includes('clinical-encounter'), 'Successful Draft save did not clear only the Encounter dirty source.');

  await page.reload({ waitUntil: 'networkidle' });
  assert(await page.locator('#encounter-chiefComplaint').inputValue() === 'Partial complaint', 'Draft values did not persist through refresh.');
  await page.locator('#encounter-chiefComplaint').fill('   \n ');
  await page.getByRole('button', { name: 'Complete Encounter' }).click();
  const invalidFields = page.locator('[aria-invalid="true"]');
  assert(await invalidFields.count() === 3, 'All completion-required fields did not receive inline errors.');
  assert(await page.locator('.clinical-workspace__validation-summary:not([hidden])').count() === 1, 'Completion error summary is missing.');
  assert(await page.evaluate(() => document.activeElement?.id) === 'encounter-chiefComplaint', 'The first invalid completion field did not receive focus.');
  assert(await page.getByRole('dialog', { name: 'Complete this clinical encounter?' }).count() === 0, 'Confirmation opened before validation passed.');
  for (const id of ['encounter-chiefComplaint', 'encounter-examinationNotes', 'encounter-clinicalNotes']) {
    const describedBy = await page.locator(`#${id}`).getAttribute('aria-describedby');
    assert(describedBy && await page.locator(`#${describedBy}[role="alert"]`).count() === 1, `${id} is not accessibly associated with its error.`);
  }
  state = await getState(page);
  encounter = currentAminaEncounter(state);
  assert(encounter.status === 'DRAFT' && !encounter.completedAt && !state.auditLogs.some(item => item.actionCode === 'ENCOUNTER_COMPLETED' && item.entityId === encounter.id), 'Failed completion was not atomic.');
  assert((await getDirtySources(page)).includes('clinical-encounter'), 'Failed completion incorrectly cleared the Encounter dirty source.');

  await page.locator('#encounter-chiefComplaint').fill('Sensitivity');
  assert(await page.locator('#encounter-chiefComplaint').getAttribute('aria-invalid') === null, 'A corrected field retained stale validation state.');
  await page.locator('#encounter-examinationNotes').fill('Localized tenderness.');
  await page.locator('#encounter-clinicalNotes').fill('Clinical assessment documented.');
  await page.getByRole('button', { name: 'Save Draft' }).click();
  state = await getState(page);
  encounter = currentAminaEncounter(state);
  assert(encounter.status === 'DRAFT' && encounter.examinationNotes === 'Localized tenderness.', 'Fix-errors then Save Draft failed.');
  assert(!(await getDirtySources(page)).length, 'Save Draft left a false dirty state.');

  // Medical History can be dirty alongside Encounter; dismissing it must not clear the Encounter source.
  await page.locator('#encounter-followUpNotes').fill('Review in one week.');
  await page.getByRole('button', { name: 'Edit Penicillin' }).click();
  await page.getByRole('dialog', { name: 'Edit Allergy' }).locator('input').fill('Unsaved Penicillin edit');
  let dirtySources = await getDirtySources(page);
  assert(dirtySources.includes('clinical-encounter') && dirtySources.includes('medical-history'), 'Encounter and Medical History dirty sources did not coexist.');
  await page.getByRole('dialog', { name: 'Edit Allergy' }).getByRole('button', { name: 'Close modal' }).click();
  await page.getByRole('dialog', { name: 'Discard Medical History changes?' }).getByRole('button', { name: 'Cancel' }).click();
  assert(await page.getByRole('dialog', { name: 'Edit Allergy' }).count() === 1, 'Modal close Stay did not preserve Medical History input.');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Discard Medical History changes?' }).getByRole('button', { name: 'Discard Changes' }).click();
  dirtySources = await getDirtySources(page);
  assert(dirtySources.includes('clinical-encounter') && !dirtySources.includes('medical-history'), 'Medical History discard cleared the wrong dirty source.');
  await page.getByRole('button', { name: 'Save Draft' }).click();

  const beforeCompletion = await getState(page);
  const beforeCounts = downstreamCounts(beforeCompletion);
  await page.locator('#encounter-treatmentDiscussion').fill('Discussed conservative management.');
  await page.getByRole('button', { name: 'Complete Encounter' }).evaluate(button => { button.click(); button.click(); });
  const completionDialog = page.getByRole('dialog', { name: 'Complete this clinical encounter?' });
  assert(await completionDialog.count() === 1, 'Commit lock did not preserve exactly one completion confirmation.');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement));
  assert(await completionDialog.evaluate(dialog => dialog.contains(document.activeElement)), 'Completion dialog did not receive keyboard focus.');
  await completionDialog.getByRole('button', { name: 'Complete Encounter' }).click();

  state = await getState(page);
  encounter = currentAminaEncounter(state);
  assert(encounter.status === 'COMPLETED' && encounter.completedAt && encounter.completedByUserId === 'U002', 'Completion status or metadata is invalid.');
  assert(JSON.stringify([encounter.id, encounter.encounterNumber, encounter.patientId, encounter.appointmentId, encounter.dentistUserId, encounter.createdAt]) === JSON.stringify(immutableIdentity), 'Completion changed immutable Encounter identity or relationships.');
  assert(Date.parse(encounter.completedAt) >= Date.parse(encounter.createdAt), 'Completion timestamp precedes Encounter creation.');
  assert(state.auditLogs.filter(item => item.actionCode === 'ENCOUNTER_COMPLETED' && item.entityId === encounter.id).length === 1, 'Completion audit event is missing or duplicated.');
  assert(state.appointments.find(item => item.id === 'APT-000103').status === 'IN_TREATMENT' && state.queueEntries.find(item => item.appointmentId === 'APT-000103').status === 'IN_TREATMENT', 'Encounter completion incorrectly changed Phase 10 operational state.');
  assert(JSON.stringify(beforeCounts) === JSON.stringify(downstreamCounts(state)), 'Encounter completion created a downstream clinical or finance record.');
  assert(state.patientAllergies.some(item => item.patientId === 'P001' && item.allergen === 'Penicillin'), 'Encounter completion changed Amina Medical History.');
  assert(!(await getDirtySources(page)).includes('clinical-encounter'), 'Completion did not clear the Encounter dirty source.');
  assert(await page.getByRole('button', { name: 'Save Draft' }).count() === 0 && await page.getByRole('button', { name: 'Complete Encounter' }).count() === 0, 'Completed actions remain available.');
  assert(await page.locator('.clinical-workspace__form textarea[readonly]').count() === 5, 'Completed clinical fields are not all read-only.');
  assert(await page.getByText(/This encounter is read-only/).count() === 1 && await page.getByRole('button', { name: /Reopen|Unlock|Edit Completed/i }).count() === 0, 'Completed read-only state is unclear or a reopen action was introduced.');

  const completedAt = encounter.completedAt;
  await page.reload({ waitUntil: 'networkidle' });
  state = await getState(page);
  encounter = currentAminaEncounter(state);
  assert(encounter.completedAt === completedAt && encounter.status === 'COMPLETED' && await page.locator('.clinical-workspace__form textarea[readonly]').count() === 5, 'Completed reload changed timestamp, status, or read-only behavior.');
  assert((await page.locator('.clinical-workspace__history').innerText()).includes(`${encounter.encounterNumber}`) && (await page.locator('.clinical-workspace__history').innerText()).includes('Completed'), 'Clinical history did not reflect centralized completion state.');
  assert(await noOverflow(page), 'Completed desktop workspace has horizontal overflow.');
  await page.screenshot({ path: join(outputDir, 'completed-desktop.png'), fullPage: true });

  const domainGuards = await page.evaluate(async completedEncounterId => {
    const { completeClinicalEncounter } = await import('./assets/js/data/clinical-workflows.js');
    const values = { chiefComplaint: 'Valid', examinationNotes: 'Valid', clinicalNotes: 'Valid' };
    const actor = { userId: 'U002', role: 'Dentist' };
    const results = {};
    for (const [name, mutate, encounterId, testActor] of [
      ['invalidEncounter', state => state, 'ENC-999999', actor],
      ['doubleComplete', state => state, completedEncounterId, actor],
      ['wrongDentist', state => state, 'ENC-000203', actor],
      ['patientMismatch', state => { const draft = state.clinicalEncounters.find(item => item.id === 'ENC-000203'); draft.patientId = 'P001'; return state; }, 'ENC-000203', { userId: 'U003', role: 'Dentist' }]
    ]) {
      const state = mutate(window.DentalAppDev.getState());
      try { completeClinicalEncounter({ state, encounterId, values, actor: testActor }); results[name] = false; }
      catch { results[name] = true; }
    }
    return results;
  }, encounter.id);
  assert(Object.values(domainGuards).every(Boolean), 'One or more store-level completion guards failed.');
  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  assert(!(await getDirtySources(page)).length, 'Demo reset did not clear the dirty registry.');
  state = await getState(page);
  assert(state.clinicalEncounters.length === 4 && state.clinicalEncounters.find(item => item.id === 'ENC-000203')?.status === 'DRAFT' && !state.clinicalEncounters.some(item => item.appointmentId === 'APT-000103'), 'Demo reset did not restore canonical Encounter state.');
  await primaryContext.close();

  // Complete dirty-navigation matrix, including Stay, Discard, patient switch, and Logout.
  const navigationContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const navigationPage = await navigationContext.newPage();
  observe(navigationPage);
  await login(navigationPage);
  await openAminaDraft(navigationPage);
  const unsavedValue = 'Unsaved navigation value';
  await navigationPage.locator('#encounter-chiefComplaint').fill(unsavedValue);
  await cancelDirtyNavigation(navigationPage, () => navigationPage.locator('a[href="#/dashboard"]').click(), unsavedValue);
  await cancelDirtyNavigation(navigationPage, () => navigationPage.getByRole('button', { name: 'Back to Patient Profile' }).click(), unsavedValue);
  await cancelDirtyNavigation(navigationPage, () => navigationPage.locator('a[href="#/waiting-room"]').click(), unsavedValue);
  await cancelDirtyNavigation(navigationPage, () => navigationPage.locator('a[href="#/appointments"]').click(), unsavedValue);
  await cancelDirtyNavigation(navigationPage, () => navigationPage.locator('a[href="#/reports"]').click(), unsavedValue);
  await navigationPage.getByRole('searchbox', { name: /Search patient/i }).fill('Peter Okello');
  await cancelDirtyNavigation(navigationPage, () => navigationPage.getByRole('option', { name: 'View Peter Okello' }).click(), unsavedValue);
  await navigationPage.locator('summary[aria-label="Account menu"]').click();
  await navigationPage.getByRole('menuitem', { name: 'Logout' }).click();
  const logoutDialog = navigationPage.getByRole('dialog', { name: 'Unsaved changes' });
  assert(await logoutDialog.count() === 1, 'Dirty Logout confirmation did not open.');
  await logoutDialog.getByRole('button', { name: 'Cancel' }).click();
  assert(navigationPage.url().includes('#/patients/P001/clinical') && await navigationPage.locator('#encounter-chiefComplaint').inputValue() === unsavedValue, 'Cancel Logout did not preserve the Clinical workspace and unsaved value.');
  assert((await getDirtySources(navigationPage)).includes('clinical-encounter'), 'Cancel Logout cleared the Encounter dirty source.');

  await navigationPage.locator('a[href="#/appointments"]').click();
  await navigationPage.getByRole('dialog', { name: 'Discard encounter changes?' }).getByRole('button', { name: 'Discard Changes' }).click();
  await navigationPage.waitForURL('**#/appointments');
  assert(!(await getDirtySources(navigationPage)).includes('clinical-encounter'), 'Discard navigation did not clear the Encounter dirty source.');
  await navigationPage.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' });
  assert(await navigationPage.locator('#encounter-chiefComplaint').inputValue() === '', 'Discard navigation persisted an unsaved form value.');
  await navigationPage.locator('#encounter-chiefComplaint').fill('Saved clean navigation value');
  await navigationPage.getByRole('button', { name: 'Save Draft' }).click();
  await navigationPage.locator('a[href="#/dashboard"]').click();
  await navigationPage.waitForURL('**#/dashboard');
  assert(await navigationPage.getByRole('dialog', { name: 'Discard encounter changes?' }).count() === 0, 'Clean navigation produced a false dirty warning.');
  await navigationPage.locator('summary[aria-label="Account menu"]').click();
  await navigationPage.getByRole('menuitem', { name: 'Logout' }).click();
  await navigationPage.waitForURL('**/index.html?signed-out');
  assert(await navigationPage.getByRole('dialog', { name: 'Unsaved changes' }).count() === 0, 'Clean Logout produced a false dirty warning.');
  await navigationContext.close();

  // Canonical historical records, Brenda resume, and role/ownership boundaries.
  const sarahContext = await browser.newContext();
  const sarahPage = await sarahContext.newPage();
  observe(sarahPage);
  await login(sarahPage, accounts.sarah);
  await sarahPage.goto(`${baseUrl}/app.html#/waiting-room`, { waitUntil: 'networkidle' });
  const brendaRow = sarahPage.locator('.waiting-room__queue-row', { hasText: 'Brenda Namusoke' });
  await brendaRow.getByRole('button', { name: 'Start Treatment' }).click();
  await sarahPage.getByRole('dialog', { name: 'Start treatment for Brenda Namusoke?' }).getByRole('button', { name: 'Start Treatment', exact: true }).click();
  await sarahPage.goto(`${baseUrl}/app.html#/patients/P009/clinical`, { waitUntil: 'networkidle' });
  state = await getState(sarahPage);
  assert(state.clinicalEncounters.length === 4 && state.clinicalEncounters.find(item => item.id === 'ENC-000203')?.status === 'DRAFT', 'Brenda resume created a duplicate Encounter.');
  assert(await sarahPage.getByRole('button', { name: 'Resume Encounter' }).count() === 1 && await sarahPage.getByRole('button', { name: 'Complete Encounter' }).count() === 1, 'Sarah cannot resume her valid Draft Encounter.');
  await sarahPage.goto(`${baseUrl}/app.html#/patients/P002/clinical`, { waitUntil: 'networkidle' });
  assert((await sarahPage.locator('body').innerText()).includes('ENC-000204') && (await sarahPage.locator('body').innerText()).includes('Completed') && await sarahPage.locator('.clinical-workspace__form').count() === 0, 'Peter historical Encounter is not read-only.');
  await sarahPage.evaluate(() => window.DentalAppDev.resetDemoData());
  await sarahContext.close();

  const historicalContext = await browser.newContext();
  const historicalPage = await historicalContext.newPage();
  observe(historicalPage);
  await login(historicalPage, accounts.daniel);
  await historicalPage.goto(`${baseUrl}/app.html#/patients/P003/clinical`, { waitUntil: 'networkidle' });
  assert((await historicalPage.locator('body').innerText()).includes('ENC-000202') && (await historicalPage.locator('body').innerText()).includes('Completed') && await historicalPage.locator('.clinical-workspace__form').count() === 0, 'Joan historical Encounter is not read-only.');
  await historicalContext.close();

  for (const [label, email, expected] of [
    ['Admin', accounts.admin, 'read-only'],
    ['Dr. Sarah', accounts.sarah, 'read-only'],
    ['Receptionist', accounts.receptionist, 'denied'],
    ['Cashier', accounts.cashier, 'denied']
  ]) {
    const roleContext = await browser.newContext();
    const rolePage = await roleContext.newPage();
    observe(rolePage);
    await login(rolePage, email);
    await rolePage.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' });
    const body = await rolePage.locator('body').innerText();
    assert(await rolePage.getByRole('button', { name: 'Complete Encounter' }).count() === 0, `${label} received Daniel's Complete action.`);
    if (expected === 'denied') assert(body.includes('Access Denied') && !body.includes('Penicillin'), `${label} sensitive Clinical route did not deny before PHI render.`);
    else assert(body.includes('Amina Nakato'), `${label} expected read-only oversight/context is missing.`);
    await roleContext.close();
  }

  // A corrupted cross-patient Encounter must not render under the appointment's patient context.
  const mismatchContext = await browser.newContext();
  const mismatchPage = await mismatchContext.newPage();
  observe(mismatchPage);
  await login(mismatchPage);
  await openAminaDraft(mismatchPage);
  await mismatchPage.evaluate(() => {
    const state = window.DentalAppDev.getState();
    state.clinicalEncounters.find(item => item.appointmentId === 'APT-000103').patientId = 'P002';
    localStorage.setItem('pearl-smile-dental.demo-state', JSON.stringify(state));
  });
  await mismatchPage.reload({ waitUntil: 'networkidle' });
  const mismatchBody = await mismatchPage.locator('.clinical-workspace').innerText();
  assert(mismatchBody.includes('Encounter relationship unavailable') && await mismatchPage.locator('.clinical-workspace__form').count() === 0 && await mismatchPage.getByRole('button', { name: 'Start Clinical Encounter' }).count() === 0, 'Patient/Encounter mismatch was rendered or made actionable.');
  await mismatchPage.evaluate(() => window.DentalAppDev.resetDemoData());
  await mismatchContext.close();

  // Responsive validation, first-error focus, actions, confirmation fit, and encoding.
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const responsiveContext = await browser.newContext({ viewport });
    const responsivePage = await responsiveContext.newPage();
    observe(responsivePage);
    await login(responsivePage);
    await openAminaDraft(responsivePage);
    await responsivePage.getByRole('button', { name: 'Complete Encounter' }).click();
    assert(await responsivePage.locator('[aria-invalid="true"]').count() === 3, `Responsive validation failed at ${viewport.width}px.`);
    assert(await responsivePage.evaluate(() => document.activeElement?.id) === 'encounter-chiefComplaint', `Responsive first-error focus failed at ${viewport.width}px.`);
    assert(await noOverflow(responsivePage), `Validation caused horizontal overflow at ${viewport.width}px.`);
    if (viewport.width === 390) await responsivePage.screenshot({ path: join(outputDir, 'validation-mobile.png'), fullPage: true });
    await responsivePage.locator('#encounter-chiefComplaint').fill('Sensitivity');
    await responsivePage.locator('#encounter-examinationNotes').fill('Localized tenderness.');
    await responsivePage.locator('#encounter-clinicalNotes').fill('Clinical assessment documented.');
    assert(!await responsivePage.locator('.clinical-workspace__validation-summary').isVisible(), `Corrected validation summary remained visible at ${viewport.width}px.`);
    await responsivePage.getByRole('button', { name: 'Complete Encounter' }).click();
    const dialog = responsivePage.getByRole('dialog', { name: 'Complete this clinical encounter?' });
    const bounds = await dialog.boundingBox();
    assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, `Completion dialog does not fit at ${viewport.width}px.`);
    if (viewport.width === 390) await responsivePage.screenshot({ path: join(outputDir, 'confirmation-mobile.png'), fullPage: true });
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    const text = await responsivePage.locator('body').innerText();
    assert(!/[ÃÂ]|â(?:€|™|œ)|ï¿½|�/.test(text), `Visible encoding artifact found at ${viewport.width}px.`);
    await responsivePage.evaluate(() => window.DentalAppDev.resetDemoData());
    await responsiveContext.close();
  }

  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2));
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
