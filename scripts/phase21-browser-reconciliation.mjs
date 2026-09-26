import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4231;
const base = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase21');
const assert = (value, message) => { if (!value) throw new Error(message); };
const findings = { consoleErrors: [], pageErrors: [], failedRequests: [], missingAssets: [], apiRequests: [] };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, base).pathname.replace(/^\/+/, '')) || 'index.html';
  const file = normalize(join(root, pathname));
  if (file !== root && !file.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(`${request.url()}: ${request.failure()?.errorText || 'failed'}`));
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.apiRequests.push(request.url()); });
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) findings.missingAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async page => {
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill('grace.admin@pearlsmiledental.test');
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  await page.locator('.app-shell').waitFor();
};
const route = async (page, path) => {
  await page.goto(`${base}/app.html#/${path}`, { waitUntil: 'networkidle' });
  await page.locator('#main-content').waitFor();
};
const body = page => page.locator('#main-content').innerText();
const hasAll = async (page, values, label) => {
  const text = await body(page);
  for (const value of values) assert(text.includes(value), `${label}: rendered surface is missing “${value}”.`);
  assert(!/\b(?:nullnull|undefinedundefined|NaN|Invalid Date)\b/i.test(text), `${label}: invalid visible value rendered.`);
  return text;
};
const stateSummary = page => page.evaluate(() => {
  const state = window.DentalAppDev.getState();
  return {
    patients: state.patients.length,
    users: state.users.length,
    todayAppointments: state.appointments.filter(item => item.startDateTime.startsWith(state.referenceDate)).length,
    queue: state.queueEntries.length,
    encounters: state.clinicalEncounters.length,
    procedures: state.proceduresPerformed.length,
    invoices: state.invoices.length,
    payments: state.payments.length,
    receipts: state.receipts.length,
    recalls: state.recalls.length,
    aminaBalance: state.invoices.find(item => item.id === 'INV-000602')?.balance
  };
});

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  observe(page);
  await login(page);

  const initial = await stateSummary(page);
  assert(JSON.stringify(initial) === JSON.stringify({ patients: 30, users: 6, todayAppointments: 9, queue: 2, encounters: 4, procedures: 4, invoices: 6, payments: 7, receipts: 7, recalls: 5, aminaBalance: 70000 }), `Browser did not start from canonical state: ${JSON.stringify(initial)}`);

  // Operational facts across dashboard, report, appointment, and queue surfaces.
  await route(page, 'dashboard');
  await hasAll(page, ["Today's Appointments", '9', 'Active Queue', '2', "Today's Collections", 'UGX 360,000', 'Outstanding Balance', 'UGX 420,000', 'Amina Nakato', 'Brenda Namusoke'], 'Administrator dashboard');
  await route(page, 'reports');
  await page.locator('#report-type').selectOption('appointments');
  await hasAll(page, ['Appointment Activity', 'Appointments', 'Dr. Daniel Mugisha', 'Dr. Sarah Nakanwagi', 'Completed', 'Waiting', 'In Treatment', 'Confirmed', 'Scheduled', 'Cancelled'], 'Appointment report');
  await route(page, 'appointments');
  await hasAll(page, ['Brenda Namusoke', 'Amina Nakato', 'Joan Nambasa', 'Waiting', 'In Treatment', 'Completed'], 'Appointment register');
  await route(page, 'waiting-room');
  await hasAll(page, ['Brenda Namusoke', 'Amina Nakato', 'Waiting', 'In Treatment'], 'Waiting room');

  // Clinical stories across register, encounter context, chart, plans, documents, and clinical report.
  await route(page, 'clinical/encounters');
  await hasAll(page, ['Total Encounters', '4', 'Draft', 'Completed', "Today's Encounters", 'ENC-000201', 'ENC-000202', 'ENC-000203', 'ENC-000204', 'Brenda Namusoke'], 'Encounter register');
  await route(page, 'clinical/encounters/ENC-000201');
  await hasAll(page, ['Amina Nakato', 'ENC-000201', 'APT-000103', 'Current Visit', 'No current encounter yet'], 'Amina encounter context');
  const currentVisitText = await page.getByRole('heading', { name: 'Current Visit' }).locator('xpath=../../..').innerText();
  assert(currentVisitText.includes('APT-000103') && currentVisitText.includes('No current encounter yet') && !currentVisitText.includes('ENC-000201'), 'Amina historical encounter was presented as the current encounter.');
  await route(page, 'patients/P001/dental-chart');
  await hasAll(page, ['Amina Nakato', 'Tooth 16', 'Restoration', 'Tooth 26', 'Caries', 'Tooth 36', 'Root Canal Treated', 'Crown', 'Tooth 46', 'Missing', 'Planned Treatment'], 'Amina dental chart');
  await route(page, 'treatment-plans/TP-000303');
  await hasAll(page, ['Samuel Kato', 'TP-000303', 'UGX 450,000', 'UGX 330,000', 'UGX 150,000', 'Accepted', 'Declined', 'Completed'], 'Samuel treatment plan');
  await route(page, 'patients/P013/dental-chart');
  await page.getByRole('button', { name: 'Primary Dentition' }).click();
  await hasAll(page, ['Mercy Ayaa', 'Primary Dentition', 'Tooth 75', 'Caries', 'Tooth 84', 'Restoration', 'Tooth 64', 'Healthy'], 'Mercy primary chart');
  await route(page, 'patients/P005/documents');
  await hasAll(page, ['Esther Atim', 'Tooth 21 Fracture', 'Clinical Photo'], 'Esther documents');
  await route(page, 'reports');
  await page.locator('#report-type').selectOption('clinical');
  await hasAll(page, ['Clinical Procedures & Plans', 'Completed Procedures', 'Service Value', 'Treatment Plans', 'Scaling & Polishing', 'Porcelain Crown'], 'Clinical report');

  // Finance facts across dashboard, report, register, patient profile, and receipt/document surfaces.
  await page.locator('#report-type').selectOption('finance');
  await hasAll(page, ['Collections & Outstanding Balances', 'UGX 2,360,000', 'UGX 420,000', 'UGX 360,000', 'Joseph Walusimbi', 'Amina Nakato', 'Samuel Kato'], 'Finance report');
  await route(page, 'outstanding-balances');
  const outstandingRows = await page.locator('tbody tr').allInnerTexts();
  assert(outstandingRows.length === 3 && outstandingRows[0].includes('Joseph Walusimbi') && outstandingRows[0].includes('UGX 300,000') && outstandingRows[1].includes('Amina Nakato') && outstandingRows[1].includes('UGX 70,000') && outstandingRows[2].includes('Samuel Kato') && outstandingRows[2].includes('UGX 50,000'), 'Outstanding register disagrees with finance selectors.');
  await route(page, 'patients/P001/billing');
  await hasAll(page, ['Amina Nakato', 'INV-000602', 'Total UGX 120,000', 'Paid UGX 50,000', 'Balance UGX 70,000', 'PAY-000702', 'RCT-000802'], 'Amina billing history');
  await route(page, 'billing/receipts');
  await hasAll(page, ['Receipt History', 'RCT-000801', 'RCT-000802', 'UGX 180,000', 'UGX 50,000'], 'Receipt register');
  await page.locator('.data-table .dropdown summary').first().click();
  await page.getByRole('menuitem', { name: 'View receipt' }).first().click();
  const receiptDrawer = page.getByRole('complementary', { name: /Receipt/ });
  const receiptText = await receiptDrawer.innerText();
  for (const value of ['Payment Receipt', 'Pearl Smile Dental Clinic', 'RCT-', 'Payment method', 'Amount received']) assert(receiptText.includes(value), `Receipt document is missing “${value}”.`);
  await receiptDrawer.getByRole('button', { name: 'Close', exact: true }).click();

  // Recall facts across register, report, and patient profile.
  await route(page, 'recalls');
  await hasAll(page, ['Joan Nambasa', 'Samuel Kato', 'Amina Nakato', 'Upcoming', 'Overdue', 'Scheduled'], 'Recall register');
  await route(page, 'reports');
  await page.locator('#report-type').selectOption('recalls');
  await hasAll(page, ['Recall Follow-Up', 'Upcoming', 'Overdue', 'Scheduled', 'Joan Nambasa', 'Samuel Kato'], 'Recall report');
  await route(page, 'patients/P001/recalls');
  await hasAll(page, ['Amina Nakato', 'REC-000905', 'APT-000103', 'Scheduled'], 'Amina recall profile');

  // Store workflow propagation, refresh persistence, duplicate protection, and reset.
  await page.evaluate(async () => {
    const { state } = await import('/assets/js/core/state.js');
    state.checkInAppointment({ appointmentId: 'APT-000104', actor: { userId: 'U004', role: 'Receptionist' } });
  });
  await page.reload({ waitUntil: 'networkidle' });
  let persisted = await page.evaluate(() => { const state = window.DentalAppDev.getState(); const appointment = state.appointments.find(item => item.id === 'APT-000104'); return { status: appointment.status, queue: state.queueEntries.filter(item => item.appointmentId === appointment.id).length }; });
  assert(persisted.status === 'WAITING' && persisted.queue === 1, 'Check-in did not survive browser refresh.');
  const duplicateCheckIn = await page.evaluate(async () => {
    const { state } = await import('/assets/js/core/state.js'); const before = JSON.stringify(state.get()); let rejected = false;
    try { state.checkInAppointment({ appointmentId: 'APT-000104', actor: { userId: 'U004', role: 'Receptionist' } }); } catch { rejected = true; }
    return { rejected, unchanged: JSON.stringify(state.get()) === before };
  });
  assert(duplicateCheckIn.rejected && duplicateCheckIn.unchanged, 'Duplicate check-in was not rejected atomically in the browser store.');

  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  await page.reload({ waitUntil: 'networkidle' });
  const paymentResult = await page.evaluate(async () => {
    const { state } = await import('/assets/js/core/state.js');
    const result = state.recordPayment({ invoiceId: 'INV-000602', amount: 20000, paymentMethodCode: 'CASH', actor: { userId: 'U005', role: 'Cashier' } });
    return { payment: result.payment.id, receipt: result.receipt.id, balance: result.invoice.balance };
  });
  assert(paymentResult.balance === 50000, 'Browser payment did not recalculate Amina balance.');
  await route(page, 'dashboard');
  await hasAll(page, ['UGX 380,000', 'UGX 400,000'], 'Mutated dashboard finance');
  await route(page, 'reports');
  await page.locator('#report-type').selectOption('finance');
  await hasAll(page, ['UGX 380,000', 'UGX 400,000'], 'Mutated finance report');
  await route(page, 'patients/P001/billing');
  await hasAll(page, ['Balance UGX 50,000', paymentResult.payment, paymentResult.receipt], 'Mutated patient billing history');
  await page.reload({ waitUntil: 'networkidle' });
  persisted = await page.evaluate(() => { const state = window.DentalAppDev.getState(); return { balance: state.invoices.find(item => item.id === 'INV-000602').balance, payments: state.payments.length, receipts: state.receipts.length }; });
  assert(persisted.balance === 50000 && persisted.payments === 8 && persisted.receipts === 8, 'Payment/receipt persistence split after refresh.');
  const invalidPayment = await page.evaluate(async () => {
    const { state } = await import('/assets/js/core/state.js'); const before = JSON.stringify(state.get()); let rejected = false;
    try { state.recordPayment({ invoiceId: 'INV-000602', amount: 50001, paymentMethodCode: 'CASH', actor: { userId: 'U005', role: 'Cashier' } }); } catch { rejected = true; }
    return { rejected, unchanged: JSON.stringify(state.get()) === before };
  });
  assert(invalidPayment.rejected && invalidPayment.unchanged && await page.locator('.toast').count() === 0, 'Rejected browser payment changed state or emitted a false-success toast.');

  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  await page.reload({ waitUntil: 'networkidle' });
  const final = await page.evaluate(async () => {
    const state = window.DentalAppDev.getState();
    const { validateCanonicalDemoState } = await import('/assets/js/data/integrity.js');
    return { valid: validateCanonicalDemoState(state).valid, payments: state.payments.length, receipts: state.receipts.length, queue: state.queueEntries.length, balance: state.invoices.find(item => item.id === 'INV-000602').balance };
  });
  assert(final.valid && final.payments === 7 && final.receipts === 7 && final.queue === 2 && final.balance === 70000, `Final browser reset failed: ${JSON.stringify(final)}`);
  assert(Object.values(findings).every(items => items.length === 0), `Browser findings: ${JSON.stringify(findings)}`);

  const result = {
    status: 'pass',
    chromium: 'real headless Chromium via Playwright',
    triangulation: { operations: ['dashboard', 'appointments', 'waiting room', 'appointment report'], clinical: ['encounter register', 'encounter context', 'dental chart', 'treatment plans', 'documents', 'clinical report'], finance: ['dashboard', 'finance report', 'outstanding register', 'patient billing', 'receipt document'], recalls: ['register', 'report', 'patient profile'] },
    persistence: { checkIn: 'pass', paymentReceipt: 'pass', refresh: 'pass', duplicateProtection: 'pass' },
    finalReset: final,
    findings
  };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
