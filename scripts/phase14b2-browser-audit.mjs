import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4202;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase14b2');
const fixtureA = join(outputDir, 'phase14b-test-image-a.png');
const fixtureB = join(outputDir, 'phase14b-test-image-b.png');
const largeFixture = join(outputDir, 'phase14b-large-image.png');
const unsupportedFixture = join(outputDir, 'phase14b-unsupported.txt');
const zeroFixture = join(outputDir, 'phase14b-zero.png');
const accounts = {
  administrator: 'grace.admin@pearlsmiledental.test',
  daniel: 'daniel.mugisha@pearlsmiledental.test',
  sarah: 'sarah.nakanwagi@pearlsmiledental.test',
  receptionist: 'lydia.reception@pearlsmiledental.test',
  cashier: 'brian.cashier@pearlsmiledental.test'
};
const findings = { consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [], failedAssets: [], unexpectedApiRequests: [], uploadRequests: [] };
const assert = (value, message) => { if (!value) throw new Error(message); };
const mimeTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const server = createServer(async (request, response) => {
  const file = normalize(join(root, decodeURIComponent(new URL(request.url, baseUrl).pathname.replace(/^\/+/, '')) || 'index.html'));
  if (!file.startsWith(root)) return response.writeHead(403).end();
  try { response.writeHead(200, { 'content-type': mimeTypes[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not Found'); }
});
const observe = page => {
  page.on('console', event => { if (event.type() === 'error') findings.consoleErrors.push(event.text()); if (event.type() === 'warning') findings.warnings.push(event.text()); });
  page.on('pageerror', error => findings.pageErrors.push(error.message));
  page.on('requestfailed', request => findings.failedRequests.push(`${request.method()} ${request.url()}`));
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (/\/api(?:\/|$)/i.test(pathname)) findings.unexpectedApiRequests.push(`${request.method()} ${request.url()}`);
    if (request.method() !== 'GET' || /\/(?:uploads?|storage|patient-files)(?:\/|$)/i.test(pathname)) findings.uploadRequests.push(`${request.method()} ${request.url()}`);
  });
  page.on('response', response => { if (response.url().startsWith(baseUrl) && response.status() >= 400) findings.failedAssets.push(`${response.status()} ${response.url()}`); });
};
const login = async (page, email, reset = true) => {
  await page.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(shouldReset => { if (shouldReset) localStorage.clear(); sessionStorage.clear(); }, reset);
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
};
const loginFromIndex = async (page, email) => {
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Demo@123');
  await page.locator('#login-form button[type=submit]').click();
  await page.waitForURL('**/app.html#/dashboard');
};
const dismissWelcome = async page => { const button = page.getByRole('button', { name: 'Dismiss notification' }); if (await button.count()) await button.click(); };
const logout = async page => { await page.locator('.dropdown summary').click(); await page.getByRole('menuitem', { name: 'Logout' }).click(); await page.waitForURL('**/index.html?signed-out'); };
const openDocuments = async (page, patientId) => { await page.goto(`${baseUrl}/app.html#/patients/${patientId}/documents`, { waitUntil: 'networkidle' }); if (patientId === 'P999') await page.getByText('Patient Not Found').waitFor(); else await page.locator('.documents-workspace').waitFor(); };
const state = page => page.evaluate(() => window.DentalAppDev.getState());
const dirtySources = page => page.evaluate(() => window.DentalAppDev.getDirtySources());
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const installUrlAudit = page => page.evaluate(() => {
  if (window.__documentUrlAudit) return;
  const original = URL.revokeObjectURL.bind(URL);
  window.__documentUrlAudit = { revoked: [] };
  URL.revokeObjectURL = url => { window.__documentUrlAudit.revoked.push(url); return original(url); };
});
const revokedUrls = page => page.evaluate(() => window.__documentUrlAudit?.revoked || []);
const openAddDocument = async page => { const trigger = page.getByRole('button', { name: 'Add Document', exact: true }); await trigger.click(); const dialog = page.getByRole('dialog', { name: 'Add Document' }); await dialog.waitFor(); return { trigger, dialog }; };
const discardDocument = async (page, dialog) => { await dialog.getByRole('button', { name: 'Cancel' }).click(); const prompt = page.getByRole('dialog', { name: 'Discard document changes?' }); await prompt.waitFor(); await prompt.getByRole('button', { name: 'Discard', exact: true }).click(); await dialog.waitFor({ state: 'detached' }); };
const waitForImage = async locator => { await locator.waitFor(); await locator.evaluate(image => new Promise((resolveImage, rejectImage) => { if (image.complete && image.naturalWidth) return resolveImage(); image.addEventListener('load', resolveImage, { once: true }); image.addEventListener('error', () => rejectImage(new Error('Preview image failed to load.')), { once: true }); })); };
const protectedSnapshot = source => JSON.stringify({ medicalHistory: [source.patientAllergies, source.patientConditions, source.patientMedications], findings: source.dentalChartEntries, treatmentPlans: [source.treatmentPlans, source.treatmentPlanItems], procedures: source.proceduresPerformed, prescriptions: [source.prescriptions, source.prescriptionItems], appointments: source.appointments, queue: source.queueEntries, encounters: source.clinicalEncounters, finance: [source.invoices, source.payments, source.receipts] });
const screenshot = (page, name) => page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: true });

