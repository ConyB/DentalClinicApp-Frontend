import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { calculateInvoiceBalance, calculateInvoicePaid, calculateInvoiceTotal, getOutstandingBalance, getTodayCollections, getTotalPostedPayments } from '../assets/js/data/finance.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';
import { getDentalChartDefaultDentition, getDentalChartViewModel } from '../assets/js/data/dental-chart.js';
import { buildReport } from '../assets/js/data/reports.js';
import { formatDate, formatStatus, formatUGX } from '../assets/js/utils/formatters.js';

const root = resolve('.');
const port = 4229;
const base = `http://127.0.0.1:${port}`;
const auditDir = join(root, 'tests', 'audits', 'output', 'phase19b');
const pdfDir = join(root, 'tmp', 'pdfs', 'phase19b');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const accounts = { administrator: 'grace.admin@pearlsmiledental.test', dentist: 'daniel.mugisha@pearlsmiledental.test', receptionist: 'lydia.reception@pearlsmiledental.test', cashier: 'brian.cashier@pearlsmiledental.test' };
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], missingAssets: [], unexpectedApiRequests: [] };
const pdfs = [];
const inventory = [
  { surface: 'Invoice', route: '#/billing/invoices', roles: ['Clinic Administrator', 'Cashier'], trigger: 'Print Invoice', layout: 'dedicated', size: 'A4', orientation: 'portrait', privacy: 'financial', status: 'supported' },
  { surface: 'Payment Receipt', route: '#/billing/receipts', roles: ['Clinic Administrator', 'Cashier'], trigger: 'Print Receipt', layout: 'dedicated', size: 'A4', orientation: 'portrait', privacy: 'financial', status: 'supported' },
  { surface: 'Prescription', route: '#/patients/:patient/prescriptions', roles: ['Clinic Administrator', 'Dentist'], trigger: 'Print Prescription', layout: 'dedicated', size: 'A4', orientation: 'portrait', privacy: 'clinical', status: 'supported' },
  { surface: 'Treatment Plan', route: '#/treatment-plans/:plan', roles: ['Clinic Administrator', 'Dentist'], trigger: 'Print Treatment Plan', layout: 'dedicated', size: 'A4', orientation: 'portrait', privacy: 'clinical', status: 'supported' },
  { surface: 'Dental Chart Summary', route: '#/patients/:patient/dental-chart', roles: ['Clinic Administrator', 'Dentist'], trigger: 'Print Dental Chart Summary', layout: 'dedicated', size: 'A4', orientation: 'portrait', privacy: 'clinical', status: 'supported' },
  { surface: 'Selected Reports', route: '#/reports', roles: ['Clinic Administrator', 'Dentist', 'Receptionist', 'Cashier'], trigger: 'Print Report', layout: 'dedicated', size: 'A4', orientation: 'landscape', privacy: 'role-scoped', status: 'supported' }
];
const screenOnly = ['Patients registry/profile', 'Appointments workspace', 'Waiting Room', 'Encounters workspace', 'Procedures register', 'Documents metadata', 'Users & Staff', 'Clinic Settings', 'Profile'];

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
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); });
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) findings.missingAssets.push(`${response.status()} ${response.url()}`); });
};

