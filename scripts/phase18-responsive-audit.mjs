import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { getOutstandingBalance, getRecallsByStatus, getTodayCollections, getTotalPostedPayments } from '../assets/js/data/finance.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';

const root = resolve('.');
const port = 4226;
const base = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase18');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const viewports = [
  { width: 1440, height: 900 }, { width: 1366, height: 768 },
  { width: 1280, height: 720 }, { width: 1024, height: 768 },
  { width: 390, height: 844 }
];
const roles = [
  { name: 'Clinic Administrator', email: 'grace.admin@pearlsmiledental.test', routes: ['dashboard', 'patients', 'appointments', 'waiting-room', 'clinical/encounters', 'treatment-plans', 'procedures', 'billing/invoices', 'billing/payments', 'billing/receipts', 'outstanding-balances', 'recalls', 'reports', 'users', 'clinic-settings', 'profile'], details: ['patients/new', 'patients/P001', 'patients/P001/edit', 'patients/P001/appointments', 'patients/P001/clinical', 'patients/P001/dental-chart', 'patients/P001/clinical-history', 'patients/P001/treatment-plans', 'patients/P001/prescriptions', 'patients/P001/documents', 'patients/P001/billing', 'patients/P001/recalls', 'treatment-plans/TP-000303'] },
  { name: 'Dentist', email: 'daniel.mugisha@pearlsmiledental.test', routes: ['dashboard', 'patients', 'appointments', 'waiting-room', 'clinical/encounters', 'clinical/dental-chart', 'treatment-plans', 'procedures', 'prescriptions', 'recalls', 'reports', 'clinic-settings', 'profile'], details: ['clinical/encounters/ENC-000201', 'patients/P001', 'patients/P001/clinical', 'patients/P001/dental-chart', 'patients/P013/dental-chart', 'patients/P001/treatment-plans/workspace', 'patients/P001/prescriptions', 'patients/P001/documents', 'treatment-plans/TP-000303'] },
  { name: 'Receptionist', email: 'lydia.reception@pearlsmiledental.test', routes: ['dashboard', 'patients', 'appointments', 'waiting-room', 'recalls', 'reports', 'clinic-settings', 'profile'], details: ['patients/new', 'patients/P001', 'patients/P001/edit', 'patients/P001/appointments', 'patients/P001/recalls', 'appointments/new'] },
  { name: 'Cashier', email: 'brian.cashier@pearlsmiledental.test', routes: ['dashboard', 'patients', 'billing/invoices', 'billing/payments', 'billing/receipts', 'outstanding-balances', 'reports', 'clinic-settings', 'profile'], details: ['patients/P001', 'patients/P001/billing'] }
];
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], missingAssets: [], apiRequests: [] };
const checks = [];
const screenshots = [];
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
const login = async (page, email) => {
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
  await page.locator('.app-shell').waitFor();
  const toast = page.getByRole('button', { name: 'Dismiss notification' });
  if (await toast.count()) await toast.first().click();
};
const layout = page => page.evaluate(() => {
  const doc = document.documentElement;
  const body = document.body;
  const shell = document.querySelector('.app-shell');
  const sidebar = document.querySelector('.shell-sidebar');
  const nav = document.querySelector('.shell-nav');
  const workspace = document.querySelector('.shell-workspace');
  const header = document.querySelector('.shell-header');
  const main = document.querySelector('#main-content');
  const box = selector => { const node = document.querySelector(selector); if (!node || getComputedStyle(node).display === 'none') return null; const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; };
  return {
    viewport: { width: innerWidth, height: innerHeight },
    document: { width: doc.clientWidth, scrollWidth: doc.scrollWidth, height: doc.clientHeight, scrollHeight: doc.scrollHeight },
    body: { scrollHeight: body.scrollHeight, overflowY: getComputedStyle(body).overflowY },
    shell: shell && { height: shell.getBoundingClientRect().height, overflowY: getComputedStyle(shell).overflowY },
    sidebar: sidebar && { height: sidebar.getBoundingClientRect().height, overflowY: getComputedStyle(sidebar).overflowY, scrollWidth: sidebar.scrollWidth, clientWidth: sidebar.clientWidth },
    nav: nav && { scrollHeight: nav.scrollHeight, clientHeight: nav.clientHeight, scrollWidth: nav.scrollWidth, clientWidth: nav.clientWidth, overflowY: getComputedStyle(nav).overflowY },
    workspace: workspace && { scrollHeight: workspace.scrollHeight, clientHeight: workspace.clientHeight, scrollWidth: workspace.scrollWidth, clientWidth: workspace.clientWidth, overflowY: getComputedStyle(workspace).overflowY },
    header: header && { bottom: header.getBoundingClientRect().bottom },
    main: main && { left: main.getBoundingClientRect().left, right: main.getBoundingClientRect().right },
    controls: { search: box('.shell-header__search'), notifications: box('.header-notifications'), account: box('.shell-header__user details.dropdown') }
  };
});
const overlaps = (a, b) => a && b && a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1;
const assertLayout = (metric, label, authenticated = true) => {
  assert(metric.document.scrollWidth <= metric.document.width + 1, `${label}: global horizontal overflow ${metric.document.scrollWidth} > ${metric.document.width}.`);
  if (!authenticated) return;
  assert(metric.workspace.scrollWidth <= metric.workspace.clientWidth + 1, `${label}: workspace horizontal overflow ${metric.workspace.scrollWidth} > ${metric.workspace.clientWidth}.`);
  assert(metric.sidebar.scrollWidth <= metric.sidebar.clientWidth + 1 && metric.nav.scrollWidth <= metric.nav.clientWidth + 1, `${label}: sidebar horizontal overflow.`);
  if (metric.viewport.width >= 1024) {
    assert(metric.document.scrollHeight <= metric.document.height + 2 && metric.body.scrollHeight <= metric.viewport.height + 2, `${label}: body and workspace both scroll on desktop.`);
    assert(metric.workspace.overflowY === 'auto' && metric.sidebar.overflowY === 'hidden' && metric.nav.overflowY === 'auto', `${label}: desktop independent-scroll architecture regressed.`);
  }
  assert(!overlaps(metric.controls.search, metric.controls.notifications) && !overlaps(metric.controls.search, metric.controls.account), `${label}: topbar controls overlap.`);
};
const visit = async (page, role, route, viewport, { screenshot = false } = {}) => {
  const label = `${role} ${route} ${viewport.width}x${viewport.height}`;
  await page.goto(`${base}/app.html#/${route}`, { waitUntil: 'networkidle' });
  await page.locator('#main-content').waitFor();
  const content = await page.locator('#main-content').innerText();
  assert(content.trim().length > 10 && !/Page Not Found|Access Denied|Workspace unavailable|implemented in a later approved phase/i.test(content), `${label}: missing, denied, or placeholder workspace.`);
  assert(!/nullnull|undefinedundefined|nullundefined|undefinednull|\[object Object\]|(?:^|\s)(?:null|undefined|NaN)(?=$|\s|[.,:;!?])/m.test(content), `${label}: invalid visible data.`);
  const metric = await layout(page);
  assertLayout(metric, label);
  checks.push({ role, route, viewport: `${viewport.width}x${viewport.height}`, documentOverflow: metric.document.scrollWidth - metric.document.width, workspaceOverflow: metric.workspace.scrollWidth - metric.workspace.clientWidth });
  if (screenshot) { const name = `${role.toLowerCase().replaceAll(' ', '-')}-${route.replaceAll('/', '-')}-${viewport.width}.png`; await page.screenshot({ path: join(outputDir, name), fullPage: true }); screenshots.push(name); }
};
const checkModal = async (page, role, route, buttonLabel, viewport) => {
  await page.setViewportSize(viewport);
  await visit(page, role, route, viewport);
  const trigger = page.getByRole('button', { name: buttonLabel, exact: true }).first();
  assert(await trigger.count() === 1 && await trigger.isVisible(), `${role} ${route}: ${buttonLabel} action is unreachable.`);
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await page.waitForFunction(() => { const modal = document.querySelector('.modal'); return modal && modal.contains(document.activeElement); });
  const metric = await dialog.evaluate(node => {
    const body = node.querySelector('.modal__body');
    const header = node.querySelector('.modal__header');
    const footer = node.querySelector('.modal__footer');
    const rect = node.getBoundingClientRect();
    const headerBox = header?.getBoundingClientRect();
    const footerBox = footer?.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height, headerBottom: headerBox?.bottom, footerTop: footerBox?.top, bodyScrollHeight: body?.scrollHeight, bodyClientHeight: body?.clientHeight, focusInside: node.contains(document.activeElement), overlayLocked: document.body.classList.contains('has-overlay') };
  });
  assert(metric.left >= -1 && metric.right <= viewport.width + 1 && metric.top >= -1 && metric.bottom <= viewport.height + 1 && metric.height > 100, `${role} ${route} ${viewport.width}: modal extends outside viewport: ${JSON.stringify(metric)}`);
  assert(metric.headerBottom <= metric.footerTop && metric.focusInside && metric.overlayLocked, `${role} ${route} ${viewport.width}: modal header/footer, focus, or scroll lock is broken: ${JSON.stringify(metric)}`);
  await dialog.getByRole('button', { name: 'Close modal' }).click();
  await dialog.waitFor({ state: 'detached' });
  assert(!await page.evaluate(() => document.body.classList.contains('has-overlay')), `${role} ${route}: modal scroll lock remained after close.`);
  checks.push({ role, route: `${route} modal`, viewport: `${viewport.width}x${viewport.height}`, modal: 'pass' });
};
const checkMobileShell = async (page, role) => {
  const viewport = viewports[4];
  await page.setViewportSize(viewport);
  await visit(page, role, 'dashboard', viewport);
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.waitForFunction(() => document.querySelector('.shell-sidebar')?.getBoundingClientRect().left >= -1);
  const sidebar = await page.locator('.shell-sidebar').evaluate(node => { const rect = node.getBoundingClientRect(); const nav = node.querySelector('.shell-nav'); return { left: rect.left, right: rect.right, navWidth: nav.clientWidth, navScrollWidth: nav.scrollWidth, open: node.closest('.app-shell').classList.contains('app-shell--mobile-open') }; });
  assert(sidebar.open && sidebar.left >= -1 && sidebar.right <= viewport.width && sidebar.navScrollWidth <= sidebar.navWidth + 1, `${role}: mobile sidebar failed to open within viewport: ${JSON.stringify(sidebar)}`);
  const patientLink = page.locator('.shell-sidebar .shell-nav__item[href="#/patients"]');
  await patientLink.click();
  await page.waitForURL(`${base}/app.html#/patients`);
  await page.locator('.patient-registry').waitFor();
  assert(!await page.locator('.app-shell').evaluate(node => node.classList.contains('app-shell--mobile-open')), `${role}: mobile sidebar did not close after navigation.`);
  for (const control of ['summary[aria-label="Account menu"]', '.header-notification-button']) {
    await page.locator(control).click();
    const selector = control.startsWith('summary') ? '.shell-header__user .dropdown__menu' : '.header-notification-panel';
    const box = await page.locator(selector).boundingBox();
    assert(box && box.x >= -1 && box.x + box.width <= viewport.width + 1 && box.y >= -1 && box.y + box.height <= viewport.height + 1, `${role}: ${selector} extends beyond mobile viewport: ${JSON.stringify(box)}`);
    await page.locator(control).click();
  }
  checks.push({ role, route: 'mobile shell and dropdowns', viewport: '390x844', result: 'pass' });
};
const checkLocalTableScroll = async (page, role, route) => {
  const viewport = viewports[4];
  await page.setViewportSize(viewport);
  await visit(page, role, route, viewport);
  const result = await page.locator('.table-wrap').first().evaluate(node => {
    const last = node.querySelector('thead th:last-child');
    const before = node.scrollLeft;
    node.scrollLeft = node.scrollWidth;
    const container = node.getBoundingClientRect();
    const lastBox = last?.getBoundingClientRect();
    return { clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, moved: node.scrollLeft > before, lastVisible: Boolean(lastBox && lastBox.left < container.right && lastBox.right > container.left), overflowX: getComputedStyle(node).overflowX };
  });
  assert(result.scrollWidth > result.clientWidth && result.moved && result.lastVisible && result.overflowX === 'auto', `${role} ${route}: table's last column cannot be reached by local scrolling: ${JSON.stringify(result)}`);
  assertLayout(await layout(page), `${role} ${route} after table scroll`);
  checks.push({ role, route: `${route} local table scroll`, viewport: '390x844', result: 'pass' });
};
const checkMoreActions = async (page, role, route) => {
  const viewport = viewports[4];
  await page.setViewportSize(viewport);
  await visit(page, role, route, viewport);
  await page.locator('.table-wrap').first().evaluate(node => { node.scrollLeft = node.scrollWidth; });
  const row = page.locator('.data-table tbody tr').first();
  await row.locator('summary[aria-label="More actions"]').click();
  const menu = row.locator('.dropdown__menu');
  const metric = await menu.evaluate(node => {
    const item = node.querySelector('[role="menuitem"]');
    const box = node.getBoundingClientRect();
    const itemBox = item?.getBoundingClientRect();
    const hit = itemBox ? document.elementFromPoint(Math.min(innerWidth - 1, itemBox.left + itemBox.width / 2), Math.min(innerHeight - 1, itemBox.top + itemBox.height / 2)) : null;
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, itemVisible: Boolean(itemBox && itemBox.width && itemBox.height && hit && (hit === item || item.contains(hit))) };
  });
  assert(metric.left >= -1 && metric.right <= viewport.width + 1 && metric.itemVisible, `${role} ${route}: More Actions menu is clipped or unreachable: ${JSON.stringify(metric)}`);
  await row.locator('summary[aria-label="More actions"]').click();
  checks.push({ role, route: `${route} More Actions menu`, viewport: '390x844', result: 'pass' });
};
const checkOdontogram = async page => {
  const viewport = viewports[4];
  await page.setViewportSize(viewport);
  await visit(page, 'Dentist', 'patients/P001/dental-chart', viewport);
  assert(await page.locator('.odontogram-tooth').count() === 32, 'Permanent odontogram does not render 32 teeth.');
  const permanent = await page.locator('.odontogram__scroll').evaluate(node => { const first = node.querySelector('.odontogram-tooth')?.getBoundingClientRect(); node.scrollLeft = node.scrollWidth; return { clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, scrollLeft: node.scrollLeft, toothWidth: first?.width, overflowX: getComputedStyle(node).overflowX }; });
  assert(permanent.scrollWidth > permanent.clientWidth && permanent.scrollLeft > 0 && permanent.toothWidth >= 44 && permanent.overflowX === 'auto', `Permanent odontogram is not locally scrollable with touch-size teeth: ${JSON.stringify(permanent)}`);
  await page.locator('.odontogram__scroll').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(outputDir, 'dentist-odontogram-visible-390.png') }); screenshots.push('dentist-odontogram-visible-390.png');
  await page.locator('.odontogram-tooth').first().click();
  assert(!(await page.locator('.dental-chart__selected').innerText()).includes('No tooth selected.'), 'Tooth selection failed on mobile.');
  await page.getByRole('button', { name: /Add Finding — Tooth/ }).first().click();
  const findingDialog = page.getByRole('dialog');
  await findingDialog.waitFor();
  const findingBox = await findingDialog.boundingBox();
  assert(findingBox && findingBox.x >= -1 && findingBox.x + findingBox.width <= viewport.width + 1 && findingBox.y >= -1 && findingBox.y + findingBox.height <= viewport.height + 1, 'Odontogram finding modal does not fit the mobile viewport.');
  await findingDialog.getByRole('button', { name: 'Close modal' }).click();
  await findingDialog.waitFor({ state: 'detached' });
  await visit(page, 'Dentist', 'patients/P013/dental-chart', viewport);
  await page.getByRole('button', { name: 'Primary Dentition' }).click();
  assert(await page.locator('.odontogram-tooth').count() === 20, 'Primary odontogram does not render 20 teeth.');
  assertLayout(await layout(page), 'Dentist primary odontogram mobile');
  checks.push({ role: 'Dentist', route: 'permanent and primary odontogram interaction', viewport: '390x844', result: 'pass' });
};
const checkIntermediateOdontogram = async page => {
  for (const viewport of [viewports[0], viewports[2], viewports[3]]) {
    await page.setViewportSize(viewport);
    await visit(page, 'Dentist', 'patients/P001/dental-chart', viewport, { screenshot: viewport.width === 1024 });
    const tooth = await page.locator('.odontogram-tooth').first().boundingBox();
    assert(await page.locator('.odontogram-tooth').count() === 32 && tooth?.width >= 44, `Permanent chart teeth are too small or missing at ${viewport.width}px.`);
    if (viewport.width === 1024) {
      await page.locator('.odontogram__scroll').scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(outputDir, 'dentist-odontogram-visible-1024.png') }); screenshots.push('dentist-odontogram-visible-1024.png');
    }
    checks.push({ role: 'Dentist', route: 'permanent odontogram tap size', viewport: `${viewport.width}x${viewport.height}`, result: 'pass' });
  }
};
const checkReportTypes = async page => {
  for (const viewport of [viewports[1], viewports[4]]) {
    await page.setViewportSize(viewport);
    await visit(page, 'Clinic Administrator', 'reports', viewport);
    const types = await page.locator('#report-type option').evaluateAll(options => options.map(option => option.value).filter(Boolean));
    assert(types.length >= 5, `Report type options are missing at ${viewport.width}px.`);
    for (const type of types) {
      await page.locator('#report-type').selectOption(type);
      assert(await page.locator('#report-type').inputValue() === type, `${type} report selection did not persist.`);
      assertLayout(await layout(page), `${type} report ${viewport.width}x${viewport.height}`);
      checks.push({ role: 'Clinic Administrator', route: `reports/${type}`, viewport: `${viewport.width}x${viewport.height}`, result: 'pass' });
    }
  }
};
const checkStressContent = async (page, role) => {
  const viewport = viewports[4];
  await page.setViewportSize(viewport);
  const longWord = 'ResponsiveClinicalSafetyAndDocumentation'.repeat(5);
  await visit(page, role, 'dashboard', viewport);
  await page.evaluate(value => { document.querySelector('.dropdown__trigger-label strong').textContent = value; const kpi = document.querySelector('.kpi-card strong'); if (kpi) kpi.textContent = 'UGX 2,360,000,000'; }, longWord);
  assertLayout(await layout(page), `${role} long topbar name and large UGX`);
  await page.locator('summary[aria-label="Account menu"]').click();
  const accountBox = await page.locator('.shell-header__user .dropdown__menu').boundingBox();
  assert(accountBox && accountBox.x >= -1 && accountBox.x + accountBox.width <= viewport.width + 1, `${role}: long account name pushed the dropdown off-screen.`);
  await visit(page, role, 'patients/P001', viewport);
  await page.evaluate(value => { const name = document.querySelector('.patient-context__identity h2'); if (name) name.textContent = value; }, longWord);
  assertLayout(await layout(page), `${role} long patient name`);
  if (role === 'Clinic Administrator') {
    await visit(page, role, 'users', viewport);
    await page.evaluate(value => { const email = document.querySelector('.data-table tbody tr td:nth-child(3)'); if (email) email.textContent = `${value}@pearlsmiledental.test`; }, longWord);
    assertLayout(await layout(page), 'Users long email');
    await visit(page, role, 'clinic-settings', viewport);
    await page.locator('#settings-clinic-name').evaluate((node, value) => { node.value = `Pearl Smile ${value}`; }, longWord);
    assertLayout(await layout(page), 'Settings long clinic name draft');
    await page.reload({ waitUntil: 'networkidle' });
    await visit(page, role, 'recalls', viewport);
    const row = page.locator('.data-table tbody tr').first();
    await row.locator('summary[aria-label="More actions"]').click();
    await row.getByRole('menuitem', { name: 'View recall details' }).click();
    await page.locator('.recall-detail__grid dd').nth(6).evaluate((node, value) => { node.textContent = value; }, longWord);
    const recallDetail = await page.locator('.drawer').evaluate(node => ({ width: node.clientWidth, scrollWidth: node.scrollWidth }));
    assert(recallDetail.scrollWidth <= recallDetail.width + 1, `Long recall reason escaped its drawer: ${JSON.stringify(recallDetail)}`);
    assertLayout(await layout(page), 'Recalls long reason');
    await page.locator('.drawer').getByRole('button', { name: 'Close', exact: true }).click();
  } else if (role === 'Dentist') {
    await visit(page, role, 'patients/P001/documents', viewport);
    const filename = await page.locator('.documents__item-copy small').first().evaluate((node, value) => { node.textContent = `${value}.png`; const container = node.closest('.documents__item-copy'); return { width: container.clientWidth, scrollWidth: container.scrollWidth }; }, longWord);
    assert(filename.scrollWidth <= filename.width + 1, `Long document filename escaped its card: ${JSON.stringify(filename)}`);
    assertLayout(await layout(page), 'Documents long filename');
    const preview = await page.locator('.documents__preview').first().evaluate(async node => {
      const image = document.createElement('img');
      image.alt = 'Responsive audit preview';
      image.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="5000" height="3000"><rect width="5000" height="3000" fill="#dce9ef"/></svg>')}`;
      node.replaceChildren(image);
      await image.decode();
      const container = node.getBoundingClientRect(), rendered = image.getBoundingClientRect();
      return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, containerWidth: container.width, imageWidth: rendered.width, ratio: rendered.width / rendered.height };
    });
    assert(preview.naturalWidth === 5000 && preview.imageWidth <= preview.containerWidth + 1 && Math.abs(preview.ratio - 5 / 3) < .01, `Large image preview overflowed or lost aspect ratio: ${JSON.stringify(preview)}`);
    assertLayout(await layout(page), 'Documents large preview');
  }
  checks.push({ role, route: 'temporary long-text/large-UGX stress', viewport: '390x844', result: 'pass' });
};

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
let browser;
let currentPage;
try {
  browser = await chromium.launch({ headless: true });
  const loginContext = await browser.newContext();
  currentPage = await loginContext.newPage(); observe(currentPage);
  for (const viewport of viewports) {
    await currentPage.setViewportSize(viewport);
    await currentPage.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    const metric = await layout(currentPage);
    assertLayout(metric, `Login ${viewport.width}x${viewport.height}`, false);
    for (const selector of ['#email', '#password', '#login-form button[type=submit]']) {
      const box = await currentPage.locator(selector).boundingBox();
      assert(box && box.x >= -1 && box.x + box.width <= viewport.width + 1 && box.width >= 44, `Login ${viewport.width}x${viewport.height}: ${selector} is clipped.`);
    }
    checks.push({ role: 'Login', route: 'index.html', viewport: `${viewport.width}x${viewport.height}`, documentOverflow: metric.document.scrollWidth - metric.document.width });
  }
  await loginContext.close();
  for (const role of roles) {
    const context = await browser.newContext({ viewport: viewports[0] });
    currentPage = await context.newPage(); currentPage.setDefaultTimeout(8_000); observe(currentPage);
    await login(currentPage, role.email);
    const initialState = await currentPage.evaluate(() => JSON.stringify(window.DentalAppDev.getState()));
    const targets = role.name === 'Clinic Administrator' ? viewports : [viewports[1], viewports[4]];
    for (const viewport of targets) {
      await currentPage.setViewportSize(viewport);
      const routes = role.name === 'Clinic Administrator' || viewport.width === 1366 ? role.routes : [...new Set(['dashboard', 'patients', ...role.routes.filter(route => ['waiting-room', 'billing/invoices', 'billing/payments', 'billing/receipts', 'recalls', 'reports', 'clinic-settings', 'profile'].includes(route))])];
      for (const route of routes) {
        const screenshot = role.name === 'Clinic Administrator' && (([1366, 390].includes(viewport.width) && ['dashboard', 'patients', 'waiting-room', 'billing/invoices', 'reports', 'users', 'clinic-settings'].includes(route)) || (![1366, 390].includes(viewport.width) && route === 'dashboard'));
        await visit(currentPage, role.name, route, viewport, { screenshot });
      }
      if (role.name !== 'Clinic Administrator' && !routes.includes('dashboard')) await visit(currentPage, role.name, 'dashboard', viewport);
    }
    const detailViewports = role.name === 'Clinic Administrator' || role.name === 'Dentist' ? [viewports[1], viewports[4]] : [viewports[4]];
    for (const viewport of detailViewports) {
      await currentPage.setViewportSize(viewport);
      for (const route of role.details) await visit(currentPage, role.name, route, viewport, { screenshot: role.name === 'Dentist' && route === 'patients/P001/dental-chart' });
    }
    await checkMobileShell(currentPage, role.name);
    if (role.name === 'Clinic Administrator') {
      await checkReportTypes(currentPage);
      for (const route of ['users', 'billing/invoices', 'reports']) await checkLocalTableScroll(currentPage, role.name, route);
      for (const route of ['users', 'billing/invoices']) await checkMoreActions(currentPage, role.name, route);
      for (const [route, button] of [['users', 'Add User'], ['billing/invoices', 'Create Invoice'], ['waiting-room', 'Check In Patient'], ['recalls', 'Add Recall']]) await checkModal(currentPage, role.name, route, button, viewports[4]);
      for (const [route, button] of [['users', 'Add User'], ['billing/invoices', 'Create Invoice']]) await checkModal(currentPage, role.name, route, button, viewports[2]);
    } else if (role.name === 'Dentist') {
      await checkIntermediateOdontogram(currentPage);
      await checkOdontogram(currentPage);
      await checkModal(currentPage, role.name, 'patients/P001/clinical', 'Add Allergy', viewports[4]);
      await checkModal(currentPage, role.name, 'patients/P001/documents', 'Add Document', viewports[4]);
      await checkModal(currentPage, role.name, 'patients/P001/prescriptions', 'New Prescription', viewports[4]);
      await checkModal(currentPage, role.name, 'patients/P001/treatment-plans/workspace', 'Create Treatment Plan', viewports[4]);
    } else if (role.name === 'Cashier') {
      await checkLocalTableScroll(currentPage, role.name, 'billing/receipts');
      await checkMoreActions(currentPage, role.name, 'billing/receipts');
      await checkModal(currentPage, role.name, 'billing/payments', 'Record Payment', viewports[4]);
    }
    if (['Clinic Administrator', 'Dentist'].includes(role.name)) await checkStressContent(currentPage, role.name);
    assert(await currentPage.evaluate(() => JSON.stringify(window.DentalAppDev.getState())) === initialState, `${role.name}: responsive navigation mutated business state.`);
    if (role.name === 'Clinic Administrator') {
      const resetState = await currentPage.evaluate(() => window.DentalAppDev.resetDemoData());
      const validation = validateCanonicalDemoState(resetState);
      assert(validation.valid, `Canonical reset failed integrity validation: ${validation.errors.join('; ')}`);
      assert(JSON.stringify(resetState) === initialState, 'Canonical reset did not restore the starting demo state.');
      assert(getTotalPostedPayments(resetState) === 2_360_000 && getOutstandingBalance(resetState) === 420_000 && getTodayCollections(resetState) === 360_000, 'Canonical finance figures changed after reset.');
      assert(resetState.payments.filter(payment => payment.status === 'POSTED' && payment.receivedAt.startsWith(resetState.referenceDate)).length === 2, 'Canonical payments-today count changed after reset.');
      assert(resetState.users.length === 6 && resetState.users.filter(user => user.status === 'active').length === 5 && resetState.users.filter(user => user.status === 'inactive').length === 1 && resetState.users.filter(user => user.roleId === 'ROLE-DENTIST').length === 2, 'Canonical user counts changed after reset.');
      assert(['UPCOMING', 'OVERDUE', 'SCHEDULED'].every((status, index) => getRecallsByStatus(resetState, status).length === [1, 1, 3][index]), 'Canonical recall counts changed after reset.');
      assert(resetState.appointments.filter(appointment => appointment.startDateTime.startsWith(resetState.referenceDate)).length === 9, 'Canonical appointment count changed after reset.');
      assert((await currentPage.evaluate(() => window.DentalAppDev.getDirtySources())).length === 0, 'Canonical reset left unsaved-change sources behind.');
      checks.push({ role: role.name, route: 'canonical demo-data reset and integrity', viewport: '390x844', result: 'pass' });
    }
    await context.close();
  }
  assert(!Object.values(findings).some(values => values.length), `Browser console/network findings: ${JSON.stringify(findings)}`);
  const result = { status: 'pass', viewports: viewports.map(({ width, height }) => `${width}x${height}`), checks: checks.length, routes: [...new Set(checks.map(check => check.route))], screenshots, findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const screenshot = 'failure.png';
  if (currentPage && !currentPage.isClosed()) { try { await currentPage.screenshot({ path: join(outputDir, screenshot), fullPage: true }); } catch {} }
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, completedChecks: checks.length, lastCheck: checks.at(-1), screenshot, findings }, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
