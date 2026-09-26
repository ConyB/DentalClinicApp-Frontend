import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';

const root = resolve('.');
const port = 4189;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase11b2c');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const accounts = {
  admin: 'grace.admin@pearlsmiledental.test',
  daniel: 'daniel.mugisha@pearlsmiledental.test',
  sarah: 'sarah.nakanwagi@pearlsmiledental.test',
  receptionist: 'lydia.reception@pearlsmiledental.test',
  cashier: 'brian.cashier@pearlsmiledental.test'
};

const assert = (value, message) => { if (!value) throw new Error(message); };
const unique = (records, key = 'id') => new Set(records.map(record => record[key])).size === records.length;
const downstreamCounts = state => Object.fromEntries(['dentalChartEntries', 'treatmentPlans', 'proceduresPerformed', 'prescriptions', 'invoices', 'payments', 'receipts'].map(key => [key, state[key].length]));
const clinicalAuditCounts = (state, encounterId) => Object.fromEntries(['ENCOUNTER_STARTED', 'ENCOUNTER_UPDATED', 'ENCOUNTER_COMPLETED'].map(code => [code, state.auditLogs.filter(item => item.actionCode === code && item.entityId === encounterId).length]));

const canonical = createCanonicalDemoState();
const canonicalValidation = validateCanonicalDemoState(canonical);
assert(canonicalValidation.valid, `Canonical validation failed: ${canonicalValidation.errors.join(' | ')}`);
assert(unique(canonical.clinicalEncounters) && unique(canonical.clinicalEncounters, 'encounterNumber'), 'Canonical Encounter identity is not unique.');
assert(unique(canonical.clinicalEncounters.filter(item => item.appointmentId), 'appointmentId'), 'Canonical appointment has multiple Encounters.');
assert(unique(canonical.patientAllergies) && unique(canonical.patientConditions) && unique(canonical.patientMedications), 'Canonical Medical History identity is not unique.');
const patientIds = new Set(canonical.patients.map(patient => patient.id));
for (const record of [...canonical.patientAllergies, ...canonical.patientConditions, ...canonical.patientMedications]) assert(patientIds.has(record.patientId), `Orphan Medical History record ${record.id}.`);
assert(canonical.patientAllergies.some(item => item.patientId === 'P001' && item.allergen === 'Penicillin'), 'Amina Penicillin baseline is missing.');
assert(canonical.patientConditions.some(item => item.patientId === 'P002' && item.conditionName === 'Hypertension') && canonical.patientMedications.some(item => item.patientId === 'P002' && item.medicationName === 'Amlodipine'), 'Peter Medical History baseline is missing.');
assert(canonical.patientConditions.some(item => item.patientId === 'P004' && item.conditionName === 'Diabetes') && canonical.patientMedications.some(item => item.patientId === 'P004' && item.medicationName === 'Metformin'), 'Samuel Medical History baseline is missing.');
assert(canonical.patientConditions.some(item => item.patientId === 'P010' && item.conditionName === 'Hypertension') && canonical.patientMedications.some(item => item.patientId === 'P010' && item.medicationName === 'Losartan'), 'Joseph Medical History baseline is missing.');
assert(canonical.clinicalEncounters.find(item => item.id === 'ENC-000201')?.status === 'COMPLETED' && canonical.clinicalEncounters.find(item => item.id === 'ENC-000202')?.status === 'COMPLETED' && canonical.clinicalEncounters.find(item => item.id === 'ENC-000203')?.status === 'DRAFT' && canonical.clinicalEncounters.find(item => item.id === 'ENC-000204')?.status === 'COMPLETED', 'Canonical Encounter statuses are incorrect.');

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

