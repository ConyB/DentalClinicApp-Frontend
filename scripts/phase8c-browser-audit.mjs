import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.'), port = 4179, baseUrl = `http://127.0.0.1:${port}`, outputDir = join(root, 'tests', 'audits', 'output', 'phase8c');
const accounts = { admin: 'grace.admin@pearlsmiledental.test', dentist: 'daniel.mugisha@pearlsmiledental.test', receptionist: 'lydia.reception@pearlsmiledental.test', cashier: 'brian.cashier@pearlsmiledental.test' };
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const server = createServer(async (request, response) => {
  const path = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '') || 'index.html')));
  if (!path.startsWith(root)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' }[extname(path)] || 'application/octet-stream' }); response.end(await readFile(path)); } catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async (page, email) => { await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' }); await page.locator('#email').fill(email); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click(); await page.waitForURL('**/app.html#/dashboard'); };
const open = async (page, id, section = '') => {
  await page.goto(`${baseUrl}/app.html#/patients/${id}${section ? `/${section}` : ''}`, { waitUntil: 'networkidle' });
  const dedicatedSections = {
    'dental-chart': ['.dental-chart', 'Dental Chart'],
    prescriptions: ['.prescriptions', 'Prescriptions'],
    documents: ['.documents-workspace', 'Documents']
  };
  const [selector, title] = dedicatedSections[section] || ['.patient-profile', 'Patient Profile'];
  await page.locator(selector).waitFor();
  const expectedTitle = `${title} | Pearl Smile Dental Clinic`;
  assert(await page.title() === expectedTitle, 'Patient route title is not privacy-safe');
};
const text = page => page.locator('body').innerText();
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.shell-workspace').scrollWidth <= document.querySelector('.shell-workspace').clientWidth);
const appState = page => page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
const expectedTabs = {
  admin: ['Overview', 'Appointments', 'Clinical', 'Dental Chart', 'Treatment Plans', 'Prescriptions', 'Documents', 'Billing', 'Recalls'],
  dentist: ['Overview', 'Appointments', 'Clinical', 'Dental Chart', 'Treatment Plans', 'Prescriptions', 'Documents', 'Billing', 'Recalls'],
  receptionist: ['Overview', 'Appointments', 'Treatment Plans', 'Billing', 'Recalls'],
  cashier: ['Overview', 'Appointments', 'Treatment Plans', 'Billing', 'Recalls']
};
const forbiddenTabs = { receptionist: ['Clinical', 'Dental Chart', 'Prescriptions', 'Documents'], cashier: ['Clinical', 'Dental Chart', 'Prescriptions', 'Documents'] };

