import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';

const root = resolve('.');
const port = 4190;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase11c');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const checks = {};
const accounts = {
  admin: 'grace.admin@pearlsmiledental.test',
  daniel: 'daniel.mugisha@pearlsmiledental.test',
  sarah: 'sarah.nakanwagi@pearlsmiledental.test',
  receptionist: 'lydia.reception@pearlsmiledental.test',
  cashier: 'brian.cashier@pearlsmiledental.test'
};

const assert = (value, message) => { if (!value) throw new Error(message); };
const pass = name => { checks[name] = 'pass'; };
const unique = (records, key = 'id') => new Set(records.map(record => record[key])).size === records.length;
const downstreamCounts = state => Object.fromEntries(['dentalChartEntries', 'treatmentPlans', 'proceduresPerformed', 'prescriptions', 'invoices', 'payments', 'receipts'].map(key => [key, state[key].length]));
const sensitiveTerms = ['Penicillin', 'Hypertension', 'Amlodipine', 'Diabetes', 'Metformin', 'Losartan', 'Chief Complaint', 'Clinical Notes', 'ENC-000201'];

const canonical = createCanonicalDemoState();
const canonicalValidation = validateCanonicalDemoState(canonical);
assert(canonicalValidation.valid, `Canonical validation failed: ${canonicalValidation.errors.join(' | ')}`);
const patients = new Set(canonical.patients.map(item => item.id));
const users = new Set(canonical.users.map(item => item.id));
const appointments = new Map(canonical.appointments.map(item => [item.id, item]));
assert(unique(canonical.clinicalEncounters) && unique(canonical.clinicalEncounters, 'encounterNumber'), 'Canonical Encounter IDs or numbers are not unique.');
assert(unique(canonical.clinicalEncounters.filter(item => item.appointmentId), 'appointmentId'), 'An appointment has multiple canonical Encounters.');
for (const encounter of canonical.clinicalEncounters) {
  assert(patients.has(encounter.patientId) && users.has(encounter.dentistUserId), `Encounter ${encounter.id} has an orphan Patient or Dentist.`);
  assert(encounter.organizationId === canonical.organization.id && canonical.branches.some(item => item.id === encounter.branchId), `Encounter ${encounter.id} has an invalid organization or branch.`);
  assert(['DRAFT', 'IN_PROGRESS', 'COMPLETED'].includes(encounter.status), `Encounter ${encounter.id} has an invalid status.`);
  if (encounter.appointmentId) {
    const appointment = appointments.get(encounter.appointmentId);
    assert(appointment && appointment.patientId === encounter.patientId && appointment.dentistUserId === encounter.dentistUserId, `Encounter ${encounter.id} does not match its appointment.`);
  }
  assert(encounter.status === 'COMPLETED' ? Boolean(encounter.completedAt) : !encounter.completedAt, `Encounter ${encounter.id} completion metadata is invalid.`);
}
const medical = [...canonical.patientAllergies, ...canonical.patientConditions, ...canonical.patientMedications];
assert(unique(canonical.patientAllergies) && unique(canonical.patientConditions) && unique(canonical.patientMedications), 'Canonical Medical History IDs are not unique.');
assert(medical.every(item => patients.has(item.patientId)), 'Canonical Medical History contains an orphan Patient reference.');
assert(canonical.clinicalEncounters.find(item => item.id === 'ENC-000201')?.appointmentId === 'APT-000094', 'Amina historical Encounter baseline is invalid.');
assert(!canonical.clinicalEncounters.some(item => item.appointmentId === 'APT-000103'), 'Amina current appointment should not have a canonical Encounter.');
assert(canonical.clinicalEncounters.find(item => item.id === 'ENC-000203')?.appointmentId === 'APT-000102', 'Brenda Draft baseline is invalid.');
assert(canonical.clinicalEncounters.find(item => item.id === 'ENC-000202')?.status === 'COMPLETED' && canonical.clinicalEncounters.find(item => item.id === 'ENC-000204')?.status === 'COMPLETED', 'Joan or Peter historical Encounter baseline is invalid.');
assert(canonical.patientAllergies.some(item => item.patientId === 'P001' && item.allergen === 'Penicillin'), 'Amina safety baseline is missing.');
assert(canonical.patientConditions.some(item => item.patientId === 'P002' && item.conditionName === 'Hypertension') && canonical.patientMedications.some(item => item.patientId === 'P002' && item.medicationName === 'Amlodipine'), 'Peter safety baseline is missing.');
assert(canonical.patientConditions.some(item => item.patientId === 'P004' && item.conditionName === 'Diabetes') && canonical.patientMedications.some(item => item.patientId === 'P004' && item.medicationName === 'Metformin'), 'Samuel safety baseline is missing.');
assert(canonical.patientConditions.some(item => item.patientId === 'P010' && item.conditionName === 'Hypertension') && canonical.patientMedications.some(item => item.patientId === 'P010' && item.medicationName === 'Losartan'), 'Joseph safety baseline is missing.');
pass('canonicalClinicalData');

