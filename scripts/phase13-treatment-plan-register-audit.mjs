import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.'), port = 4232, baseUrl = `http://127.0.0.1:${port}`, outputDir = join(root, 'tests', 'audits', 'output', 'treatment-plan-register');
const accounts = { administrator: 'grace.admin@pearlsmiledental.test', daniel: 'daniel.mugisha@pearlsmiledental.test', sarah: 'sarah.nakanwagi@pearlsmiledental.test', receptionist: 'lydia.reception@pearlsmiledental.test', cashier: 'brian.cashier@pearlsmiledental.test' };
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => { const file = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html')); if (!file.startsWith(root)) return response.writeHead(403).end(); try { response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); } catch { response.writeHead(404).end('Not Found'); } });
const observe = page => { page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); }); page.on('pageerror', error => findings.pageErrors.push(error.message)); page.on('requestfailed', request => findings.failedRequests.push(request.url())); page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); }); page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); }); };
const login = async (page, email, reset = true) => { await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' }); await page.evaluate(shouldReset => { if (shouldReset) localStorage.clear(); sessionStorage.clear(); }, reset); await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' }); await page.locator('#email').fill(email); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click(); await page.waitForURL('**/app.html#/dashboard'); const dismiss = page.getByRole('button', { name: 'Dismiss notification' }); if (await dismiss.count()) await dismiss.click(); };
const loginFromCurrentIndex = async (page, email) => { await page.locator('#email').fill(email); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click(); await page.waitForURL('**/app.html#/dashboard'); };
const getState = page => page.evaluate(() => window.DentalAppDev.getState());
const stateSnapshot = page => page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
const noGlobalOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.shell-workspace').scrollWidth <= document.querySelector('.shell-workspace').clientWidth);
const openRegister = async page => { await page.goto(`${baseUrl}/app.html#/treatment-plans`, { waitUntil: 'networkidle' }); await page.locator('.treatment-plan-register').waitFor(); };
const openPlanFromRow = async (page, planNumber) => { const row = page.locator('.treatment-plan-register__table tbody tr', { hasText: planNumber }); await row.locator('summary[aria-label="More actions"]').click(); await row.getByRole('menuitem', { name: 'View Plan' }).click(); await page.locator('.treatment-plan__detail').waitFor(); };
const assertNoInvalidText = async page => { const text = await page.locator('#main-content').innerText(); assert(!/nullnull|undefinedundefined|nullundefined|undefinednull|\[object Object\]|(?:^|\s)(?:null|undefined|NaN)(?=$|\s|[.,:;!?])/m.test(text), `Invalid rendered text found: ${text.match(/nullnull|undefinedundefined|nullundefined|undefinednull|\[object Object\]|(?:^|\s)(?:null|undefined|NaN)(?=$|\s|[.,:;!?])/m)?.[0]}`); };

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); observe(page);
  await login(page, accounts.administrator); const canonical = await stateSnapshot(page); await openRegister(page);
  assert(await page.title() === 'Treatment Plans | Pearl Smile Dental Clinic', 'Global route has an incorrect or privacy-unsafe browser title.');
  assert(await page.locator('.treatment-plan-register').count() === 1 && await page.getByRole('heading', { name: 'Treatment Plan Register' }).count() === 1, 'Global register did not render.');
  assert(await page.getByRole('heading', { name: 'Select a patient' }).count() === 0 && !(await page.locator('#main-content').innerText()).includes('Page Not Found'), 'Patient-only gateway or placeholder still owns the global route.');
  let registerText = await page.locator('.treatment-plan-register').innerText();
  for (const expected of ['TP-000301', 'Amina Nakato', 'TP-000302', 'Esther Atim', 'TP-000303', 'Samuel Kato', 'TP-000304', 'Mercy Ayaa', 'UGX 450,000', 'UGX 330,000', 'UGX 150,000']) assert(registerText.includes(expected), `Register is missing ${expected}.`);
  assert(await page.getByRole('button', { name: 'Open Patients' }).count() === 1 && await page.getByRole('button', { name: 'Create Treatment Plan' }).count() === 0, 'Administrator received a global clinical mutation action.');
  await assertNoInvalidText(page);

  const search = page.getByRole('searchbox', { name: 'Search treatment plans by patient name, patient number, or treatment plan ID' });
  await search.click(); await search.pressSequentially('samuel');
  assert(await search.inputValue() === 'samuel' && await search.evaluate(node => node === document.activeElement), 'Treatment plan search lost characters or focus.');
  assert(await page.locator('.treatment-plan-register .search-control [aria-label="Clear search"]').count() === 1 && await page.locator('.treatment-plan-register__table tbody tr').count() === 1 && (await page.locator('.treatment-plan-register__table tbody').innerText()).includes('Samuel Kato'), 'Search result or single clear control is incorrect.');
  await page.locator('.treatment-plan-register .search-control [aria-label="Clear search"]').click();
  assert(await search.inputValue() === '' && await search.evaluate(node => node === document.activeElement), 'Custom search clear did not retain focus.');
  await page.locator('#treatment-plan-status-filter').selectOption('PARTIALLY_ACCEPTED');
  assert(await page.locator('.treatment-plan-register__table tbody tr').count() === 1 && (await page.locator('.treatment-plan-register__table tbody').innerText()).includes('TP-000303'), 'Status filtering failed.');
  await page.getByRole('button', { name: 'Reset' }).click();
  assert(await page.locator('.treatment-plan-register__table tbody tr').count() === 4, 'Reset did not restore the complete register.');
  await page.locator('#treatment-plan-dentist-filter').selectOption('U002'); assert(await page.locator('.treatment-plan-register__table tbody tr').count() === 3, 'Dentist filtering does not use the modeled plan owner.'); await page.getByRole('button', { name: 'Reset' }).click();

  const patientRow = page.locator('.treatment-plan-register__table tbody tr', { hasText: 'TP-000301' }); await patientRow.locator('summary[aria-label="More actions"]').click(); await patientRow.getByRole('menuitem', { name: 'Open Patient' }).click(); await page.waitForURL('**/app.html#/patients/P001'); assert((await page.locator('#main-content').innerText()).includes('Amina Nakato'), 'Open Patient did not reuse Patient Profile.'); await openRegister(page);

  await openPlanFromRow(page, 'TP-000301'); let body = await page.locator('#main-content').innerText();
  assert(page.url().endsWith('#/treatment-plans/TP-000301') && body.includes('Amina Nakato') && body.includes('Tooth 26') && body.includes('In Progress') && body.includes('UGX 120,000'), 'Amina plan did not open in the frozen patient workspace.');
  assert(await page.getByRole('button', { name: 'Record Procedure' }).count() === 0 && await page.getByRole('button', { name: 'Accept', exact: true }).count() === 0 && await page.getByRole('button', { name: 'Add Treatment' }).count() === 0, 'Administrator received Dentist mutation controls.');
  assert(await page.title() === 'Treatment Plans | Pearl Smile Dental Clinic', 'Plan detail browser title leaks patient context.');
  await page.getByRole('button', { name: 'Back to Treatment Plan Register' }).click(); await page.locator('.treatment-plan-register').waitFor();
  await openPlanFromRow(page, 'TP-000303'); body = await page.locator('#main-content').innerText();
  for (const expected of ['Samuel Kato', 'UGX 450,000', 'UGX 330,000', 'UGX 150,000', 'Tooth 46', 'Tooth 47', 'Accepted', 'Declined', 'Completed', 'Planned']) assert(body.includes(expected), `Samuel detail is missing ${expected}.`);
  await page.getByRole('button', { name: 'Back to Treatment Plan Register' }).click(); await openPlanFromRow(page, 'TP-000304'); body = await page.locator('#main-content').innerText(); assert(body.includes('Mercy Ayaa') && body.includes('Tooth 75') && body.includes('Planned'), 'Mercy primary-tooth plan did not retain context.');
  await page.getByRole('button', { name: 'Back to Treatment Plan Register' }).click(); await openPlanFromRow(page, 'TP-000302'); body = await page.locator('#main-content').innerText(); assert(body.includes('Esther Atim') && body.includes('Tooth 21') && body.includes('Porcelain Crown') && body.includes('Proposed'), 'Esther proposed Crown plan is incorrect.');
  await page.goto(`${baseUrl}/app.html#/treatment-plans/TP-999999`, { waitUntil: 'networkidle' }); body = await page.locator('#main-content').innerText(); assert(body.includes('Treatment Plan Not Found') && !body.includes('Esther Atim') && !body.includes('Tooth 21'), 'Invalid plan route leaked stale patient data.');
  assert(await stateSnapshot(page) === canonical && (await page.evaluate(() => window.DentalAppDev.getDirtySources())).length === 0, 'Read-only register navigation mutated state or created a dirty source.');

  await login(page, accounts.daniel); await openRegister(page); assert(await page.locator('.treatment-plan-register__table tbody tr').count() === 4 && await page.getByRole('button', { name: 'Create Treatment Plan' }).count() === 1, 'Dr. Daniel register visibility or handoff is incorrect.'); await page.getByRole('button', { name: 'Create Treatment Plan' }).click(); await page.waitForURL('**/app.html#/patients'); await page.locator('.patient-registry').waitFor(); assert(await page.locator('.patient-registry').count() === 1 && await page.locator('.modal').count() === 0, 'Create Plan handoff bypassed patient context or opened a global mutation form.'); await openRegister(page);
  await openPlanFromRow(page, 'TP-000301'); assert(await page.getByRole('button', { name: 'Record Procedure' }).count() === 1, 'Dr. Daniel ownership action disappeared on his eligible plan.');
  await login(page, accounts.sarah); await openRegister(page); assert(await page.locator('.treatment-plan-register__table tbody tr').count() === 4, 'Dr. Sarah cannot view the approved register scope.');
  await openPlanFromRow(page, 'TP-000301'); assert(await page.getByRole('button', { name: 'Record Procedure' }).count() === 0 && await page.getByRole('button', { name: 'Accept', exact: true }).count() === 0, 'Dr. Sarah can mutate Dr. Daniel’s plan.');
  await page.goto(`${baseUrl}/app.html#/treatment-plans/TP-000302`, { waitUntil: 'networkidle' }); assert(await page.getByRole('button', { name: 'Accept', exact: true }).count() === 1, 'Dr. Sarah cannot act on her own eligible plan.');

  await login(page, accounts.administrator); await page.goto(`${baseUrl}/app.html#/treatment-plans/TP-000301`, { waitUntil: 'networkidle' });
  await page.locator('summary[aria-label="Account menu"]').click(); await page.getByRole('menuitem', { name: 'Logout' }).click(); await page.waitForURL('**/index.html?signed-out'); await loginFromCurrentIndex(page, accounts.cashier);
  const cashierLandingText = await page.locator('#main-content').innerText();
  assert(page.url().endsWith('#/dashboard') && !cashierLandingText.includes('TP-000301') && !cashierLandingText.includes('Tooth 26') && await page.locator('.treatment-plan').count() === 0, 'Treatment-plan context leaked across logout.');
  for (const [role, email] of [['Receptionist', accounts.receptionist], ['Cashier', accounts.cashier]]) { await login(page, email); await page.goto(`${baseUrl}/app.html#/treatment-plans`, { waitUntil: 'networkidle' }); const denied = await page.locator('body').innerText(); assert(denied.includes('Access Denied') && await page.locator('.treatment-plan-register').count() === 0 && !denied.includes('TP-000301') && !denied.includes('Tooth 26') && !denied.includes('UGX 120,000'), `${role} global route leaked plan PHI.`); await page.goto(`${baseUrl}/app.html#/treatment-plans/TP-000301`, { waitUntil: 'networkidle' }); const detailDenied = await page.locator('body').innerText(); assert(detailDenied.includes('Access Denied') && await page.locator('.treatment-plan').count() === 0 && !detailDenied.includes('Amina Nakato'), `${role} detail route leaked plan PHI.`); }

  await login(page, accounts.administrator);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) { await page.setViewportSize(viewport); await openRegister(page); assert(await noGlobalOverflow(page), `Global overflow at ${viewport.width}×${viewport.height}.`); assert(await search.isVisible() && await page.locator('#treatment-plan-status-filter').isVisible() && await page.locator('#treatment-plan-dentist-filter').isVisible(), `Register filters are unreachable at ${viewport.width}px.`); if (viewport.width === 390) assert(await page.locator('.treatment-plan-register__cards').isVisible() && await page.locator('.treatment-plan-register__cards').getByRole('button', { name: 'View Plan' }).first().isVisible(), 'Mobile plan cards or actions are unavailable.'); if (viewport.width === 1366 || viewport.width === 390) await page.screenshot({ path: join(outputDir, `register-${viewport.width}.png`), fullPage: true }); await assertNoInvalidText(page); }
  await page.setViewportSize({ width: 1366, height: 768 }); await page.goto(`${baseUrl}/app.html#/procedures`, { waitUntil: 'networkidle' }); assert(await page.locator('.procedure-history').count() === 1 && await page.getByRole('heading', { name: 'Completed Procedures' }).count() === 1 && !(await page.locator('#main-content').innerText()).includes('Select a patient'), 'Procedures Performed is not an implemented read-only register.');

  const reset = await page.evaluate(() => window.DentalAppDev.resetDemoData()); const resetState = await getState(page); const validation = await page.evaluate(async current => (await import('/assets/js/data/integrity.js')).validateCanonicalDemoState(current), resetState);
  assert(reset && validation.valid && validation.errors.length === 0 && resetState.treatmentPlans.length === 4, 'Demo reset or Phase 5 validation failed.');
  assert(resetState.payments.reduce((sum, payment) => sum + payment.amount, 0) === 2360000 && resetState.invoices.reduce((sum, invoice) => sum + invoice.balance, 0) === 420000 && resetState.payments.filter(payment => payment.receivedAt.slice(0, 10) === resetState.referenceDate).length === 2, 'Finance canonical state changed.');
  await context.close();
  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', route: 'global register', canonicalPlans: 'Amina/Esther/Samuel/Mercy pass', search: 'continuous/focus/single-clear pass', roles: 'administrator/Daniel/Sarah/receptionist/cashier pass', ownership: 'pass', isolation: 'read-only', responsive: '1440/1366/1280/1024/390 pass', proceduresRoute: 'implemented read-only register', phase5: 'pass', findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} catch (error) { await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2)); console.error(error.stack || error.message); process.exitCode = 1; }
finally { await browser.close(); await new Promise(done => server.close(done)); }
