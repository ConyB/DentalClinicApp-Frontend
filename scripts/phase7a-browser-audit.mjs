import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.'), port = 4174, baseUrl = `http://127.0.0.1:${port}`, outputDir = join(root, 'tests', 'audits', 'output', 'phase7a');
const accounts = {
  admin: 'grace.admin@pearlsmiledental.test', daniel: 'daniel.mugisha@pearlsmiledental.test', receptionist: 'lydia.reception@pearlsmiledental.test', cashier: 'brian.cashier@pearlsmiledental.test'
};
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  const path = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '') || 'index.html')));
  if (!path.startsWith(root)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream' }); response.end(await readFile(path)); } catch { response.writeHead(404).end('Not Found'); }
});
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.shell-workspace').scrollWidth <= document.querySelector('.shell-workspace').clientWidth);
const noMojibake = page => page.locator('body').innerText().then(text => !/[\u00c2\u00c3\u00e2\ufffd]/.test(text));
const login = async (page, email) => {
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email); await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click(); await page.waitForURL('**/app.html#/dashboard');
};
const logout = async page => { await page.locator('.shell-header .dropdown summary').click(); await page.getByRole('menuitem', { name: 'Logout' }).click(); await page.waitForURL('**/index.html?signed-out'); };
const openPatients = async page => { await page.goto(`${baseUrl}/app.html#/patients`, { waitUntil: 'networkidle' }); await page.locator('.patient-registry').waitFor(); assert(await page.title() === 'Patients | Pearl Smile Dental Clinic', 'Patients title is incorrect'); };

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
page.on('pageerror', error => findings.pageErrors.push(error.message));
page.on('requestfailed', request => findings.failedRequests.push(request.url()));
page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });

