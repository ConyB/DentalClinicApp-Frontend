import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { calculateInvoiceBalance, getOutstandingBalance, getTodayCollections, getTotalPostedPayments } from '../assets/js/data/finance.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';
import { paymentMethodLabel } from '../assets/js/data/payment-workflows.js';
import { formatDate, formatTime, formatUGX } from '../assets/js/utils/formatters.js';

const root = resolve('.');
const port = 4227;
const base = `http://127.0.0.1:${port}`;
const auditDir = join(root, 'tests', 'audits', 'output', 'phase19a');
const pdfDir = join(root, 'output', 'pdf');
const canonicalPdf = join(pdfDir, 'phase19a-payment-receipt.pdf');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], missingAssets: [], apiRequests: [] };
const checks = [];
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

const login = async page => {
  await page.goto(`${base}/app.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill('brian.cashier@pearlsmiledental.test');
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  const toast = page.getByRole('button', { name: 'Dismiss notification' });
  if (await toast.count()) await toast.first().click();
};

const openReceipt = async (page, receiptNumber) => {
  await page.emulateMedia({ media: 'screen' });
  await page.goto(`${base}/app.html#/billing/receipts`, { waitUntil: 'networkidle' });
  const row = page.locator('.data-table tbody tr', { hasText: receiptNumber });
  assert(await row.count() === 1, `${receiptNumber} is missing from Receipt History.`);
  await row.locator('summary[aria-label="More actions"]').click();
  await row.getByRole('menuitem', { name: 'View receipt' }).click();
  const drawer = page.getByRole('complementary', { name: `Receipt ${receiptNumber}` });
  await drawer.waitFor();
  return drawer;
};

const emulatePrint = async page => {
  await page.emulateMedia({ media: 'print' });
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.receipt-print__field--amount dd')).fontSize) >= 30);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};

const pdfFacts = buffer => {
  const source = buffer.toString('latin1');
  const pages = source.match(/\/Type\s*\/Page\b/g)?.length || 0;
  const box = source.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  return { pages, widthPoints: box ? Number(box[1]) : null, heightPoints: box ? Number(box[2]) : null };
};

const assertA4Pdf = (buffer, label) => {
  const facts = pdfFacts(buffer);
  assert(facts.pages === 1, `${label} generated ${facts.pages} PDF pages instead of one.`);
  assert(facts.widthPoints && facts.heightPoints && Math.abs(facts.widthPoints - 595.28) < 2 && Math.abs(facts.heightPoints - 841.89) < 2 && facts.heightPoints > facts.widthPoints, `${label} is not A4 portrait: ${JSON.stringify(facts)}`);
  return facts;
};

const printMetrics = page => page.locator('.receipt-print').evaluate(node => {
  const box = node.getBoundingClientRect();
  const visible = selector => { const item = document.querySelector(selector); return item && getComputedStyle(item).display !== 'none' && item.getClientRects().length > 0; };
  const rect = selector => { const item = node.querySelector(selector); const value = item?.getBoundingClientRect(); return value ? { top: value.top, bottom: value.bottom, left: value.left, right: value.right, width: value.width, height: value.height } : null; };
  return {
    width: box.width, height: box.height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
    brand: rect('.receipt-print__brand'), identity: rect('.receipt-print__title'), context: rect('.receipt-print__context'), amount: rect('.receipt-print__amount'), payment: rect('.receipt-print__payment'),
    amountFont: parseFloat(getComputedStyle(node.querySelector('.receipt-print__field--amount dd')).fontSize),
    normalFont: parseFloat(getComputedStyle(node.querySelector('.receipt-print__field--method dd')).fontSize),
    amountBorder: getComputedStyle(node.querySelector('.receipt-print__amount')).borderTopWidth,
    appChromeVisible: ['.shell-sidebar', '.shell-header', '.shell-footer', '.drawer__header', '.drawer__footer', '.toast-region'].some(visible),
    logo: { complete: node.querySelector('img').complete, naturalWidth: node.querySelector('img').naturalWidth, naturalHeight: node.querySelector('img').naturalHeight }
  };
});

const assertPrintLayout = (metric, label) => {
  assert(metric.width >= 650 && metric.width <= 680 && metric.scrollWidth <= metric.clientWidth + 1, `${label} printable width or overflow is incorrect: ${JSON.stringify(metric)}`);
  assert(!metric.appChromeVisible, `${label} still exposes application chrome in print.`);
  assert(metric.brand && metric.identity && Math.abs(metric.brand.top - metric.identity.top) < 3, `${label} print header is not balanced.`);
  assert(metric.context.top > Math.max(metric.brand.bottom, metric.identity.bottom) && metric.amount.top > metric.context.bottom && metric.payment.top > metric.amount.bottom, `${label} print reading order is incorrect.`);
  assert(metric.amountFont >= metric.normalFont * 2 && metric.amountBorder !== '0px', `${label} amount hierarchy is not print-safe.`);
  assert(metric.logo.complete && metric.logo.naturalWidth > 0 && metric.logo.naturalHeight > 0, `${label} clinic logo failed to load.`);
};

const canonical = createCanonicalDemoState();
const expectedReceipt = number => {
  const receipt = canonical.receipts.find(item => item.receiptNumber === number);
  const payment = canonical.payments.find(item => item.id === receipt.paymentId);
  const invoice = canonical.invoices.find(item => item.id === payment.invoiceId);
  const patient = canonical.patients.find(item => item.id === payment.patientId);
  const receivedBy = canonical.users.find(item => item.id === payment.receivedByUserId);
  return { receipt, payment, invoice, patient, receivedBy, balance: calculateInvoiceBalance(canonical, invoice.id) };
};

await mkdir(auditDir, { recursive: true });
await mkdir(pdfDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
let browser;
let page;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  page = await context.newPage();
  page.setDefaultTimeout(8_000);
  observe(page);
  await login(page);
  const initialState = await page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));

  const canonicalCase = expectedReceipt('RCT-000807');
  let drawer = await openReceipt(page, canonicalCase.receipt.receiptNumber);
  assert(await drawer.getByRole('button', { name: 'Print Receipt' }).isVisible(), 'Print Receipt action is not accessible in the screen drawer.');
  const screenText = await drawer.locator('.receipt-print').innerText();
  for (const value of [canonicalCase.receipt.receiptNumber, canonicalCase.patient.fullName, canonicalCase.patient.patientNumber, canonicalCase.invoice.invoiceNumber, formatUGX(canonicalCase.receipt.amount), paymentMethodLabel(canonicalCase.payment.paymentMethodCode), canonicalCase.payment.transactionReference, canonicalCase.receivedBy.fullName, `${formatDate(canonicalCase.receipt.issuedAt)} - ${formatTime(canonicalCase.receipt.issuedAt)}`, formatUGX(canonicalCase.balance)]) assert(screenText.includes(value), `Canonical receipt is missing ${value}.`);
  assert(!/[\s](?:null|undefined|NaN)(?:[\s.,:;!?]|$)|nullnull|undefinedundefined|\[object Object\]/i.test(screenText), 'Canonical screen receipt contains an invalid value artifact.');
  assert(!['VAT', 'Tax', 'TIN', 'Subtotal', 'Signature', 'QR code', 'Barcode'].some(value => screenText.includes(value)), 'Receipt contains an invented financial/legal field.');
  assert(!screenText.includes(canonicalCase.patient.phone) && !/Date of birth|Medical history|Clinical notes/i.test(screenText), 'Receipt exposes unnecessary patient or clinical data.');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Receipt drawer causes screen-level horizontal overflow.');
  await page.screenshot({ path: join(auditDir, 'receipt-screen-1366.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileDrawer = await drawer.boundingBox();
  assert(mobileDrawer && mobileDrawer.x >= -1 && mobileDrawer.x + mobileDrawer.width <= 391 && await drawer.getByRole('button', { name: 'Print Receipt' }).isVisible(), 'Receipt screen drawer or print action is unusable at 390px.');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.receipt-print').scrollWidth <= document.querySelector('.receipt-print').clientWidth), 'Receipt drawer causes mobile horizontal overflow.');
  await page.screenshot({ path: join(auditDir, 'receipt-screen-390.png'), fullPage: true });
  await page.setViewportSize({ width: 1366, height: 768 });

  await emulatePrint(page);
  let metric = await printMetrics(page);
  assertPrintLayout(metric, 'Canonical card receipt');
  await page.screenshot({ path: join(auditDir, 'receipt-print-emulation.png'), fullPage: true });
  const cardPdf = await page.pdf({ path: canonicalPdf, format: 'A4', printBackground: false, preferCSSPageSize: true, displayHeaderFooter: false, scale: 1 });
  const canonicalPdfFacts = assertA4Pdf(cardPdf, 'Canonical card receipt');
  checks.push({ receipt: 'RCT-000807', method: 'Card', balance: 0, pdf: canonicalPdfFacts, layout: metric });

  await page.emulateMedia({ media: 'screen' });
  await drawer.getByRole('button', { name: 'Close', exact: true }).click();
  for (const [number, method, balance, reference] of [['RCT-000802', 'Cash', 70_000, 'Not provided'], ['RCT-000806', 'Mobile Money', 300_000, 'DEMO-MM-706']]) {
    const record = expectedReceipt(number);
    drawer = await openReceipt(page, number);
    const text = await drawer.locator('.receipt-print').innerText();
    for (const value of [method, reference, formatUGX(record.receipt.amount), formatUGX(balance)]) assert(text.includes(value), `${number} is missing ${value}.`);
    await emulatePrint(page);
    metric = await printMetrics(page);
    assertPrintLayout(metric, `${number} ${method} receipt`);
    const pdf = await page.pdf({ format: 'A4', printBackground: false, preferCSSPageSize: true, displayHeaderFooter: false, scale: 1 });
    checks.push({ receipt: number, method, balance, pdf: assertA4Pdf(pdf, `${number} ${method} receipt`), layout: metric });
    await page.emulateMedia({ media: 'screen' });
    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
  }

  drawer = await openReceipt(page, 'RCT-000807');
  const longValue = 'ExceptionallyLongReceiptReferenceWithoutNaturalBreaks'.repeat(4);
  await drawer.locator('.receipt-print__field--patient dd').evaluate((node, value) => { node.textContent = `Sharon ${value} Apio`; }, longValue);
  await drawer.locator('.receipt-print__field--reference dd').evaluate((node, value) => { node.textContent = value; }, longValue);
  await drawer.locator('.receipt-print__field--received-by dd').evaluate((node, value) => { node.textContent = `Brian ${value} Ssemanda`; }, longValue);
  await emulatePrint(page);
  metric = await printMetrics(page);
  assertPrintLayout(metric, 'Long-value stress receipt');
  const stressPdf = await page.pdf({ format: 'A4', printBackground: false, preferCSSPageSize: true, displayHeaderFooter: false, scale: 1 });
  assertA4Pdf(stressPdf, 'Long-value stress receipt');
  await page.screenshot({ path: join(auditDir, 'receipt-print-long-values.png'), fullPage: true });
  checks.push({ receipt: 'temporary long-value stress', result: 'pass', layout: metric });

  const grayscaleStyle = await page.addStyleTag({ content: '@media print { html { filter: grayscale(1); } }' });
  await page.screenshot({ path: join(auditDir, 'receipt-print-grayscale.png'), fullPage: true });
  await grayscaleStyle.evaluate(node => node.remove());
  const logoFallback = await drawer.locator('.receipt-print__brand').evaluate(node => {
    const image = node.querySelector('img'), heading = node.querySelector('h1');
    image.hidden = true;
    const brand = node.getBoundingClientRect(), title = heading.getBoundingClientRect();
    return { brandWidth: brand.width, titleWidth: title.width, titleHeight: title.height, overflow: node.scrollWidth - node.clientWidth };
  });
  assert(logoFallback.brandWidth > 200 && logoFallback.titleWidth > 150 && logoFallback.titleHeight > 15 && logoFallback.overflow <= 1, `Logo fallback collapses receipt branding: ${JSON.stringify(logoFallback)}`);
  checks.push({ receipt: 'logo failure fallback', result: 'pass', layout: logoFallback });

  const resetState = await page.evaluate(() => window.DentalAppDev.resetDemoData());
  const validation = validateCanonicalDemoState(resetState);
  assert(validation.valid && validation.errors.length === 0, `Canonical reset failed validation: ${validation.errors.join('; ')}`);
  assert(JSON.stringify(resetState) === initialState, 'Canonical state changed during receipt print testing.');
  assert(getTotalPostedPayments(resetState) === 2_360_000 && getOutstandingBalance(resetState) === 420_000 && getTodayCollections(resetState) === 360_000 && resetState.payments.filter(item => item.status === 'POSTED' && item.receivedAt.startsWith(resetState.referenceDate)).length === 2, 'Canonical finance totals changed during receipt printing.');
  assert(resetState.payments.length === 7 && resetState.receipts.length === 7 && resetState.payments.every(payment => resetState.receipts.filter(receipt => receipt.paymentId === payment.id).length === 1), 'Receipt-to-payment relationships changed.');
  assert(!Object.values(findings).some(values => values.length), `Browser console/network findings: ${JSON.stringify(findings)}`);

  const result = { status: 'pass', playwright: '1.63.0', browser: await browser.version(), page: { size: 'A4', orientation: 'portrait', scale: 1, pages: 1, printBackground: false }, canonical: { receipt: canonicalCase.receipt.receiptNumber, patient: canonicalCase.patient.fullName, patientId: canonicalCase.patient.patientNumber, invoice: canonicalCase.invoice.invoiceNumber, amount: canonicalCase.receipt.amount, method: paymentMethodLabel(canonicalCase.payment.paymentMethodCode), reference: canonicalCase.payment.transactionReference, receivedBy: canonicalCase.receivedBy.fullName, date: `${formatDate(canonicalCase.receipt.issuedAt)} - ${formatTime(canonicalCase.receipt.issuedAt)}`, remainingBalance: canonicalCase.balance }, checks, reset: { validator: 'pass', totalPayments: getTotalPostedPayments(resetState), outstanding: getOutstandingBalance(resetState), todayCollections: getTodayCollections(resetState), paymentsToday: 2 }, findings, pdf: canonicalPdf.replace(root, '').replace(/^[/\\]/, '') };
  await writeFile(join(auditDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await context.close();
} catch (error) {
  if (page && !page.isClosed()) { try { await page.screenshot({ path: join(auditDir, 'failure.png'), fullPage: true }); } catch {} }
  await writeFile(join(auditDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, checks, findings }, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
