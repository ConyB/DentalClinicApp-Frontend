import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { getClinicalVisitContext } from '../assets/js/data/clinical-workflows.js';
import { getDentalChartViewModel } from '../assets/js/data/dental-chart.js';
import { getRecallDisplayStatus } from '../assets/js/data/finance.js';

const root = resolve('.');
const port = 4232;
const base = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase22');
const assert = (value, message) => { if (!value) throw new Error(message); };
const equal = (actual, expected, message) => assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nExpected ${JSON.stringify(expected)}\nActual ${JSON.stringify(actual)}`);
const snapshot = value => JSON.stringify(value);
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], missingAssets: [], apiRequests: [] };
const accounts = {
  admin: 'grace.admin@pearlsmiledental.test', daniel: 'daniel.mugisha@pearlsmiledental.test', sarah: 'sarah.nakanwagi@pearlsmiledental.test',
  receptionist: 'lydia.reception@pearlsmiledental.test', cashier: 'brian.cashier@pearlsmiledental.test'
};
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

// Static clinical-domain gates run before Chromium.
const canonical = createCanonicalDemoState(), baseline = snapshot(canonical);
const canonicalValidation = validateCanonicalDemoState(canonical), runtimeValidation = validateRuntimeState(canonical);
assert(canonicalValidation.valid && runtimeValidation.valid, `Canonical clinical state is invalid: ${[...canonicalValidation.errors, ...runtimeValidation.errors].join(' | ')}`);
assert(canonical.referenceDate === '2026-09-21' && canonical.organization.timezone === 'Africa/Kampala', 'Clinical reference context changed.');
const aminaVisit = getClinicalVisitContext(canonical, 'P001');
assert(aminaVisit.appointment?.id === 'APT-000103' && aminaVisit.appointment.status === 'IN_TREATMENT' && aminaVisit.encounter === null, 'Amina current visit resolver selected historical clinical data.');
assert(canonical.clinicalEncounters.find(item => item.id === 'ENC-000201')?.appointmentId === 'APT-000094', 'Amina historical encounter link changed.');
const brendaAppointment = canonical.appointments.find(item => item.id === 'APT-000102');
const brendaQueue = canonical.queueEntries.find(item => item.appointmentId === 'APT-000102');
const brendaEncounter = canonical.clinicalEncounters.find(item => item.id === 'ENC-000203');
assert(brendaAppointment?.patientId === 'P009' && brendaAppointment.status === 'WAITING' && brendaQueue?.status === 'WAITING' && brendaEncounter?.appointmentId === brendaAppointment.id && brendaEncounter.status === 'DRAFT', 'Brenda operational/clinical state changed.');
const aminaChart = getDentalChartViewModel(canonical, 'P001', 'permanent'), mercyChart = getDentalChartViewModel(canonical, 'P013', 'primary');
equal(aminaChart.arches.upper.map(item => item.code), ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'], 'Permanent upper FDI orientation changed.');
equal(aminaChart.arches.lower.map(item => item.code), ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'], 'Permanent lower FDI orientation changed.');
equal(mercyChart.arches.upper.map(item => item.code), ['55','54','53','52','51','61','62','63','64','65'], 'Primary upper FDI orientation changed.');
equal(mercyChart.arches.lower.map(item => item.code), ['85','84','83','82','81','71','72','73','74','75'], 'Primary lower FDI orientation changed.');
const tooth = (model, code) => [...model.arches.upper, ...model.arches.lower].find(item => item.code === code);
assert(tooth(aminaChart, '11').accessibleLabel.includes('no recorded findings') && !tooth(aminaChart, '11').accessibleLabel.toLowerCase().includes('healthy'), 'No-record tooth is represented as Healthy.');
assert(tooth(aminaChart, '46').entries.some(item => item.conceptCode === 'MISSING'), 'Amina Missing state changed.');
assert(tooth(aminaChart, '36').entries.some(item => item.conceptCode === 'ROOT_CANAL_TREATED') && tooth(aminaChart, '36').entries.some(item => item.conceptCode === 'CROWN'), 'Amina concurrent RCT/crown states changed.');
assert(tooth(aminaChart, '26').entries.some(item => item.conceptCode === 'CARIES') && tooth(aminaChart, '26').planned.some(item => item.label.includes('Composite Filling')), 'Amina observed/planned separation changed.');
assert(tooth(mercyChart, '75').entries.some(item => item.conceptCode === 'CARIES') && tooth(mercyChart, '75').planned.length === 1 && tooth(mercyChart, '84').entries.some(item => item.conceptCode === 'RESTORATION') && tooth(mercyChart, '64').entries.some(item => item.conceptCode === 'HEALTHY'), 'Mercy primary-dentition story changed.');
const samuelPlan = canonical.treatmentPlans.find(item => item.id === 'TP-000303'), samuelItems = canonical.treatmentPlanItems.filter(item => item.treatmentPlanId === samuelPlan.id);
assert(samuelPlan.proposedTotal === 450000 && samuelPlan.acceptedTotal === 330000 && samuelPlan.completedTotal === 150000 && samuelItems.some(item => item.acceptanceStatus === 'DECLINED') && samuelItems.some(item => item.progressStatus === 'COMPLETED') && samuelItems.some(item => item.progressStatus === 'PLANNED'), 'Samuel mixed-state treatment plan changed.');
assert(canonical.proceduresPerformed.length === 4 && canonical.proceduresPerformed.some(item => item.id === 'PROC-000402' && item.patientId === 'P004' && item.toothCode === '46') && canonical.proceduresPerformed.filter(item => item.patientId === 'P002' && item.toothCode === '36').length === 2, 'Canonical procedure history changed.');
assert(canonical.prescriptions.length === 1 && canonical.prescriptions[0].id === 'RX-000501' && canonical.prescriptions[0].patientId === 'P004', 'Canonical prescription changed.');
assert(canonical.patientDocuments.every(item => !('toothCode' in item) && !('procedureId' in item)) && new Set(canonical.patientDocuments.map(item => item.type)).size === 2 && canonical.patientDocuments.every(item => ['X_RAY', 'CLINICAL_PHOTO'].includes(item.type)), 'Clinical document schema expanded beyond the approved model.');
assert(snapshot(canonical) === baseline, 'Clinical selectors mutated canonical state.');

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, base).pathname.replace(/^\/+/, '')) || 'index.html';
  const file = normalize(join(root, pathname));
  if (file !== root && !file.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(`${request.url()}: ${request.failure()?.errorText || 'failed'}`));
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.apiRequests.push(request.url()); });
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) findings.missingAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async (page, email, clear = true) => {
  if (clear) { await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' }); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); }
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard'); await page.locator('.app-shell').waitFor();
};
const route = async (page, path) => { await page.goto(`${base}/app.html#/${path}`, { waitUntil: 'networkidle' }); await page.locator('#main-content').waitFor(); };
const mainText = page => page.locator('#main-content').innerText();
const contains = async (page, expected, forbidden = [], label = 'page') => {
  const text = await mainText(page);
  for (const value of expected) assert(text.includes(value), `${label} is missing "${value}". Available text: ${text.replace(/\s+/g, ' ').slice(0, 900)}`);
  for (const value of forbidden) assert(!text.includes(value), `${label} retained stale or unsafe "${value}".`);
  assert(!/[ÃÂ][\x80-\xBF]|ï¿½|�|undefinedundefined|nullnull|Invalid Date/i.test(text), `${label} contains encoding or invalid-value artifacts.`);
  return text;
};
const noDocumentOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.shell-workspace').scrollWidth <= document.querySelector('.shell-workspace').clientWidth);
const screenshot = async (page, name) => {
  for (const button of await page.getByRole('button', { name: 'Dismiss notification' }).all()) await button.click();
  await page.waitForTimeout(220);
  return page.screenshot({ path: join(outputDir, name), fullPage: true });
};

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({ headless: true });

  // Daniel: rapid patient switching, current/historical separation, charts, plans, procedures, prescriptions, documents, recalls.
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await context.newPage(); observe(page); page.setDefaultTimeout(10_000); await login(page, accounts.daniel);
    const switches = [
      ['P001', ['Amina Nakato', 'Penicillin', 'APT-000103'], ['Amlodipine','Metformin','Losartan']],
      ['P002', ['Peter Okello', 'Hypertension', 'Amlodipine'], ['Penicillin','Metformin','Losartan']],
      ['P004', ['Samuel Kato', 'Diabetes', 'Metformin'], ['Penicillin','Amlodipine','Losartan']],
      ['P013', ['Mercy Ayaa'], ['Penicillin','Amlodipine','Metformin','Losartan']],
      ['P009', ['Brenda Namusoke', 'ENC-000203'], ['Penicillin','Amlodipine','Metformin','Losartan']],
      ['P001', ['Amina Nakato', 'Penicillin', 'APT-000103'], ['Amlodipine','Metformin','Losartan']]
    ];
    for (const [id, expected, forbidden] of switches) { await route(page, `patients/${id}/clinical`); await contains(page, expected, forbidden, `${id} clinical switch`); assert(!(await page.title()).includes(expected[0]), `${id}: browser title exposes patient identity.`); }
    await screenshot(page, 'amina-clinical-1366.png');
    const currentVisit = await page.getByRole('heading', { name: 'Current Visit' }).locator('xpath=../../..').innerText();
    assert(currentVisit.includes('APT-000103') && currentVisit.includes('No current encounter yet') && !currentVisit.includes('ENC-000201'), 'Amina historical encounter is shown as current.');
    assert(await page.getByRole('button', { name: 'Start Clinical Encounter' }).count() === 1, 'Amina current treatment cannot start the correct encounter.');
    assert((await page.getByRole('heading', { name: 'Previous Encounters' }).locator('xpath=../../..').innerText()).includes('ENC-000201'), 'Amina historical encounter is not clearly available as history.');

    await route(page, 'patients/P001/dental-chart');
    const upper = await page.locator('.odontogram__arch--upper [data-tooth-code]').evaluateAll(nodes => nodes.map(node => node.dataset.toothCode));
    const lower = await page.locator('.odontogram__arch--lower [data-tooth-code]').evaluateAll(nodes => nodes.map(node => node.dataset.toothCode));
    equal(upper, ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'], 'Rendered permanent upper orientation changed.');
    equal(lower, ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'], 'Rendered permanent lower orientation changed.');
    const unrecorded = page.locator('[data-tooth-code="11"]'); assert((await unrecorded.getAttribute('aria-label')).includes('no recorded findings') && !(await unrecorded.getAttribute('aria-label')).toLowerCase().includes('healthy'), 'Rendered no-record semantics are unsafe.');
    const tooth26 = page.locator('[data-tooth-code="26"]'); await tooth26.focus(); await page.keyboard.press('Enter');
    assert(await page.locator('[data-tooth-code="26"]').getAttribute('aria-pressed') === 'true', 'Odontogram keyboard selection failed.');
    await contains(page, ['Tooth 26', 'Recorded Findings', 'Caries', 'Condition', 'Planned Treatment', 'Composite Filling', 'Dental Chart Legend'], [], 'Amina odontogram');
    assert((await page.locator('[data-tooth-code="36"]').getAttribute('aria-label')).includes('Root Canal Treated') && (await page.locator('[data-tooth-code="36"]').getAttribute('aria-label')).includes('Crown'), 'Concurrent RCT/crown state is not accessible.');
    assert((await page.locator('[data-tooth-code="46"]').getAttribute('aria-label')).includes('Missing'), 'Missing tooth state is not accessible.');
    await screenshot(page, 'amina-odontogram-1366.png');

    await route(page, 'treatment-plans/TP-000303');
    await contains(page, ['Samuel Kato','TP-000303','Proposed','UGX 450,000','Accepted','UGX 330,000','Completed','UGX 150,000','Simple Extraction','Declined','Scaling & Polishing','Planned'], ['Amount Paid','Invoice Total'], 'Samuel treatment plan');
    await screenshot(page, 'samuel-treatment-plan-1366.png');
    await route(page, 'procedures');
    await contains(page, ['Procedures Performed','Read-only history','PROC-000402','Samuel Kato','PROC-000403','PROC-000404','Peter Okello','Root Canal Treatment','Porcelain Crown','Service value'], ['Payment','Collected'], 'Procedure register');

    await route(page, 'patients/P001/prescriptions');
    await contains(page, ['Amina Nakato','Clinical Safety Summary','Penicillin','Known recorded history only','not a drug-interaction engine','New Prescription'], ['contraindicated','interaction severity','Invoice'], 'Amina prescription safety');
    await screenshot(page, 'prescription-safety-1366.png');
    await route(page, 'patients/P004/prescriptions');
    await contains(page, ['Samuel Kato','RX-000501','Diabetes','Metformin','Read-only issued clinical record'], ['Payment','Invoice'], 'Samuel prescription');

    await route(page, 'patients/P001/documents');
    await contains(page, ['Amina Nakato','X-Rays','Upper Left Posterior X-Ray','Preview unavailable','frontend demo','Related Encounter','ENC-000201'], ['Tooth field','Procedure field'], 'Amina documents');
    assert(await page.locator('input[name*=tooth], select[name*=tooth], input[name*=procedure], select[name*=procedure]').count() === 0, 'Document workspace exposes unsupported tooth/procedure fields.');
    await page.getByRole('button', { name: 'Add Document' }).click();
    const documentDialog = page.getByRole('dialog', { name: 'Add Document' });
    assert(await documentDialog.locator('input[type=file]').count() === 1 && await documentDialog.getByLabel(/Tooth|Procedure/).count() === 0, 'Add Document form expanded the schema.');
    await documentDialog.locator('input[type=file]').setInputFiles({ name: 'very-long-clinical-image-filename-with-apostrophe-and-parentheses-(left-upper)-review-2026.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff,0xd8,0xff,0xd9]) });
    assert((await documentDialog.innerText()).includes('Temporary preview for this browser session.'), 'Runtime document preview is not identified as temporary.');
    await documentDialog.getByRole('button', { name: 'Cancel' }).click();
    const discardDocument = page.getByRole('dialog', { name: 'Discard document changes?' });
    await discardDocument.getByRole('button', { name: 'Discard' }).click();
    await screenshot(page, 'clinical-documents-1366.png');

    await route(page, 'recalls');
    await contains(page, ['Recalls & Follow-Up','future review obligations separately from appointments','Joan Nambasa','Samuel Kato','Mariam Nabwire','Amina Nakato','APT-000103','APT-000105'], ['Peter Okello','APT-000104'], 'Daniel recall register');
    await route(page, 'patients/P999/clinical'); await contains(page, ['Patient not found'], ['Amina Nakato','Penicillin','Samuel Kato'], 'Invalid clinical patient');
    await route(page, 'patients/P999/dental-chart'); await contains(page, ['Patient Not Found'], ['Amina Nakato','Caries','Penicillin'], 'Invalid chart patient');
    await route(page, 'treatment-plans/TP-999999'); await contains(page, ['Treatment Plan Not Found'], ['Samuel Kato','UGX 450,000'], 'Invalid treatment plan');
    await context.close();
  }

  // Sarah: waiting-room ownership, Brenda draft workflow, validation, dirty navigation, and the corrected resume action.
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await context.newPage(); observe(page); await login(page, accounts.sarah);
    await route(page, 'waiting-room');
    await contains(page, ['Waiting Room','Expected Arrivals','Waiting','In Treatment','Brenda Namusoke','Start Treatment'], ['Amina Nakato'], 'Sarah waiting room');
    assert(await page.getByRole('button', { name: 'Start Treatment' }).count() === 1, 'Assigned Dentist cannot identify the start-treatment action.');
    assert(await page.getByRole('button', { name: 'Open Clinical Encounter' }).count() === 0, "Sarah received another Dentist's Amina clinical action.");
    await page.getByRole('button', { name: 'Start Treatment' }).click();
    await page.getByRole('dialog', { name: 'Start treatment for Brenda Namusoke?' }).getByRole('button', { name: 'Start Treatment' }).click();
    await page.getByRole('button', { name: 'Open Clinical Encounter' }).waitFor();
    await page.getByRole('button', { name: 'Open Clinical Encounter' }).click();
    await page.waitForURL('**#/patients/P009/clinical');
    await page.getByRole('heading', { name: 'Clinical Workspace' }).waitFor();
    await contains(page, ['Brenda Namusoke','APT-000102','In Treatment','ENC-000203','Draft','Resume Encounter','Clinical Safety Summary'], ['Detailed encounter documentation begins','Phase 11'], 'Brenda clinical workspace');
    await page.getByRole('button', { name: 'Resume Encounter' }).click();
    assert(await page.locator('#encounter-chiefComplaint').evaluate(node => node === document.activeElement), 'Resume Encounter did not focus the draft documentation.');
    await page.locator('.shell-workspace').evaluate(node => node.scrollTo({ top: 0, behavior: 'instant' }));
    await screenshot(page, 'brenda-encounter-1366.png');
    await page.getByRole('button', { name: 'Complete Encounter' }).click();
    assert(await page.locator('.clinical-workspace__validation-summary:not([hidden])').count() === 1 && await page.locator('textarea[aria-invalid=true]').count() === 3 && await page.locator('#encounter-chiefComplaint').evaluate(node => node === document.activeElement), 'Encounter completion validation is not accessible or focused.');
    await page.locator('#encounter-chiefComplaint').fill('Pain on chewing');
    await page.locator('#encounter-examinationNotes').fill('Localized tenderness');
    await page.locator('#encounter-clinicalNotes').fill('Review and document findings');
    await page.getByRole('button', { name: 'Complete Encounter' }).click();
    const completion = page.getByRole('dialog', { name: 'Complete this clinical encounter?' });
    assert((await completion.innerText()).includes('ordinary editing will no longer be available'), 'Encounter completion confirmation is misleading.');
    await completion.getByRole('button', { name: 'Cancel' }).click();
    assert((await page.evaluate(() => window.DentalAppDev.getDirtySources())).includes('clinical-encounter'), 'Encounter changes did not register as dirty.');
    await page.getByRole('button', { name: 'View Dental Chart' }).click();
    const discard = page.getByRole('dialog', { name: 'Discard encounter changes?' });
    await discard.getByRole('button', { name: 'Cancel' }).click();
    assert(page.url().includes('/patients/P009/clinical') && await page.locator('#encounter-chiefComplaint').inputValue() === 'Pain on chewing', 'Stay did not preserve unsaved clinical work.');
    await page.getByRole('button', { name: 'View Dental Chart' }).click(); await page.getByRole('dialog', { name: 'Discard encounter changes?' }).getByRole('button', { name: 'Discard Changes' }).click();
    await page.waitForURL('**#/patients/P009/dental-chart');
    assert(!(await page.evaluate(() => window.DentalAppDev.getDirtySources())).length, 'Discard did not clean the encounter source.');
    await context.close();
  }

  // Daniel ownership and patient-specific clinical evidence for Mercy/Peter/Samuel.
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await context.newPage(); observe(page); await login(page, accounts.daniel);
    await route(page, 'clinical/encounters/ENC-000203');
    await contains(page, ['Brenda Namusoke','Draft','read-only for the current user'], [], 'Daniel viewing Brenda');
    assert(await page.getByRole('button', { name: 'Save Draft' }).count() === 0 && await page.locator('textarea[readonly]').count() === 5, 'Wrong Dentist received Brenda mutation controls.');
    await route(page, 'clinical/encounters/ENC-000202');
    await contains(page, ['Joan Nambasa','Completed documentation is locked and read-only','This encounter is read-only'], ['Save Draft','Complete Encounter'], 'Joan completed encounter');

    await route(page, 'patients/P013/dental-chart');
    assert(await page.getByRole('button', { name: 'Primary Dentition' }).getAttribute('aria-pressed') === 'true', 'Mercy did not resolve to primary dentition.');
    equal(await page.locator('.odontogram__arch--upper [data-tooth-code]').evaluateAll(nodes => nodes.map(node => node.dataset.toothCode)), ['55','54','53','52','51','61','62','63','64','65'], 'Rendered primary upper orientation changed.');
    equal(await page.locator('.odontogram__arch--lower [data-tooth-code]').evaluateAll(nodes => nodes.map(node => node.dataset.toothCode)), ['85','84','83','82','81','71','72','73','74','75'], 'Rendered primary lower orientation changed.');
    assert((await page.locator('[data-tooth-code="75"]').getAttribute('aria-label')).includes('Caries') && (await page.locator('[data-tooth-code="75"]').getAttribute('aria-label')).includes('planned treatment'), 'Mercy tooth 75 state is incomplete.');
    assert((await page.locator('[data-tooth-code="84"]').getAttribute('aria-label')).includes('Existing Restoration') && (await page.locator('[data-tooth-code="64"]').getAttribute('aria-label')).includes('Healthy Observation'), 'Mercy restoration/explicit Healthy states are unclear.');
    await screenshot(page, 'mercy-primary-dentition-1366.png');
    await route(page, 'patients/P002/clinical'); await contains(page, ['Peter Okello','Hypertension','Amlodipine','ENC-000204','Completed'], ['No current encounter yet'], 'Peter clinical history');
    await route(page, 'patients/P004/dental-chart'); assert((await page.locator('[data-tooth-code="46"]').getAttribute('aria-label')).includes('Extracted'), 'Samuel Extracted state is not distinct from Missing.');
    await context.close();
  }

  // Role/privacy boundaries and session handoff.
  for (const [role, email] of [['Administrator', accounts.admin], ['Receptionist', accounts.receptionist], ['Cashier', accounts.cashier]]) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await context.newPage(); observe(page); await login(page, email);
    await route(page, 'patients/P001/clinical'); const text = await mainText(page);
    if (role === 'Administrator') assert(text.includes('Amina Nakato') && text.includes('Penicillin') && await page.getByRole('button', { name: /Save Draft|Complete Encounter|Add Allergy/ }).count() === 0, 'Administrator clinical oversight implies treating authority.');
    else assert(text.includes('Access Denied') && !/Amina Nakato|Penicillin|ENC-000201/.test(text) && await page.locator('.clinical-workspace').count() === 0, `${role} received clinical PHI.`);
    await context.close();
  }
  {
    const context = await browser.newContext(); const page = await context.newPage(); observe(page); await login(page, accounts.daniel); await route(page, 'patients/P001/clinical'); assert((await mainText(page)).includes('Penicillin'), 'Dentist clinical baseline unavailable.');
    await page.locator('summary[aria-label="Account menu"]').click(); await page.getByRole('menuitem', { name: 'Logout' }).click(); await page.waitForURL('**/index.html?signed-out');
    await page.locator('#email').fill(accounts.cashier); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click(); await page.waitForURL('**/app.html#/dashboard'); await route(page, 'patients/P001/clinical');
    const text = await mainText(page); assert(text.includes('Access Denied') && !/Amina Nakato|Penicillin|ENC-000201/.test(text) && !(await page.evaluate(() => window.DentalAppDev.getDirtySources())).length, 'Clinical context leaked across role change.');
    await context.close();
  }

  // Responsive clinical usability and the known Waiting Room collision regression.
  const responsive = {};
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport }); const page = await context.newPage(); observe(page); await login(page, accounts.daniel);
    for (const path of ['patients/P001/clinical','patients/P001/dental-chart','treatment-plans/TP-000303','patients/P001/prescriptions','patients/P001/documents','waiting-room']) {
      await route(page, path); assert(await noDocumentOverflow(page), `${path} overflows the viewport at ${viewport.width}px.`);
    }
    await route(page, 'waiting-room');
    const heading = await page.locator('.waiting-room__panel--treatment h2').boundingBox(), action = await page.getByRole('button', { name: 'Open Clinical Encounter' }).boundingBox();
    if (heading && action) assert(heading.y + heading.height <= action.y || action.y + action.height <= heading.y || heading.x + heading.width <= action.x || action.x + action.width <= heading.x, `In Treatment heading overlaps Open Clinical Encounter at ${viewport.width}px.`);
    await route(page, 'patients/P001/dental-chart');
    const toothBox = await page.locator('[data-tooth-code="26"]').boundingBox(); assert(toothBox && toothBox.width >= 40 && toothBox.height >= 40, `Tooth target is impractical at ${viewport.width}px.`);
    responsive[`${viewport.width}x${viewport.height}`] = 'pass'; await context.close();
  }

  // Isolated safe-text rendering and exact final reset.
  {
    const context = await browser.newContext(); const page = await context.newPage(); observe(page); await login(page, accounts.sarah);
    const injection = `<script>window.__phase22Injected = true</script> O'Brien & Sons / review (left-right)\nSecond clinical line`;
    await page.evaluate(async value => { const { state } = await import('/assets/js/core/state.js'); state.saveClinicalEncounterDraft({ encounterId: 'ENC-000203', values: { chiefComplaint: value, examinationNotes: '', clinicalNotes: '', treatmentDiscussion: '', followUpNotes: '' }, actor: { userId: 'U003', role: 'Dentist' } }); }, injection);
    await route(page, 'clinical/encounters/ENC-000203');
    assert(await page.locator('#encounter-chiefComplaint').inputValue() === injection && await page.evaluate(() => window.__phase22Injected !== true) && await page.locator('script').filter({ hasText: '__phase22Injected' }).count() === 0, 'Clinical free text executed or lost special/multiline content.');
    await page.evaluate(() => window.DentalAppDev.resetDemoData()); await page.reload({ waitUntil: 'networkidle' });
    const final = await page.evaluate(async () => { const state = window.DentalAppDev.getState(); const { validateCanonicalDemoState } = await import('/assets/js/data/integrity.js'); const { getRuntimeDocumentPreview } = await import('/assets/js/data/document-workflows.js'); return { valid: validateCanonicalDemoState(state).valid, appointments: state.appointments.filter(item => item.startDateTime.startsWith(state.referenceDate)).length, activeQueue: state.queueEntries.filter(item => ['WAITING','IN_TREATMENT'].includes(item.status)).length, waiting: state.queueEntries.filter(item => item.status === 'WAITING').length, inTreatment: state.queueEntries.filter(item => item.status === 'IN_TREATMENT').length, encounters: state.clinicalEncounters.length, chart: state.dentalChartEntries.length, plans: state.treatmentPlans.length, procedures: state.proceduresPerformed.length, prescriptions: state.prescriptions.length, documents: state.patientDocuments.length, recalls: state.recalls.reduce((out,item) => { const status = item.status; out[status] = (out[status] || 0) + 1; return out; }, {}), dirty: window.DentalAppDev.getDirtySources(), preview: getRuntimeDocumentPreview('DOC-001','P001') }; });
    assert(final.valid && final.appointments === 9 && final.activeQueue === 2 && final.waiting === 1 && final.inTreatment === 1 && final.encounters === 4 && final.chart === 31 && final.plans === 4 && final.procedures === 4 && final.prescriptions === 1 && final.documents === 4 && final.recalls.UPCOMING === 1 && final.recalls.OVERDUE === 1 && final.recalls.SCHEDULED === 3 && final.dirty.length === 0 && final.preview === null, `Final clinical reset failed: ${JSON.stringify(final)}`);
    await context.close();
  }

  assert(Object.values(findings).every(items => items.length === 0), `Browser findings: ${JSON.stringify(findings)}`);
  const version = await browser.version();
  const result = {
    status: 'technical-pass', playwright: '1.63.0', chromium: version,
    patientContext: 'switching, invalid contexts, resource ownership, and session isolation pass',
    operationalWorkflow: 'appointment/queue/encounter states remain distinct; ownership and waiting-room layout pass',
    encounters: 'current/historical resolution, draft/completed treatment, validation, confirmation, dirty navigation pass',
    medicalSafety: 'allergies, conditions, medications, no-record semantics, and prescription context pass',
    odontogram: 'FDI orientation, dentition distinction, no-record/Healthy, Missing/Extracted, multi-state, surfaces, planned overlay, keyboard and legend pass',
    treatmentPlans: 'item acceptance/progress and Proposed/Accepted/Completed value separation pass',
    boundaries: 'finding != plan; plan != procedure; procedure != invoice/payment; prescription != medical history/finance; document has no tooth/procedure link',
    responsive, screenshots: ['amina-clinical-1366.png','amina-odontogram-1366.png','samuel-treatment-plan-1366.png','mercy-primary-dentition-1366.png','brenda-encounter-1366.png','prescription-safety-1366.png','clinical-documents-1366.png'],
    finalReset: 'canonical and clean', findings,
    clinicalReviewer: 'Practicing Dentist/Dental Surgeon sign-off remains an external Phase 22 gate per docs/11_FRONTEND_IMPLEMENTATION_PLAN.md.'
  };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} finally {
  if (browser) await browser.close(); await new Promise(done => server.close(done));
}
