import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.'), port = 4220, baseUrl = `http://127.0.0.1:${port}`, outputDir = join(root, 'tests', 'audits', 'output', 'outstanding-balances');
const accounts = { admin: 'grace.admin@pearlsmiledental.test', cashier: 'brian.cashier@pearlsmiledental.test', daniel: 'daniel.mugisha@pearlsmiledental.test', sarah: 'sarah.nakanwagi@pearlsmiledental.test', receptionist: 'lydia.reception@pearlsmiledental.test' };
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], apiRequests: [], paymentProviderRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  const file = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('request', request => {
    const url = request.url();
    if (/\/api(?:\/|$)/i.test(new URL(url).pathname)) findings.apiRequests.push(url);
    if (/stripe|paypal|flutterwave|paystack|mtn|airtel/i.test(url)) findings.paymentProviderRequests.push(url);
  });
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async (page, email, { reset = true } = {}) => {
  await page.goto(`${baseUrl}/app.html`);
  if (reset) await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  const toast = page.getByRole('button', { name: 'Dismiss notification' });
  if (await toast.count()) await toast.click();
};
const stateOf = page => page.evaluate(() => window.DentalAppDev.getState());
const route = (page, value) => page.goto(`${baseUrl}/app.html#/${value}`, { waitUntil: 'networkidle' });
const rowFor = (page, invoiceNumber) => page.locator('.outstanding-balances tbody tr').filter({ hasText: invoiceNumber });
const openRowAction = async (page, invoiceNumber, action) => {
  const row = rowFor(page, invoiceNumber);
  await row.locator('summary').click();
  await row.getByRole('menuitem', { name: action, exact: true }).click();
};
const noGlobalOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.shell-workspace').scrollWidth <= document.querySelector('.shell-workspace').clientWidth);

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }), page = await context.newPage();
  observe(page);
  await login(page, accounts.cashier);
  await route(page, 'outstanding-balances');
  assert(await page.title() === 'Outstanding Balances | Pearl Smile Dental Clinic', 'Outstanding Balances browser title is incorrect.');
  const canonicalBody = await page.locator('body').innerText();
  assert(canonicalBody.includes('Outstanding Balance Register') && !canonicalBody.includes('implemented in a later approved phase'), 'The route still renders a placeholder.');
  assert(canonicalBody.includes('UGX 420,000') && canonicalBody.includes('Outstanding Invoices') && canonicalBody.includes('Patients with Balances'), 'Derived KPI cards are missing or incorrect.');
  const canonicalRows = await page.locator('.outstanding-balances tbody tr').allInnerTexts();
  assert(canonicalRows.length === 3 && canonicalRows[0].includes('INV-000605') && canonicalRows[0].includes('Joseph Walusimbi') && canonicalRows[0].includes('UGX 300,000') && canonicalRows[1].includes('INV-000602') && canonicalRows[1].includes('Amina Nakato') && canonicalRows[1].includes('UGX 70,000') && canonicalRows[2].includes('INV-000604') && canonicalRows[2].includes('Samuel Kato') && canonicalRows[2].includes('UGX 50,000'), 'Canonical rows or highest-balance ordering are incorrect.');
  assert(!canonicalBody.includes('INV-000601') && !canonicalBody.includes('INV-000603') && !canonicalBody.includes('INV-000606'), 'A fully paid invoice appears in the workspace.');

  const auditBeforeFilters = (await stateOf(page)).auditLogs.length;
  const search = () => page.getByRole('searchbox', { name: 'Search balances by invoice number, patient name, or patient ID' });
  await search().fill('Joseph'); assert(await page.locator('tbody tr').count() === 1 && (await page.locator('tbody tr').innerText()).includes('INV-000605'), 'Patient-name search failed.');
  await search().fill('PAT-000001'); assert(await page.locator('tbody tr').count() === 1 && (await page.locator('tbody tr').innerText()).includes('INV-000602'), 'Patient-ID search failed.');
  await search().fill('INV-000604'); assert(await page.locator('tbody tr').count() === 1 && (await page.locator('tbody tr').innerText()).includes('Samuel Kato'), 'Invoice-number search failed.');
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByLabel('Status').selectOption('ISSUED'); assert((await page.getByText('No matching outstanding balances').count()) === 1, 'Filtered empty state is missing.');
  await page.getByLabel('Status').selectOption('PARTIALLY_PAID'); assert(await page.locator('tbody tr').count() === 3, 'Outstanding status filter failed.');
  await page.getByLabel('Sort by').selectOption('date-oldest');
  await page.getByRole('button', { name: 'Reset' }).click();
  assert((await stateOf(page)).auditLogs.length === auditBeforeFilters && (await page.evaluate(() => window.DentalAppDev.getDirtySources())).length === 0, 'Read-only filters created persistence, audit, or dirty state.');

  await openRowAction(page, 'INV-000605', 'View Invoice');
  const invoiceDrawer = page.getByRole('complementary', { name: 'Invoice INV-000605' });
  await invoiceDrawer.waitFor();
  const drawerText = await invoiceDrawer.innerText();
  assert(drawerText.includes('Invoice total') && drawerText.includes('UGX 600,000') && drawerText.includes('Paid') && drawerText.includes('UGX 300,000') && drawerText.includes('Balance'), 'Existing invoice detail drawer was not reused correctly.');
  await invoiceDrawer.getByRole('button', { name: 'Close', exact: true }).click();

  await openRowAction(page, 'INV-000605', 'Record Payment');
  let paymentDialog = page.getByRole('dialog', { name: 'Record Payment' });
  assert(await paymentDialog.locator('#payment-invoice').inputValue() === 'INV-000605', 'Payment modal was not preselected from the balance row.');
  await paymentDialog.getByLabel('Amount Received (UGX)').fill('100000');
  await paymentDialog.getByLabel('Payment Method').selectOption('CASH');
  await page.locator('a[href="#/dashboard"]').first().evaluate(link => link.click());
  let discardDialog = page.getByRole('dialog', { name: 'Discard payment entry?' });
  await discardDialog.getByRole('button', { name: 'Stay' }).click();
  assert(await paymentDialog.isVisible() && await paymentDialog.getByLabel('Amount Received (UGX)').inputValue() === '100000' && await page.evaluate(() => location.hash !== '#/dashboard'), 'Stay did not preserve the dirty payment entry.');
  await page.locator('a[href="#/dashboard"]').first().evaluate(link => link.click());
  discardDialog = page.getByRole('dialog', { name: 'Discard payment entry?' });
  await discardDialog.getByRole('button', { name: 'Discard Payment' }).click();
  await page.waitForURL('**/app.html#/dashboard');
  assert((await stateOf(page)).invoices.find(invoice => invoice.id === 'INV-000605').balance === 300000 && (await page.evaluate(() => window.DentalAppDev.getDirtySources())).length === 0, 'Discard changed the balance or left dirty state behind.');

  await route(page, 'outstanding-balances');
  const canonicalState = await stateOf(page), canonicalPayments = canonicalState.payments.length, canonicalReceipts = canonicalState.receipts.length;
  await openRowAction(page, 'INV-000605', 'Record Payment');
  paymentDialog = page.getByRole('dialog', { name: 'Record Payment' });
  await paymentDialog.getByLabel('Amount Received (UGX)').fill('100000');
  await paymentDialog.getByLabel('Payment Method').selectOption('CASH');
  await paymentDialog.getByRole('button', { name: 'Record Payment' }).click();
  await paymentDialog.waitFor({ state: 'detached' });
  await page.getByText('Payment recorded.').waitFor();
  let runtime = await stateOf(page);
  assert(runtime.invoices.find(invoice => invoice.id === 'INV-000605').balance === 200000 && runtime.payments.length === canonicalPayments + 1 && runtime.receipts.length === canonicalReceipts + 1 && runtime.receipts.at(-1).amount === runtime.payments.at(-1).amount, 'Partial payment or receipt did not reconcile.');
  assert((await rowFor(page, 'INV-000605').innerText()).includes('UGX 200,000') && (await page.locator('.outstanding-balances').innerText()).includes('UGX 320,000'), 'Workspace did not refresh after partial settlement.');

  await route(page, 'dashboard'); assert((await page.locator('body').innerText()).includes('UGX 320,000'), 'Cashier Dashboard did not reconcile after partial settlement.');
  await route(page, 'patients/P010/billing'); const patientBody = await page.locator('body').innerText(); assert(patientBody.includes('Billing History') && patientBody.includes('INV-000605') && patientBody.includes('Balance UGX 200,000'), 'Patient Profile billing did not reconcile.');
  await route(page, 'reports'); assert((await page.locator('body').innerText()).includes('Current Outstanding') && (await page.locator('body').innerText()).includes('UGX 320,000'), 'Finance report did not reconcile.');
  await route(page, 'outstanding-balances');
  await openRowAction(page, 'INV-000605', 'View Invoice');
  assert((await page.getByRole('complementary', { name: 'Invoice INV-000605' }).innerText()).includes('UGX 200,000'), 'Invoice detail did not reconcile after payment.');
  await page.getByRole('complementary', { name: 'Invoice INV-000605' }).getByRole('button', { name: 'Close', exact: true }).click();

  await openRowAction(page, 'INV-000602', 'Record Payment');
  paymentDialog = page.getByRole('dialog', { name: 'Record Payment' });
  await paymentDialog.getByLabel('Amount Received (UGX)').fill('70000');
  await paymentDialog.getByLabel('Payment Method').selectOption('CASH');
  await paymentDialog.getByRole('button', { name: 'Record Payment' }).evaluate(button => { button.click(); button.click(); });
  await paymentDialog.waitFor({ state: 'detached' });
  runtime = await stateOf(page);
  assert(runtime.invoices.find(invoice => invoice.id === 'INV-000602').status === 'PAID' && runtime.invoices.find(invoice => invoice.id === 'INV-000602').balance === 0 && await rowFor(page, 'INV-000602').count() === 0 && runtime.payments.filter(payment => payment.invoiceId === 'INV-000602').length === 2, 'Full settlement did not remove Amina or double-submit protection failed.');

  await openRowAction(page, 'INV-000604', 'Record Payment');
  paymentDialog = page.getByRole('dialog', { name: 'Record Payment' });
  const beforeOverpay = JSON.stringify(await stateOf(page));
  await paymentDialog.getByLabel('Amount Received (UGX)').fill('50001');
  await paymentDialog.getByLabel('Payment Method').selectOption('CASH');
  await paymentDialog.getByRole('button', { name: 'Record Payment' }).click();
  assert(await paymentDialog.getByText(/cannot exceed the remaining balance/i).count() >= 1 && JSON.stringify(await stateOf(page)) === beforeOverpay, 'Overpayment was not rejected atomically.');
  await paymentDialog.getByRole('button', { name: 'Cancel' }).click();
  discardDialog = page.getByRole('dialog', { name: 'Discard payment entry?' }); await discardDialog.getByRole('button', { name: 'Discard Payment' }).click();

  for (const [invoiceNumber, amount] of [['INV-000604', '50000'], ['INV-000605', '200000']]) {
    await openRowAction(page, invoiceNumber, 'Record Payment');
    paymentDialog = page.getByRole('dialog', { name: 'Record Payment' });
    await paymentDialog.getByLabel('Amount Received (UGX)').fill(amount);
    await paymentDialog.getByLabel('Payment Method').selectOption('CASH');
    await paymentDialog.getByRole('button', { name: 'Record Payment' }).click();
    await paymentDialog.waitFor({ state: 'detached' });
  }
  assert(await page.getByText('No outstanding balances', { exact: true }).count() === 1 && await page.locator('.outstanding-balances tbody tr').count() === 0 && (await page.locator('.outstanding-balances').innerText()).includes('UGX 0'), 'Fully settled clinic state did not render the no-balances empty state.');

  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  await page.reload({ waitUntil: 'networkidle' });
  const reset = await stateOf(page);
  const resetText = await page.locator('.outstanding-balances').innerText();
  assert(reset.payments.length === 7 && reset.receipts.length === 7 && reset.invoices.find(invoice => invoice.id === 'INV-000605').balance === 300000 && resetText.includes('UGX 420,000'), `Demo reset did not restore canonical balances: payments=${reset.payments.length}, receipts=${reset.receipts.length}, Joseph=${reset.invoices.find(invoice => invoice.id === 'INV-000605').balance}, KPI=${resetText.includes('UGX 420,000')}.`);

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport); await route(page, 'outstanding-balances');
    await page.waitForTimeout(250);
    assert(await noGlobalOverflow(page), `Global horizontal overflow at ${viewport.width} × ${viewport.height}.`);
    const clipped = await page.evaluate(() => [...document.querySelectorAll('.outstanding-balances > .page-header, .outstanding-balances .kpi-card, .outstanding-balances > .billing-workspace__region > .card, .outstanding-balances .filter-bar, .outstanding-balances .table-wrap')].map(node => ({ className: node.className, ...node.getBoundingClientRect().toJSON() })).filter(box => box.left < -1 || box.right > innerWidth + 1));
    assert(!clipped.length, `Workspace content is clipped at ${viewport.width}px: ${JSON.stringify(clipped)}.`);
    assert(await page.getByRole('heading', { name: 'Outstanding Balances', level: 1 }).isVisible() && await page.getByRole('searchbox', { name: 'Search balances by invoice number, patient name, or patient ID' }).isVisible(), `Core controls are not visible at ${viewport.width}px.`);
    if (viewport.width === 1366 || viewport.width === 390) await page.screenshot({ path: join(outputDir, `outstanding-${viewport.width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('tbody tr').first().locator('td').nth(1).evaluate(cell => { cell.textContent = 'Joseph Walusimbi With An Exceptionally Long Demonstration Name · PAT-000010'; });
  await page.locator('tbody tr').first().locator('td').nth(5).evaluate(cell => { cell.textContent = 'UGX 9,999,999,999'; });
  assert(await noGlobalOverflow(page), 'Long patient name or large UGX value caused global overflow.');

  assert(await page.locator('.outstanding-balances__metrics[aria-label="Outstanding balance summary"]').count() === 1, 'KPI group lacks an accessible label.');
  assert(await page.locator('th[scope="col"]').count() === 8 && await page.locator('.badge').count() >= 3, 'Table headings or non-colour status badges are missing.');
  const tableWrap = page.locator('.outstanding-balances .table-wrap'); await tableWrap.focus(); assert(await tableWrap.evaluate(node => document.activeElement === node), 'Scrollable table region is not keyboard focusable.');
  const firstSummary = page.locator('.outstanding-balances tbody summary').first(); await firstSummary.focus(); await page.keyboard.press('Enter'); assert(await rowFor(page, 'INV-000605').getByRole('menuitem', { name: 'View Invoice' }).isVisible(), 'Row actions are not keyboard operable.'); await page.keyboard.press('Escape');

  for (const [role, email, allowed] of [['Clinic Administrator', accounts.admin, true], ['Cashier', accounts.cashier, true], ['Dr. Daniel', accounts.daniel, false], ['Dr. Sarah', accounts.sarah, false], ['Receptionist', accounts.receptionist, false]]) {
    const roleContext = await browser.newContext({ viewport: { width: 1280, height: 720 } }), rolePage = await roleContext.newPage(); observe(rolePage); await login(rolePage, email); await route(rolePage, 'outstanding-balances'); const body = await rolePage.locator('body').innerText();
    assert(allowed ? body.includes('Outstanding Balance Register') : body.includes('Access Denied'), `${role} route permission is incorrect.`);
    assert(allowed || (!body.includes('INV-000605') && !body.includes('Joseph Walusimbi') && !body.includes('UGX 420,000') && await rolePage.locator('.outstanding-balances').count() === 0), `${role} received unauthorized finance DOM.`);
    await roleContext.close();
  }

  const leakContext = await browser.newContext(), leakPage = await leakContext.newPage(); observe(leakPage); await login(leakPage, accounts.cashier); await route(leakPage, 'outstanding-balances');
  await leakPage.locator('summary[aria-label="Account menu"]').click(); await leakPage.getByRole('menuitem', { name: 'Logout' }).click(); await leakPage.waitForURL('**/index.html?signed-out');
  await leakPage.locator('#email').fill(accounts.daniel); await leakPage.locator('#password').fill('Demo@123'); await leakPage.locator('#login-form button[type=submit]').click(); await leakPage.waitForURL('**/app.html#/dashboard'); await route(leakPage, 'outstanding-balances'); const leakedBody = await leakPage.locator('body').innerText(); assert(leakedBody.includes('Access Denied') && !leakedBody.includes('INV-000605') && !leakedBody.includes('UGX 420,000'), 'Cashier finance DOM leaked into the next role session.'); await leakContext.close();

  const integrity = await page.evaluate(async () => { const { validateCanonicalDemoState } = await import('/assets/js/data/integrity.js'); return validateCanonicalDemoState(window.DentalAppDev.getState()); });
  assert(integrity.valid, integrity.errors.join(' | '));
  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', route: '#/outstanding-balances', canonical: { Joseph: 300000, Amina: 70000, Samuel: 50000, total: 420000, order: 'balance descending' }, workspace: { title: 'pass', kpis: 'pass', search: 'pass', filters: 'pass', sorting: 'pass', invoiceDrawer: 'pass', paymentModal: 'pass', emptyState: 'pass' }, roles: { admin: 'allowed', cashier: 'allowed', dentists: 'denied', receptionist: 'denied', sessionLeakage: 'none' }, payment: { dirtyGuard: 'stay/discard pass', partial: 'pass', full: 'pass', doubleSubmit: 'pass', overpayment: 'pass', receipt: 'pass' }, reconciliation: { dashboard: 'pass', patientProfile: 'pass', reports: 'pass', invoiceDetail: 'pass' }, responsive: ['1440×900', '1366×768', '1280×720', '1024×768', '390×844'], accessibility: 'pass', reset: 'canonical', findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
  await context.close();
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2));
  console.error(error.stack || error.message); process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
