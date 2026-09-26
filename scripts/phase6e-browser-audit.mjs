import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const outputDir = join(root, 'tests', 'audits', 'output', 'phase6e');
const port = 4173;
const baseUrl = `http://127.0.0.1:${port}`;
const demoPassword = 'Demo@123';
const accounts = {
  admin: { email: 'grace.admin@pearlsmiledental.test', role: 'Clinic Administrator' },
  daniel: { email: 'daniel.mugisha@pearlsmiledental.test', role: 'Dentist' },
  sarah: { email: 'sarah.nakanwagi@pearlsmiledental.test', role: 'Dentist' },
  receptionist: { email: 'lydia.reception@pearlsmiledental.test', role: 'Receptionist' },
  cashier: { email: 'brian.cashier@pearlsmiledental.test', role: 'Cashier' },
  inactive: { email: 'miriam.old@pearlsmiledental.test' }
};
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [] };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const textHas = async (page, value) => (await page.locator('body').innerText()).includes(value);
const noMojibake = async page => !/[\u00c2\u00c3\u00e2\ufffd]/.test(await page.locator('body').innerText());

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, baseUrl).pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = normalize(join(root, relativePath));
  if (!filePath.startsWith(root)) { response.writeHead(403).end(); return; }
  try {
    const file = await readFile(filePath);
    response.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(file);
  } catch {
    response.writeHead(404).end('Not Found');
  }
});

const attachObservability = page => {
  page.on('console', message => {
    if (message.type() === 'error') findings.consoleErrors.push(message.text());
    if (message.type() === 'warning') findings.warnings.push(message.text());
  });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText || 'failed'}`));
  page.on('response', response => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`);
  });
};

const login = async (page, account) => {
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(demoPassword);
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  await page.locator('.dashboard').waitFor();
  assert(await page.title() === 'Dashboard | Pearl Smile Dental Clinic', `${account.email}: dashboard title is not privacy-safe`);
};

const logout = async page => {
  await page.locator('.dropdown summary').click();
  for (const label of ['Profile', 'Change Password', 'Logout']) assert(await page.getByRole('menuitem', { name: label }).count(), `Account menu item missing: ${label}`);
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await page.waitForURL('**/index.html?signed-out');
  assert(!(await page.locator('.app-shell').count()), 'Authenticated shell remained after logout');
};

const dashboardOverflow = async page => {
  const metrics = await page.evaluate(() => ({ documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, workspaceOverflow: document.querySelector('.shell-workspace').scrollWidth > document.querySelector('.shell-workspace').clientWidth }));
  assert(!metrics.documentOverflow && !metrics.workspaceOverflow, 'Horizontal overflow detected');
};
const documentOverflow = async page => assert(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), 'Horizontal document overflow detected');
const mobileShellAudit = async page => {
  await page.waitForTimeout(200);
  assert(!(await page.locator('.app-shell--mobile-open').count()), 'Mobile sidebar was open before interaction');
  const hiddenPosition = await page.locator('.shell-sidebar').boundingBox();
  const sidebarStyle = await page.locator('.shell-sidebar').evaluate(node => ({ position: getComputedStyle(node).position, transform: getComputedStyle(node).transform, mediaMatches: matchMedia('(max-width: 62rem)').matches }));
  assert(hiddenPosition.x + hiddenPosition.width <= 1, `Mobile sidebar was not fully off-canvas (x: ${hiddenPosition.x}, width: ${hiddenPosition.width}, ${JSON.stringify(sidebarStyle)})`);
  await page.locator('button[aria-label="Toggle navigation"]').click();
  assert(await page.locator('.app-shell--mobile-open').count(), 'Mobile navigation did not open');
  await page.locator('.shell-backdrop').click();
  assert(!(await page.locator('.app-shell--mobile-open').count()), 'Mobile navigation did not close');
};

const screenshot = (page, name) => page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: true });