await mkdir(outputDir, { recursive: true });
await writeFile(unsupportedFixture, 'Not an image fixture.');
await writeFile(zeroFixture, new Uint8Array());
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });

try {
  // Generate deterministic, safe PNG fixtures in audit output rather than production assets.
  const fixtureContext = await browser.newContext({ viewport: { width: 80, height: 50 } });
  const fixturePage = await fixtureContext.newPage();
  await fixturePage.setContent('<style>html,body{margin:0;width:100%;height:100%;background:#176b78}</style>');
  await fixturePage.screenshot({ path: fixtureA });
  await fixturePage.setViewportSize({ width: 50, height: 80 });
  await fixturePage.setContent('<style>html,body{margin:0;width:100%;height:100%;background:#d98b4a}</style>');
  await fixturePage.screenshot({ path: fixtureB });
  await fixturePage.setViewportSize({ width: 1600, height: 900 });
  await fixturePage.setContent('<style>html,body{margin:0;width:100%;height:100%;background:linear-gradient(135deg,#176b78,#e7f4f5)}</style>');
  await fixturePage.screenshot({ path: largeFixture });
  await fixtureContext.close();
  const fixtureABuffer = await readFile(fixtureA), fixtureBBuffer = await readFile(fixtureB), largeBuffer = await readFile(largeFixture);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  observe(page);
  await login(page, accounts.daniel);
  await dismissWelcome(page);
  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  await page.reload({ waitUntil: 'networkidle' });
  const canonical = await state(page);
  const canonicalCount = canonical.patientDocuments.length;
  assert(canonicalCount === 4, `Unexpected canonical Document count: ${canonicalCount}.`);
  assert(new Set(canonical.patientDocuments.map(record => record.id)).size === canonicalCount, 'Canonical Document IDs are not unique.');

  // Canonical rendering, filters, selection, schema protection, and privacy-safe routing.
  await openDocuments(page, 'P001');
  assert(await page.title() === 'Documents | Pearl Smile Dental Clinic', 'Documents title exposes incorrect context.');
  assert(!/Amina|X-Ray|upper-left/i.test(new URL(page.url()).hash), 'Documents URL exposes patient or clinical metadata.');
  const aminaText = await page.locator('.documents-workspace').innerText();
  assert(aminaText.includes('Amina Nakato') && aminaText.includes('Upper Left Posterior X-Ray') && /20 Sep(?:t)? 2026/.test(aminaText), `Amina canonical Document metadata is incorrect: ${JSON.stringify(aminaText)}`);
  assert(await page.locator('.documents__preview--unavailable').count() === 1 && await page.locator('.documents__preview img').count() === 0, 'Amina canonical preview fallback is incorrect.');
  assert(await page.getByRole('button', { name: /Download/i }).count() === 0, 'A fake Download action is exposed.');
  assert((await dirtySources(page)).length === 0, 'Read-only Documents open dirty.');
  await page.getByRole('button', { name: /^X-Rays/ }).click();
  assert(await page.locator('.documents__item').count() === 1 && (await dirtySources(page)).length === 0, 'X-Ray filtering failed or marked dirty.');
  await page.getByRole('button', { name: /^Clinical Photos/ }).click();
  assert(await page.locator('.documents__item').count() === 0 && (await dirtySources(page)).length === 0, 'Clinical Photo empty filter failed or marked dirty.');
  await page.getByRole('button', { name: /^All/ }).click();
  assert(await page.locator('.documents__item[aria-pressed="true"]').count() === 1, 'Selected Document state is inaccessible.');

  await openDocuments(page, 'P002');
  let workspaceText = await page.locator('.documents-workspace').innerText();
  assert(workspaceText.includes('Tooth 36 Pre-RCT X-Ray') && workspaceText.includes('Tooth 36 Post-RCT X-Ray') && await page.locator('.documents__item').count() === 2, 'Peter canonical Documents were merged or omitted.');
  await page.locator('.documents__item', { hasText: 'Pre-RCT' }).click();
  assert((await page.locator('.documents__detail-region').innerText()).includes('Pre-RCT') && !(await page.locator('.documents__detail-region').innerText()).includes('Post-RCT'), 'Peter Pre-RCT selection retained stale details.');
  await page.locator('.documents__item', { hasText: 'Post-RCT' }).click();
  assert((await page.locator('.documents__detail-region').innerText()).includes('Post-RCT') && !(await page.locator('.documents__detail-region').innerText()).includes('Pre-RCT'), 'Peter Post-RCT selection retained stale details.');
  assert((await dirtySources(page)).length === 0, 'Document selection marked dirty.');

  await openDocuments(page, 'P005');
  workspaceText = await page.locator('.documents-workspace').innerText();
  const detailLabels = await page.locator('.documents__details dt').allTextContents();
  assert(workspaceText.includes('Clinical Photo') && workspaceText.includes('Tooth 21 Fracture') && /19 Sep(?:t)? 2026/.test(workspaceText), 'Esther canonical Clinical Photo is incorrect.');
  assert(!detailLabels.includes('Tooth') && !detailLabels.includes('Procedure'), 'Unsupported Tooth or Procedure relationship is displayed.');

  for (const [patientId, patientName, absent] of [['P001', 'Amina Nakato', 'Pre-RCT'], ['P002', 'Peter Okello', 'Upper Left Posterior'], ['P005', 'Esther Atim', 'Post-RCT'], ['P004', 'Samuel Kato', 'Tooth 21 Fracture'], ['P001', 'Amina Nakato', 'Samuel Kato']]) {
    await openDocuments(page, patientId);
    const text = await page.locator('.documents-workspace').innerText();
    assert(text.includes(patientName) && !text.includes(absent), `Patient switch retained stale Document metadata for ${patientId}.`);
  }
  await openDocuments(page, 'P999');
  assert(!(await page.locator('body').innerText()).includes('Upper Left Posterior X-Ray'), 'Invalid patient route leaked previous Document metadata.');

  // Patient Profile and Clinical Workspace must route to the same Documents workspace.
  await page.goto(`${baseUrl}/app.html#/patients/P001`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Documents', exact: true }).click();
  await page.waitForURL('**/patients/P001/documents');
  await page.locator('.documents-workspace').waitFor();
  assert(await page.locator('.documents-workspace').count() === 1, `Patient Profile did not route to the centralized Documents workspace: ${page.url()} :: ${JSON.stringify(await page.locator('body').innerText())}`);
  await page.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Documents', exact: true }).click();
  await page.waitForURL('**/patients/P001/documents');
  await page.locator('.documents-workspace').waitFor();
  assert(await page.locator('.documents-workspace').count() === 1, 'Clinical Workspace did not route to the centralized Documents workspace.');

  // Modal schema, focus, clean close, Escape/backdrop dirty confirmation, and URL cleanup.
  await installUrlAudit(page);
  let opened = await openAddDocument(page), dialog = opened.dialog;
  assert((await dirtySources(page)).length === 0, 'Opening Add Document marked the form dirty.');
  assert(await dialog.locator('#clinical-document-file').count() === 1 && await dialog.locator('#clinical-document-file').evaluate(control => control.labels?.[0]?.textContent.includes('File')) && await dialog.getByLabel('Type').count() === 1 && await dialog.getByLabel('Title').count() === 1 && await dialog.getByLabel('Document Date').count() === 1 && await dialog.getByLabel('Related Encounter').count() === 1 && await dialog.getByLabel('Notes').count() === 1, 'Add Document is missing an actual schema field.');
  assert(await dialog.getByLabel('Procedure').count() === 0 && await dialog.getByLabel('Tooth').count() === 0, 'Add Document exposes an unsupported Procedure or Tooth field.');
  assert(JSON.stringify(await dialog.getByLabel('Type').locator('option').allTextContents()) === JSON.stringify(['X-Ray', 'Clinical Photo']), 'Document Type options are not exact.');
  assert(await dialog.locator('#clinical-document-file').getAttribute('accept') === 'image/jpeg,image/png' && await dialog.locator('#clinical-document-file').getAttribute('aria-describedby'), 'File input accessibility guidance is incomplete.');
  assert(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]')?.getAttribute('aria-label') === 'Add Document'), 'Modal did not move focus into the dialog.');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert(await page.evaluate(() => document.activeElement?.textContent.trim()) === 'Add Document', 'Clean modal close did not restore trigger focus.');

  opened = await openAddDocument(page); dialog = opened.dialog;
  await dialog.locator('#clinical-document-file').setInputFiles({ name: 'phase14b-a.png', mimeType: 'image/png', buffer: fixtureABuffer });
  await dialog.getByLabel('Title').fill('Unsaved image');
  const dirtyPreview = dialog.locator('.documents__preview img');
  await waitForImage(dirtyPreview);
  const dirtyUrl = await dirtyPreview.getAttribute('src');
  assert(dirtyUrl.startsWith('blob:'), 'Temporary preview does not use an object URL.');
  assert((await dirtySources(page)).includes('clinical-document'), 'File selection did not mark clinical-document dirty.');
  await page.keyboard.press('Escape');
  let prompt = page.getByRole('dialog', { name: 'Discard document changes?' });
  await prompt.waitFor();
  await prompt.getByRole('button', { name: 'Stay', exact: true }).click();
  assert(await dialog.isVisible() && await dirtyPreview.getAttribute('src') === dirtyUrl && (await dirtySources(page)).includes('clinical-document'), 'Dirty Escape Stay did not preserve the form and preview.');
  await page.locator('.overlay--modal').click({ position: { x: 3, y: 3 } });
  await prompt.waitFor();
  await prompt.getByRole('button', { name: 'Stay', exact: true }).click();
  assert(await dialog.isVisible(), 'Dirty backdrop silently discarded the form.');
  await discardDocument(page, dialog);
  assert(!(await dirtySources(page)).includes('clinical-document') && (await revokedUrls(page)).includes(dirtyUrl) && await page.locator(`img[src="${dirtyUrl}"]`).count() === 0, 'Discard did not clean dirty state and temporary preview URL.');

  // File replacement revokes A before rendering B.
  opened = await openAddDocument(page); dialog = opened.dialog;
  const replacementInput = dialog.locator('#clinical-document-file');
  await replacementInput.setInputFiles({ name: 'replacement-a.png', mimeType: 'image/png', buffer: fixtureABuffer });
  let replacementPreview = dialog.locator('.documents__preview img'); await waitForImage(replacementPreview); const firstUrl = await replacementPreview.getAttribute('src');
  await replacementInput.setInputFiles({ name: 'replacement-b.png', mimeType: 'image/png', buffer: fixtureBBuffer });
  replacementPreview = dialog.locator('.documents__preview img'); await waitForImage(replacementPreview); const secondUrl = await replacementPreview.getAttribute('src');
  assert(firstUrl !== secondUrl && (await revokedUrls(page)).includes(firstUrl), 'Replacing a file did not replace and revoke the old preview URL.');
  await discardDocument(page, dialog);
  assert((await revokedUrls(page)).includes(secondUrl), 'Discard did not revoke the replacement preview URL.');

  // Validation remains atomic and produces no audit success event.
  const validationBaseline = await state(page), validationDocumentCount = validationBaseline.patientDocuments.length, validationAuditCount = validationBaseline.auditLogs.length;
  opened = await openAddDocument(page); dialog = opened.dialog;
  await dialog.getByLabel('Title').fill('Missing attachment');
  await dialog.getByRole('button', { name: 'Save Document' }).click();
  assert(await dialog.locator('#clinical-document-file').getAttribute('aria-invalid') === 'true' && await dialog.getByText('Select an image file.').count() === 1, 'Missing-file validation is not inline and accessible.');
  await dialog.locator('#clinical-document-file').setInputFiles(unsupportedFixture);
  await dialog.getByRole('button', { name: 'Save Document' }).click();
  assert((await dialog.locator('#clinical-document-file-hint').innerText()).includes('JPEG or PNG'), 'Unsupported file type was not rejected.');
  await dialog.locator('#clinical-document-file').setInputFiles(zeroFixture);
  await dialog.getByRole('button', { name: 'Save Document' }).click();
  assert((await dialog.locator('#clinical-document-file-hint').innerText()).includes('empty'), 'Zero-byte file was not rejected.');
  await dialog.locator('#clinical-document-file').setInputFiles({ name: 'valid.png', mimeType: 'image/png', buffer: fixtureABuffer });
  await dialog.getByLabel('Type').evaluate(control => { control.value = ''; control.dispatchEvent(new Event('change', { bubbles: true })); });
  await dialog.getByRole('button', { name: 'Save Document' }).click();
  assert(await dialog.getByLabel('Type').getAttribute('aria-invalid') === 'true', 'Missing Document Type was not identified inline.');
  let validationAfter = await state(page);
  assert(validationAfter.patientDocuments.length === validationDocumentCount && validationAfter.auditLogs.length === validationAuditCount && await page.getByText('Document added.').count() === 0, 'Failed validation created a Document, audit, or success toast.');
  await discardDocument(page, dialog);

  // Dirty navigation, patient switch, and logout protections.
  opened = await openAddDocument(page); dialog = opened.dialog;
  await dialog.locator('#clinical-document-file').setInputFiles({ name: 'navigation.png', mimeType: 'image/png', buffer: fixtureABuffer });
  await dialog.getByLabel('Title').fill('Navigation guard');
  const originalRoute = page.url();
  const stayFor = async trigger => { await trigger(); const confirmation = page.getByRole('dialog', { name: 'Discard document changes?' }); await confirmation.waitFor(); await confirmation.getByRole('button', { name: 'Stay', exact: true }).click(); assert(page.url() === originalRoute && await dialog.isVisible(), 'Dirty navigation did not stay on Documents.'); };
  for (const href of ['#/dashboard', '#/clinical/dental-chart', '#/treatment-plans', '#/procedures', '#/prescriptions', '#/appointments', '#/waiting-room']) await stayFor(() => page.locator(`a[href="${href}"]`).first().click({ force: true }));
  await stayFor(() => page.getByRole('button', { name: 'Patient Profile', exact: true }).click({ force: true }));
  await stayFor(() => page.getByRole('button', { name: 'Clinical Workspace', exact: true }).click({ force: true }));
  const search = page.locator('.global-patient-search input'); await search.fill('Peter'); const peterResult = page.getByRole('option', { name: /View Peter Okello/ });
  assert(await peterResult.getAttribute('href') === '#/patients/P002', 'Global patient switch target is incorrect.');
  await peterResult.evaluate(link => link.click());
  const patientSwitchPrompt = page.getByRole('dialog', { name: 'Discard document changes?' });
  try { await patientSwitchPrompt.waitFor({ timeout: 3000 }); } catch { throw new Error(`Dirty patient switch was not guarded: url=${page.url()} dirty=${JSON.stringify(await dirtySources(page))} modal=${await dialog.isVisible()}`); }
  await patientSwitchPrompt.getByRole('button', { name: 'Stay', exact: true }).click();
  assert(page.url() === originalRoute && await dialog.isVisible(), 'Dirty patient switch did not stay on Documents.');
  assert((await dialog.locator('#clinical-document-file').inputValue()).includes('navigation.png'), 'Patient-switch Stay lost the selected file.');
  await page.locator('.dropdown summary').evaluate(summary => summary.click());
  await page.getByRole('menuitem', { name: 'Logout' }).evaluate(item => item.click());
  const logoutPrompt = page.getByRole('dialog', { name: 'Unsaved changes' }); await logoutPrompt.waitFor(); await logoutPrompt.getByRole('button', { name: 'Cancel' }).click();
  assert(await dialog.isVisible() && page.url() === originalRoute, 'Dirty Logout did not preserve the Document form.');
  await search.fill('Peter'); await page.getByRole('option', { name: /View Peter Okello/ }).evaluate(link => link.click()); prompt = page.getByRole('dialog', { name: 'Discard document changes?' }); await prompt.waitFor(); await prompt.getByRole('button', { name: 'Discard', exact: true }).click(); await page.waitForURL('**/patients/P002'); await page.locator('.patient-profile').waitFor();
  assert(!(await page.locator('body').innerText()).includes('Upper Left Posterior X-Ray') && !(await dirtySources(page)).includes('clinical-document'), 'Dirty Patient switch leaked Amina metadata or dirty state.');
  await openDocuments(page, 'P001');

  // Valid save, double-submit lock, safe rendering, audit, persistence, and cross-domain isolation.
  await installUrlAudit(page);
  const beforeCreate = await state(page), patientBefore = beforeCreate.patientDocuments.filter(record => record.patientId === 'P001').length, storageBefore = await page.evaluate(() => localStorage.getItem('pearl-smile-dental.demo-state')?.length || 0), isolationBaseline = protectedSnapshot(beforeCreate);
  opened = await openAddDocument(page); dialog = opened.dialog;
  const safeFilename = 'test-<sample>&"quote".png';
  const safeTitle = '<em data-document-xss>Runtime Clinical Photo</em>';
  await dialog.locator('#clinical-document-file').setInputFiles({ name: safeFilename, mimeType: 'image/png', buffer: fixtureABuffer });
  await dialog.getByLabel('Type').selectOption('CLINICAL_PHOTO');
  await dialog.getByLabel('Title').fill(safeTitle);
  await dialog.getByLabel('Related Encounter').selectOption('ENC-000201');
  await dialog.getByLabel('Notes').fill('<script>not executable</script> Metadata only.');
  const savePreview = dialog.locator('.documents__preview img'); await waitForImage(savePreview); const savedObjectUrl = await savePreview.getAttribute('src');
  await page.evaluate(async () => { const { dirtyState } = await import('/assets/js/core/dirty-state.js'); ['prescription', 'clinical-encounter', 'medical-history', 'odontogram', 'treatment-plan', 'procedure'].forEach(source => dirtyState.markUnsavedChanges(source)); });
  await dialog.getByRole('button', { name: 'Save Document' }).evaluate(button => { button.click(); button.click(); });
  await dialog.waitFor({ state: 'detached' });
  await page.getByText('Document added.').waitFor();
  const afterCreate = await state(page), runtimeDocument = afterCreate.patientDocuments.find(record => record.title === safeTitle), documentEvents = afterCreate.auditLogs.filter(event => event.actionCode === 'CLINICAL_DOCUMENT_CREATED' && event.entityId === runtimeDocument?.id), storageAfter = await page.evaluate(() => localStorage.getItem('pearl-smile-dental.demo-state') || '');
  assert(runtimeDocument?.id === 'DOC-005' && afterCreate.patientDocuments.length === canonicalCount + 1 && afterCreate.patientDocuments.filter(record => record.patientId === 'P001').length === patientBefore + 1, 'Valid Save did not add exactly one collision-safe Document.');
  assert(runtimeDocument.type === 'CLINICAL_PHOTO' && runtimeDocument.encounterId === 'ENC-000201' && runtimeDocument.fileName === safeFilename && runtimeDocument.mimeType === 'image/png' && runtimeDocument.fileSizeBytes === fixtureABuffer.length, 'Runtime Document metadata is incorrect.');
  assert(!('procedureId' in runtimeDocument) && !('toothCode' in runtimeDocument) && !('storageUrl' in runtimeDocument) && !('runtimeFileUnavailable' in runtimeDocument), 'Runtime Document contains unsupported fields.');
  assert(documentEvents.length === 1 && documentEvents[0].actorUserId === 'U002' && documentEvents[0].occurredAt === '2026-09-21T10:00:00+03:00', 'Document audit event is incorrect.');
  assert(await page.getByText('Document added.').count() === 1, 'Double submit produced multiple success toasts.');
  const remainingDirty = await dirtySources(page);
  assert(!remainingDirty.includes('clinical-document') && ['prescription', 'clinical-encounter', 'medical-history', 'odontogram', 'treatment-plan', 'procedure'].every(source => remainingDirty.includes(source)), 'Document Save cleared an unrelated dirty source.');
  assert(protectedSnapshot(afterCreate) === isolationBaseline, 'Document Save mutated another clinical, operational, or finance domain.');
  assert(!storageAfter.includes('blob:') && !storageAfter.includes('data:image') && !storageAfter.includes('base64') && !/\/(?:uploads?|storage\/documents|patient-files)\//i.test(storageAfter) && storageAfter.length - storageBefore < 10000, 'Persistent state contains binary, object URL, fake path, or excessive data.');
  workspaceText = await page.locator('.documents-workspace').innerText();
  assert(workspaceText.includes(safeTitle) && workspaceText.includes(safeFilename) && await page.locator('[data-document-xss]').count() === 0, 'Runtime metadata was not reflected safely as text.');
  const sessionPreview = page.locator('.documents__detail-region .documents__preview img'); await waitForImage(sessionPreview);
  assert(await sessionPreview.getAttribute('src') === savedObjectUrl && (await sessionPreview.evaluate(image => image.naturalWidth > 0)), 'Same-session saved preview is unavailable.');
  await page.evaluate(async () => { const { dirtyState } = await import('/assets/js/core/dirty-state.js'); dirtyState.clear(); });

  // Refresh retains metadata but not the ephemeral object URL.
  await page.reload({ waitUntil: 'networkidle' });
  workspaceText = await page.locator('.documents-workspace').innerText();
  assert(workspaceText.includes(safeTitle) && await page.locator('.documents__detail-region .documents__preview img').count() === 0 && await page.locator('.documents__preview--unavailable').count() === 1, 'Refresh did not retain metadata with an honest unavailable preview.');
  assert(!(await page.locator('body').evaluate(body => body.innerHTML.includes('blob:'))), 'A stale object URL survived refresh.');
  await page.goto(`${baseUrl}/app.html#/patients/P001`, { waitUntil: 'networkidle' }); await page.getByRole('link', { name: 'Documents', exact: true }).click(); await page.waitForURL('**/patients/P001/documents'); await page.locator('.documents-workspace').waitFor(); assert((await page.locator('.documents-workspace').innerText()).includes(safeTitle), 'Patient Profile did not reflect runtime Document metadata.');
  await page.goto(`${baseUrl}/app.html#/patients/P001/clinical`, { waitUntil: 'networkidle' }); await page.getByRole('button', { name: 'Documents', exact: true }).click(); await page.waitForURL('**/patients/P001/documents'); await page.locator('.documents-workspace').waitFor(); assert((await page.locator('.documents-workspace').innerText()).includes(safeTitle), 'Clinical Workspace did not reflect runtime Document metadata.');

  // Dentist-to-Cashier session leak and direct-route DOM protection.
  await logout(page);
  await loginFromIndex(page, accounts.cashier);
  await page.goto(`${baseUrl}/app.html#/patients/P002/documents`, { waitUntil: 'networkidle' });
  const cashierBody = await page.locator('body').innerText();
  for (const secret of ['Tooth 36 Pre-RCT X-Ray', 'Tooth 36 Post-RCT X-Ray', 'tooth-36-pre-rct-demo.jpg', 'tooth-36-post-rct-demo.jpg', safeTitle, safeFilename]) assert(!cashierBody.includes(secret), `Cashier DOM leaked ${secret}.`);
  assert(cashierBody.includes('Access Denied') && await page.locator('.documents-workspace').count() === 0, 'Cashier route was not denied before Documents rendered.');

  // Role matrix in isolated browser contexts.
  const roleAudit = async (email, expected) => {
    const roleContext = await browser.newContext({ viewport: { width: 1366, height: 768 } }); const rolePage = await roleContext.newPage(); observe(rolePage); await login(rolePage, email); await dismissWelcome(rolePage);
    if (expected.view) await openDocuments(rolePage, 'P001'); else { await rolePage.goto(`${baseUrl}/app.html#/patients/P001/documents`, { waitUntil: 'networkidle' }); await rolePage.getByText('Access Denied', { exact: true }).waitFor(); }
    const body = await rolePage.locator('body').innerText();
    assert(body.includes(expected.view ? 'Upper Left Posterior X-Ray' : 'Access Denied'), `${email} view permission is incorrect.`);
    assert((await rolePage.getByRole('button', { name: 'Add Document', exact: true }).count() > 0) === expected.add, `${email} Add permission is incorrect.`);
    if (!expected.view) assert(!body.includes('upper-left-posterior-xray-demo.jpg') && await rolePage.locator('.documents-workspace').count() === 0, `${email} unauthorized DOM contains Document PHI.`);
    await roleContext.close();
  };
  await roleAudit(accounts.administrator, { view: true, add: false });
  await roleAudit(accounts.daniel, { view: true, add: true });
  await roleAudit(accounts.sarah, { view: true, add: true });
  await roleAudit(accounts.receptionist, { view: false, add: false });
  await roleAudit(accounts.cashier, { view: false, add: false });

  // Return to Dentist state, exercise responsive and shell behavior, then Waiting Room regression.
  await logout(page); await loginFromIndex(page, accounts.daniel); await dismissWelcome(page); await openDocuments(page, 'P001');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport); await openDocuments(page, 'P001');
    assert(await noOverflow(page), `Documents workspace has global overflow at ${viewport.width}x${viewport.height}.`);
    assert(await page.locator('.documents__filter[aria-pressed]').count() === 3 && await page.locator('.documents__item').first().getAttribute('aria-pressed') !== null, `Filter or card accessibility state is missing at ${viewport.width}px.`);
    opened = await openAddDocument(page); dialog = opened.dialog;
    const longName = `${'long-clinical-document-'.repeat(8)}.png`;
    await dialog.locator('#clinical-document-file').setInputFiles({ name: longName, mimeType: 'image/png', buffer: largeBuffer });
    await dialog.getByLabel('Title').fill('Large image responsive audit');
    const largePreview = dialog.locator('.documents__preview img'); await waitForImage(largePreview);
    const imageMetrics = await largePreview.evaluate(image => { const imageBox = image.getBoundingClientRect(), parentBox = image.parentElement.getBoundingClientRect(); return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, width: imageBox.width, height: imageBox.height, parentWidth: parentBox.width, parentHeight: parentBox.height }; });
    assert(imageMetrics.naturalWidth === 1600 && imageMetrics.naturalHeight === 900 && imageMetrics.width <= imageMetrics.parentWidth + 1 && imageMetrics.height <= imageMetrics.parentHeight + 1 && Math.abs((imageMetrics.width / imageMetrics.height) - (16 / 9)) < 0.03, `Large preview is distorted or overflowing at ${viewport.width}px.`);
    assert(await dialog.getByRole('button', { name: 'Save Document' }).isVisible() && await dialog.getByRole('button', { name: 'Cancel' }).isVisible() && await noOverflow(page), `Modal actions are clipped at ${viewport.width}px.`);
    if ([1440, 1366, 1024, 390].includes(viewport.width)) await screenshot(page, `documents-modal-${viewport.width}`);
    await discardDocument(page, dialog);
  }
  assert(await page.locator('.shell-sidebar').count() === 1 && await page.locator('.shell-header').count() === 1 && await page.locator('.shell-footer').getByText('Developed with').count() === 1, 'Shell structure regressed on Documents.');
  await page.locator('.header-notification-button').click(); assert(await page.locator('#header-notification-panel').isVisible(), 'Notification panel does not open.'); await page.keyboard.press('Escape');
  await page.locator('.dropdown summary').click(); assert(await page.getByRole('menuitem', { name: 'Profile' }).isVisible(), 'Profile dropdown does not open.'); await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 1366, height: 768 }); await page.goto(`${baseUrl}/app.html#/waiting-room`, { waitUntil: 'networkidle' });
  const treatmentPanel = page.locator('.waiting-room__panel--treatment'), waitingWorkspace = page.locator('.waiting-room__workspace');
  const panelBox = await treatmentPanel.boundingBox(), workspaceBox = await waitingWorkspace.boundingBox(), status = treatmentPanel.getByText('In Treatment', { exact: true }).first(), clinicalAction = treatmentPanel.getByRole('button', { name: 'Open Clinical Encounter' }).first();
  assert(panelBox && workspaceBox && panelBox.width >= workspaceBox.width * .95 && await status.isVisible() && await clinicalAction.isVisible(), 'Waiting Room full-laptop layout regressed.');
  const statusBox = await status.boundingBox(), actionBox = await clinicalAction.boundingBox();
  assert(statusBox && actionBox && (statusBox.x + statusBox.width <= actionBox.x || actionBox.x + actionBox.width <= statusBox.x || statusBox.y + statusBox.height <= actionBox.y || actionBox.y + actionBox.height <= statusBox.y), 'Waiting Room In Treatment status overlaps its action.');
  assert(await noOverflow(page), 'Waiting Room has global overflow.');
  await screenshot(page, 'waiting-room-1366');

  // Reset removes runtime metadata, dirty sources, and an active same-session preview.
  await page.setViewportSize({ width: 1440, height: 900 }); await openDocuments(page, 'P001'); await installUrlAudit(page);
  opened = await openAddDocument(page); dialog = opened.dialog;
  await dialog.locator('#clinical-document-file').setInputFiles({ name: 'reset-preview.png', mimeType: 'image/png', buffer: fixtureABuffer }); await dialog.getByLabel('Title').fill('Reset preview');
  const resetPreview = dialog.locator('.documents__preview img'); await waitForImage(resetPreview); const resetDraftUrl = await resetPreview.getAttribute('src');
  await dialog.getByRole('button', { name: 'Save Document' }).click(); await dialog.waitFor({ state: 'detached' });
  const resetSavedUrl = await page.locator('.documents__detail-region .documents__preview img').getAttribute('src'); assert(resetSavedUrl === resetDraftUrl, 'Reset fixture did not retain a same-session preview.');
  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  assert((await revokedUrls(page)).includes(resetSavedUrl), 'Demo reset did not revoke the saved temporary preview URL.');
  await page.reload({ waitUntil: 'networkidle' });
  const resetState = await state(page), resetText = await page.locator('.documents-workspace').innerText();
  assert(resetState.patientDocuments.length === canonicalCount && !resetState.patientDocuments.some(record => record.id === 'DOC-005') && resetText.includes('Upper Left Posterior X-Ray') && !resetText.includes(safeTitle) && (await dirtySources(page)).length === 0, 'Demo reset did not restore canonical Documents and dirty registry.');
  assert(resetState.patientDocuments.filter(record => record.patientId === 'P002').length === 2 && resetState.patientDocuments.some(record => record.id === 'DOC-004' && record.type === 'CLINICAL_PHOTO'), 'Demo reset did not restore Peter and Esther Documents.');
  const integrity = await page.evaluate(async () => { const { validateCanonicalDemoState } = await import('/assets/js/data/integrity.js'); return validateCanonicalDemoState(window.DentalAppDev.getState()); });
  assert(integrity.valid && integrity.errors.length === 0, `Post-reset Phase 5/global validator failed: ${integrity.errors.join(' | ')}`);
  assert(!Object.values(findings).some(records => records.length), JSON.stringify(findings));

  const result = {
    status: 'pass',
    browser: 'Chromium via Playwright 1.63.0',
    canonicalDocuments: 'Amina, Peter pre/post RCT, and Esther pass',
    schemaProtection: 'no Procedure/Tooth relationship; X_RAY and CLINICAL_PHOTO only',
    routingAndPrivacy: 'pass',
    filtersAndSelection: 'pass',
    runtimeCreate: { id: runtimeDocument.id, patientId: runtimeDocument.patientId, type: runtimeDocument.type, mimeType: runtimeDocument.mimeType, fileSizeBytes: runtimeDocument.fileSizeBytes, before: canonicalCount, after: afterCreate.patientDocuments.length },
    persistence: 'metadata only; same-session blob preview; unavailable fallback after refresh',
    temporaryPreviewLifecycle: 'select, replace, discard, save, and reset pass',
    dirtyState: 'navigation, patient switch, logout, and six-source coexistence pass',
    roleSecurity: 'Administrator read-only; both Dentists create; Receptionist/Cashier denied',
    responsive: '1440x900, 1366x768, 1280x720, 1024x768, 390x844 pass',
    waitingRoomRegression: 'pass',
    runtimeIntegrityAndReset: 'pass',
    screenshots: outputDir,
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
