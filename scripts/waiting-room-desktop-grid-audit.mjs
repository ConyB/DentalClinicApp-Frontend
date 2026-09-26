import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4197;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'waiting-room-desktop-grid');
const baselineOnly = process.argv.includes('--baseline');
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [] };
const viewports = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }];
const assert = (value, message) => { if (!value) throw new Error(message); };
const inside = (inner, outer) => inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1;
const overlaps = (first, second) => first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;

const server = createServer(async (request, response) => {
  const file = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try {
    response.writeHead(200, { 'content-type': { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch { response.writeHead(404).end('Not Found'); }
});

const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('request', request => { if (/\/api(?:\/|$)/i.test(new URL(request.url()).pathname)) findings.unexpectedApiRequests.push(request.url()); });
  page.on('requestfailed', request => findings.failedRequests.push(request.url()));
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};

const login = async page => {
  await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill('daniel.mugisha@pearlsmiledental.test');
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
};

const panels = page => ({
  waiting: page.getByRole('heading', { name: 'Waiting', exact: true }).locator('xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " card ")]'),
  arrivals: page.getByRole('heading', { name: 'Expected Arrivals', exact: true }).locator('xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " card ")]'),
  treatment: page.getByRole('heading', { name: 'In Treatment', exact: true }).locator('xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " card ")]')
});

const measure = async page => {
  const { waiting, arrivals, treatment } = panels(page);
  const workspace = page.locator('.waiting-room__workspace');
  const content = page.locator('.waiting-room');
  const row = treatment.locator('.waiting-room__queue-row').first();
  const status = row.locator('.badge', { hasText: 'In Treatment' });
  const action = row.getByRole('button', { name: 'Open Clinical Encounter' });
  const actionGroup = row.locator('.waiting-room__queue-actions');
  const [viewport, contentBox, workspaceBox, waitingBox, arrivalsBox, treatmentBox, rowBox, statusBox, actionBox, workspaceStyle, treatmentStyle] = await Promise.all([
    page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })), content.boundingBox(), workspace.boundingBox(), waiting.boundingBox(), arrivals.boundingBox(), treatment.boundingBox(), row.boundingBox(), status.boundingBox(), action.boundingBox(),
    workspace.evaluate(node => { const style = getComputedStyle(node); return { display: style.display, gridTemplateColumns: style.gridTemplateColumns, gap: style.gap }; }),
    treatment.evaluate(node => { const style = getComputedStyle(node); return { gridColumnStart: style.gridColumnStart, gridColumnEnd: style.gridColumnEnd }; })
  ]);
  assert(contentBox && workspaceBox && waitingBox && arrivalsBox && treatmentBox && rowBox && statusBox && actionBox, 'A required Waiting Room element was not rendered.');
  const sameLine = statusBox.y < actionBox.y + actionBox.height && statusBox.y + statusBox.height > actionBox.y;
  const gap = sameLine ? actionBox.x - (statusBox.x + statusBox.width) : actionBox.y - (statusBox.y + statusBox.height);
  const sameActionParent = await actionGroup.count() ? await actionGroup.evaluate(node => node.querySelector('.badge')?.parentElement === node && node.querySelector('.waiting-room__queue-action .button')?.closest('.waiting-room__queue-actions') === node) : false;
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.shell-workspace').scrollWidth <= document.querySelector('.shell-workspace').clientWidth);
  return { viewport, content: contentBox, workspace: workspaceBox, waiting: waitingBox, arrivals: arrivalsBox, treatment: treatmentBox, row: rowBox, status: statusBox, action: actionBox, gap, sameLine, sameActionParent, intersection: overlaps(statusBox, actionBox), contained: inside(statusBox, treatmentBox) && inside(actionBox, treatmentBox), noOverflow, workspaceStyle, treatmentStyle };
};

const assertLayout = (layout, width) => {
  const desktop = width >= 1280;
  if (desktop) {
    assert(Math.abs(layout.waiting.y - layout.arrivals.y) <= 2, `First-row panels are not aligned at ${width}px.`);
    assert(layout.treatment.y >= Math.max(layout.waiting.y + layout.waiting.height, layout.arrivals.y + layout.arrivals.height) - 1, `In Treatment is not on the second row at ${width}px.`);
    assert(Math.abs(layout.treatment.x - layout.waiting.x) <= 2, `In Treatment does not align with Waiting at ${width}px.`);
    assert(Math.abs((layout.treatment.x + layout.treatment.width) - (layout.arrivals.x + layout.arrivals.width)) <= 2, `In Treatment does not span through Expected Arrivals at ${width}px.`);
    assert(layout.treatmentStyle.gridColumnStart === '1' && layout.treatmentStyle.gridColumnEnd === '-1', `In Treatment computed grid span is incorrect at ${width}px: ${JSON.stringify(layout.treatmentStyle)}`);
  } else {
    assert(layout.waiting.y < layout.arrivals.y && layout.arrivals.y < layout.treatment.y, `Stacked panel order is incorrect at ${width}px.`);
  }
  assert(layout.sameActionParent, `Status and action do not share their protected group at ${width}px.`);
  assert(!layout.intersection && layout.gap >= 12, `Status/action collision at ${width}px: ${JSON.stringify({ gap: layout.gap, status: layout.status, action: layout.action })}`);
  assert(layout.contained, `Status or action escapes In Treatment at ${width}px.`);
  assert(layout.noOverflow, `Global or workspace overflow at ${width}px.`);
};