const desktopShellAudit = async (page, { tooltipLabels, screenshotName }) => {
  const sidebarBefore = await page.locator('.shell-sidebar').boundingBox();
  const headerBefore = await page.locator('.shell-header').boundingBox();
  const branchBefore = await page.locator('.shell-sidebar__footer').boundingBox();
  const scroll = await page.locator('.shell-workspace').evaluate(node => { node.scrollTop = node.scrollHeight; return { top: node.scrollTop, bodyScrollable: document.scrollingElement.scrollHeight > document.scrollingElement.clientHeight + 1 }; });
  const sidebarAfter = await page.locator('.shell-sidebar').boundingBox();
  const headerAfter = await page.locator('.shell-header').boundingBox();
  const branchAfter = await page.locator('.shell-sidebar__footer').boundingBox();
  assert(scroll.top > 0, 'Workspace did not scroll');
  assert(!scroll.bodyScrollable, 'Unexpected competing body scrollbar detected');
  assert(sidebarBefore.y === sidebarAfter.y && headerBefore.y === headerAfter.y && branchBefore.y === branchAfter.y, 'Sidebar, header, or branch footer moved with workspace scrolling');
  await page.locator('button[aria-label="Toggle navigation"]').click();
  assert(await page.locator('.app-shell--collapsed').count(), 'Sidebar did not collapse');
  await documentOverflow(page);
  for (const label of tooltipLabels) {
    const item = page.locator(`[data-tooltip="${label}"]`).first();
    await item.hover();
    assert(await item.evaluate(node => getComputedStyle(node, '::after').display !== 'none'), `${label} tooltip was not visible in collapsed mode`);
  }
  await screenshot(page, screenshotName);
  await page.locator('button[aria-label="Toggle navigation"]').click();
};

const patientSearchAudit = async page => {
  const input = page.locator('.shell-header__search input');
  for (const term of ['Amina', 'PAT-000001', '+256 701 100 001']) {
    await input.fill(term);
    await page.locator('.global-patient-search__results').waitFor();
    assert(await textHas(page, 'Amina Nakato'), `Patient search did not resolve Amina for ${term}`);
  }
  await input.fill('');
  await page.waitForTimeout(50);
  assert(await page.locator('.global-patient-search__results[hidden]').count(), 'Patient search results remained open after clearing');
};

const checkLoginPage = async (page, viewport, name) => {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  assert(await page.title() === 'Sign In | Pearl Smile Dental Clinic', 'Login page title incorrect');
  assert(await page.locator('img[alt="Pearl Smile Dental Clinic logo"]').count(), 'Clinic logo is absent');
  assert(await page.locator('#email').count() && await page.locator('#password').count(), 'Login fields are absent');
  assert(await page.locator('link[rel="icon"]').count(), 'Favicon link is absent');
  assert(await noMojibake(page), 'Mojibake found on login page');
  await documentOverflow(page);
  await screenshot(page, `login-${name}`);
};

await mkdir(outputDir, { recursive: true });
await new Promise(resolveServer => server.listen(port, '127.0.0.1', resolveServer));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
attachObservability(page);

