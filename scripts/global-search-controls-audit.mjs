import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4224;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'global-search-controls');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html';
  const filePath = normalize(join(root, pathname));
  if (!filePath.startsWith(root)) return response.writeHead(403).end();
  try {
    response.writeHead(200, { 'content-type': mime[extname(filePath)] || 'application/octet-stream' });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404).end('Not Found');
  }
});

const observe = page => {
  page.on('console', event => {
    if (event.type() === 'error') findings.consoleErrors.push(event.text());
    if (event.type() === 'warning') findings.warnings.push(event.text());
  });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('request', request => {
    if (!request.url().startsWith(baseUrl)) findings.unexpectedApiRequests.push(request.url());
  });
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`);
  });
};

const accounts = {
  admin: 'grace.admin@pearlsmiledental.test',
  receptionist: 'lydia.reception@pearlsmiledental.test'
};

const login = async (page, email) => {
  await page.goto(`${baseUrl}/app.html`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type="submit"]').click();
  await page.waitForURL('**/app.html#/dashboard');
};

const route = async (page, path) => {
  await page.goto(`${baseUrl}/app.html#/${path}`, { waitUntil: 'networkidle' });
  await page.locator('#main-content').waitFor();
};

const noPageOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const pageOverflowDetails = page => page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  offenders: [...document.querySelectorAll('body *')].map(node => ({ node, box: node.getBoundingClientRect() })).filter(({ box }) => box.right > document.documentElement.clientWidth + 1).slice(0, 12).map(({ node, box }) => ({ tag: node.tagName, className: node.className, left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) }))
}));

const searchMetrics = control => control.evaluate(node => {
  const input = node.querySelector('input');
  const icon = node.querySelector('.ui-icon');
  const clear = node.querySelector('[aria-label="Clear search"]');
  const style = getComputedStyle(input);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const placeholderWidth = context.measureText(input.placeholder).width;
  const availableWidth = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const box = node.getBoundingClientRect();
  const inputBox = input.getBoundingClientRect();
  const iconBox = icon?.getBoundingClientRect();
  const clearBox = clear?.getBoundingClientRect();
  return {
    placeholder: input.placeholder,
    accessibleName: input.getAttribute('aria-label'),
    controlWidth: box.width,
    inputWidth: inputBox.width,
    placeholderWidth,
    availableWidth,
    placeholderFits: placeholderWidth <= availableWidth + 1,
    iconSeparated: !iconBox || iconBox.right <= inputBox.left + 1,
    clearHidden: clear?.hidden ?? true,
    clearSeparated: !clearBox || clear.hidden || inputBox.right <= clearBox.left + 1,
    controlHeight: box.height,
    inputHeight: inputBox.height,
    inputType: input.type,
    customClearCount: node.querySelectorAll('[aria-label="Clear search"]').length
  };
});

const typeSequentiallyStable = async (page, control, value, key) => {
  const input = control.locator('input').first();
  await input.evaluate((node, auditKey) => {
    window.__searchAuditNodes ||= {};
    window.__searchAuditNodes[auditKey] = node;
  }, key);
  await input.focus();
  let expected = '';
  for (const character of value) {
    await page.keyboard.type(character);
    expected += character;
    const state = await control.locator('input').first().evaluate((node, payload) => ({
      sameNode: node === window.__searchAuditNodes[payload.key],
      connected: node.isConnected,
      active: document.activeElement === node,
      value: node.value,
      selectionStart: node.selectionStart,
      selectionEnd: node.selectionEnd
    }), { key, expected });
    assert(state.sameNode && state.connected, `${key}: search input DOM node changed while typing "${expected}".`);
    assert(state.active, `${key}: search input lost focus while typing "${expected}".`);
    assert(state.value === expected, `${key}: expected "${expected}" but found "${state.value}".`);
    assert(state.selectionStart === expected.length && state.selectionEnd === expected.length, `${key}: caret did not remain at the end of "${expected}".`);
  }
  return input;
};