try {
  await login(page, accounts.admin); await openPatients(page);
  assert(await page.locator('.patient-registry__summary').innerText().then(text => text.includes('Total Patients') && text.includes('30')), 'Registry total is not derived as 30');
  assert(await page.locator('.data-table tbody tr').count() === 10, 'Default page does not contain 10 patients');
  assert(await page.getByRole('button', { name: 'Add Patient' }).count(), 'Admin Add Patient action missing');
  assert(await page.locator('.shell-nav__item.is-active').innerText().then(text => text.includes('Patients')), 'Patients sidebar item is not active');
  const moduleSearch = page.locator('.patient-registry input[type=search]');
  for (const term of ['Amina', 'Nakato', 'Amina   Nakato', 'PAT-000001', '+256 701 100 001']) { await moduleSearch.fill(term); assert(await page.locator('.data-table tbody tr').count() === 1 && await page.locator('body').innerText().then(text => text.includes('Amina Nakato')), `Module search failed for ${term}`); }
  await moduleSearch.fill('no patient exists'); assert(await page.locator('.empty-state').innerText().then(text => text.includes('No patients found')), 'No-results empty state missing');
  await page.getByRole('button', { name: 'Clear Filters' }).click();
  const selects = page.locator('.patient-registry select');
  await selects.nth(0).selectOption('inactive'); assert(await page.locator('.data-table tbody tr').count() === 1 && await page.locator('body').innerText().then(text => text.includes('Daniel Tumusiime')), 'Inactive filter failed');
  await selects.nth(0).selectOption('all'); await selects.nth(1).selectOption('female'); assert(await page.locator('.pagination__summary').innerText().then(text => text.includes('16 patients')), 'Sex filter count is incorrect');
  await selects.nth(1).selectOption('all'); await selects.nth(2).selectOption('number-asc'); assert(await page.locator('.data-table tbody tr').first().innerText().then(text => text.includes('PAT-000001')), 'Patient number sort failed');
  await page.getByRole('button', { name: 'Next' }).click(); assert(await page.locator('.data-table tbody tr').count() === 10 && await page.locator('.data-table tbody tr').first().innerText().then(text => text.includes('PAT-000011')), 'Pagination did not advance correctly');
  await page.getByRole('button', { name: 'Previous' }).click();
  await page.locator('.data-table .dropdown summary').first().click(); await page.getByRole('menuitem', { name: 'View patient' }).click(); await page.locator('.patient-profile').waitFor(); assert(await page.locator('body').innerText().then(text => text.includes('Patient Profile') && text.includes('PAT-000001')), 'View action did not reach the patient profile');
  await openPatients(page); await page.getByRole('button', { name: 'Add Patient' }).click(); await page.locator('.patient-registration__form').waitFor(); assert(await page.title() === 'Register Patient | Pearl Smile Dental Clinic', 'Add Patient did not open the registration workflow');
  await openPatients(page); const globalSearch = page.locator('.shell-header input[type=search]'); await globalSearch.fill('Amina'); assert(await page.locator('.global-patient-search__results').innerText().then(text => text.includes('Amina Nakato')), 'Global search regressed on Patients page'); await globalSearch.fill('');
  const sidebarBefore = await page.locator('.shell-sidebar').boundingBox(), headerBefore = await page.locator('.shell-header').boundingBox(); await page.locator('.shell-workspace').evaluate(node => { node.scrollTop = node.scrollHeight; }); const sidebarAfter = await page.locator('.shell-sidebar').boundingBox(), headerAfter = await page.locator('.shell-header').boundingBox();
  assert(sidebarBefore.y === sidebarAfter.y && headerBefore.y === headerAfter.y, 'Static shell regression'); assert(await noOverflow(page), 'Desktop overflow detected'); assert(await noMojibake(page), 'Mojibake found on Patients page'); await page.locator('.shell-workspace').evaluate(node => { node.scrollTop = 0; });
  await page.screenshot({ path: join(outputDir, 'admin-desktop.png'), fullPage: true });
  await page.locator('button[aria-label="Toggle navigation"]').click(); assert(await page.locator('.app-shell--collapsed').count() && await noOverflow(page), 'Collapsed sidebar regression'); await page.locator('button[aria-label="Toggle navigation"]').click();
  await page.setViewportSize({ width: 1024, height: 768 }); await page.waitForTimeout(200); assert(await noOverflow(page), 'Tablet overflow detected'); await page.screenshot({ path: join(outputDir, 'admin-tablet.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200); assert(await page.locator('.patient-registry__cards').count() && await noOverflow(page), 'Mobile patient cards or layout failed'); await page.screenshot({ path: join(outputDir, 'admin-mobile.png'), fullPage: true });
  await logout(page);

  await page.setViewportSize({ width: 1440, height: 900 }); await login(page, accounts.receptionist); await openPatients(page);
  assert(await page.getByRole('button', { name: 'Add Patient' }).count(), 'Receptionist Add Patient action missing'); await page.locator('.data-table .dropdown summary').first().click(); assert(await page.getByRole('menuitem', { name: 'Edit patient' }).count(), 'Receptionist Edit action missing'); await logout(page);
  await login(page, accounts.daniel); await openPatients(page); await page.locator('.data-table .dropdown summary').first().click(); assert(!(await page.getByRole('button', { name: 'Add Patient' }).count()) && await page.getByRole('menuitem', { name: 'Edit patient' }).count(), 'Dentist patient permissions no longer match the approved limited-edit role'); await page.goto(`${baseUrl}/app.html#/dashboard`, { waitUntil: 'networkidle' }); assert(await page.locator('.dashboard').count(), 'Dentist dashboard regression'); await logout(page);
  await login(page, accounts.cashier); await openPatients(page); assert(!(await page.getByRole('button', { name: 'Add Patient' }).count()) && !(await page.locator('body').innerText()).includes('Edit patient'), 'Cashier received unauthorized patient actions'); await page.goto(`${baseUrl}/app.html#/patients/new`, { waitUntil: 'networkidle' }); assert(await page.locator('.empty-state').innerText().then(text => text.includes('Access Denied')), 'Cashier direct registration route was not denied'); await page.goto(`${baseUrl}/app.html#/dashboard`, { waitUntil: 'networkidle' }); assert(await page.locator('.dashboard').count(), 'Cashier dashboard regression');
  assert(!findings.consoleErrors.length, `Console errors: ${findings.consoleErrors.join(' | ')}`); assert(!findings.pageErrors.length, `Page errors: ${findings.pageErrors.join(' | ')}`); assert(!findings.warnings.length, `Console warnings: ${findings.warnings.join(' | ')}`); assert(!findings.failedRequests.length, `Failed requests: ${findings.failedRequests.join(' | ')}`); assert(!findings.failedAssets.length, `Failed assets: ${findings.failedAssets.join(' | ')}`);
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'pass', findings }, null, 2)); console.log(JSON.stringify({ status: 'pass', findings }, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2)); console.error(error.stack || error.message); process.exitCode = 1;
} finally { await context.close(); await browser.close(); await new Promise(done => server.close(done)); }