const getState = page => page.evaluate(() => window.DentalAppDev.getState());
const getDirtySources = page => page.evaluate(() => window.DentalAppDev.getDirtySources());
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const openClinical = async (page, patientId) => page.goto(`${baseUrl}/app.html#/patients/${patientId}/clinical`, { waitUntil: 'networkidle' });
const addMedical = async (page, addLabel, value, saveLabel) => {
  await page.getByRole('button', { name: addLabel, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input').fill(value);
  await dialog.getByRole('button', { name: saveLabel }).click();
};
const editMedical = async (page, editLabel, value, saveLabel) => {
  await page.getByRole('button', { name: editLabel, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input').fill(value);
  await dialog.getByRole('button', { name: saveLabel }).click();
};

await mkdir(outputDir, { recursive: true });
await new Promise(resolveListen => server.listen(port, '127.0.0.1', resolveListen));
const browser = await chromium.launch({ headless: true });

try {
  // Amina: one coherent start, medical-history, Draft, validation, completion, and reset flow.
  const flowContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await flowContext.newPage();
  observe(page);
  await login(page);
  await openClinical(page, 'P001');
  let text = await page.locator('.clinical-workspace').innerText();
  assert(text.includes('Penicillin') && text.includes('APT-000103') && text.includes('In Treatment') && text.includes('ENC-000201') && text.includes('Completed'), 'Amina safety, current visit, or historical Encounter context is incomplete.');
  assert(await page.getByRole('button', { name: 'Start Clinical Encounter' }).count() === 1 && await page.getByRole('button', { name: 'Resume Encounter' }).count() === 0, 'Amina Start/Resume action resolution is ambiguous.');
  assert(text.includes('No recorded medical conditions.') && text.includes('No recorded medications.') && !text.includes('No allergies.'), 'Neutral Medical History empty-state wording regressed.');

  const baseline = await getState(page);
  const baselineDownstream = downstreamCounts(baseline);
  await page.getByRole('button', { name: 'Start Clinical Encounter' }).click();
  let state = await getState(page);
  let encounter = state.clinicalEncounters.find(item => item.appointmentId === 'APT-000103');
  assert(encounter?.status === 'DRAFT' && encounter.patientId === 'P001' && encounter.dentistUserId === 'U002', 'Runtime Encounter did not start as Daniel-owned Amina Draft.');
  const encounterIdentity = [encounter.id, encounter.encounterNumber, encounter.patientId, encounter.appointmentId, encounter.dentistUserId, encounter.createdAt];
  const initialAudits = clinicalAuditCounts(baseline, encounter.id);
  assert((await page.locator('.clinical-workspace__history').innerText()).includes('ENC-000201'), 'Amina historical Encounter was replaced by the current Draft.');

  await page.locator('#encounter-chiefComplaint').fill('Intermittent sensitivity');
  await page.getByRole('button', { name: 'Save Draft' }).click();
  state = await getState(page);
  encounter = state.clinicalEncounters.find(item => item.id === encounterIdentity[0]);
  assert(encounter.status === 'DRAFT' && encounter.chiefComplaint === 'Intermittent sensitivity', 'Partial Draft save failed.');
  assert(JSON.stringify([encounter.id, encounter.encounterNumber, encounter.patientId, encounter.appointmentId, encounter.dentistUserId, encounter.createdAt]) === JSON.stringify(encounterIdentity), 'Draft save changed Encounter identity.');
  assert(!(await getDirtySources(page)).length, 'Draft save did not establish a clean baseline.');
  await page.reload({ waitUntil: 'networkidle' });
  assert(await page.getByRole('button', { name: 'Resume Encounter' }).count() === 1 && await page.locator('#encounter-chiefComplaint').inputValue() === 'Intermittent sensitivity', 'Draft refresh/resume did not preserve the same Encounter and value.');
  state = await getState(page);
  assert(state.clinicalEncounters.filter(item => item.appointmentId === 'APT-000103').length === 1, 'Refresh/resume created a duplicate Encounter.');

  await addMedical(page, 'Add Allergy', 'Latex', 'Save Allergy');
  state = await getState(page);
  const allergyId = state.patientAllergies.find(item => item.patientId === 'P001' && item.allergen === 'Latex')?.id;
  assert(allergyId && unique(state.patientAllergies), 'Normalized Allergy Add failed or produced a duplicate ID.');
  await editMedical(page, 'Edit Latex', 'Latex gloves', 'Save Allergy');
  await addMedical(page, 'Add Medical Condition', 'Asthma <em>stable</em>', 'Save Medical Condition');
  state = await getState(page);
  const conditionId = state.patientConditions.find(item => item.patientId === 'P001' && item.conditionName === 'Asthma <em>stable</em>')?.id;
  assert(conditionId && !await page.locator('.clinical-workspace em').count() && !await page.evaluate(() => window.__phase11bXss), 'Medical free text rendered as raw HTML.');
  await editMedical(page, 'Edit Asthma <em>stable</em>', 'Controlled asthma', 'Save Medical Condition');
  await addMedical(page, 'Add Current Medication', 'Salbutamol', 'Save Medication');
  state = await getState(page);
  const medicationId = state.patientMedications.find(item => item.patientId === 'P001' && item.medicationName === 'Salbutamol')?.id;
  await editMedical(page, 'Edit Salbutamol', 'Salbutamol inhaler', 'Save Medication');
  state = await getState(page);
  assert(state.patientAllergies.find(item => item.id === allergyId)?.allergen === 'Latex gloves' && state.patientConditions.find(item => item.id === conditionId)?.conditionName === 'Controlled asthma' && state.patientMedications.find(item => item.id === medicationId)?.medicationName === 'Salbutamol inhaler', 'Medical History Edit did not preserve entity identity.');
  assert(state.clinicalEncounters.find(item => item.id === encounterIdentity[0])?.chiefComplaint === 'Intermittent sensitivity', 'Medical History mutation changed Encounter data.');
  text = await page.locator('.clinical-workspace').innerText();
  assert(text.includes('Latex gloves') && text.includes('Controlled asthma') && text.includes('Salbutamol inhaler') && text.includes('Penicillin'), 'Safety Summary did not reflect normalized Medical History.');

  // Save Encounter while Medical History is independently dirty.
  await page.locator('#encounter-examinationNotes').fill('Tenderness on examination.');
  await page.getByRole('button', { name: 'Edit Latex gloves' }).click();
  await page.getByRole('dialog', { name: 'Edit Allergy' }).locator('input').fill('Latex products');
  let dirty = await getDirtySources(page);
  assert(dirty.includes('clinical-encounter') && dirty.includes('medical-history'), 'Both dirty sources did not coexist.');
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Save Draft')?.click());
  dirty = await getDirtySources(page);
  assert(!dirty.includes('clinical-encounter') && dirty.includes('medical-history'), 'Encounter save cleared the Medical History dirty source.');
  assert(await page.getByRole('dialog', { name: 'Edit Allergy' }).count() === 1, 'Encounter save unexpectedly dismissed the Medical History editor.');
  await page.getByRole('dialog', { name: 'Edit Allergy' }).getByRole('button', { name: 'Save Allergy' }).click();
  assert(!(await getDirtySources(page)).length, 'Saving both contexts did not clear the aggregate dirty state.');

  // Save Medical History while Encounter remains dirty.
  await page.locator('#encounter-clinicalNotes').fill('Unsaved clinical assessment.');
  await page.getByRole('button', { name: 'Edit Latex products' }).click();
  await page.getByRole('dialog', { name: 'Edit Allergy' }).locator('input').fill('Latex materials');
  await page.getByRole('dialog', { name: 'Edit Allergy' }).getByRole('button', { name: 'Save Allergy' }).click();
  dirty = await getDirtySources(page);
  assert(dirty.includes('clinical-encounter') && !dirty.includes('medical-history'), 'Medical History save cleared the Encounter dirty source.');
  assert(await page.locator('#encounter-clinicalNotes').inputValue() === 'Unsaved clinical assessment.', 'Medical History save lost unsaved Encounter input.');
  await page.getByRole('button', { name: 'Save Draft' }).click();
  assert(!(await getDirtySources(page)).length, 'Final Draft save left a false dirty source.');

  // Backdrop Stay/Discard and focus restoration regression.
  const editMedication = page.getByRole('button', { name: 'Edit Salbutamol inhaler' });
  await editMedication.focus();
  await editMedication.click();
  await page.getByRole('dialog', { name: 'Edit Medication' }).locator('input').fill('Discarded medication edit');
  await page.locator('.overlay').first().click({ position: { x: 2, y: 2 } });
  await page.getByRole('dialog', { name: 'Discard Medical History changes?' }).getByRole('button', { name: 'Cancel' }).click();
  assert(await page.getByRole('dialog', { name: 'Edit Medication' }).count() === 1, 'Backdrop Stay did not preserve the Medical History modal.');
  await page.locator('.overlay').first().click({ position: { x: 2, y: 2 } });
  await page.getByRole('dialog', { name: 'Discard Medical History changes?' }).getByRole('button', { name: 'Discard Changes' }).click();
  assert(!(await getDirtySources(page)).length && (await page.evaluate(() => document.activeElement?.textContent || '')).includes('Edit Salbutamol inhaler'), 'Backdrop discard or focus restoration regressed.');

  // Completion validation and long/safe clinical text.
  for (const id of ['encounter-chiefComplaint', 'encounter-examinationNotes', 'encounter-clinicalNotes']) await page.locator(`#${id}`).fill('   ');
  await page.getByRole('button', { name: 'Complete Encounter' }).click();
  assert(await page.locator('[aria-invalid="true"]').count() === 3 && await page.locator('.clinical-workspace__validation-summary').isVisible(), 'Consolidated completion validation failed.');
  state = await getState(page);
  encounter = state.clinicalEncounters.find(item => item.id === encounterIdentity[0]);
  assert(encounter.status === 'DRAFT' && !encounter.completedAt && clinicalAuditCounts(state, encounter.id).ENCOUNTER_COMPLETED === 0, 'Failed completion was not atomic.');
  const longText = '<img src=x onerror="window.__phase11bXss=1"> Patient reports several weeks of intermittent sensitivity, especially with cold drinks. Symptoms settle quickly and there is no spontaneous night pain. The record is intentionally long to verify wrapping and safe text rendering.';
  await page.locator('#encounter-chiefComplaint').fill(longText);
  await page.locator('#encounter-examinationNotes').fill('Localized tenderness without swelling. Soft tissues appear healthy and the clinical examination remains stable.');
  await page.locator('#encounter-clinicalNotes').fill('Assessment discussed with the patient. Conservative care and review instructions were explained clearly.');
  assert(!await page.locator('.clinical-workspace__validation-summary').isVisible(), 'Corrected validation summary remained visible.');
  await page.getByRole('button', { name: 'Complete Encounter' }).evaluate(button => { button.click(); button.click(); });
  const completionDialog = page.getByRole('dialog', { name: 'Complete this clinical encounter?' });
  assert(await completionDialog.count() === 1, 'Completion dialog lock failed.');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement));
  assert(await completionDialog.evaluate(dialog => dialog.contains(document.activeElement)), 'Completion dialog focus failed.');
  await completionDialog.getByRole('button', { name: 'Complete Encounter' }).click();
  state = await getState(page);
  encounter = state.clinicalEncounters.find(item => item.id === encounterIdentity[0]);
  assert(encounter.status === 'COMPLETED' && encounter.completedByUserId === 'U002' && Date.parse(encounter.completedAt) >= Date.parse(encounter.createdAt), 'Successful completion metadata is invalid.');
  assert(JSON.stringify([encounter.id, encounter.encounterNumber, encounter.patientId, encounter.appointmentId, encounter.dentistUserId, encounter.createdAt]) === JSON.stringify(encounterIdentity), 'Completion changed Encounter identity or relationships.');
  assert(await page.locator('.clinical-workspace__form textarea[readonly]').count() === 5 && await page.getByRole('button', { name: /Save Draft|Complete Encounter|Reopen|Unlock|Edit Completed/i }).count() === 0, 'Completed Encounter is not strictly read-only.');
  assert(!await page.locator('.clinical-workspace img[src="x"]').count() && !await page.evaluate(() => window.__phase11bXss), 'Clinical free text executed or rendered raw HTML.');
  assert(await noOverflow(page), 'Long clinical text caused desktop overflow.');
  const completedAt = encounter.completedAt;
  await page.reload({ waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  state = await getState(page);
  assert(state.clinicalEncounters.find(item => item.id === encounter.id)?.completedAt === completedAt, 'Completion timestamp changed across repeated reloads.');
  assert(state.auditLogs.filter(item => item.actionCode === 'ENCOUNTER_COMPLETED' && item.entityId === encounter.id).length === 1, 'Completion audit event duplicated.');
  const finalAudits = clinicalAuditCounts(state, encounter.id);
  assert(finalAudits.ENCOUNTER_STARTED - initialAudits.ENCOUNTER_STARTED === 1 && finalAudits.ENCOUNTER_COMPLETED === 1 && finalAudits.ENCOUNTER_UPDATED >= 1, 'Encounter audit lifecycle is incomplete.');
  assert(state.auditLogs.filter(item => item.entityId === encounter.id).every(item => item.actorUserId === 'U002' && item.occurredAt === '2026-09-21T10:00:00+03:00'), 'Encounter audit actor or centralized timestamp is incorrect.');
  assert(JSON.stringify(downstreamCounts(state)) === JSON.stringify(baselineDownstream), 'Clinical workflow mutated a downstream module.');
  assert(state.appointments.find(item => item.id === 'APT-000103').status === 'IN_TREATMENT' && state.queueEntries.find(item => item.appointmentId === 'APT-000103').status === 'IN_TREATMENT', 'Clinical workflow changed the operational visit boundary.');
  const runtimeValidation = await page.evaluate(async () => { const { validateRuntimeState } = await import('./assets/js/data/integrity.js'); return validateRuntimeState(window.DentalAppDev.getState()); });
  assert(runtimeValidation.valid, `Runtime integrity failed: ${runtimeValidation.errors.join(' | ')}`);
  assert(unique(state.clinicalEncounters) && unique(state.clinicalEncounters, 'encounterNumber') && unique(state.clinicalEncounters.filter(item => item.appointmentId), 'appointmentId'), 'Runtime Encounter uniqueness failed.');
  assert(unique(state.patientAllergies) && unique(state.patientConditions) && unique(state.patientMedications), 'Runtime Medical History uniqueness failed.');
  await page.screenshot({ path: join(outputDir, 'amina-completed-desktop.png'), fullPage: true });

  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  state = await getState(page);
  assert(!(await getDirtySources(page)).length && state.clinicalEncounters.length === 4 && state.clinicalEncounters.find(item => item.id === 'ENC-000203')?.status === 'DRAFT', 'Reset did not restore canonical Encounter/dirty state.');
  const resetValidation = await page.evaluate(async () => { const { validateCanonicalDemoState } = await import('./assets/js/data/integrity.js'); return validateCanonicalDemoState(window.DentalAppDev.getState()); });
  assert(resetValidation.valid, `Post-reset canonical validation failed: ${resetValidation.errors.join(' | ')}`);
  assert(state.patientAllergies.length === canonical.patientAllergies.length && state.patientAllergies.some(item => item.patientId === 'P001' && item.allergen === 'Penicillin') && !state.patientAllergies.some(item => /Latex/.test(item.allergen)), 'Reset did not restore Amina Medical History.');
  assert(state.patientConditions.some(item => item.patientId === 'P002' && item.conditionName === 'Hypertension') && state.patientMedications.some(item => item.patientId === 'P002' && item.medicationName === 'Amlodipine') && state.patientConditions.some(item => item.patientId === 'P004' && item.conditionName === 'Diabetes') && state.patientMedications.some(item => item.patientId === 'P004' && item.medicationName === 'Metformin') && state.patientConditions.some(item => item.patientId === 'P010' && item.conditionName === 'Hypertension') && state.patientMedications.some(item => item.patientId === 'P010' && item.medicationName === 'Losartan'), 'Reset did not restore canonical safety baselines.');

  // Cross-patient navigation must replace every prior patient's context without stale PHI.
  const patientCases = [
    ['P001', ['Amina Nakato', 'Penicillin', 'APT-000103', 'ENC-000201'], ['Peter Okello', 'Amlodipine', 'Metformin', 'Losartan']],
    ['P002', ['Peter Okello', 'Hypertension', 'Amlodipine', 'ENC-000204'], ['Amina Nakato', 'Penicillin', 'Metformin', 'Losartan']],
    ['P004', ['Samuel Kato', 'Diabetes', 'Metformin'], ['Amina Nakato', 'Penicillin', 'Amlodipine', 'Losartan']],
    ['P010', ['Joseph Walusimbi', 'Hypertension', 'Losartan'], ['Amina Nakato', 'Penicillin', 'Amlodipine', 'Metformin']],
    ['P001', ['Amina Nakato', 'Penicillin', 'APT-000103', 'ENC-000201'], ['Peter Okello', 'Amlodipine', 'Metformin', 'Losartan']]
  ];
  for (const [patientId, expected, forbidden] of patientCases) {
    await openClinical(page, patientId);
    const body = await page.locator('.clinical-workspace').innerText();
    expected.forEach(value => assert(body.includes(value), `${patientId} is missing ${value}.`));
    forbidden.forEach(value => assert(!body.includes(value), `${patientId} retained stale ${value}.`));
  }
  await openClinical(page, 'P999');
  text = await page.locator('body').innerText();
  assert(text.includes('Patient not found') && !['Penicillin', 'Amlodipine', 'Metformin', 'Losartan', 'ENC-000201'].some(value => text.includes(value)), 'Invalid Patient route retained stale clinical data.');
  await flowContext.close();

  // Strict privacy and role behavior.
  const restrictedTerms = ['Penicillin', 'Hypertension', 'Amlodipine', 'Diabetes', 'Metformin', 'Losartan', 'Chief Complaint', 'Clinical Notes'];
  for (const [label, email] of [['Receptionist', accounts.receptionist], ['Cashier', accounts.cashier]]) {
    const context = await browser.newContext();
    const rolePage = await context.newPage();
    observe(rolePage);
    await login(rolePage, email);
    await openClinical(rolePage, 'P001');
    const body = await rolePage.locator('body').innerText();
    assert(body.includes('Access Denied') && restrictedTerms.every(value => !body.includes(value)), `${label} rendered restricted Clinical PHI.`);
    await context.close();
  }
  for (const [label, email] of [['Administrator', accounts.admin], ['Dr. Sarah', accounts.sarah]]) {
    const context = await browser.newContext();
    const rolePage = await context.newPage();
    observe(rolePage);
    await login(rolePage, email);
    await openClinical(rolePage, 'P001');
    const body = await rolePage.locator('body').innerText();
    assert(body.includes('Amina Nakato') && body.includes('Penicillin'), `${label} permitted read-only context is missing.`);
    assert(await rolePage.getByRole('button', { name: /Start Clinical Encounter|Save Draft|Complete Encounter/i }).count() === 0, `${label} received unauthorized Encounter mutation actions.`);
    const medicalActions = await rolePage.getByRole('button', { name: /Add Allergy|Add Medical Condition|Add Current Medication/i }).count();
    assert(label === 'Administrator' ? medicalActions === 0 : medicalActions === 3, `${label} Medical History permissions do not match the role matrix.`);
    await context.close();
  }

  // Brenda Draft recognition after the documented Phase 10 transition.
  const brendaContext = await browser.newContext();
  const brendaPage = await brendaContext.newPage();
  observe(brendaPage);
  await login(brendaPage, accounts.sarah);
  await brendaPage.goto(`${baseUrl}/app.html#/waiting-room`, { waitUntil: 'networkidle' });
  const brendaRow = brendaPage.locator('.waiting-room__queue-row', { hasText: 'Brenda Namusoke' });
  await brendaRow.getByRole('button', { name: 'Start Treatment' }).click();
  await brendaPage.getByRole('dialog', { name: 'Start treatment for Brenda Namusoke?' }).getByRole('button', { name: 'Start Treatment', exact: true }).click();
  await openClinical(brendaPage, 'P009');
  state = await getState(brendaPage);
  assert(state.clinicalEncounters.length === 4 && state.clinicalEncounters.filter(item => item.appointmentId === 'APT-000102').length === 1 && await brendaPage.getByRole('button', { name: 'Resume Encounter' }).count() === 1, 'Brenda canonical Draft was not resumed uniquely.');
  await brendaPage.evaluate(() => window.DentalAppDev.resetDemoData());
  await brendaContext.close();

  // Shell, stress, and responsive checks.
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const responsivePage = await context.newPage();
    observe(responsivePage);
    await login(responsivePage);
    await responsivePage.evaluate(() => {
      const state = window.DentalAppDev.getState();
      const patient = state.patients.find(item => item.id === 'P001');
      patient.fullName = 'Amina Nakato With An Exceptionally Long Runtime Clinical Display Name For Layout Verification';
      localStorage.setItem('pearl-smile-dental.demo-state', JSON.stringify(state));
    });
    await openClinical(responsivePage, 'P001');
    if (await responsivePage.getByRole('button', { name: 'Start Clinical Encounter' }).count()) await responsivePage.getByRole('button', { name: 'Start Clinical Encounter' }).click();
    assert(await noOverflow(responsivePage), `Clinical workspace overflow at ${viewport.width}px.`);
    const shell = await responsivePage.evaluate(() => ({
      bodyScroll: document.body.scrollHeight > innerHeight + 1,
      workspaceScrollable: document.querySelector('.shell-workspace').scrollHeight > document.querySelector('.shell-workspace').clientHeight,
      workspaceOverflow: getComputedStyle(document.querySelector('.shell-workspace')).overflowY,
      sidebarTop: document.querySelector('.shell-sidebar').getBoundingClientRect().top,
      sidebarHeight: document.querySelector('.shell-sidebar').getBoundingClientRect().height
    }));
    if (viewport.width >= 1024) {
      assert(!shell.bodyScroll && shell.workspaceScrollable && shell.workspaceOverflow === 'auto', `Independent workspace scrolling failed at ${viewport.width}px.`);
      assert(Math.abs(shell.sidebarTop) < 1 && Math.abs(shell.sidebarHeight - viewport.height) < 2, `Static sidebar failed at ${viewport.width}px.`);
      await responsivePage.getByRole('button', { name: 'Toggle navigation' }).click();
      assert(await responsivePage.locator('.app-shell--collapsed').count() === 1 && await noOverflow(responsivePage), `Collapsed sidebar failed at ${viewport.width}px.`);
    } else assert(shell.bodyScroll && shell.workspaceOverflow === 'visible', 'Mobile shell did not use the approved document-scrolling layout.');
    await responsivePage.getByRole('button', { name: 'Complete Encounter' }).click();
    assert(await responsivePage.locator('[aria-invalid="true"]').count() === 3 && await noOverflow(responsivePage), `Responsive inline validation failed at ${viewport.width}px.`);
    await responsivePage.locator('#encounter-chiefComplaint').fill('Responsive complaint');
    await responsivePage.locator('#encounter-examinationNotes').fill('Responsive examination');
    await responsivePage.locator('#encounter-clinicalNotes').fill('Responsive clinical note');
    await responsivePage.getByRole('button', { name: 'Complete Encounter' }).click();
    const dialog = responsivePage.getByRole('dialog', { name: 'Complete this clinical encounter?' });
    const bounds = await dialog.boundingBox();
    assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height, `Completion dialog does not fit at ${viewport.width}px.`);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await responsivePage.getByRole('button', { name: 'Add Allergy' }).click();
    const medicalDialog = responsivePage.getByRole('dialog', { name: 'Add Allergy' });
    const medicalBounds = await medicalDialog.boundingBox();
    assert(medicalBounds && medicalBounds.x >= 0 && medicalBounds.y >= 0 && medicalBounds.x + medicalBounds.width <= viewport.width && medicalBounds.y + medicalBounds.height <= viewport.height, `Medical History modal does not fit at ${viewport.width}px.`);
    await responsivePage.keyboard.press('Escape');
    assert(await medicalDialog.count() === 0, `Clean Medical History modal did not close with Escape at ${viewport.width}px.`);
    const body = await responsivePage.locator('body').innerText();
    assert(!/[ÃÂ]|â(?:€|™|œ)|ï¿½|�/.test(body), `Visible encoding artifact found at ${viewport.width}px.`);
    if (viewport.width === 390) await responsivePage.screenshot({ path: join(outputDir, 'clinical-mobile.png'), fullPage: true });
    await responsivePage.evaluate(() => window.DentalAppDev.resetDemoData());
    await context.close();
  }

  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', canonicalValidation, findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, canonicalValidation, findings }, null, 2));
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
