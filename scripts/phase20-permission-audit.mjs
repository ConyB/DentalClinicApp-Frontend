import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4230;
const base = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase20');
const password = 'Demo@123';
const roles = ['Clinic Administrator', 'Dentist', 'Receptionist', 'Cashier'];
const accounts = [
  { role: 'Clinic Administrator', userId: 'U001', email: 'grace.admin@pearlsmiledental.test' },
  { role: 'Dentist', userId: 'U002', email: 'daniel.mugisha@pearlsmiledental.test', name: 'Daniel' },
  { role: 'Dentist', userId: 'U003', email: 'sarah.nakanwagi@pearlsmiledental.test', name: 'Sarah' },
  { role: 'Receptionist', userId: 'U004', email: 'lydia.reception@pearlsmiledental.test' },
  { role: 'Cashier', userId: 'U005', email: 'brian.cashier@pearlsmiledental.test' }
];
const expectedNavigation = {
  'Clinic Administrator': ['dashboard', 'patients', 'appointments', 'waiting-room', 'clinical/encounters', 'treatment-plans', 'procedures', 'billing/invoices', 'billing/payments', 'billing/receipts', 'outstanding-balances', 'recalls', 'reports', 'users', 'clinic-settings', 'profile'],
  Dentist: ['dashboard', 'appointments', 'waiting-room', 'patients', 'clinical/encounters', 'clinical/dental-chart', 'treatment-plans', 'procedures', 'prescriptions', 'recalls', 'reports', 'clinic-settings', 'profile'],
  Receptionist: ['dashboard', 'patients', 'appointments', 'waiting-room', 'recalls', 'reports', 'clinic-settings', 'profile'],
  Cashier: ['dashboard', 'patients', 'billing/invoices', 'billing/payments', 'billing/receipts', 'outstanding-balances', 'reports', 'clinic-settings', 'profile']
};
const routeMatrix = [
  ['dashboard', roles], ['patients', roles],
  ['appointments', roles.slice(0, 3)], ['waiting-room', roles.slice(0, 3)],
  ['clinical/encounters', roles.slice(0, 2)], ['clinical/dental-chart', ['Dentist']],
  ['treatment-plans', roles.slice(0, 2)], ['procedures', roles.slice(0, 2)], ['prescriptions', ['Dentist']],
  ['billing/invoices', ['Clinic Administrator', 'Cashier']], ['billing/payments', ['Clinic Administrator', 'Cashier']],
  ['billing/receipts', ['Clinic Administrator', 'Cashier']], ['outstanding-balances', ['Clinic Administrator', 'Cashier']],
  ['recalls', ['Clinic Administrator', 'Dentist', 'Receptionist']], ['reports', roles],
  ['users', ['Clinic Administrator']], ['clinic-settings', roles], ['profile', roles],
  ['patients/new', ['Clinic Administrator', 'Receptionist']], ['patients/P001/edit', ['Clinic Administrator', 'Dentist', 'Receptionist']],
  ['patients/P001', roles], ['patients/P001/appointments', roles],
  ['patients/P001/clinical-history', ['Clinic Administrator', 'Dentist']], ['patients/P001/clinical', ['Clinic Administrator', 'Dentist']],
  ['patients/P001/dental-chart', ['Clinic Administrator', 'Dentist']], ['patients/P001/treatment-plans', roles],
  ['patients/P001/treatment-plans/workspace', ['Clinic Administrator', 'Dentist']], ['patients/P001/prescriptions', ['Clinic Administrator', 'Dentist']],
  ['patients/P001/documents', ['Clinic Administrator', 'Dentist']], ['patients/P001/billing', roles], ['patients/P001/recalls', roles],
  ['clinical/encounters/ENC-000203', ['Clinic Administrator', 'Dentist']], ['treatment-plans/TP-000301', ['Clinic Administrator', 'Dentist']]
];
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], missingAssets: [], apiRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
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
const clearAndOpenLogin = async page => {
  await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
};
const login = async (page, account, { clear = true } = {}) => {
  if (clear) await clearAndOpenLogin(page); else await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(password);
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  await page.locator('.app-shell').waitFor();
  const toast = page.getByRole('button', { name: 'Dismiss notification' });
  if (await toast.count()) await toast.first().click();
};
const signOut = async page => {
  await page.getByLabel('Account menu').click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await page.waitForURL('**/index.html?signed-out');
  assert(await page.locator('.app-shell').count() === 0, 'Authenticated shell survived logout.');
};
const navRoutes = page => page.locator('.shell-sidebar .shell-nav__item').evaluateAll(links => links.map(link => link.getAttribute('href')?.replace(/^#\//, '')).filter(Boolean));
const mainText = page => page.locator('#main-content').innerText();
const noSensitiveDeniedDom = async page => {
  const html = await page.locator('#main-content').innerHTML();
  assert(!/clinical-workspace|dental-chart__|users-workspace|billing-workspace|payments-workspace|configuration__form/i.test(html), 'Denied route retained a protected workspace node.');
};
const stateAttack = async (page, kind) => page.evaluate(async attack => {
  const { state } = await import('/assets/js/core/state.js');
  const actors = { admin: { userId: 'U001', role: 'Clinic Administrator' }, daniel: { userId: 'U002', role: 'Dentist' }, receptionist: { userId: 'U004', role: 'Receptionist' }, cashier: { userId: 'U005', role: 'Cashier' } };
  const before = JSON.stringify(state.get()); let rejected = false;
  try {
    if (attack === 'patient') state.addPatient({ values: {}, actor: actors.cashier });
    if (attack === 'appointment') state.addAppointment({ values: {}, actor: actors.cashier });
    if (attack === 'encounter') state.startClinicalEncounter({ patientId: 'P001', actor: actors.receptionist });
    if (attack === 'medical') state.savePatientMedicalRecord({ type: 'allergy', patientId: 'P001', value: 'Injected', actor: actors.receptionist });
    if (attack === 'odontogram') state.addDentalFinding({ patientId: 'P001', toothCode: '11', conditionCode: 'CARIES', surfaces: ['F'], actor: actors.receptionist });
    if (attack === 'plan') state.createTreatmentPlan({ patientId: 'P001', actor: actors.receptionist });
    if (attack === 'procedure') state.recordProcedure({ patientId: 'P001', serviceId: 'SVC-001', actor: actors.receptionist });
    if (attack === 'prescription') state.createPrescription({ patientId: 'P001', items: [], actor: actors.receptionist });
    if (attack === 'document') state.createClinicalDocument({ patientId: 'P001', type: 'XRAY', title: 'Injected', capturedAt: '2026-09-21', fileMetadata: {}, actor: actors.receptionist });
    if (attack === 'invoice') state.createInvoice({ patientId: 'P001', items: [], actor: actors.daniel });
    if (attack === 'payment') state.recordPayment({ invoiceId: 'INV-000602', amount: 1, paymentMethodCode: 'CASH', actor: actors.daniel });
    if (attack === 'recall') state.createRecall({ values: {}, actor: actors.cashier });
    if (attack === 'user') state.createUser({ values: {}, actor: actors.daniel });
    if (attack === 'settings') state.updateSettings({ values: {}, actor: actors.daniel });
    if (attack === 'role-spoof') state.updateSettings({ values: {}, actor: { userId: 'U005', role: 'Clinic Administrator' } });
  } catch { rejected = true; }
  return { rejected, unchanged: JSON.stringify(state.get()) === before };
}, kind);

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({ headless: true });

  // Logged-out direct route and inactive-account preconditions.
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await context.newPage(); observe(page);
    await page.goto(`${base}/app.html#/users`, { waitUntil: 'networkidle' });
    await page.waitForURL('**/index.html?expired');
    assert(await page.locator('.app-shell').count() === 0, 'Logged-out direct route rendered the application shell.');
    await page.locator('#email').fill('miriam.old@pearlsmiledental.test'); await page.locator('#password').fill(password); await page.locator('#login-form button[type=submit]').click();
    assert((await page.locator('#login-error').innerText()).includes('inactive'), 'Inactive Miriam login was not denied.');
    await context.close();
  }

  const routeResults = {};
  for (const account of accounts) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await context.newPage(); page.setDefaultTimeout(8_000); observe(page);
    await login(page, account);
    const desktopNav = await navRoutes(page);
    assert(JSON.stringify(desktopNav) === JSON.stringify(expectedNavigation[account.role]), `${account.email}: desktop navigation mismatch.\nActual ${JSON.stringify(desktopNav)}`);
    const expectedGroups = account.role === 'Clinic Administrator' ? 2 : account.role === 'Dentist' ? 1 : 0;
    assert((await page.locator('.shell-nav__group').count()) === expectedGroups, `${account.email}: empty or unexpected navigation parent group.`);
    await page.setViewportSize({ width: 390, height: 844 });
    assert(JSON.stringify(await navRoutes(page)) === JSON.stringify(expectedNavigation[account.role]), `${account.email}: mobile navigation differs from desktop.`);
    await page.setViewportSize({ width: 1366, height: 768 });
    const checks = [];
    for (const [route, allowedRoles] of routeMatrix) {
      await page.goto(`${base}/app.html#/${route}`, { waitUntil: 'networkidle' });
      const allowed = allowedRoles.includes(account.role), text = await mainText(page);
      if (allowed) assert(!text.includes('Access Denied') && !text.includes('Workspace unavailable'), `${account.email}/${route}: authorized route was denied or unavailable.`);
      else { assert(text.includes('Access Denied') && await page.title() === 'Access Denied | Pearl Smile Dental Clinic', `${account.email}/${route}: unauthorized route was not denied.`); await noSensitiveDeniedDom(page); }
      checks.push([route, allowed ? 'allowed' : 'denied']);
    }
    await page.goto(`${base}/app.html#/not-a-phase20-route`, { waitUntil: 'networkidle' });
    assert((await mainText(page)).includes('Page Not Found') && !(await mainText(page)).includes('Grace Namutebi'), `${account.email}: invalid route leaked stale content.`);
    routeResults[account.name || account.role] = checks;
    await context.close();
  }

  // PHI, ownership, finance, administration, profile, reports, print and export checks.
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true }); const page = await context.newPage(); observe(page);
    await login(page, accounts[4]);
    await page.goto(`${base}/app.html#/patients/P001`, { waitUntil: 'networkidle' });
    let text = await mainText(page);
    assert(!/Penicillin|Hypertension|Clinical History|Dental Chart|Prescriptions|Clinical Notes/i.test(text), 'Cashier patient profile exposed clinical PHI.');
    const search = page.locator('.shell-header__search input'); await search.fill('Amina'); await page.getByRole('option', { name: /View Amina Nakato/ }).click(); await page.waitForURL('**#/patients/P001');
    assert(!/Penicillin|Hypertension|Clinical Notes/i.test(await mainText(page)), 'Cashier global search bypassed patient privacy.');
    await page.goto(`${base}/app.html#/billing/receipts`, { waitUntil: 'networkidle' });
    assert(!(await mainText(page)).includes('Clinical Notes'), 'Finance workspace contains clinical notes.');
    await page.goto(`${base}/app.html#/reports`, { waitUntil: 'networkidle' });
    assert(JSON.stringify(await page.locator('#report-type option').evaluateAll(options => options.map(option => option.value))) === JSON.stringify(['finance']), 'Cashier report catalogue contains unauthorized types.');
    const beforeOutput = await page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
    await page.evaluate(() => { window.print = () => { window.__phase20Printed = true; }; });
    await page.getByRole('button', { name: 'Print Report' }).click();
    assert(await page.evaluate(() => window.__phase20Printed === true), 'Authorized report print did not invoke print.');
    const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV' }).click(); const csv = await download;
    assert((await csv.suggestedFilename()).includes('finance-report.csv'), 'Cashier export was not finance-scoped.');
    assert(await page.evaluate(() => JSON.stringify(window.DentalAppDev.getState())) === beforeOutput, 'Print/export mutated application state.');
    await context.close();
  }
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await context.newPage(); observe(page);
    await login(page, accounts[3]);
    await page.goto(`${base}/app.html#/patients/P001`, { waitUntil: 'networkidle' }); const text = await mainText(page);
    assert(text.includes('Penicillin') && !text.includes('Hypertension') && !/Current Medications|Clinical Notes|Diagnosis/i.test(text), 'Receptionist safety summary scope is wrong.');
    await page.goto(`${base}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' }); await noSensitiveDeniedDom(page);
    await context.close();
  }
  {
    const ownership = [];
    for (const account of [accounts[0], accounts[1], accounts[2]]) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const page = await context.newPage(); observe(page); await login(page, account);
      await page.goto(`${base}/app.html#/clinical/encounters/ENC-000203`, { waitUntil: 'networkidle' });
      const editable = await page.getByRole('button', { name: 'Save Draft' }).count() > 0;
      assert(editable === (account.userId === 'U003'), `${account.email}: Sarah-owned Brenda draft mutation controls are wrong.`);
      assert(await page.getByRole('button', { name: 'Add Allergy' }).count() === (account.userId === 'U003' ? 1 : 0), `${account.email}: medical-history ownership controls are wrong.`);
      ownership.push([account.userId, editable ? 'editable' : 'read-only']); await context.close();
    }
    const context = await browser.newContext(); const page = await context.newPage(); observe(page); await login(page, accounts[2]);
    await page.goto(`${base}/app.html#/clinical/encounters/ENC-000202`, { waitUntil: 'networkidle' });
    assert(await page.getByRole('button', { name: 'Save Draft' }).count() === 0 && (await mainText(page)).includes('read-only'), 'Completed encounter is not locked.');
    await context.close();
  }
  {
    const context = await browser.newContext(); const page = await context.newPage(); observe(page); await login(page, accounts[0]);
    await page.goto(`${base}/app.html#/clinical/encounters/ENC-000203`, { waitUntil: 'networkidle' });
    assert(await page.getByRole('button', { name: 'Save Draft' }).count() === 0 && await page.getByRole('button', { name: 'Add Allergy' }).count() === 0, 'Administrator received routine clinical mutation controls.');
    await page.goto(`${base}/app.html#/users`, { waitUntil: 'networkidle' });
    assert((await mainText(page)).includes('Miriam Achieng') && await page.getByRole('button', { name: 'Add User' }).count() === 1, 'Administrator user management is incomplete.');
    await page.goto(`${base}/app.html#/clinic-settings`, { waitUntil: 'networkidle' });
    assert(await page.getByRole('button', { name: 'Save Changes' }).count() === 1, 'Administrator cannot edit settings.');
    await page.goto(`${base}/app.html#/profile`, { waitUntil: 'networkidle' });
    assert(await page.locator('input[name="role"], input[name="status"], input[name="userId"]').count() === 0, 'Profile exposes protected account fields.');
    assert(await page.locator('#password-current[type=password][autocomplete=current-password]').count() === 1 && await page.locator('#password-new[type=password][autocomplete=new-password]').count() === 1, 'Password controls are not privacy-safe.');
    await context.close();
  }
  for (const account of accounts.slice(1)) {
    const context = await browser.newContext(); const page = await context.newPage(); observe(page); await login(page, account);
    await page.goto(`${base}/app.html#/clinic-settings`, { waitUntil: 'networkidle' });
    assert(await page.getByRole('button', { name: 'Save Changes' }).count() === 0 && await page.locator('.configuration__form input:not([disabled])').count() === 0, `${account.email}: settings are not view-only.`);
    await page.goto(`${base}/app.html#/profile`, { waitUntil: 'networkidle' });
    assert((await page.locator('#profile-full-name').inputValue()).length > 0 && await page.locator('input[name="role"], input[name="status"], input[name="userId"]').count() === 0, `${account.email}: own profile boundary failed.`);
    await context.close();
  }

  // Store façade attacks must be rejected atomically, including a role-spoof attempt.
  {
    const context = await browser.newContext(); const page = await context.newPage(); observe(page); await login(page, accounts[0]);
    const attackKinds = ['patient', 'appointment', 'encounter', 'medical', 'odontogram', 'plan', 'procedure', 'prescription', 'document', 'invoice', 'payment', 'recall', 'user', 'settings', 'role-spoof'];
    for (const kind of attackKinds) { const result = await stateAttack(page, kind); assert(result.rejected && result.unchanged, `${kind}: store-boundary attack was not atomically denied.`); }
    const controls = await page.evaluate(async () => {
      const { state } = await import('/assets/js/core/state.js');
      const results = [];
      state.reset();
      const settings = state.updateSettings({ values: { clinicName: 'Pearl Smile Dental Clinic', branchName: 'Kampala Main Branch', phone: '+256 414 555 010', email: 'info@pearlsmiledental.test', address: 'Plot 9, Kampala Road, Kampala', defaultAppointmentMinutes: 30 }, actor: { userId: 'U001', role: 'Clinic Administrator' } }); results.push(settings.changed && Boolean(settings.audit));
      state.reset();
      const payment = state.recordPayment({ invoiceId: 'INV-000602', amount: 10000, paymentMethodCode: 'CASH', actor: { userId: 'U005', role: 'Cashier' } }); results.push(payment.payment.amount === payment.receipt.amount && payment.totals.balance === 60000);
      state.reset();
      const encounter = state.saveClinicalEncounterDraft({ encounterId: 'ENC-000203', values: { chiefComplaint: 'Follow-up discomfort', examinationNotes: 'Review completed.', clinicalNotes: 'Draft updated by responsible Dentist.', treatmentDiscussion: '', followUpNotes: '' }, actor: { userId: 'U003', role: 'Dentist' } }); results.push(encounter.changed);
      state.reset();
      const recall = state.createRecall({ values: { patientId: 'P009', recallTypeId: 'RECALL-TYPE-ROUTINE_DENTAL_REVIEW', dentistUserId: 'U003', dueDate: '2026-10-21', notes: 'Authorized control.' }, actor: { userId: 'U004', role: 'Receptionist' } }); results.push(Boolean(recall.recall));
      state.reset();
      return results;
    });
    assert(controls.every(Boolean), `Authorized store controls failed: ${JSON.stringify(controls)}`);
    await context.close();
  }

  // Tampered, stale and case-altered session roles fail closed.
  for (const injectedRole of ['Clinic Administrator', '', 'cashier']) {
    const context = await browser.newContext(); const page = await context.newPage(); observe(page); await login(page, accounts[4]);
    await page.evaluate(role => {
      const key = 'pearl-smile-dental.session';
      for (const area of [localStorage, sessionStorage]) { const raw = area.getItem(key); if (raw) { const value = JSON.parse(raw); value.role = role; area.setItem(key, JSON.stringify(value)); } }
    }, injectedRole);
    await page.goto(`${base}/app.html#/users`, { waitUntil: 'networkidle' }); await page.waitForURL('**/index.html?expired');
    assert(await page.locator('.app-shell').count() === 0, `Tampered role ${JSON.stringify(injectedRole)} received a shell.`); await context.close();
  }

  // Runtime role changes are recomputed at the next session, without stale grants.
  {
    const context = await browser.newContext(); const page = await context.newPage(); observe(page); await login(page, accounts[0]);
    await page.evaluate(async () => { const { state } = await import('/assets/js/core/state.js'); state.updateUser({ userId: 'U005', values: { fullName: 'Brian Ssemanda', email: 'brian.cashier@pearlsmiledental.test', phone: '+256 700 555 105', jobTitle: 'Cashier', roleCode: 'receptionist', status: 'active' }, actor: { userId: 'U001', role: 'Clinic Administrator' } }); });
    await signOut(page); await login(page, accounts[4], { clear: false });
    assert(JSON.stringify(await navRoutes(page)) === JSON.stringify(expectedNavigation.Receptionist), 'Role change did not recompute permissions after login.');
    assert(!(await navRoutes(page)).includes('billing/payments'), 'Old Cashier grant survived role change.');
    await page.evaluate(async () => { const { state } = await import('/assets/js/core/state.js'); state.reset(); }); await context.close();
  }

  // Cross-role session transitions must clear protected DOM and dirty sources.
  {
    const context = await browser.newContext(); const page = await context.newPage(); observe(page);
    await login(page, accounts[0]); await page.goto(`${base}/app.html#/users`, { waitUntil: 'networkidle' }); assert((await mainText(page)).includes('Miriam Achieng'), 'Admin sensitive route setup failed.'); await signOut(page);
    await login(page, accounts[4], { clear: false }); assert(!(await page.locator('body').innerText()).includes('Miriam Achieng') && !(await navRoutes(page)).includes('users'), 'Admin DOM leaked into Cashier session.'); await signOut(page);
    await login(page, accounts[2], { clear: false }); await page.goto(`${base}/app.html#/clinical/encounters/ENC-000203`, { waitUntil: 'networkidle' }); assert((await mainText(page)).includes('Clinical Encounter Documentation'), 'Dentist sensitive route setup failed.'); await signOut(page);
    await login(page, accounts[3], { clear: false }); assert(!(await page.locator('body').innerText()).includes('Clinical Encounter Documentation') && await page.evaluate(() => window.DentalAppDev.getDirtySources().length === 0), 'Clinical DOM or dirty state leaked into Receptionist session.'); await signOut(page);
    await login(page, accounts[4], { clear: false }); await page.goto(`${base}/app.html#/billing/receipts`, { waitUntil: 'networkidle' }); assert((await mainText(page)).includes('Receipts'), 'Cashier finance setup failed.'); await signOut(page);
    await login(page, accounts[1], { clear: false }); assert(!(await page.locator('body').innerText()).includes('RCT-000801') && !(await navRoutes(page)).includes('billing/receipts'), 'Finance DOM leaked into Dentist session.');
    await context.close();
  }

  assert(!Object.values(findings).some(items => items.length), `Browser console/network findings: ${JSON.stringify(findings)}`);
  const result = {
    status: 'pass', environment: 'Playwright Chromium headless', viewports: ['1366x768', '390x844'],
    navigation: Object.fromEntries(Object.entries(expectedNavigation).map(([role, routes]) => [role, { routes, desktop: 'pass', mobile: 'pass' }])),
    routes: { tested: routeMatrix.length * accounts.length, invalid: 'safe 404', deniedDomLeaks: 0 },
    authentication: { loggedOutDirectRoute: 'denied', inactiveMiriam: 'denied', tamperedRoles: 'denied', roleChangeRecomputed: true },
    privacy: { cashierClinicalPhi: 'not rendered', receptionist: 'allergy safety summary only', searchClickThrough: 'guarded' },
    ownership: { brendaDraft: { Sarah: 'editable', Daniel: 'read-only', Administrator: 'read-only' }, completedEncounter: 'locked' },
    store: { deniedAttackCases: 15, authorizedControls: 4, atomicStateDeltaOnDenied: 0 },
    output: { reportPrint: 'role-scoped', csv: 'role-scoped', stateSideEffects: 0 }, findings
  };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2));
  console.error(error.stack || error.message); process.exitCode = 1;
} finally {
  if (browser) await browser.close(); await new Promise(done => server.close(done));
}
