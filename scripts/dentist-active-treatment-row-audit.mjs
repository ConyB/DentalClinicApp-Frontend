import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.'), port = 4199, baseUrl = `http://127.0.0.1:${port}`, outputDir = join(root, 'tests', 'audits', 'output', 'dentist-active-treatment-row');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const intersects = (first, second) => first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;
const inside = (inner, outer) => inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
const server = createServer(async (request, response) => {
  const file = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); });
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async (page, email) => {
  await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' }); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' }); await page.locator('#email').fill(email); await page.locator('#password').fill('Demo@123'); await page.locator('#login-form button[type=submit]').click(); await page.waitForURL('**/app.html#/dashboard');
};
const checkPriority = async (page, viewport, expectedStatus, expectedAction, stressNames = false) => {
  await page.setViewportSize(viewport); await page.goto(`${baseUrl}/app.html#/dashboard`, { waitUntil: 'networkidle' });
  const row = page.locator('.dashboard-current-row').first(), card = row.locator('xpath=ancestor::section[contains(@class,"card")]'), info = row.locator('.dashboard-current-row__info'), controls = row.locator('.dashboard-current-row__actions'), badge = controls.locator('.badge').filter({ hasText: expectedStatus }), action = controls.getByRole('link', { name: expectedAction });
  await row.waitFor(); if (stressNames) { await row.locator('.dashboard-current-row__identity strong').evaluate(node => { node.textContent = 'Amina Nakato Wekesa Namusoke'; }); await row.locator('.dashboard-current-row__detail').filter({ hasText: 'Dentist' }).locator('strong').evaluate(node => { node.textContent = 'Dr. Daniel Mugisha Nsubuga-Kato'; }); }
  const [rowBox, cardBox, infoBox, controlsBox, badgeBox, actionBox, sameActionParent, styles] = await Promise.all([row.boundingBox(), card.boundingBox(), info.boundingBox(), controls.boundingBox(), badge.boundingBox(), action.boundingBox(), controls.evaluate(node => { const badgeNode = node.querySelector('.badge'), actionNode = node.querySelector('.button'); return badgeNode?.parentElement === node && actionNode?.parentElement === node; }), row.evaluate(node => { const rowStyle = getComputedStyle(node), infoNode = node.querySelector('.dashboard-current-row__info'), controlsNode = node.querySelector('.dashboard-current-row__actions'), badgeNode = controlsNode?.querySelector('.badge'), actionNode = controlsNode?.querySelector('.button'), infoStyle = getComputedStyle(infoNode), controlsStyle = getComputedStyle(controlsNode), badgeStyle = getComputedStyle(badgeNode), actionStyle = getComputedStyle(actionNode); return { row: { display: rowStyle.display, gridTemplateColumns: rowStyle.gridTemplateColumns, minWidth: rowStyle.minWidth }, information: { display: infoStyle.display, gridTemplateColumns: infoStyle.gridTemplateColumns, minWidth: infoStyle.minWidth }, actions: { display: controlsStyle.display, width: controlsStyle.width, minWidth: controlsStyle.minWidth, justifySelf: controlsStyle.justifySelf, columnGap: controlsStyle.columnGap, rowGap: controlsStyle.rowGap }, status: { whiteSpace: badgeStyle.whiteSpace, flexShrink: badgeStyle.flexShrink, width: badgeStyle.width }, button: { flexShrink: actionStyle.flexShrink, width: actionStyle.width } }; })]);
  assert(rowBox && cardBox && infoBox && controlsBox && badgeBox && actionBox, `Missing rendered boxes at ${viewport.width}px.`); const sameLine = badgeBox.y < actionBox.y + actionBox.height && badgeBox.y + badgeBox.height > actionBox.y, gap = sameLine ? actionBox.x - (badgeBox.x + badgeBox.width) : actionBox.y - (badgeBox.y + badgeBox.height);
  assert(sameActionParent, `Status and action do not share the dedicated action container at ${viewport.width}px.`);
  assert(infoBox.y + infoBox.height <= controlsBox.y, `Action container is not below the information container at ${viewport.width}px.`);
  assert(!intersects(badgeBox, actionBox), `Status and action overlap at ${viewport.width}px: ${JSON.stringify({ badgeBox, actionBox, styles })}`); assert(gap >= 12, `Status/action gap is only ${gap}px at ${viewport.width}px: ${JSON.stringify({ badgeBox, actionBox, styles })}`); assert(inside(badgeBox, cardBox) && inside(actionBox, cardBox), `Status or action escapes the card at ${viewport.width}px.`); assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `Global horizontal overflow at ${viewport.width}px.`);
  await action.focus(); assert(await action.evaluate(node => document.activeElement === node && getComputedStyle(node).outlineStyle !== 'none'), `Action focus is not visible at ${viewport.width}px.`);
  return { viewport, layoutMode: sameLine ? 'inline controls' : 'stacked controls', rowWidth: rowBox.width, informationWidth: infoBox.width, actionRowWidth: controlsBox.width, statusWidth: badgeBox.width, buttonWidth: actionBox.width, gap, sameActionParent, styles, intersection: false, globalOverflow: false };
};

await mkdir(outputDir, { recursive: true }); await new Promise(done => server.listen(port, '127.0.0.1', done)); const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await context.newPage(); observe(page); const viewports = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }];
  await login(page, 'daniel.mugisha@pearlsmiledental.test'); const canonicalRowText = await page.locator('.dashboard-current-row').innerText(); for (const value of ['Amina Nakato', 'PAT-000001', '09:30', '09:18', 'Dr. Daniel Mugisha', '09:32', 'In Treatment', 'Open Clinical Encounter']) assert(canonicalRowText.includes(value), `Current-patient row is missing canonical value: ${value}`); const daniel = []; for (const viewport of viewports) daniel.push(await checkPriority(page, viewport, 'In Treatment', 'Open Clinical Encounter'));
  await page.setViewportSize({ width: 1366, height: 768 }); await page.goto(`${baseUrl}/app.html#/dashboard`, { waitUntil: 'networkidle' }); const proofCard = page.locator('.dashboard-current-row').first().locator('xpath=ancestor::section[contains(@class,"card")]'); await proofCard.screenshot({ path: join(outputDir, 'corrected-row-1366.png') });
  const stress = await checkPriority(page, { width: 1366, height: 768 }, 'In Treatment', 'Open Clinical Encounter', true);
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(`${baseUrl}/app.html#/dashboard`, { waitUntil: 'networkidle' }); await page.getByRole('link', { name: 'Open Clinical Encounter' }).click(); await page.waitForURL('**/patients/P001/clinical');
  await login(page, 'sarah.nakanwagi@pearlsmiledental.test'); const sarah = []; for (const viewport of viewports) sarah.push(await checkPriority(page, viewport, 'Waiting', 'Open Clinical Workspace'));
  assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings)); const result = { status: 'pass', component: 'dashboard-current-row', daniel, sarah, longNameStress: stress, navigation: 'preserved', findings };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2)); await context.close();
} catch (error) { await writeFile(join(outputDir, 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2)); console.error(error.stack || error.message); process.exitCode = 1; }
finally { await browser.close(); await new Promise(done => server.close(done)); }