const postedPayments = canonical.payments.filter(item => item.status === 'POSTED');
assert(postedPayments.reduce((sum, item) => sum + item.amount, 0) === 2360000, 'Canonical payment total regressed.');
assert(canonical.invoices.reduce((sum, item) => sum + item.balance, 0) === 420000, 'Canonical outstanding balance regressed.');
assert(postedPayments.filter(item => item.receivedAt.startsWith(canonical.referenceDate)).reduce((sum, item) => sum + item.amount, 0) === 360000, 'Canonical today collections regressed.');
assert(postedPayments.filter(item => item.receivedAt.startsWith(canonical.referenceDate)).length === 2, 'Canonical payments-today count regressed.');
assert(canonical.queueEntries.filter(item => ['WAITING', 'IN_TREATMENT'].includes(item.status)).length === 2 && canonical.queueEntries.some(item => item.patientId === 'P009' && item.status === 'WAITING') && canonical.queueEntries.some(item => item.patientId === 'P001' && item.status === 'IN_TREATMENT'), 'Canonical queue baseline regressed.');
pass('canonicalQueueAndFinance');

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
const loginForm = async (page, email) => {
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
};
const login = async (page, email = accounts.daniel) => {
  await page.goto(`${baseUrl}/app.html`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`);
  await loginForm(page, email);
};
const openClinical = (page, patientId) => page.goto(`${baseUrl}/app.html#/patients/${patientId}/clinical`, { waitUntil: 'networkidle' });
const getState = page => page.evaluate(() => window.DentalAppDev.getState());
const getDirty = page => page.evaluate(() => window.DentalAppDev.getDirtySources());
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const startDirtyAmina = async page => {
  await openClinical(page, 'P001');
  await page.getByRole('button', { name: 'Start Clinical Encounter' }).click();
  await page.locator('#encounter-chiefComplaint').fill('Unsaved navigation audit value');
  assert((await getDirty(page)).includes('clinical-encounter'), 'Clinical Encounter did not become dirty.');
};
const newObservedPage = async (viewport = { width: 1440, height: 900 }) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  observe(page);
  return { context, page };
};

await mkdir(outputDir, { recursive: true });
await new Promise(resolveListen => server.listen(port, '127.0.0.1', resolveListen));
const browser = await chromium.launch({ headless: true });

try {
  // Canonical current-versus-historical resolution and safe browser metadata.
  {
    const { context, page } = await newObservedPage();
    await login(page);
    const cases = [
      ['P001', ['Amina Nakato', 'APT-000103', 'In Treatment', 'ENC-000201', 'Penicillin'], ['Amlodipine', 'Metformin', 'Losartan']],
      ['P002', ['Peter Okello', 'ENC-000204', 'Hypertension', 'Amlodipine'], ['Penicillin', 'Metformin', 'Losartan']],
      ['P003', ['Joan Nambasa', 'ENC-000202', 'Completed'], ['Penicillin', 'Amlodipine', 'Metformin', 'Losartan']],
      ['P004', ['Samuel Kato', 'Diabetes', 'Metformin'], ['Penicillin', 'Amlodipine', 'Losartan']],
      ['P010', ['Joseph Walusimbi', 'Hypertension', 'Losartan'], ['Penicillin', 'Amlodipine', 'Metformin']]
    ];
    for (const [patientId, expected, forbidden] of cases) {
      await openClinical(page, patientId);
      const text = await page.locator('.clinical-workspace').innerText();
      expected.forEach(value => assert(text.includes(value), `${patientId} is missing ${value}.`));
      forbidden.forEach(value => assert(!text.includes(value), `${patientId} retained stale ${value}.`));
      assert(!page.url().match(/Amina|Peter|Penicillin|Hypertension|Amlodipine/i), 'Clinical URL exposed PHI.');
      assert(await page.title() === 'Clinical Encounter | Pearl Smile Dental Clinic' && !await page.title().then(value => /Amina|Peter|Joan|Samuel|Joseph/.test(value)), 'Clinical document title is not privacy-safe.');
    }
    pass('currentHistoricalAndStalePhi');
    await context.close();
  }

  // Role matrix, cross-Dentist ownership, DOM privacy, and session-cache safety.
  for (const [label, email, access, encounterActions, medicalActions] of [
    ['Administrator', accounts.admin, true, 0, 0],
    ['Dr Daniel', accounts.daniel, true, 1, 3],
    ['Dr Sarah', accounts.sarah, true, 0, 3],
    ['Receptionist', accounts.receptionist, false, 0, 0],
    ['Cashier', accounts.cashier, false, 0, 0]
  ]) {
    const { context, page } = await newObservedPage();
    await login(page, email);
    await openClinical(page, 'P001');
    const body = await page.locator('body').innerText();
    if (access) {
      assert(body.includes('Amina Nakato') && body.includes('Penicillin'), `${label} permitted Clinical context is missing.`);
      assert(await page.getByRole('button', { name: /Start Clinical Encounter|Save Draft|Complete Encounter/i }).count() === encounterActions, `${label} Encounter actions are incorrect.`);
      assert(await page.getByRole('button', { name: /Add Allergy|Add Medical Condition|Add Current Medication/i }).count() === medicalActions, `${label} Medical History actions are incorrect.`);
    } else {
      assert(body.includes('Access Denied') && sensitiveTerms.every(value => !body.includes(value)), `${label} rendered restricted Clinical PHI.`);
      assert(await page.locator('a[href*="clinical"]').count() === 0, `${label} received Clinical navigation.`);
      assert(await page.evaluate(() => typeof window.__clinicalGuardCleanup === 'undefined'), `${label} composed the Clinical workspace before authorization.`);
      if (label === 'Cashier') await page.screenshot({ path: join(outputDir, 'cashier-access-denied.png'), fullPage: true });
      await page.goto(`${baseUrl}/app.html#/patients/P001/clinical-history`, { waitUntil: 'networkidle' });
      const historyBody = await page.locator('body').innerText();
      assert(historyBody.includes('Access Denied') && sensitiveTerms.every(value => !historyBody.includes(value)), `${label} rendered restricted Clinical History PHI.`);
    }
    await context.close();
  }
  {
    const { context, page } = await newObservedPage();
    await login(page, accounts.daniel);
    await openClinical(page, 'P001');
    assert((await page.locator('body').innerText()).includes('Penicillin'), 'Clinical user did not render the sensitive baseline.');
    await page.locator('summary[aria-label="Account menu"]').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await page.waitForURL('**/index.html?signed-out');
    await loginForm(page, accounts.cashier);
    await openClinical(page, 'P001');
    const body = await page.locator('body').innerText();
    assert(body.includes('Access Denied') && sensitiveTerms.every(value => !body.includes(value)) && !(await getDirty(page)).length && await page.evaluate(() => typeof window.__clinicalGuardCleanup === 'undefined'), 'Clinical PHI, composition state, or dirty state leaked into the Cashier session.');
    pass('rolePrivacyAndSessionLeak');
    await context.close();
  }

  // Invalid Patient/Encounter contexts must fail without stale PHI.
  {
    const { context, page } = await newObservedPage();
    await login(page);
    await openClinical(page, 'P001');
    await page.goto(`${baseUrl}/app.html#/patients/P999/clinical`, { waitUntil: 'networkidle' });
    let body = await page.locator('body').innerText();
    assert(body.includes('Patient not found') && sensitiveTerms.every(value => !body.includes(value)), 'Invalid Patient route retained Clinical PHI.');
    for (const route of ['patients/P001/clinical/ENC-999999', 'patients/P001/clinical/ENC-000204']) {
      await page.goto(`${baseUrl}/app.html#/${route}`, { waitUntil: 'networkidle' });
      body = await page.locator('body').innerText();
      assert(body.includes('Page Not Found') && sensitiveTerms.every(value => !body.includes(value)), `${route} did not fail safely.`);
    }
    pass('invalidClinicalRoutes');
    await context.close();
  }

  // Dirty Encounter navigation matrix, Stay/Discard, clean navigation, and logout.
  const navCases = [
    ['Dashboard', page => page.locator('a[href="#/dashboard"]').click()],
    ['Patient Profile', page => page.getByRole('button', { name: 'Back to Patient Profile' }).click()],
    ['Waiting Room', page => page.locator('a[href="#/waiting-room"]').click()],
    ['Appointments', page => page.locator('a[href="#/appointments"]').click()],
    ['Sidebar module', page => page.locator('a[href="#/patients"]').click()],
    ['Patient switch', async page => { const search = page.getByRole('searchbox', { name: 'Search patients by name, number, or phone' }); await search.fill('Peter Okello'); await page.getByRole('option', { name: 'View Peter Okello' }).click(); }],
    ['Logout', async page => { await page.locator('summary[aria-label="Account menu"]').click(); await page.getByRole('menuitem', { name: 'Logout' }).click(); }]
  ];
  for (const [label, action] of navCases) {
    const { context, page } = await newObservedPage();
    await login(page);
    await startDirtyAmina(page);
    await action(page);
    const dialog = page.getByRole('dialog', { name: label === 'Logout' ? 'Unsaved changes' : 'Discard encounter changes?' });
    assert(await dialog.count() === 1, `${label} did not trigger the unsaved-changes guard.`);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    assert(page.url().includes('/patients/P001/clinical') && await page.locator('#encounter-chiefComplaint').inputValue() === 'Unsaved navigation audit value' && (await getDirty(page)).includes('clinical-encounter'), `${label} Stay did not preserve the dirty Encounter.`);
    await context.close();
  }
  {
    const { context, page } = await newObservedPage();
    await login(page);
    await startDirtyAmina(page);
    await page.locator('a[href="#/dashboard"]').click();
    await page.getByRole('dialog', { name: 'Discard encounter changes?' }).getByRole('button', { name: 'Discard Changes' }).click();
    await page.waitForURL('**/app.html#/dashboard');
    assert(!(await getDirty(page)).length, 'Discard navigation did not clear the Encounter source.');
    await openClinical(page, 'P001');
    assert(await page.locator('#encounter-chiefComplaint').inputValue() === '', 'Discarded Encounter value was persisted.');
    await page.locator('#encounter-chiefComplaint').fill('Saved clean navigation value');
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await page.locator('a[href="#/dashboard"]').click();
    await page.waitForURL('**/app.html#/dashboard');
    assert(await page.getByRole('dialog', { name: /Discard encounter changes|Unsaved changes/ }).count() === 0, 'Clean navigation produced a false warning.');
    await page.evaluate(() => window.DentalAppDev.resetDemoData());
    pass('dirtyNavigationMatrix');
    await context.close();
  }

  // Representative evidence plus accessibility, modal, safe rendering, and responsive checks.
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const { context, page } = await newObservedPage(viewport);
    await login(page);
    await openClinical(page, 'P001');
    await page.getByRole('button', { name: 'Start Clinical Encounter' }).click();
    assert(await noOverflow(page), `Clinical workspace overflow at ${viewport.width}px.`);
    const shell = await page.evaluate(() => ({ bodyScroll: document.body.scrollHeight > innerHeight + 1, workspaceOverflow: getComputedStyle(document.querySelector('.shell-workspace')).overflowY, sidebarTop: document.querySelector('.shell-sidebar').getBoundingClientRect().top, sidebarHeight: document.querySelector('.shell-sidebar').getBoundingClientRect().height }));
    if (viewport.width >= 1024) {
      assert(!shell.bodyScroll && shell.workspaceOverflow === 'auto' && Math.abs(shell.sidebarTop) < 1 && Math.abs(shell.sidebarHeight - viewport.height) < 2, `Desktop shell scrolling failed at ${viewport.width}px.`);
      await page.getByRole('button', { name: 'Toggle navigation' }).click();
      assert(await page.locator('.app-shell--collapsed').count() === 1 && await noOverflow(page), `Collapsed shell failed at ${viewport.width}px.`);
    } else assert(shell.bodyScroll && shell.workspaceOverflow === 'visible', 'Mobile document scrolling regressed.');
    const headings = await page.locator('.clinical-workspace h1, .clinical-workspace h2, .clinical-workspace h3').allTextContents();
    assert(['Clinical Workspace', 'Clinical Safety Summary', 'Current Visit', 'Previous Encounters', 'Clinical Encounter Documentation'].every(value => headings.includes(value)), `Heading structure is incomplete at ${viewport.width}px.`);
    const fields = page.locator('.clinical-workspace textarea');
    assert(await fields.evaluateAll(items => items.every(item => item.labels?.length)), `Encounter fields lack visible labels at ${viewport.width}px.`);
    await fields.first().focus();
    assert(await fields.first().evaluate(item => { const style = getComputedStyle(item); return style.outlineStyle !== 'none' || style.boxShadow !== 'none'; }), `Encounter field focus is not visible at ${viewport.width}px.`);
    await page.getByRole('button', { name: 'Complete Encounter' }).click();
    assert(await page.locator('[aria-invalid="true"][aria-describedby]').count() === 3 && await page.locator('.clinical-workspace__validation-summary[role="alert"]').isVisible(), `Accessible completion validation failed at ${viewport.width}px.`);
    if (viewport.width === 1440) await page.screenshot({ path: join(outputDir, 'completion-validation.png'), fullPage: true });
    await page.getByRole('button', { name: 'Add Allergy' }).click();
    const modal = page.getByRole('dialog', { name: 'Add Allergy' });
    await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement));
    assert(await modal.count() === 1 && await modal.evaluate(node => node.contains(document.activeElement)), `Medical History modal focus failed at ${viewport.width}px.`);
    if (viewport.width === 1440) await page.screenshot({ path: join(outputDir, 'medical-history-modal.png'), fullPage: true });
    await page.keyboard.press('Escape');
    assert(await modal.count() === 0, `Clean Medical History modal did not close with Escape at ${viewport.width}px.`);
    const body = await page.locator('body').innerText();
    assert(!/[ÃÂ]|â(?:€|™|œ)|ï¿½|�/.test(body), `Visible encoding artifact found at ${viewport.width}px.`);
    if (viewport.width === 1440) {
      await page.screenshot({ path: join(outputDir, 'clinical-draft-desktop.png'), fullPage: true });
      await page.locator('.clinical-workspace > .card').first().screenshot({ path: join(outputDir, 'medical-safety-summary.png') });
    }
    if (viewport.width === 390) await page.screenshot({ path: join(outputDir, 'clinical-mobile.png'), fullPage: true });
    await page.evaluate(() => window.DentalAppDev.resetDemoData());
    await context.close();
  }
  pass('responsiveAccessibilityEncoding');

  // Reset and final runtime/cross-module integrity.
  {
    const { context, page } = await newObservedPage();
    await login(page);
    await page.evaluate(() => window.DentalAppDev.resetDemoData());
    const state = await getState(page);
    const runtime = await page.evaluate(async () => { const { validateRuntimeState, validateCanonicalDemoState } = await import('./assets/js/data/integrity.js'); return { runtime: validateRuntimeState(window.DentalAppDev.getState()), canonical: validateCanonicalDemoState(window.DentalAppDev.getState()) }; });
    assert(runtime.runtime.valid && runtime.canonical.valid, `Final reset validation failed: ${[...runtime.runtime.errors, ...runtime.canonical.errors].join(' | ')}`);
    assert(JSON.stringify(downstreamCounts(state)) === JSON.stringify(downstreamCounts(canonical)), 'Final reset changed downstream record counts.');
    assert(!(await getDirty(page)).length && state.clinicalEncounters.length === canonical.clinicalEncounters.length && medical.length === [...state.patientAllergies, ...state.patientConditions, ...state.patientMedications].length, 'Final reset did not restore Clinical state.');
    pass('finalResetAndIntegrity');
    await context.close();
  }

  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', canonicalValidation, checks, baseline: { clinicalEncounters: canonical.clinicalEncounters.length, medicalHistoryRecords: medical.length, activeQueue: 2, totalPayments: 2360000, outstanding: 420000, todayCollections: 360000, paymentsToday: 2, downstreamCounts: downstreamCounts(canonical) }, findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, canonicalValidation, checks, findings }, null, 2));
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
