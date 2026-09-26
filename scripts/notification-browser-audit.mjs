import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4194;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'notification-fix');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const accounts = {
  administrator: ['grace.admin@pearlsmiledental.test', 'Grace Namutebi', 'Clinic Administrator'],
  dentist: ['daniel.mugisha@pearlsmiledental.test', 'Dr. Daniel Mugisha', 'Dentist'],
  receptionist: ['lydia.reception@pearlsmiledental.test', 'Lydia Akello', 'Receptionist'],
  cashier: ['brian.cashier@pearlsmiledental.test', 'Brian Ssemanda', 'Cashier']
};
const viewports = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 390, height: 844 }];
const assert = (value, message) => { if (!value) throw new Error(message); };

const server = createServer(async (request, response) => {
  const path = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!path.startsWith(root)) return response.writeHead(403).end();
  try {
    const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[extname(path)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': mime });
    response.end(await readFile(path));
  } catch { response.writeHead(404).end('Not Found'); }
});

const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); });
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};

const login = async (page, email) => {
  await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  assert(await page.getByRole('button', { name: 'Notifications' }).count() === 0, 'Notification control leaked onto the login page.');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
};

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const appState = page => page.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
const dirtySources = page => page.evaluate(() => window.DentalAppDev.getDirtySources());

const verifyNotificationControl = async (page, viewport, label) => {
  const trigger = page.getByRole('button', { name: 'Notifications', exact: true });
  const panel = page.locator('#header-notification-panel');
  const account = page.locator('.shell-header details.dropdown');
  const beforeRoute = page.url();
  const beforeState = await appState(page);
  const controlCount = await trigger.count();
  const panelCount = await panel.count();
  assert(controlCount === 1 && panelCount === 1, `${label}: notification control or panel count is incorrect (${controlCount}/${panelCount}).`);
  assert(await panel.getAttribute('role') === 'region' && await panel.getAttribute('aria-labelledby') === 'header-notification-title', `${label}: panel semantics are incorrect.`);
  assert(await trigger.locator('svg.lucide-icon').count() === 1 && await trigger.locator('svg svg, i[data-lucide]').count() === 0, `${label}: bell is missing, nested, or uninitialized.`);
  assert(await trigger.getAttribute('aria-expanded') === 'false' && await trigger.getAttribute('aria-haspopup') === 'true', `${label}: collapsed ARIA state is incorrect.`);
  assert(await trigger.getAttribute('title') === 'Notifications', `${label}: tooltip is missing or retains placeholder language.`);
  assert(await page.getByText(/notifications placeholder/i).count() === 0, `${label}: placeholder language remains visible.`);
  assert(await panel.locator('[class*="badge"], [class*="unread"]').count() === 0, `${label}: an unsupported unread indicator is present.`);
  const triggerMetrics = await trigger.evaluate(node => { const box = node.getBoundingClientRect(); const style = getComputedStyle(node); return { width: box.width, height: box.height, radius: style.borderRadius, background: style.backgroundColor }; });
  assert(triggerMetrics.width >= 40 && triggerMetrics.width <= 44 && triggerMetrics.height >= 40 && triggerMetrics.height <= 44, `${label}: trigger is not 40–44px: ${JSON.stringify(triggerMetrics)}.`);

  await trigger.focus();
  await page.keyboard.press('Enter');
  assert(await panel.isVisible() && await trigger.getAttribute('aria-expanded') === 'true', `${label}: Enter did not open the panel.`);
  assert(await trigger.getAttribute('title') === null, `${label}: tooltip remained enabled while the panel was open.`);
  const panelText = (await panel.innerText()).replace(/\s+/g, ' ').trim();
  assert(panelText === "Notifications No new notifications You're all caught up.", `${label}: empty-state wording is incorrect: ${panelText}`);
  const panelBox = await panel.boundingBox();
  assert(panelBox && panelBox.x >= 0 && panelBox.y >= 0 && panelBox.x + panelBox.width <= viewport.width + 1 && panelBox.y + panelBox.height <= viewport.height + 1, `${label}: panel is clipped: ${JSON.stringify(panelBox)}.`);
  if (viewport.width > 768) assert(panelBox.width >= 340 && panelBox.width <= 380, `${label}: desktop panel width is outside 340–380px.`);
  await page.keyboard.press('Escape');
  assert(!(await panel.isVisible()) && await trigger.getAttribute('aria-expanded') === 'false', `${label}: Escape did not close the panel.`);
  assert(await trigger.getAttribute('title') === 'Notifications', `${label}: tooltip was not restored after closing.`);
  assert(await trigger.evaluate(node => document.activeElement === node), `${label}: Escape did not return focus to the trigger.`);

  await page.keyboard.press('Space');
  assert(await panel.isVisible(), `${label}: Space did not open the panel.`);
  await page.keyboard.press('Space');
  assert(!(await panel.isVisible()), `${label}: Space did not toggle the panel closed.`);
  await trigger.click();
  await page.locator('.shell-content').click({ position: { x: 5, y: 5 } });
  assert(!(await panel.isVisible()), `${label}: outside click did not close the panel.`);

  await trigger.click();
  await account.locator('summary').click();
  assert(!(await panel.isVisible()) && await account.getAttribute('open') !== null, `${label}: opening the account menu did not close notifications.`);
  await trigger.click();
  assert(await panel.isVisible() && await account.getAttribute('open') === null, `${label}: opening notifications did not close the account menu.`);
  await page.keyboard.press('Escape');

  assert(page.url() === beforeRoute, `${label}: notification interaction changed route.`);
  assert(await appState(page) === beforeState, `${label}: notification interaction mutated app state.`);
  assert(await noOverflow(page), `${label}: notification control introduced horizontal overflow.`);
  const body = await page.locator('body').innerText();
  assert(!/[ÃƒÃ‚]|Ã¢(?:â‚¬|â„¢|Å“)|Ã¯Â¿Â½|ï¿½/.test(body), `${label}: encoding artifact detected.`);
};

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });

try {
  for (const [key, [email, name, role]] of Object.entries(accounts)) {
    const context = await browser.newContext({ viewport: viewports[0] });
    const page = await context.newPage();
    observe(page);
    await login(page, email);
    const identity = await page.locator('.dropdown__trigger-label').innerText();
    assert(identity.includes(name) && identity.includes(role), `${key}: account identity changed.`);
    await verifyNotificationControl(page, viewports[0], role);
    assert((await page.locator('#header-notification-panel').innerText()).includes('No new notifications'), `${key}: role did not receive the privacy-safe empty state.`);
    await context.close();
  }

  for (const viewport of viewports.slice(1)) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    observe(page);
    await login(page, accounts.receptionist[0]);
    await verifyNotificationControl(page, viewport, `Responsive ${viewport.width}`);
    if (viewport.width === 1024 || viewport.width === 390) {
      await page.getByRole('button', { name: 'Notifications', exact: true }).click();
      await page.screenshot({ path: join(outputDir, `notifications-${viewport.width}.png`), fullPage: true });
      await page.keyboard.press('Escape');
    }
    await context.close();
  }

  const rerenderContext = await browser.newContext({ viewport: viewports[0] });
  const rerenderPage = await rerenderContext.newPage();
  observe(rerenderPage);
  await login(rerenderPage, accounts.administrator[0]);
  for (const route of ['patients', 'appointments', 'dashboard', 'reports']) {
    await rerenderPage.goto(`${baseUrl}/app.html#/${route}`, { waitUntil: 'networkidle' });
    assert(await rerenderPage.getByRole('button', { name: 'Notifications', exact: true }).count() === 1, `Shell rerender duplicated the notification trigger on ${route}.`);
    await rerenderPage.getByRole('button', { name: 'Notifications', exact: true }).click();
    assert(await rerenderPage.locator('#header-notification-panel').isVisible(), `Shell rerender broke the notification toggle on ${route}.`);
    await rerenderPage.keyboard.press('Escape');
  }
  await rerenderContext.close();

  const clinicalContext = await browser.newContext({ viewport: viewports[0] });
  const clinical = await clinicalContext.newPage();
  observe(clinical);
  await login(clinical, accounts.dentist[0]);
  await clinical.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' });
  await clinical.getByRole('button', { name: 'Start Clinical Encounter' }).click();
  await clinical.locator('#encounter-chiefComplaint').fill('Unsaved notification regression check');
  const clinicalState = await appState(clinical);
  const clinicalDirty = await dirtySources(clinical);
  await clinical.getByRole('button', { name: 'Notifications', exact: true }).click();
  await clinical.keyboard.press('Escape');
  assert(JSON.stringify(await dirtySources(clinical)) === JSON.stringify(clinicalDirty), 'Clinical dirty sources changed after notification interaction.');
  assert((await clinical.locator('#encounter-chiefComplaint').inputValue()) === 'Unsaved notification regression check', 'Clinical draft value changed after notification interaction.');
  assert(await appState(clinical) === clinicalState && clinical.url().includes('#/patients/P001/clinical'), 'Clinical state or route changed after notification interaction.');
  await clinical.getByRole('button', { name: 'Add Allergy', exact: true }).click();
  await clinical.getByRole('dialog', { name: 'Add Allergy' }).locator('input').fill('Unsaved allergy');
  const combinedDirty = await dirtySources(clinical);
  await clinical.getByRole('button', { name: 'Notifications', exact: true }).evaluate(button => button.click());
  await clinical.getByRole('button', { name: 'Notifications', exact: true }).evaluate(button => button.click());
  assert(JSON.stringify(await dirtySources(clinical)) === JSON.stringify(combinedDirty), 'Medical History dirty source changed after notification interaction.');
  assert((await clinical.getByRole('dialog', { name: 'Add Allergy' }).locator('input').inputValue()) === 'Unsaved allergy', 'Medical History input changed after notification interaction.');
  await clinicalContext.close();

  for (const [route, selector, value, label] of [
    ['patients/P001/edit', '#patient-address', 'Unsaved patient address', 'Patient form'],
    ['appointments/new', '#appointment-reason', 'Unsaved appointment reason', 'Appointment form']
  ]) {
    const context = await browser.newContext({ viewport: viewports[0] });
    const page = await context.newPage();
    observe(page);
    await login(page, accounts.receptionist[0]);
    await page.goto(`${baseUrl}/app.html#/${route}`, { waitUntil: 'networkidle' });
    await page.locator(selector).fill(value);
    const beforeDirty = await dirtySources(page);
    const beforeState = await appState(page);
    await page.getByRole('button', { name: 'Notifications', exact: true }).click();
    await page.keyboard.press('Escape');
    assert((await page.locator(selector).inputValue()) === value, `${label} value changed after notification interaction.`);
    assert(JSON.stringify(await dirtySources(page)) === JSON.stringify(beforeDirty), `${label} dirty state changed after notification interaction.`);
    assert(await appState(page) === beforeState, `${label} app state changed after notification interaction.`);
    await context.close();
  }

  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
  const result = { status: 'pass', roles: Object.keys(accounts), viewports, checks: ['empty state', 'keyboard', 'outside click', 'profile coexistence', 'rerender listeners', 'privacy', 'dirty state', 'responsive fit', 'console', 'network', 'encoding'], findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