await mkdir(outputDir, { recursive: true }); await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
try {
  for (const [role, email] of Object.entries(accounts)) {
    const context = await browser.newContext({ viewport: { width: role === 'receptionist' ? 1024 : 1440, height: 900 } }); const page = await context.newPage(); observe(page); await login(page, email); await open(page, 'P001');
    const navText = await page.locator('.patient-profile__nav').innerText();
    expectedTabs[role].forEach(tab => assert(navText.includes(tab), `${role} missing permitted ${tab} tab`));
    (forbiddenTabs[role] || []).forEach(tab => assert(!navText.includes(tab), `${role} received restricted ${tab} tab`));
    for (const tab of expectedTabs[role].filter(tab => tab !== 'Overview')) {
      const section = {
        Appointments: 'appointments',
        Clinical: 'clinical-history',
        'Dental Chart': 'dental-chart',
        'Treatment Plans': 'treatment-plans',
        Prescriptions: 'prescriptions',
        Documents: 'documents',
        Billing: 'billing',
        Recalls: 'recalls'
      }[tab];
      await open(page, 'P001', section);
      const contextSelector = ['dental-chart', 'prescriptions', 'documents'].includes(section) ? '.patient-context' : '.patient-profile__context';
      await page.locator(contextSelector).waitFor();
      assert((await page.locator(contextSelector).innerText()).includes('Amina Nakato'), `${role} stale patient context on ${tab}`);
    }
    assert(await noOverflow(page), `${role} profile overflow`); await context.close();
  }

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const admin = await adminContext.newPage(); observe(admin); await login(admin, accounts.admin); await open(admin, 'P001', 'dental-chart');
  let body = await text(admin); ['Tooth 16', 'Existing Treatment · M, O', 'Tooth 26', 'Condition · O', 'Tooth 46', 'Missing', 'Planned Treatment · O'].forEach(value => assert(body.includes(value), `Amina dental reconciliation missing ${value}`));
  await open(admin, 'P001', 'appointments'); body = await text(admin); ['APT-000094', 'APT-000103'].forEach(value => assert(body.includes(value), `Amina appointment reconciliation missing ${value}`)); await admin.reload({ waitUntil: 'networkidle' }); assert((await text(admin)).includes('APT-000103'), 'Direct appointment refresh failed');
  await open(admin, 'P001', 'clinical-history'); assert((await text(admin)).includes('ENC-000201'), 'Amina clinical reconciliation failed'); await open(admin, 'P001', 'treatment-plans'); assert((await text(admin)).includes('TP-000301'), 'Amina treatment reconciliation failed'); await open(admin, 'P001', 'documents'); assert((await text(admin)).includes('Upper Left Posterior X-Ray'), 'Amina document reconciliation failed'); await open(admin, 'P001', 'billing'); body = await text(admin); ['INV-000602', 'UGX 120,000', 'UGX 50,000', 'UGX 70,000', 'PAY-000702'].forEach(value => assert(body.includes(value), `Amina finance reconciliation missing ${value}`)); await open(admin, 'P001', 'recalls'); assert((await text(admin)).includes('REC-000905') && (await text(admin)).includes('APT-000103'), 'Amina recall relationship failed');
  await open(admin, 'P002', 'appointments'); assert((await text(admin)).includes('APT-000104'), 'Peter appointment reconciliation failed'); await open(admin, 'P002', 'clinical-history'); assert((await text(admin)).includes('ENC-000204'), 'Peter clinical reconciliation failed'); await open(admin, 'P002', 'billing'); body = await text(admin); ['INV-000603', 'PAY-000703', 'UGX 1,000,000', 'Bank', 'PAY-000704', 'UGX 500,000', 'Mobile Money'].forEach(value => assert(body.includes(value), `Peter split-payment reconciliation missing ${value}`)); await open(admin, 'P002', 'dental-chart'); body = await text(admin); ['Tooth 36', 'Root Canal Treated', 'Crown', 'Tooth 47', 'Restoration'].forEach(value => assert(body.includes(value), `Peter dental reconciliation missing ${value}`)); await open(admin, 'P002', 'documents'); body = await text(admin); ['Tooth 36 Pre-RCT X-Ray', 'Tooth 36 Post-RCT X-Ray'].forEach(value => assert(body.includes(value), `Peter documents missing ${value}`)); await open(admin, 'P002', 'recalls'); body = await text(admin); assert(body.includes('REC-000903') && body.includes('APT-000104'), 'Peter recall relationship failed');
  await open(admin, 'P013'); assert((await text(admin)).includes('Rose Ayaa'), 'Mercy guardian reconciliation failed'); await open(admin, 'P013', 'dental-chart'); body = await text(admin); ['Tooth 75', 'Tooth 84', 'Tooth 64', 'Observation'].forEach(value => assert(body.includes(value), `Mercy primary-dentition reconciliation missing ${value}`)); await open(admin, 'P004', 'treatment-plans'); body = await text(admin); ['TP-000303', 'Proposed UGX 450,000', 'Accepted UGX 330,000', 'Completed UGX 150,000'].forEach(value => assert(body.includes(value), `Samuel treatment reconciliation missing ${value}`)); await open(admin, 'P004', 'billing'); assert((await text(admin)).includes('UGX 50,000'), 'Samuel balance reconciliation failed'); await open(admin, 'P004', 'recalls'); body = await text(admin); assert(body.includes('REC-000902') && body.includes('Overdue'), 'Samuel recall reconciliation failed'); await open(admin, 'P003', 'treatment-plans'); body = await text(admin); ['PROC-000401', 'Scaling', 'UGX 180,000'].forEach(value => assert(body.includes(value), `Joan procedure reconciliation missing ${value}`)); await open(admin, 'P003', 'billing'); body = await text(admin); ['INV-000601', 'PAY-000701', 'RCT-000801'].forEach(value => assert(body.includes(value), `Joan finance reconciliation missing ${value}`)); await open(admin, 'P003', 'recalls'); body = await text(admin); assert(body.includes('REC-000901') && body.includes('Upcoming'), 'Joan recall reconciliation failed'); await open(admin, 'P007', 'recalls'); body = await text(admin); assert(body.includes('REC-000904') && body.includes('APT-000105'), 'Mariam recall relationship failed'); await open(admin, 'P009', 'clinical-history'); body = await text(admin); ['ENC-000203', 'Draft'].forEach(value => assert(body.includes(value), `Brenda draft reconciliation missing ${value}`));
  const beforeView = await appState(admin); for (const section of ['appointments', 'clinical-history', 'dental-chart', 'treatment-plans', 'documents', 'billing', 'recalls']) await open(admin, 'P001', section); assert(await appState(admin) === beforeView, 'Viewing profile sections mutated application state');
  await open(admin, 'P001'); await admin.locator('.shell-header__search input').fill('Peter'); await admin.getByRole('option', { name: 'View Peter Okello' }).click(); await admin.waitForURL('**/app.html#/patients/P002'); await open(admin, 'P013'); assert((await text(admin)).includes('Mercy Ayaa') && !(await text(admin)).includes('Peter Okello'), 'Profile route change retained stale patient data');
  await admin.goto(`${baseUrl}/app.html#/patients/P999`, { waitUntil: 'networkidle' }); assert((await text(admin)).includes('Patient Not Found'), 'Invalid patient route failed'); await admin.goto(`${baseUrl}/app.html#/patients/P001/not-a-section`, { waitUntil: 'networkidle' }); assert((await text(admin)).includes('Page Not Found'), 'Invalid profile section route failed safely');
  await open(admin, 'P001', 'billing'); const sidebarBefore = await admin.locator('.shell-sidebar').boundingBox(); await admin.locator('.shell-workspace').evaluate(node => { node.scrollTop = node.scrollHeight; }); const sidebarAfter = await admin.locator('.shell-sidebar').boundingBox(); assert(sidebarBefore.y === sidebarAfter.y && await noOverflow(admin), 'Static sidebar or desktop overflow failed'); await admin.locator('button[aria-label="Toggle navigation"]').click(); assert(await admin.locator('.app-shell--collapsed').count() && await noOverflow(admin), 'Collapsed sidebar profile layout failed'); await admin.screenshot({ path: join(outputDir, 'admin-billing-desktop.png'), fullPage: true }); await admin.goto(`${baseUrl}/app.html#/patients/P003/edit`, { waitUntil: 'networkidle' }); await admin.getByRole('button', { name: 'Deactivate Patient' }).click(); await admin.getByRole('button', { name: 'Deactivate Patient' }).last().click(); await open(admin, 'P003', 'billing'); body = await text(admin); assert(body.includes('Inactive') && body.includes('INV-000601'), 'Inactive patient did not retain visible profile history'); await admin.evaluate(() => window.DentalAppDev.resetDemoData()); await adminContext.close();

  const dentistContext = await browser.newContext(); const dentist = await dentistContext.newPage(); observe(dentist); await login(dentist, accounts.dentist); await open(dentist, 'P001'); assert((await text(dentist)).includes('Penicillin'), 'Dentist Amina safety alert missing'); await open(dentist, 'P002'); body = await text(dentist); assert(body.includes('Hypertension') && body.includes('Amlodipine'), 'Dentist Peter medical information missing'); await open(dentist, 'P004'); body = await text(dentist); assert(body.includes('Diabetes') && body.includes('Metformin'), 'Dentist Samuel medical information missing'); await dentistContext.close();

  const receptionistContext = await browser.newContext(); const receptionist = await receptionistContext.newPage(); observe(receptionist); await login(receptionist, accounts.receptionist); await open(receptionist, 'P002'); body = await text(receptionist); assert(!body.includes('Amlodipine') && !body.includes('Hypertension'), 'Receptionist received medical detail beyond allergy summary'); await receptionist.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' }); assert((await text(receptionist)).includes('Access Denied') && !(await text(receptionist)).includes('Penicillin'), 'Receptionist restricted clinical route exposed PHI'); await receptionistContext.close();

  const cashierContext = await browser.newContext({ viewport: { width: 390, height: 844 } }); const cashier = await cashierContext.newPage(); observe(cashier); await login(cashier, accounts.cashier); for (const id of ['P001', 'P002', 'P004']) { await open(cashier, id); body = await text(cashier); ['Penicillin', 'Hypertension', 'Amlodipine', 'Diabetes', 'Metformin', 'Clinical Encounters'].forEach(value => assert(!body.includes(value), `Cashier PHI leakage: ${value}`)); } await open(cashier, 'P001', 'billing'); assert(await noOverflow(cashier), 'Mobile billing overflow'); await cashier.screenshot({ path: join(outputDir, 'cashier-billing-mobile.png'), fullPage: true }); await cashier.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' }); body = await text(cashier); assert(body.includes('Access Denied') && !body.includes('Penicillin') && !body.includes('Caries'), 'Cashier protected clinical route leaked data'); await cashierContext.close();

  const runtimeContext = await browser.newContext(); const runtime = await runtimeContext.newPage(); observe(runtime); await login(runtime, accounts.receptionist); await runtime.goto(`${baseUrl}/app.html#/patients/new`, { waitUntil: 'networkidle' }); await runtime.locator('#patient-first-name').fill('Profile'); await runtime.locator('#patient-last-name').fill('Runtime'); await runtime.locator('#patient-date-of-birth').fill('1990-02-15'); await runtime.locator('#patient-sex').selectOption('female'); await runtime.locator('#patient-phone').fill('0712345777'); await runtime.getByRole('button', { name: 'Register Patient' }).click(); await runtime.waitForURL('**/app.html#/patients'); await open(runtime, 'P031', 'appointments'); assert((await text(runtime)).includes('No appointments recorded.'), 'Runtime patient appointment empty state failed'); await open(runtime, 'P031', 'billing'); assert((await text(runtime)).includes('No billing records found.'), 'Runtime patient billing empty state failed'); await runtime.goto(`${baseUrl}/app.html#/patients/P031/edit`, { waitUntil: 'networkidle' }); await runtime.locator('#patient-address').fill('Kampala'); await runtime.getByRole('button', { name: 'Save Changes' }).click(); await runtime.waitForURL('**/app.html#/patients'); await open(runtime, 'P031'); assert((await text(runtime)).includes('Kampala'), 'Runtime profile did not reflect edit'); await runtime.evaluate(() => window.DentalAppDev.resetDemoData()); await runtimeContext.close();

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) { const context = await browser.newContext({ viewport }); const page = await context.newPage(); observe(page); await login(page, accounts.admin); await open(page, 'P001', viewport.width === 390 ? 'billing' : viewport.width === 1024 ? 'dental-chart' : 'appointments'); assert(await noOverflow(page), `Responsive profile overflow at ${viewport.width}px`); await context.close(); }
  assert(!findings.consoleErrors.length, `Console errors: ${findings.consoleErrors.join(' | ')}`); assert(!findings.pageErrors.length, `Page errors: ${findings.pageErrors.join(' | ')}`); assert(!findings.warnings.length, `Console warnings: ${findings.warnings.join(' | ')}`); assert(!findings.failedRequests.length, `Failed requests: ${findings.failedRequests.join(' | ')}`); assert(!findings.failedAssets.length, `Failed assets: ${findings.failedAssets.join(' | ')}`);
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'pass', findings }, null, 2)); console.log(JSON.stringify({ status: 'pass', findings }, null, 2));
} catch (error) { await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2)); console.error(error.stack || error.message); process.exitCode = 1; } finally { await browser.close(); await new Promise(done => server.close(done)); }