const addSecondInTreatmentPatient = page => page.evaluate(() => {
  const key = 'pearl-smile-dental.demo-state';
  const state = JSON.parse(localStorage.getItem(key));
  const appointment = state.appointments.find(item => item.id === 'APT-000107');
  appointment.status = 'IN_TREATMENT';
  appointment.checkedInAt = '2026-09-21T13:48:00+03:00';
  state.queueEntries.push({ id: 'QUEUE-GRID-STRESS', organizationId: state.organization.id, branchId: state.branches[0].id, appointmentId: appointment.id, patientId: appointment.patientId, dentistUserId: appointment.dentistUserId, status: 'IN_TREATMENT', arrivalAt: '2026-09-21T13:48:00+03:00', waitingAt: '2026-09-21T13:50:00+03:00', treatmentStartedAt: '2026-09-21T14:02:00+03:00', readyForCheckoutAt: null, completedAt: null, reason: 'Primary tooth filling', updatedByUserId: appointment.dentistUserId, createdAt: '2026-09-21T13:48:00+03:00', updatedAt: '2026-09-21T14:02:00+03:00' });
  localStorage.setItem(key, JSON.stringify(state));
});

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  observe(page);
  await login(page);
  await page.goto(`${baseUrl}/app.html#/waiting-room`, { waitUntil: 'networkidle' });
  if (baselineOnly) {
    const baseline = await measure(page);
    await writeFile(join(outputDir, 'baseline.json'), JSON.stringify(baseline, null, 2));
    console.log(JSON.stringify(baseline, null, 2));
  } else {
    const layouts = [];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(`${baseUrl}/app.html#/waiting-room`, { waitUntil: 'networkidle' });
      await page.evaluate(() => window.scrollTo(0, 0));
      const layout = await measure(page);
      assertLayout(layout, viewport.width);
      const action = panels(page).treatment.getByRole('button', { name: 'Open Clinical Encounter' });
      await action.focus();
      assert(await action.evaluate(node => document.activeElement === node && getComputedStyle(node).outlineStyle !== 'none'), `Button focus is not visible at ${viewport.width}px.`);
      layouts.push(layout);
      if (viewport.width === 1366) {
        await page.screenshot({ path: join(outputDir, 'waiting-room-1366.png'), fullPage: true });
        await page.locator('.waiting-room__workspace').screenshot({ path: join(outputDir, 'waiting-room-panels-1366.png') });
      }
    }

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`${baseUrl}/app.html#/waiting-room`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, 0));
    const treatment = panels(page).treatment;
    await treatment.locator('.waiting-room__patient a').first().evaluate(node => { node.textContent = 'Amina Nakato Wekesa Namusoke'; });
    await treatment.locator('.waiting-room__detail').filter({ hasText: 'Dentist' }).locator('strong').first().evaluate(node => { node.textContent = 'Dr. Daniel Mugisha Nsubuga-Kato'; });
    const longName = await measure(page);
    assertLayout(longName, 1366);

    await page.goto(`${baseUrl}/app.html#/waiting-room`, { waitUntil: 'networkidle' });
    await addSecondInTreatmentPatient(page);
    await page.reload({ waitUntil: 'networkidle' });
    const rows = panels(page).treatment.locator('.waiting-room__queue-row');
    assert(await rows.count() === 2, 'The multiple-patient runtime fixture did not render two In Treatment rows.');
    const multiplePatient = await rows.evaluateAll(items => items.map(row => { const box = row.getBoundingClientRect(), badge = row.querySelector('.badge').getBoundingClientRect(), button = row.querySelector('.waiting-room__queue-action .button').getBoundingClientRect(); return { row: { x: box.x, y: box.y, width: box.width, height: box.height }, badge: { x: badge.x, y: badge.y, width: badge.width, height: badge.height }, button: { x: button.x, y: button.y, width: button.width, height: button.height }, intersects: badge.right > button.left && badge.left < button.right && badge.bottom > button.top && badge.top < button.bottom, gap: button.left - badge.right }; }));
    multiplePatient.forEach((item, index) => { assert(!item.intersects && item.gap >= 12, `Multiple-patient row ${index + 1} overlaps.`); });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Multiple-patient fixture introduced overflow.');

    await page.evaluate(() => window.DentalAppDev.resetDemoData());
    await page.reload({ waitUntil: 'networkidle' });
    await panels(page).treatment.locator('.waiting-room__queue-row', { hasText: 'Amina Nakato' }).getByRole('button', { name: 'Open Clinical Encounter' }).click();
    await page.waitForURL('**/patients/P001/clinical');
    assert(!Object.values(findings).some(items => items.length), JSON.stringify(findings));
    const result = { status: 'pass', layouts, longName, multiplePatient, navigation: 'preserved', findings };
    await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  }
  await context.close();
} catch (error) {
  await writeFile(join(outputDir, baselineOnly ? 'baseline.json' : 'result.json'), JSON.stringify({ status: 'fail', error: error.message, findings }, null, 2));
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
