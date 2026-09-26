import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4220;
const base = `http://127.0.0.1:${port}`;
const assert = (value, message) => { if (!value) throw new Error(message); };
const contentTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const server = createServer(async (request, response) => {
  const requested = decodeURIComponent(new URL(request.url, base).pathname.replace(/^\/+/, '')) || 'index.html';
  const file = normalize(join(root, requested));
  try {
    response.writeHead(200, { 'content-type': contentTypes[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});

const signIn = async (page, email, password = 'Demo@123') => {
  await page.goto(`${base}/index.html`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#login-form button[type=submit]').click();
};
const signOut = async page => {
  await page.evaluate(async () => { (await import('/assets/js/core/auth.js')).auth.signOut(); });
};
const state = page => page.evaluate(() => window.DentalAppDev.getState());
const dirtySources = page => page.evaluate(() => window.DentalAppDev.getDirtySources());
const auditCount = async (page, actionCode) => (await state(page)).auditLogs.filter(event => event.actionCode === actionCode).length;
const dismissToasts = async page => {
  const buttons = page.getByRole('button', { name: 'Dismiss notification' });
  while (await buttons.count()) { const button = buttons.first(); await button.click(); await button.waitFor({ state: 'detached' }); }
};

await mkdir(join(root, 'artifacts'), { recursive: true });
await new Promise(resolveListen => server.listen(port, '127.0.0.1', resolveListen));
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(5_000);
  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const failedRequests = [];
  const missingAssets = [];
  const apiRequests = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.stack || error.message));
  page.on('request', request => { if (/\/api\//i.test(new URL(request.url()).pathname)) apiRequests.push(request.url()); });
  page.on('requestfailed', request => failedRequests.push(`${request.url()} — ${request.failure()?.errorText || 'failed'}`));
  page.on('response', response => { if (response.status() >= 400) missingAssets.push(`${response.status()} ${response.url()}`); });

  await page.goto(`${base}/app.html`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await signIn(page, 'grace.admin@pearlsmiledental.test');
  await page.waitForURL('**/app.html#/dashboard');
  await dismissToasts(page);

  // Settings route authority and canonical render.
  await page.goto(`${base}/app.html#/clinic-settings`);
  assert(await page.title() === 'Settings | Pearl Smile Dental Clinic', 'Settings title missing.');
  assert(await page.locator('.configuration-workspace').count() === 1, 'Settings workspace root did not mount exactly once.');
  assert(await page.getByRole('heading', { name: 'Clinic Settings', exact: true }).count() >= 1, 'Settings heading missing.');
  const duration = page.getByLabel('Default appointment duration (minutes)');
  assert(await duration.count() === 1 && await page.locator('#settings-duration').count() === 1, 'Duration field selector or ID is not unique.');
  assert(await duration.getAttribute('type') === 'number' && await duration.getAttribute('min') === '10' && await duration.getAttribute('max') === '240', 'Duration control type or validation bounds changed.');
  assert(await duration.inputValue() === '30', 'Canonical duration value is not 30.');
  assert(await page.locator('label[for="settings-duration"]').count() === 1, 'Duration label is not associated with its control.');
  assert(await page.getByLabel('Clinic name').inputValue() === 'Pearl Smile Dental Clinic' && await page.getByLabel('Main branch').inputValue() === 'Kampala Main Branch', 'Canonical clinic identity did not render.');
  for (const label of ['Clinic phone', 'Clinic email', 'Clinic address']) assert(await page.getByLabel(label).count() === 1, `${label} did not render.`);
  assert(await page.getByRole('button', { name: 'Save Changes' }).count() === 1, 'Administrator save action missing.');

  // Source-scoped dirty navigation: Stay and Discard.
  await duration.fill('45');
  assert((await dirtySources(page)).includes('settings'), 'Settings did not become dirty.');
  await page.locator('details.dropdown summary').click();
  await page.locator('details.dropdown').getByRole('menuitem', { name: 'Logout' }).click();
  await page.getByRole('dialog', { name: 'Unsaved changes' }).getByRole('button', { name: 'Cancel' }).click();
  assert(page.url().endsWith('#/clinic-settings') && (await dirtySources(page)).includes('settings'), 'Logout did not protect the dirty settings draft.');
  await page.locator('a[href="#/dashboard"]').click();
  await page.getByRole('dialog', { name: 'Unsaved changes' }).getByRole('button', { name: 'Stay' }).click();
  assert(page.url().endsWith('#/clinic-settings') && await duration.inputValue() === '45' && (await dirtySources(page)).includes('settings'), 'Stay did not preserve the settings draft.');
  await page.locator('a[href="#/dashboard"]').click();
  await page.getByRole('dialog', { name: 'Unsaved changes' }).getByRole('button', { name: 'Discard and Leave' }).click();
  await page.waitForURL('**/app.html#/dashboard');
  assert(!(await dirtySources(page)).includes('settings'), 'Discard did not clear only the settings dirty source.');
  await page.goto(`${base}/app.html#/clinic-settings`);
  assert(await page.getByLabel('Default appointment duration (minutes)').inputValue() === '30', 'Discard mutated canonical settings.');

  // Invalid save is atomic and accessible.
  const settingsAuditsBeforeInvalid = await auditCount(page, 'SETTINGS_UPDATED');
  await page.getByLabel('Default appointment duration (minutes)').fill('9');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  const inlineError = page.locator('#settings-duration-error');
  assert(await inlineError.isVisible() && (await inlineError.innerText()).includes('between 10 and 240'), 'Invalid duration did not produce its inline validation error.');
  assert(await page.locator('#settings-duration').getAttribute('aria-invalid') === 'true' && await page.locator('#settings-duration').getAttribute('aria-errormessage') === 'settings-duration-error', 'Duration validation is not accessibly associated.');
  assert((await state(page)).clinicSettings.defaultAppointmentMinutes === 30 && await auditCount(page, 'SETTINGS_UPDATED') === settingsAuditsBeforeInvalid, 'Invalid duration partially mutated state or audit.');
  assert((await dirtySources(page)).includes('settings'), 'Invalid settings draft was not retained for correction.');

  // Valid save, repeated save, cross-dirty isolation, refresh, and reset.
  await page.getByLabel('Default appointment duration (minutes)').fill('45');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  assert((await state(page)).clinicSettings.defaultAppointmentMinutes === 45 && await auditCount(page, 'SETTINGS_UPDATED') === settingsAuditsBeforeInvalid + 1, 'Valid duration save or one-event audit failed.');
  assert(!(await dirtySources(page)).includes('settings') && await page.locator('.toast--success').count() === 1, 'Settings save did not clean its source or emit one success toast.');
  await dismissToasts(page);
  await page.evaluate(async () => { (await import('/assets/js/core/dirty-state.js')).dirtyState.markUnsavedChanges('user-management'); });
  await page.getByLabel('Clinic name').fill('Pearl Smile Dental Clinic Updated');
  await page.getByLabel('Default appointment duration (minutes)').fill('50');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  assert((await state(page)).clinicSettings.defaultAppointmentMinutes === 50 && (await state(page)).organization.name === 'Pearl Smile Dental Clinic Updated' && JSON.stringify(await dirtySources(page)) === JSON.stringify(['user-management']), 'Repeated settings save, branding state, or cross-dirty isolation failed.');
  await page.evaluate(async () => { (await import('/assets/js/core/dirty-state.js')).dirtyState.clearUnsavedChanges('user-management'); });
  await page.goto(`${base}/app.html#/dashboard`);
  assert(await page.getByText('Operational overview for Pearl Smile Dental Clinic Updated', { exact: true }).count() === 1, 'Central clinic branding did not propagate to its dashboard consumer.');
  await page.goto(`${base}/app.html#/clinic-settings`);
  assert(await page.getByLabel('Default appointment duration (minutes)').inputValue() === '50' && await page.getByLabel('Clinic name').inputValue() === 'Pearl Smile Dental Clinic Updated', 'Saved settings did not persist through refresh.');
  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  await page.reload();
  assert(await page.getByLabel('Default appointment duration (minutes)').inputValue() === '30', 'Reset did not restore canonical duration.');

  // Profile ownership, protected account fields, persistence, and password lifecycle.
  await page.goto(`${base}/app.html#/profile`);
  assert(await page.title() === 'My Profile | Pearl Smile Dental Clinic' && await page.getByRole('heading', { name: 'My Profile', exact: true }).count() >= 1, 'Profile route did not render.');
  assert(await page.getByLabel('Full name').inputValue() === 'Grace Namutebi' && await page.getByText('Clinic Administrator', { exact: true }).count() >= 1 && await page.getByText('Active', { exact: true }).count() >= 1, 'Current user, role, or status did not resolve.');
  assert(await page.locator('input[name="role"], input[name="status"], input[name="userId"]').count() === 0, 'Protected profile fields were exposed as editable controls.');
  await page.getByLabel('Phone', { exact: true }).fill('+256 700 555 198');
  assert((await dirtySources(page)).includes('profile'), 'Profile did not become dirty.');
  await page.locator('a[href="#/dashboard"]').click();
  await page.getByRole('dialog', { name: 'Unsaved changes' }).getByRole('button', { name: 'Stay' }).click();
  assert(page.url().endsWith('#/profile') && await page.getByLabel('Phone', { exact: true }).inputValue() === '+256 700 555 198', 'Stay did not preserve the profile draft.');
  await page.locator('a[href="#/dashboard"]').click();
  await page.getByRole('dialog', { name: 'Unsaved changes' }).getByRole('button', { name: 'Discard and Leave' }).click();
  await page.waitForURL('**/app.html#/dashboard');
  await page.goto(`${base}/app.html#/profile`);
  assert(await page.getByLabel('Phone', { exact: true }).inputValue() === '+256 700 555 101', 'Profile discard mutated central state.');
  await page.getByLabel('Full name').fill('Grace Namutebi Updated');
  await page.getByLabel('Phone', { exact: true }).fill('+256 700 555 199');
  await page.getByRole('button', { name: 'Save Profile' }).click();
  assert((await state(page)).users.find(user => user.id === 'U001').phone === '+256 700 555 199' && !(await dirtySources(page)).includes('profile'), 'Own profile did not save and clean its source.');
  await page.reload();
  assert(await page.getByLabel('Phone', { exact: true }).inputValue() === '+256 700 555 199' && await page.locator('.dropdown__trigger-label strong').innerText() === 'Grace Namutebi Updated', 'Profile update or current-user shell identity did not persist through refresh.');
  const protectedSnapshot = await page.evaluate(() => { const snapshot = window.DentalAppDev.getState(), user = snapshot.users.find(item => item.id === 'U001'); return { roleCode: user.roleCode, status: user.status, fullName: user.fullName, phone: user.phone }; });

  await page.locator('#password-current').fill('Wrong@123');
  await page.locator('#password-new').fill('NewPass@123');
  await page.locator('#password-confirmation').fill('NewPass@123');
  await page.getByRole('button', { name: 'Change Password' }).click();
  assert((await page.locator('.configuration__error:visible').last().innerText()).includes('Current password is incorrect'), 'Wrong current password was not rejected.');
  await page.locator('#password-current').fill('Demo@123');
  await page.locator('#password-confirmation').fill('Mismatch@123');
  await page.getByRole('button', { name: 'Change Password' }).click();
  assert((await page.locator('.configuration__error:visible').last().innerText()).includes('does not match'), 'Password mismatch was not rejected.');
  await page.locator('#password-confirmation').fill('NewPass@123');
  await page.getByRole('button', { name: 'Change Password' }).click();
  for (const [selector, label] of [['#password-current', 'Current password'], ['#password-new', 'New password'], ['#password-confirmation', 'Confirm new password']]) assert(await page.locator(selector).inputValue() === '', `${label} was not cleared after success.`);
  const afterPassword = await state(page);
  const protectedAfter = afterPassword.users.find(user => user.id === 'U001');
  assert(protectedAfter.roleCode === protectedSnapshot.roleCode && protectedAfter.status === protectedSnapshot.status && protectedAfter.fullName === protectedSnapshot.fullName && protectedAfter.phone === protectedSnapshot.phone, 'Password change mutated profile, role, or status.');
  const passwordAudit = afterPassword.auditLogs.at(-1);
  assert(passwordAudit.actionCode === 'PASSWORD_CHANGED' && !JSON.stringify(passwordAudit).includes('Demo@123') && !JSON.stringify(passwordAudit).includes('NewPass@123'), 'Password audit event is missing or contains a secret.');

  await signOut(page);
  await signIn(page, 'grace.admin@pearlsmiledental.test');
  assert((await page.locator('#login-error').innerText()).includes('Invalid'), 'Old password remained valid after rotation.');
  await signIn(page, 'grace.admin@pearlsmiledental.test', 'NewPass@123');
  await page.waitForURL('**/app.html#/dashboard');
  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  await signOut(page);
  await signIn(page, 'grace.admin@pearlsmiledental.test');
  await page.waitForURL('**/app.html#/dashboard');
  await signOut(page);
  await signIn(page, 'miriam.old@pearlsmiledental.test');
  assert((await page.locator('#login-error').innerText()).includes('inactive'), 'Inactive Miriam account was not denied.');

  // Limited settings access and own-profile resolution for every non-admin actor.
  const actors = [
    ['daniel.mugisha@pearlsmiledental.test', 'Dr. Daniel Mugisha', 'Dentist', true],
    ['sarah.nakanwagi@pearlsmiledental.test', 'Dr. Sarah Nakanwagi', 'Dentist', true],
    ['lydia.reception@pearlsmiledental.test', 'Lydia Akello', 'Receptionist', true],
    ['brian.cashier@pearlsmiledental.test', 'Brian Ssemanda', 'Cashier', false]
  ];
  for (const [email, name, role, seesDuration] of actors) {
    await signIn(page, email);
    await page.waitForURL('**/app.html#/dashboard');
    await dismissToasts(page);
    await page.goto(`${base}/app.html#/clinic-settings`);
    assert(await page.locator('.configuration-workspace').count() === 1 && await page.getByRole('button', { name: 'Save Changes' }).count() === 0, `${role} limited Settings view is incorrect.`);
    assert(await page.getByLabel('Clinic name').isDisabled(), `${role} received editable clinic identity.`);
    assert(await page.locator('#settings-duration').count() === (seesDuration ? 1 : 0), `${role} appointment-default visibility is incorrect.`);
    if (seesDuration) assert(await page.locator('#settings-duration').isDisabled(), `${role} received editable appointment defaults.`);
    await page.goto(`${base}/app.html#/profile`);
    assert(await page.getByLabel('Full name').inputValue() === name && await page.getByText(role, { exact: true }).count() >= 1, `${name} did not resolve to their own profile.`);
    const accountMenu = page.locator('details.dropdown');
    await accountMenu.locator('summary').click();
    assert(await accountMenu.getByRole('menuitem', { name: 'Profile' }).count() === 1 && await accountMenu.getByRole('menuitem', { name: 'Change Password' }).count() === 1 && await accountMenu.getByRole('menuitem', { name: 'Logout' }).count() === 1, `${name} account menu is incomplete.`);
    await signOut(page);
  }

  // Responsive rendering and global-overflow audit from a clean administrator session.
  await signIn(page, 'grace.admin@pearlsmiledental.test');
  await page.waitForURL('**/app.html#/dashboard');
  await dismissToasts(page);
  await page.goto(`${base}/app.html#/clinic-settings`);
  const viewportResults = {};
  for (const [width, height] of [[1440, 900], [1366, 768], [1280, 720], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width, height });
    if (width <= 992) await page.waitForFunction(() => document.querySelector('.shell-sidebar')?.getBoundingClientRect().right <= 0);
    const key = `${width}x${height}`;
    viewportResults[key] = await page.evaluate(() => { const selectors = ['.configuration-workspace', '.configuration-workspace .card', '.configuration-workspace .card__header', '.configuration-workspace .button', '.configuration-workspace label', '.configuration-workspace input']; const clipped = selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(node => { const box = node.getBoundingClientRect(); return box.left < -0.5 || box.right > window.innerWidth + 0.5; }).map(node => `${selector}:${node.id || node.textContent.trim().slice(0, 24)}`)); return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, clipped, durationVisible: Boolean(document.querySelector('#settings-duration')?.getClientRects().length), labelVisible: Boolean(document.querySelector('label[for="settings-duration"]')?.getClientRects().length), saveVisible: Boolean(document.querySelector('.configuration-workspace .button--primary')?.getClientRects().length) }; });
    assert(viewportResults[key].overflow <= 0 && viewportResults[key].clipped.length === 0 && viewportResults[key].durationVisible && viewportResults[key].labelVisible && viewportResults[key].saveVisible, `Settings responsive audit failed at ${key}: ${JSON.stringify(viewportResults[key])}`);
    if (width === 1366) await page.screenshot({ path: 'artifacts/phase17c-settings-1366x768.png', fullPage: true });
    if (width === 390) await page.screenshot({ path: 'artifacts/phase17c-settings-390x844.png', fullPage: true });
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator('#settings-duration').focus();
  assert(await page.locator('#settings-duration').evaluate(node => node.matches(':focus') && node.tabIndex >= 0), 'Duration field is not keyboard focusable.');

  assert(consoleErrors.length === 0, `Console errors: ${consoleErrors.join(' | ')}`);
  assert(consoleWarnings.length === 0, `Console warnings: ${consoleWarnings.join(' | ')}`);
  assert(pageErrors.length === 0, `Page errors: ${pageErrors.join(' | ')}`);
  assert(failedRequests.length === 0, `Failed requests: ${failedRequests.join(' | ')}`);
  assert(missingAssets.length === 0, `Missing assets: ${missingAssets.join(' | ')}`);
  assert(apiRequests.length === 0, `Unexpected API requests: ${apiRequests.join(' | ')}`);

  await context.close();
  console.log(JSON.stringify({
    status: 'pass',
    settings: { workspace: 'rendered', duration: { label: 'Default appointment duration (minutes)', selector: '#settings-duration', canonical: 30, validation: '10-240 integer', dirty: 'source-scoped', persistence: 'pass', reset: 'pass' }, roles: 'matrix-scoped' },
    profile: { ownership: 'pass', protectedFields: 'not editable', persistence: 'pass', accountMenu: 'pass' },
    password: { wrongCurrent: 'rejected', mismatch: 'rejected', rotation: 'pass', reset: 'pass', secretAuditLeakage: 0 },
    responsive: viewportResults,
    console: { errors: 0, warnings: 0, pageErrors: 0 },
    network: { failedRequests: 0, missingAssets: 0, apiRequests: 0 }
  }, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