try {
  await checkLoginPage(page, { width: 1440, height: 900 }, 'desktop');
  await checkLoginPage(page, { width: 1024, height: 768 }, 'tablet');
  await checkLoginPage(page, { width: 390, height: 844 }, 'mobile');
  await page.setViewportSize({ width: 1440, height: 900 });

  await login(page, accounts.admin);
  assert(await textHas(page, 'Welcome back, Grace Namutebi.'), 'One-time login welcome toast did not appear');
  for (const value of ["Today's Appointments", '9', 'Active Queue', '2', "Today's Collections", 'UGX 360,000', 'Outstanding Balance', 'UGX 420,000']) assert(await textHas(page, value), `Admin dashboard is missing ${value}`);
  const adminQueueText = await page.locator('.card').filter({ hasText: 'Active queue' }).first().innerText();
  assert(adminQueueText.includes('Brenda Namusoke') && adminQueueText.includes('Amina Nakato') && !adminQueueText.includes('Joan Nambasa'), 'Admin active queue does not match canonical data');
  assert(!/\b(USh|Shs)\b/.test(await page.locator('.dashboard').innerText()), 'Non-UGX dashboard currency found');
  assert(await noMojibake(page), 'Admin dashboard mojibake found');
  await screenshot(page, 'admin-desktop-expanded');
  await desktopShellAudit(page, { tooltipLabels: ['Dashboard', 'Patients', 'Clinical Overview', 'Billing', 'Clinic Settings'], screenshotName: 'admin-desktop-collapsed' });
  await patientSearchAudit(page);
  for (const label of ['Register Patient', 'Book Appointment', 'View Waiting Room', 'Record Payment', 'View Reports']) {
    const link = page.getByRole('link', { name: label }).first();
    assert(await link.count(), `Admin quick action missing: ${label}`);
    const href = await link.getAttribute('href');
    await page.goto(`${baseUrl}/app.html${href}`, { waitUntil: 'networkidle' });
    assert(!(await page.locator('.empty-state').filter({ hasText: 'Page Not Found' }).count()), `Admin quick action produced 404: ${label}`);
    await page.goto(`${baseUrl}/app.html#/dashboard`, { waitUntil: 'networkidle' });
  }
  await page.setViewportSize({ width: 1024, height: 768 });
  await dashboardOverflow(page);
  await screenshot(page, 'admin-tablet');
  await logout(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, accounts.daniel);
  for (const value of ['My Appointments Today', 'Waiting for Me', 'In Treatment', 'Amina Nakato', 'Joan Nambasa', 'Mariam Nabwire', 'Mercy Ayaa', 'Sharon Apio']) assert(await textHas(page, value), `Daniel dashboard is missing ${value}`);
  assert(!(await textHas(page, 'Brenda Namusoke')) && !(await textHas(page, 'Users & Roles')) && await textHas(page, 'Clinic Settings') && !(await textHas(page, "Today's Collections")), 'Dr. Daniel role isolation failed');
  await desktopShellAudit(page, { tooltipLabels: ['Dashboard', 'Patients', 'Clinical'], screenshotName: 'dr-daniel-desktop-collapsed' });
  await screenshot(page, 'dr-daniel-desktop');
  await logout(page);

  await login(page, accounts.sarah);
  for (const value of ['My Appointments Today', 'Brenda Namusoke', 'ENC-000203']) assert(await textHas(page, value), `Sarah dashboard is missing ${value}`);
  assert(!(await textHas(page, 'Amina Nakato')) && !(await textHas(page, 'Users & Roles')) && !(await textHas(page, "Today's Collections")), 'Dr. Sarah role isolation failed');
  await screenshot(page, 'dr-sarah-desktop');
  await logout(page);

  await login(page, accounts.receptionist);
  for (const value of ["Today's Appointments", 'Waiting Now', 'Active Queue', 'Confirmed Appointments', 'Brenda Namusoke', 'Amina Nakato']) assert(await textHas(page, value), `Receptionist dashboard is missing ${value}`);
  assert(!(await textHas(page, 'Dental Chart')) && !(await textHas(page, "Today's Collections")) && !(await textHas(page, 'Users & Roles')), 'Receptionist role isolation failed');
  await screenshot(page, 'receptionist-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await dashboardOverflow(page);
  await mobileShellAudit(page);
  await screenshot(page, 'receptionist-mobile');
  await logout(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, accounts.cashier);
  for (const value of ["Today's Collections", 'UGX 360,000', 'Payments Today', 'Outstanding Balance', 'UGX 420,000', 'Partially Paid Invoices', 'Joan Nambasa', 'Mobile Money', 'Sharon Apio', 'Card', 'RCT-000801', 'RCT-000807']) assert(await textHas(page, value), `Cashier dashboard is missing ${value}`);
  for (const value of ['Joseph Walusimbi', 'UGX 300,000', 'Amina Nakato', 'UGX 70,000', 'Samuel Kato', 'UGX 50,000']) assert(await textHas(page, value), `Cashier outstanding data is missing ${value}`);
  assert(await noMojibake(page), 'Cashier dashboard mojibake found');
  assert(!(await textHas(page, 'Clinical Work')) && !(await textHas(page, 'Users & Roles')) && !(await textHas(page, 'Active Queue')), 'Cashier role isolation failed');
  await screenshot(page, 'cashier-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await dashboardOverflow(page);
  await mobileShellAudit(page);
  await screenshot(page, 'cashier-mobile');
  await logout(page);

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(accounts.inactive.email);
  await page.locator('#password').fill(demoPassword);
  await page.locator('#login-form button[type=submit]').click();
  assert(await textHas(page, 'This account is inactive'), 'Inactive account was not rejected');

  await login(page, accounts.cashier);
  await page.goto(`${baseUrl}/app.html#/users`, { waitUntil: 'networkidle' });
  assert(await textHas(page, 'Access Denied') && await page.title() === 'Access Denied | Pearl Smile Dental Clinic', '403 route guard failed');
  await screenshot(page, 'access-denied');
  await page.goto(`${baseUrl}/app.html#/not-a-route`, { waitUntil: 'networkidle' });
  assert(await textHas(page, 'Page Not Found') && await page.title() === 'Page Not Found | Pearl Smile Dental Clinic', '404 route guard failed');
  await screenshot(page, 'page-not-found');

  assert(!findings.consoleErrors.length, `Console errors: ${findings.consoleErrors.join(' | ')}`);
  assert(!findings.pageErrors.length, `Page errors: ${findings.pageErrors.join(' | ')}`);
  assert(!findings.warnings.length, `Console warnings: ${findings.warnings.join(' | ')}`);
  assert(!findings.failedRequests.length, `Failed requests: ${findings.failedRequests.join(' | ')}`);
  assert(!findings.failedAssets.length, `Failed assets: ${findings.failedAssets.join(' | ')}`);
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'pass', findings }, null, 2));
  console.log(JSON.stringify({ status: 'pass', screenshots: outputDir, findings }, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolveServer => server.close(resolveServer));
}