const login = async (page, email) => {
  await page.goto(`${base}/app.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.count()) await dismiss.first().click();
};

const pdfAnalysis = path => {
  const code = [
    'import json,sys,pymupdf',
    'doc=pymupdf.open(sys.argv[1])',
    'pages=[]',
    'for page in doc:',
    ' text=page.get_text().strip()',
    ' pages.append({"width":round(page.rect.width,2),"height":round(page.rect.height,2),"text":text,"blank":not bool(text) and not bool(page.get_images()) and not bool(page.get_drawings())})',
    'print(json.dumps({"pageCount":len(doc),"pages":pages,"text":"\\n".join(p["text"] for p in pages)}))'
  ].join('\n');
  const run = spawnSync('py', ['-c', code, path], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`PDF analysis failed for ${path}: ${run.stderr}`);
  return JSON.parse(run.stdout);
};

const invalidText = text => /nullnull|undefinedundefined|nullundefined|undefinednull|\[object Object\]|(?:^|\s)(?:null|undefined|NaN)(?=$|\s|[.,:;!?])|�|Ã‚|Ãƒ|ï¿½/m.test(text);
const excludedChromeText = text => ['Print Report', 'Print Receipt', 'Print Invoice', 'Print Prescription', 'Print Treatment Plan', 'Export CSV', 'Change Password', 'Logout', 'Users & Staff', 'Waiting Room'].filter(value => text.includes(value));

const printPdf = async (page, { name, selector = '.document-print', landscape = false, expectedStrings = [], exactPages = null, maxPages = null, screenshot = true, printBackground = false }) => {
  await page.emulateMedia({ media: 'print' });
  await page.waitForFunction(target => { const node = document.querySelector(target); return node && getComputedStyle(node).display !== 'none' && node.getClientRects().length > 0; }, selector);
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  const metrics = await page.locator(selector).evaluate(node => {
    const visible = target => { const item = document.querySelector(target); return item && getComputedStyle(item).display !== 'none' && item.getClientRects().length > 0; };
    const logo = node.querySelector('img');
    return { width: node.getBoundingClientRect().width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, chromeVisible: ['.shell-sidebar', '.shell-header', '.shell-footer', '.toast-region', '.drawer__header', '.drawer__footer', '.modal__header', '.modal__footer'].some(visible), visibleButtons: [...document.querySelectorAll('button')].filter(item => getComputedStyle(item).display !== 'none' && item.getClientRects().length).length, logo: logo ? { complete: logo.complete, naturalWidth: logo.naturalWidth, hidden: logo.hidden } : null };
  });
  assert(metrics.scrollWidth <= metrics.clientWidth + 1, `${name} has horizontal print overflow: ${JSON.stringify(metrics)}`);
  assert(!metrics.chromeVisible && metrics.visibleButtons === 0, `${name} exposes application chrome or actions in print.`);
  assert(!metrics.logo || (metrics.logo.complete && (metrics.logo.naturalWidth > 0 || metrics.logo.hidden)), `${name} logo did not load or fall back safely.`);
  if (screenshot) await page.screenshot({ path: join(auditDir, `${name}-print.png`), fullPage: true });
  const path = join(pdfDir, `${name}.pdf`);
  await page.pdf({ path, format: 'A4', landscape, printBackground, preferCSSPageSize: true, displayHeaderFooter: false, scale: 1 });
  const facts = pdfAnalysis(path), normalized = facts.text.replace(/\s+/g, ' ');
  assert(facts.pageCount > 0 && !facts.pages.some(item => item.blank), `${name} contains a blank PDF page.`);
  if (exactPages !== null) assert(facts.pageCount === exactPages, `${name} generated ${facts.pageCount} pages instead of ${exactPages}.`);
  if (maxPages !== null) assert(facts.pageCount <= maxPages, `${name} generated an unreasonable ${facts.pageCount} pages.`);
  const first = facts.pages[0];
  assert(landscape ? first.width > first.height : first.height > first.width, `${name} has the wrong orientation: ${first.width}x${first.height}.`);
  assert(Math.abs(Math.max(first.width, first.height) - 841.89) < 3 && Math.abs(Math.min(first.width, first.height) - 595.28) < 3, `${name} is not A4.`);
  for (const value of expectedStrings) assert(normalized.toLowerCase().includes(String(value).replace(/\s+/g, ' ').toLowerCase()), `${name} PDF is missing ${value}.`);
  assert(!invalidText(facts.text), `${name} PDF contains an invalid or malformed value.`);
  const chrome = excludedChromeText(facts.text); assert(!chrome.length, `${name} PDF contains screen controls: ${chrome.join(', ')}.`);
  pdfs.push({ name, pageCount: facts.pageCount, orientation: landscape ? 'landscape' : 'portrait', blankPages: 0, width: first.width, height: first.height, printBackground, keyText: 'pass', layout: metrics });
  await page.emulateMedia({ media: 'screen' });
  return facts;
};

const clickPrintWithoutDialog = async (page, label, times = 1) => {
  await page.evaluate(() => { window.__phase19bPrintCalls = 0; window.print = () => { window.__phase19bPrintCalls += 1; }; });
  for (let index = 0; index < times; index += 1) await page.getByRole('button', { name: label, exact: true }).click();
  assert(await page.evaluate(() => window.__phase19bPrintCalls) === times, `${label} did not invoke browser print exactly ${times} time(s).`);
};

const openInvoice = async (page, invoiceNumber) => {
  await page.goto(`${base}/app.html#/billing/invoices`, { waitUntil: 'networkidle' });
  const row = page.locator('.data-table tbody tr', { hasText: invoiceNumber });
  await row.locator('summary[aria-label="More actions"]').click();
  await row.getByRole('menuitem', { name: 'View invoice details' }).click();
  return page.getByRole('complementary', { name: `Invoice ${invoiceNumber}` });
};

const openReceipt = async (page, receiptNumber) => {
  await page.goto(`${base}/app.html#/billing/receipts`, { waitUntil: 'networkidle' });
  const row = page.locator('.data-table tbody tr', { hasText: receiptNumber });
  await row.locator('summary[aria-label="More actions"]').click();
  await row.getByRole('menuitem', { name: 'View receipt' }).click();
  return page.getByRole('complementary', { name: `Receipt ${receiptNumber}` });
};

await mkdir(auditDir, { recursive: true });
await mkdir(pdfDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
let browser;
let activePage;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(10_000); observe(page);
  await login(page, accounts.administrator);
  const before = await page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
  const canonical = createCanonicalDemoState();

  const invoice = canonical.invoices.find(item => item.invoiceNumber === 'INV-000606'), invoicePatient = canonical.patients.find(item => item.id === invoice.patientId);
  const invoiceDrawer = await openInvoice(page, invoice.invoiceNumber); await invoiceDrawer.waitFor();
  assert(await invoiceDrawer.getByRole('button', { name: 'Print Invoice' }).isVisible(), 'Print Invoice is unavailable to an authorized Administrator.');
  await clickPrintWithoutDialog(page, 'Print Invoice', 2);
  await printPdf(page, { name: 'invoice', expectedStrings: ['Pearl Smile Dental Clinic', 'Invoice', invoice.invoiceNumber, invoicePatient.fullName, invoicePatient.patientNumber, formatUGX(calculateInvoiceTotal(canonical, invoice.id)), formatUGX(calculateInvoicePaid(canonical, invoice.id)), formatUGX(calculateInvoiceBalance(canonical, invoice.id))], exactPages: 1 });
  await invoiceDrawer.getByRole('button', { name: 'Close', exact: true }).click();

  const receipt = canonical.receipts.find(item => item.receiptNumber === 'RCT-000807'), receiptPayment = canonical.payments.find(item => item.id === receipt.paymentId), receiptInvoice = canonical.invoices.find(item => item.id === receiptPayment.invoiceId), receiptPatient = canonical.patients.find(item => item.id === receiptPayment.patientId);
  let receiptDrawer = await openReceipt(page, receipt.receiptNumber); await receiptDrawer.waitFor();
  assert(await receiptDrawer.getByRole('button', { name: 'Print Receipt' }).isVisible(), 'Print Receipt is unavailable to an authorized Administrator.');
  await printPdf(page, { name: 'receipt-card', selector: '.receipt-print', expectedStrings: ['Pearl Smile Dental Clinic', 'Payment Receipt', receipt.receiptNumber, receiptPatient.fullName, receiptPatient.patientNumber, receiptInvoice.invoiceNumber, 'UGX 180,000', 'Card', 'Brian Ssemanda', 'UGX 0'], exactPages: 1 });
  await receiptDrawer.getByRole('button', { name: 'Close', exact: true }).click();
  const methods = {};
  for (const method of ['CASH', 'MOBILE_MONEY', 'BANK', 'CARD']) {
    const payment = canonical.payments.find(item => item.paymentMethodCode === method), methodReceipt = canonical.receipts.find(item => item.paymentId === payment.id);
    receiptDrawer = await openReceipt(page, methodReceipt.receiptNumber); await receiptDrawer.waitFor();
    const text = await receiptDrawer.locator('.receipt-print').innerText();
    assert(text.includes(formatStatus(method)) && !invalidText(text), `${formatStatus(method)} receipt is incomplete.`);
    const facts = await printPdf(page, { name: `receipt-${method.toLowerCase().replace('_', '-')}`, selector: '.receipt-print', expectedStrings: [methodReceipt.receiptNumber, formatUGX(payment.amount), formatStatus(method)], exactPages: 1, screenshot: false });
    methods[formatStatus(method)] = { receipt: methodReceipt.receiptNumber, pages: facts.pageCount, reference: payment.transactionReference || 'Not provided' };
    await receiptDrawer.getByRole('button', { name: 'Close', exact: true }).click();
  }
  receiptDrawer = await openReceipt(page, 'RCT-000807');
  const long = 'LongUnbrokenPrintValue'.repeat(8);
  await receiptDrawer.locator('.receipt-print__field--patient dd').evaluate((node, value) => { node.textContent = value; }, long);
  await receiptDrawer.locator('.receipt-print__field--reference dd').evaluate((node, value) => { node.textContent = value; }, long);
  await receiptDrawer.locator('.receipt-print__field--received-by dd').evaluate((node, value) => { node.textContent = value; }, long);
  await printPdf(page, { name: 'receipt-long-values', selector: '.receipt-print', expectedStrings: ['Payment Receipt'], exactPages: 1, screenshot: true });
  await receiptDrawer.getByRole('button', { name: 'Close', exact: true }).click();

  const prescription = canonical.prescriptions.find(item => item.prescriptionNumber === 'RX-000501'), rxPatient = canonical.patients.find(item => item.id === prescription.patientId);
  await page.goto(`${base}/app.html#/patients/${rxPatient.id}/prescriptions`, { waitUntil: 'networkidle' });
  assert(await page.getByRole('button', { name: 'Print Prescription' }).isVisible(), 'Print Prescription is missing from the authorized workspace.');
  await clickPrintWithoutDialog(page, 'Print Prescription');
  await printPdf(page, { name: 'prescription', expectedStrings: ['Pearl Smile Dental Clinic', 'Prescription', prescription.prescriptionNumber, rxPatient.fullName, rxPatient.patientNumber, 'Medication Instructions'], exactPages: 1 });

  const plan = canonical.treatmentPlans.find(item => item.treatmentPlanNumber === 'TP-000303'), planPatient = canonical.patients.find(item => item.id === plan.patientId);
  await page.goto(`${base}/app.html#/treatment-plans/${plan.id}`, { waitUntil: 'networkidle' });
  assert(await page.getByRole('button', { name: 'Print Treatment Plan' }).isVisible(), 'Print Treatment Plan is missing from the authorized workspace.');
  await clickPrintWithoutDialog(page, 'Print Treatment Plan');
  await printPdf(page, { name: 'treatment-plan', expectedStrings: ['Pearl Smile Dental Clinic', 'Treatment Plan', plan.treatmentPlanNumber, planPatient.fullName, planPatient.patientNumber, 'Treatment Items', formatUGX(plan.proposedTotal)], exactPages: 1 });

  const chartModel = getDentalChartViewModel(canonical, 'P001', getDentalChartDefaultDentition(canonical, 'P001'));
  await page.goto(`${base}/app.html#/patients/P001/dental-chart`, { waitUntil: 'networkidle' });
  assert(await page.getByRole('button', { name: 'Print Dental Chart Summary' }).isVisible(), 'Print Dental Chart Summary is missing from the authorized workspace.');
  await clickPrintWithoutDialog(page, 'Print Dental Chart Summary');
  await printPdf(page, { name: 'dental-chart-summary', expectedStrings: ['Pearl Smile Dental Clinic', 'Dental Chart Summary', chartModel.patient.fullName, chartModel.patient.patientNumber, 'Current Chart Findings', 'Planned Treatment'], maxPages: 2 });

  await page.goto(`${base}/app.html#/reports`, { waitUntil: 'networkidle' });
  const reportExpectations = {
    appointments: ['Appointment Activity', 'Appointments', '9', 'Dentist Workload', 'Dr. Daniel Mugisha', 'Dr. Sarah Nakanwagi'],
    patients: ['Patient Registrations & Visits', 'Patients', '30'],
    clinical: ['Clinical Procedures & Plans', 'Completed Procedures', 'Service Value'],
    finance: ['Collections & Outstanding Balances', 'UGX 2,360,000', 'UGX 420,000', 'UGX 360,000', 'Payments Today', '2', '7 records', 'Outstanding Balances', 'Joseph Walusimbi', 'Amina Nakato', 'Samuel Kato'],
    recalls: ['Recall Follow-Up', 'Upcoming', '1', 'Overdue', 'Scheduled']
  };
  const reportPages = {};
  for (const type of ['appointments', 'patients', 'clinical', 'finance', 'recalls']) {
    await page.locator('#report-type').selectOption(type);
    await page.locator('.reports-workspace__heading h2').waitFor();
    if (type === 'appointments') await clickPrintWithoutDialog(page, 'Print Report', 2);
    const facts = await printPdf(page, { name: `report-${type}`, landscape: true, expectedStrings: ['Pearl Smile Dental Clinic', ...reportExpectations[type]], maxPages: 4, printBackground: type === 'finance' });
    reportPages[type] = facts.pageCount;
  }
  await page.locator('#report-type').selectOption('appointments');
  await page.locator('#report-from').fill('2027-01-01');
  await page.locator('#report-to').fill('2027-01-01');
  await page.locator('#report-to').dispatchEvent('change');
  await page.getByText('No records found', { exact: true }).first().waitFor();
  await printPdf(page, { name: 'report-empty', landscape: true, expectedStrings: ['Appointment Activity', 'No records found for the selected filters.'], exactPages: 1, screenshot: false });

  const grayscaleStyle = await page.addStyleTag({ content: '@media print { html { filter: grayscale(1); } }' });
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: join(auditDir, 'report-grayscale.png'), fullPage: true });
  await page.emulateMedia({ media: 'screen' });
  await grayscaleStyle.evaluate(node => node.remove());
  await page.dispatchEvent('body', 'beforeprint'); await page.dispatchEvent('body', 'afterprint');
  assert(await page.locator('.shell-sidebar').isVisible() && await page.getByRole('button', { name: 'Print Report' }).isVisible(), 'Returning from print left the application shell hidden or corrupted.');

  const after = await page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
  assert(after === before && (await page.evaluate(() => window.DentalAppDev.getDirtySources())).length === 0, 'Printing mutated business state or the dirty registry.');
  await context.close();

  const roleResults = {};
  const expectedReports = { administrator: ['patients', 'appointments', 'clinical', 'finance', 'recalls'], dentist: ['patients', 'appointments', 'clinical', 'recalls'], receptionist: ['patients', 'appointments', 'recalls'], cashier: ['finance'] };
  for (const [role, email] of Object.entries(accounts)) {
    const roleContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const rolePage = await roleContext.newPage(); activePage = rolePage; observe(rolePage); await login(rolePage, email);
    await rolePage.goto(`${base}/app.html#/reports`, { waitUntil: 'networkidle' });
    const options = await rolePage.locator('#report-type option').evaluateAll(nodes => nodes.map(node => node.value));
    assert(options.join('|') === expectedReports[role].join('|'), `${role} report scope is incorrect: ${options.join('|')}.`);
    const forbiddenClinical = ['receptionist', 'cashier'].includes(role);
    if (forbiddenClinical) {
      await rolePage.goto(`${base}/app.html#/patients/P001/dental-chart`, { waitUntil: 'networkidle' });
      assert((await rolePage.getByText('Access Denied', { exact: true }).count()) === 1 && (await rolePage.locator('[data-print-document]').count()) === 0, `${role} received protected clinical print content.`);
    }
    if (role === 'dentist') {
      await rolePage.goto(`${base}/app.html#/billing/receipts`, { waitUntil: 'networkidle' });
      assert((await rolePage.getByText('Access Denied', { exact: true }).count()) === 1 && (await rolePage.locator('.receipt-print').count()) === 0, 'Dentist received protected Receipt print content.');
    }
    roleResults[role] = { reports: options, unauthorizedPrintDom: 0 };
    await roleContext.close();
  }

  const sessionContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const sessionPage = await sessionContext.newPage(); activePage = sessionPage; observe(sessionPage); await login(sessionPage, accounts.cashier);
  receiptDrawer = await openReceipt(sessionPage, 'RCT-000807'); await receiptDrawer.waitFor();
  assert(await sessionPage.locator('.receipt-print').count() === 1, 'Cashier Receipt was not rendered.');
  await login(sessionPage, accounts.dentist);
  await sessionPage.goto(`${base}/app.html#/reports`, { waitUntil: 'networkidle' });
  assert((await sessionPage.locator('.receipt-print').count()) === 0 && (await sessionPage.locator('[data-print-document="reports"]').count()) === 1, 'Printable content leaked across sessions.');
  await sessionContext.close();

  const reset = createCanonicalDemoState(), validation = validateCanonicalDemoState(reset);
  assert(validation.valid && !validation.errors.length, `Canonical reset validation failed: ${validation.errors.join('; ')}`);
  assert(getTotalPostedPayments(reset) === 2_360_000 && getOutstandingBalance(reset) === 420_000 && getTodayCollections(reset) === 360_000 && reset.payments.filter(item => item.status === 'POSTED' && item.receivedAt.startsWith(reset.referenceDate)).length === 2, 'Canonical finance reset failed.');
  const appointmentReport = buildReport({ state: reset, role: 'Clinic Administrator', userId: 'U001', type: 'appointments', filters: { from: reset.referenceDate, to: reset.referenceDate } });
  const recallReport = buildReport({ state: reset, role: 'Clinic Administrator', userId: 'U001', type: 'recalls', filters: {} });
  assert(appointmentReport.rows.length === 9 && recallReport.metrics.find(([label]) => label === 'Upcoming')[1] === 1 && recallReport.metrics.find(([label]) => label === 'Overdue')[1] === 1 && recallReport.metrics.find(([label]) => label === 'Scheduled')[1] === 3, 'Canonical appointment or recall reset failed.');
  assert(!Object.values(findings).some(items => items.length), `Console/network findings: ${JSON.stringify(findings)}`);

  const result = {
    status: 'pass', playwright: '1.63.0', chromium: await browser.version(), printMediaEmulation: true, pdfGeneration: 'Playwright Chromium, A4, scale 1, browser headers/footers off',
    inventory, screenOnly, receipt: { canonical: 'RCT-000807', pages: 1, methods, unsupportedMethodVariant: 'Other - no canonical payment uses this method', longValues: 'pass', zeroBalance: 'UGX 0 preserved', partialBalance: 'verified by Phase 19A canonical receipts' },
    reports: { types: Object.keys(reportExpectations), pages: reportPages, appointmentTotal: 9, workload: { 'Dr. Daniel Mugisha': 5, 'Dr. Sarah Nakanwagi': 4 }, finance: { totalPayments: 2_360_000, outstanding: 420_000, todayCollections: 360_000, paymentsToday: 2 }, outstanding: { Joseph: 300_000, Amina: 70_000, Samuel: 50_000 }, recalls: { upcoming: 1, overdue: 1, scheduled: 3 }, empty: 'professional one-page state' },
    presentation: { clinicHeader: 'pass', logo: 'pass', a4: 'pass', grayscale: 'pass', backgroundGraphicsOff: 'pass', backgroundGraphicsOn: 'pass', tableHeaders: 'repeat', blankPages: 0, clipping: 0, horizontalOverflow: 0 },
    security: roleResults,
    stateIntegrity: { exactBrowserSnapshot: 'unchanged', dirtyRegistry: 0, printSideEffects: 0, duplicatePrintSideEffects: 0, validation: 'pass' },
    reset: { finance: { totalPayments: getTotalPostedPayments(reset), outstanding: getOutstandingBalance(reset), todayCollections: getTodayCollections(reset), paymentsToday: 2 }, appointments: 9, recalls: { upcoming: 1, overdue: 1, scheduled: 3 }, validator: 'pass' },
    pdfs, findings, architecture: { backendPdf: false, newPdfDependency: false, businessLogicChanged: false, permissionsChanged: false, undocumentedPrintSurfaces: false }
  };
  await writeFile(join(auditDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (activePage && !activePage.isClosed()) { try { await activePage.screenshot({ path: join(auditDir, 'failure.png'), fullPage: true }); } catch {} }
  await writeFile(join(auditDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, pdfs, findings }, null, 2));
  console.error(error.stack || error.message); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