const assertSingleClear = async (control, key, visible) => {
  const buttons = control.locator('button[aria-label="Clear search"]');
  assert(await buttons.count() === 1, `${key}: expected exactly one custom clear button.`);
  assert(await buttons.first().isVisible() === visible, `${key}: custom clear visibility mismatch.`);
  const metrics = await searchMetrics(control);
  assert(metrics.inputType === 'text', `${key}: native search control remains enabled and can expose a second clear affordance.`);
  assert(metrics.customClearCount === 1, `${key}: duplicate custom clear control found.`);
  const buttonState = await buttons.first().evaluate(node => ({ tag: node.tagName, tabIndex: node.tabIndex, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
  assert(buttonState.tag === 'BUTTON' && buttonState.tabIndex >= 0, `${key}: custom clear is not keyboard focusable.`);
  if (visible) assert(buttonState.width >= 32 && buttonState.height >= 32, `${key}: custom clear hit target is too small.`);
};

const modules = [
  { key: 'patients', route: 'patients', selector: '.patient-registry .filter-bar .search-control', placeholder: 'Search name, ID, or phone…', query: 'amina', expected: 'Amina Nakato', result: '.patient-registry__results', reset: 'Reset' },
  { key: 'appointments', route: 'appointments', selector: '.appointments-workspace__filters .search-control', placeholder: 'Search patient or appointment…', query: 'APT-000103', expected: 'Amina Nakato', result: '.appointments-workspace__content', reset: 'Clear Filters', customToolbar: true },
  { key: 'encounters', route: 'clinical/encounters', selector: '.encounters-register .filter-bar .search-control', placeholder: 'Search patient or encounter…', query: 'brenda', expected: 'Brenda Namusoke', result: '.encounters-register__region', reset: 'Reset', combos: [{ label: 'Status', value: 'DRAFT' }, { label: 'Dentist', value: 'U003' }] },
  { key: 'invoices', route: 'billing/invoices', selector: '.billing-workspace .filter-bar .search-control', placeholder: 'Search invoice or patient…', query: 'amina', expected: 'Amina Nakato', result: '.billing-workspace__region', reset: 'Reset', combos: [{ label: 'Status', value: 'PARTIALLY_PAID' }, { label: 'Patient', value: 'P001' }] },
  { key: 'payments', route: 'billing/payments', selector: '.billing-workspace .filter-bar .search-control', placeholder: 'Search payment or invoice…', query: 'PAY-000701', expected: 'Joan Nambasa', result: '.billing-workspace__region', reset: 'Reset' },
  { key: 'outstanding-balances', route: 'outstanding-balances', selector: '.outstanding-balances .filter-bar .search-control', placeholder: 'Search invoice or patient…', query: 'joseph', expected: 'Joseph Walusimbi', result: '.billing-workspace__region', reset: 'Reset', combos: [{ label: 'Sort by', value: 'date-oldest' }] },
  { key: 'recalls', route: 'recalls', selector: '.recalls-workspace .filter-bar .search-control', placeholder: 'Search patient or recall…', query: 'joan', expected: 'Joan Nambasa', result: '.recalls-workspace__region', reset: 'Reset' },
  { key: 'users', route: 'users', selector: '.users-workspace .filter-bar .search-control', placeholder: 'Search name, user ID, or email...', query: 'miriam', expected: 'Miriam Achieng', result: '.users-workspace__region', reset: 'Reset', combos: [{ label: 'Role', value: 'receptionist' }, { label: 'Status', value: 'inactive' }] }
];

const viewports = [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 }
];

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
  const page = await context.newPage();
  observe(page);
  await login(page, accounts.admin);
  await page.evaluate(() => window.DentalAppDev.resetDemoData());

  const initialState = JSON.stringify(await page.evaluate(() => window.DentalAppDev.getState()));
  const functional = {};
  for (const module of modules) {
    await route(page, module.route);
    const control = page.locator(module.selector);
    await control.waitFor();
    const input = control.locator('input').first();
    assert(await input.getAttribute('placeholder') === module.placeholder, `${module.key}: placeholder mismatch.`);
    assert(Boolean(await input.getAttribute('aria-label')), `${module.key}: missing accessible name.`);
    await input.focus();
    assert(await control.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth) >= 3), `${module.key}: visible focus styling is missing.`);
    await assertSingleClear(control, module.key, false);
    await typeSequentiallyStable(page, control, module.query, module.key);
    for (const combo of module.combos || []) await page.getByLabel(combo.label, { exact: true }).selectOption(combo.value);
    const stableAfterFilter = await input.evaluate((node, key) => ({ sameNode: node === window.__searchAuditNodes[key], connected: node.isConnected, value: node.value }), module.key);
    assert(stableAfterFilter.sameNode && stableAfterFilter.connected && stableAfterFilter.value === module.query, `${module.key}: filter change replaced or cleared the search input.`);
    assert((await page.locator(module.result).innerText()).includes(module.expected), `${module.key}: search or combined filter behavior failed.`);
    await assertSingleClear(control, module.key, true);
    await control.hover();
    await assertSingleClear(control, `${module.key}-hover`, true);
    assert((await searchMetrics(control)).clearSeparated, `${module.key}: clear action overlaps the input.`);
    await control.getByRole('button', { name: 'Clear search' }).click();
    assert(await input.inputValue() === '', `${module.key}: clear search did not clear the query.`);
    const stableAfterClear = await input.evaluate((node, key) => ({ sameNode: node === window.__searchAuditNodes[key], connected: node.isConnected, active: document.activeElement === node }), module.key);
    assert(stableAfterClear.sameNode && stableAfterClear.connected && stableAfterClear.active, `${module.key}: custom clear did not preserve and refocus the same input node.`);
    await assertSingleClear(control, module.key, false);
    await page.getByRole('button', { name: module.reset, exact: true }).click();
    assert(await input.inputValue() === '', `${module.key}: reset did not clear search.`);
    assert(await input.evaluate((node, key) => node === window.__searchAuditNodes[key] && node.isConnected, module.key), `${module.key}: reset replaced the search input.`);
    assert(!(await page.evaluate(() => window.DentalAppDev.getDirtySources())).length, `${module.key}: filtering registered a dirty source.`);
    functional[module.key] = 'pass';
  }

  assert(JSON.stringify(await page.evaluate(() => window.DentalAppDev.getState())) === initialState, 'Module search/filter activity mutated business state.');

  await route(page, 'patients');
  const patientNext = page.getByRole('button', { name: 'Next' });
  if (await patientNext.isEnabled()) {
    await patientNext.click();
    await typeSequentiallyStable(page, page.locator('.patient-registry .search-control'), 'Amina', 'patients-pagination');
    assert((await page.locator('.pagination').innerText()).includes('Showing 1–1'), 'Patient search did not reset pagination to page one.');
  }

  await route(page, 'clinical/encounters');
  const encounterClearControl = page.locator('.encounters-register .search-control');
  const encounterClearInput = await typeSequentiallyStable(page, encounterClearControl, 'brenda', 'encounters-clear');
  assert((await page.locator('.encounters-register .card__subtitle').innerText()).startsWith('1 encounter shown'), 'Encounter result count did not update for Brenda.');
  await encounterClearControl.getByRole('button', { name: 'Clear search' }).click();
  assert(await encounterClearInput.inputValue() === '' && (await page.locator('.encounters-register .card__subtitle').innerText()).startsWith('4 encounters shown'), 'Encounter clear did not restore the full result set.');
  assert(await encounterClearInput.evaluate(node => node === window.__searchAuditNodes['encounters-clear'] && document.activeElement === node), 'Encounter clear did not retain the same focused input.');

  await route(page, 'clinical/encounters');
  const editingControl = page.locator('.encounters-register .search-control');
  const editingInput = await typeSequentiallyStable(page, editingControl, 'brenda', 'encounters-editing');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('x');
  assert(await editingInput.inputValue() === 'brexnda', 'Caret insertion failed in encounter search.');
  await page.keyboard.press('Backspace');
  assert(await editingInput.inputValue() === 'brenda', 'Backspace editing failed in encounter search.');
  await page.keyboard.press('Delete');
  assert(await editingInput.inputValue() === 'breda', 'Delete editing failed in encounter search.');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Brenda');
  assert(await editingInput.inputValue() === 'Brenda', 'Select-all replacement failed in encounter search.');
  await page.evaluate(() => navigator.clipboard.writeText('brenda'));
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Control+V');
  assert(await editingInput.inputValue() === 'brenda', 'Clipboard paste failed in encounter search.');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('brendanamusoke', { delay: 0 });
  assert(await editingInput.inputValue() === 'brendanamusoke', 'Rapid typing failed in encounter search.');
  assert(await editingInput.evaluate(node => node === window.__searchAuditNodes['encounters-editing'] && node.isConnected && document.activeElement === node), 'Encounter search node or focus changed during editing tests.');

  for (const target of ['patients', 'clinical/encounters', 'patients', 'clinical/encounters']) await route(page, target);
  const listenerControl = page.locator('.encounters-register .search-control');
  const listenerInput = listenerControl.locator('input');
  await listenerInput.evaluate(node => { window.__searchInputEvents = 0; node.addEventListener('input', () => { window.__searchInputEvents += 1; }); });
  await listenerInput.focus();
  await page.keyboard.type('abc');
  assert(await listenerInput.inputValue() === 'abc', 'Repeated navigation caused duplicate search processing.');
  assert(await page.evaluate(() => window.__searchInputEvents) === 3, 'Repeated navigation produced duplicate input events/listeners.');

  const responsive = {};
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    responsive[`${viewport.width}x${viewport.height}`] = {};
    for (const module of modules) {
      await route(page, module.route);
      const control = page.locator(module.selector);
      await control.waitFor();
      const metrics = await searchMetrics(control);
      const containment = await control.evaluate((node, customToolbar) => {
        const toolbar = customToolbar ? node.parentElement : node.closest('.filter-bar');
        const controlBox = node.getBoundingClientRect();
        const toolbarBox = toolbar.getBoundingClientRect();
        return { left: controlBox.left >= toolbarBox.left - 1, right: controlBox.right <= toolbarBox.right + 1 };
      }, Boolean(module.customToolbar));
      assert(metrics.placeholderFits, `${module.key}: placeholder clips at ${viewport.width}px (${Math.round(metrics.placeholderWidth)}px > ${Math.round(metrics.availableWidth)}px).`);
      assert(metrics.iconSeparated, `${module.key}: icon overlaps search text at ${viewport.width}px.`);
      assert(containment.left && containment.right, `${module.key}: search control escapes its toolbar at ${viewport.width}px.`);
      assert(metrics.controlHeight >= 38 && metrics.inputHeight >= 38 && Math.abs(metrics.controlHeight - metrics.inputHeight) <= 4, `${module.key}: control height mismatch at ${viewport.width}px (${JSON.stringify(metrics)}).`);
      assert(await noPageOverflow(page), `${module.key}: global page overflow at ${viewport.width}px: ${JSON.stringify(await pageOverflowDetails(page))}.`);
      await typeSequentiallyStable(page, control, 'ab', `${module.key}-${viewport.width}`);
      await assertSingleClear(control, `${module.key}-${viewport.width}`, true);
      if (viewport.width >= 1280) assert(metrics.controlWidth >= 280, `${module.key}: desktop search width is too narrow at ${viewport.width}px.`);
      if (viewport.width === 390 && !module.customToolbar) {
        const widths = await control.evaluate(node => ({ control: node.getBoundingClientRect().width, parent: node.parentElement.getBoundingClientRect().width }));
        assert(Math.abs(widths.control - widths.parent) <= 2, `${module.key}: mobile search does not span its filter row.`);
      }
      responsive[`${viewport.width}x${viewport.height}`][module.key] = Math.round(metrics.controlWidth);
      if (viewport.width === 1366 || viewport.width === 390) {
        const toolbar = module.customToolbar ? page.locator('.appointments-workspace__filters') : control.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " filter-bar ")][1]');
        await toolbar.screenshot({ path: join(outputDir, `${module.key}-${viewport.width}.png`) });
      }
      await control.getByRole('button', { name: 'Clear search' }).click();
      assert(await control.locator('input').evaluate((node, key) => node === window.__searchAuditNodes[key] && document.activeElement === node && !node.value, `${module.key}-${viewport.width}`), `${module.key}: responsive clear changed node/focus at ${viewport.width}px.`);
    }
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await route(page, 'dashboard');
  const globalSearch = page.locator('.shell-header__search .search-control');
  const globalMetrics = await searchMetrics(globalSearch);
  const globalWidth = Math.round((await globalSearch.boundingBox()).width);
  assert(globalMetrics.placeholder === 'Search patient by name, number or phone…' && globalMetrics.placeholderFits, 'Global header search regressed.');
  assert(globalWidth === 448, 'Global header search width changed.');
  await typeSequentiallyStable(page, globalSearch, 'amina', 'global-header');
  assert((await page.locator('.global-patient-search__results').innerText()).includes('Amina Nakato'), 'Global header patient search behavior regressed.');
  await assertSingleClear(globalSearch, 'global-header', true);
  const globalClear = globalSearch.getByRole('button', { name: 'Clear search' });
  await globalClear.focus();
  assert(await globalClear.evaluate(node => document.activeElement === node), 'Global header clear is not keyboard focusable.');
  await page.keyboard.press('Enter');
  assert(await globalSearch.locator('input').evaluate(node => node === window.__searchAuditNodes['global-header'] && document.activeElement === node && !node.value), 'Global header clear changed node/focus.');
  assert(await page.locator('.shell-sidebar').count() === 1 && await page.locator('.shell-header').count() === 1 && await page.getByRole('button', { name: 'Notifications' }).count() === 1 && await page.locator('summary[aria-label="Account menu"]').count() === 1 && await page.locator('.shell-footer').count() === 1, 'Global shell regression failed.');

  await route(page, 'patients/new');
  assert(await page.locator('form input:not([type="search"])').count() > 0 && await page.locator('form .search-control').count() === 0, 'Ordinary patient form inputs inherited module-search structure.');

  const receptionContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const receptionPage = await receptionContext.newPage();
  observe(receptionPage);
  await login(receptionPage, accounts.receptionist);
  const waiting = {};
  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await receptionPage.setViewportSize(viewport);
    await route(receptionPage, 'waiting-room');
    await receptionPage.getByRole('button', { name: 'Check In Patient' }).click();
    const control = receptionPage.getByRole('dialog', { name: 'Check In Patient' }).locator('.search-control');
    const input = control.locator('input').first();
    const metrics = await searchMetrics(control);
    assert(metrics.placeholder === 'Search patient or appointment…' && metrics.placeholderFits, `waiting-room: placeholder clips at ${viewport.width}px.`);
    await typeSequentiallyStable(receptionPage, control, 'NO-MATCH-SEARCH', `waiting-room-${viewport.width}`);
    assert((await receptionPage.getByRole('dialog').innerText()).includes('No expected arrivals match.'), 'Waiting Room search behavior failed.');
    await assertSingleClear(control, `waiting-room-${viewport.width}`, true);
    await control.getByRole('button', { name: 'Clear search' }).click();
    assert(await input.evaluate((node, key) => node === window.__searchAuditNodes[key] && document.activeElement === node && !node.value, `waiting-room-${viewport.width}`), `Waiting Room clear changed node/focus at ${viewport.width}px.`);
    assert(!(await receptionPage.evaluate(() => window.DentalAppDev.getDirtySources())).length, 'Waiting Room search registered a dirty source.');
    assert(await noPageOverflow(receptionPage), `Waiting Room modal overflow at ${viewport.width}px.`);
    waiting[`${viewport.width}x${viewport.height}`] = Math.round(metrics.controlWidth);
    await control.screenshot({ path: join(outputDir, `waiting-room-${viewport.width}.png`) });
    await receptionPage.getByRole('button', { name: 'Cancel' }).click();
  }
  await receptionContext.close();

  await page.goto(`${baseUrl}/app.html#/dashboard`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  const canonicalIntegrity = await page.evaluate(async () => {
    const { validateCanonicalDemoState } = await import('/assets/js/data/integrity.js');
    return validateCanonicalDemoState(window.DentalAppDev.getState());
  });
  assert(canonicalIntegrity.valid, `Final canonical validation failed: ${canonicalIntegrity.errors.join(' | ')}`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  assert(await page.locator('#login-form .search-control').count() === 0 && await page.locator('#email').isVisible() && await page.locator('#password').isVisible(), 'Login fields regressed.');
  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));

  const result = {
    status: 'pass',
    inventory: modules.map(module => ({ module: module.key, route: module.route, placeholder: module.placeholder, toolbar: module.customToolbar ? 'custom appointment flex toolbar' : 'shared filter bar' })).concat([{ module: 'waiting-room', route: 'waiting-room check-in modal', placeholder: 'Search patient or appointment…', toolbar: 'modal search' }]),
    functional,
    responsive,
    waitingRoom: waiting,
    globalHeader: { changed: 'shared input type/ARIA semantics only; mounted behavior and layout unchanged', width: globalWidth, placeholder: globalMetrics.placeholder },
    pagination: 'pass',
    dirtyState: 'clean',
    businessStateMutation: 'none',
    shell: 'pass',
    loginAndForms: 'pass',
    reset: 'canonical',
    findings
  };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await context.close();
} catch (error) {
  await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
