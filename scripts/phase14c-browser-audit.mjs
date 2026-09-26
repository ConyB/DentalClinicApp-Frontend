import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('.');
const port = 4203;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(root, 'tests', 'audits', 'output', 'phase14c');
const fixture = join(outputDir, 'phase14c-clinical-photo.png');
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
    if (request.method() !== 'GET' || /\/(?:uploads?|storage|patient-files|documents\/files)(?:\/|$)/i.test(pathname)) findings.uploadRequests.push(`${request.method()} ${request.url()}`);
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
const openPrescriptions = async (page, patientId) => { await page.goto(`${baseUrl}/app.html#/patients/${patientId}/prescriptions`, { waitUntil: 'networkidle' }); if (patientId === 'P999') await page.getByText('Patient Not Found').waitFor(); else await page.locator('.prescriptions').waitFor(); };
const openDocuments = async (page, patientId) => { await page.goto(`${baseUrl}/app.html#/patients/${patientId}/documents`, { waitUntil: 'networkidle' }); if (patientId === 'P999') await page.getByText('Patient Not Found').waitFor(); else await page.locator('.documents-workspace').waitFor(); };
const state = page => page.evaluate(() => window.DentalAppDev.getState());
const dirtySources = page => page.evaluate(() => window.DentalAppDev.getDirtySources());
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && (!document.querySelector('.shell-workspace') || document.querySelector('.shell-workspace').scrollWidth <= document.querySelector('.shell-workspace').clientWidth));
const snapshotProtected = source => JSON.stringify({ medical: [source.patientAllergies, source.patientConditions, source.patientMedications], findings: [source.encounterFindings, source.dentalChartEntries, source.dentalChartEntrySurfaces], plans: [source.treatmentPlans, source.treatmentPlanItems], procedures: source.proceduresPerformed, appointments: source.appointments, queue: source.queueEntries, encounters: source.clinicalEncounters, finance: [source.invoices, source.invoiceItems, source.payments, source.receipts] });
const waitForImage = async locator => { await locator.waitFor(); await locator.evaluate(image => new Promise((done, fail) => { if (image.complete && image.naturalWidth) return done(); image.addEventListener('load', done, { once: true }); image.addEventListener('error', () => fail(new Error('Preview failed to load.')), { once: true }); })); };
const safeBody = async page => { const text = await page.locator('body').innerText(); assert(!/[ÃÂ]|â(?:€|™|†|‰)|ï¿½|�/.test(text), 'Visible mojibake detected.'); return text; };
const screenshot = (page, name) => page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: true });

await mkdir(outputDir, { recursive: true });
await new Promise(done => server.listen(port, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true });

try {
  const fixtureContext = await browser.newContext({ viewport: { width: 96, height: 64 } });
  const fixturePage = await fixtureContext.newPage();
  await fixturePage.setContent('<style>html,body{margin:0;width:100%;height:100%;background:linear-gradient(135deg,#176b78,#d7eef0)}</style>');
  await fixturePage.screenshot({ path: fixture });
  await fixtureContext.close();
  const fixtureBuffer = await readFile(fixture);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  observe(page);
  await login(page, accounts.daniel);
  await dismissWelcome(page);
  const canonical = await state(page);
  const canonicalCount = { prescriptions: canonical.prescriptions.length, items: canonical.prescriptionItems.length, documents: canonical.patientDocuments.length };
  const isolationBaseline = snapshotProtected(canonical);

  // Canonical Prescription, Medical Safety separation, safe patient switching, and invalid routes.
  await openPrescriptions(page, 'P004');
  let body = await safeBody(page);
  assert(body.includes('RX-000501') && body.includes('Example Medication A') && body.includes('Metformin') && body.includes('Issued'), 'Samuel canonical Prescription or Medical Safety context is incorrect.');
  for (const check of [
    ['P001', ['Amina Nakato', 'Penicillin'], ['Metformin', 'Amlodipine', 'Losartan']],
    ['P002', ['Peter Okello', 'Hypertension', 'Amlodipine', 'No prescriptions have been issued'], ['Penicillin', 'Metformin', 'Losartan']],
    ['P010', ['Joseph Walusimbi', 'Hypertension', 'Losartan', 'No prescriptions have been issued'], ['Penicillin', 'Metformin', 'Amlodipine']],
    ['P004', ['Samuel Kato', 'Diabetes', 'Metformin', 'RX-000501'], ['Penicillin', 'Amlodipine', 'Losartan']]
  ]) {
    await openPrescriptions(page, check[0]); body = await safeBody(page);
    check[1].forEach(value => assert(body.includes(value), `Prescription context ${check[0]} missing ${value}.`));
    check[2].forEach(value => assert(!body.includes(value), `Prescription context ${check[0]} leaked ${value}.`));
  }
  await openPrescriptions(page, 'P999'); body = await safeBody(page); assert(body.includes('Patient Not Found') && !body.includes('RX-000501') && !body.includes('Penicillin'), 'Invalid Prescription patient exposed stale PHI.');

  // Failed create, dirty navigation Stay/Discard, valid double save, text safety, and cross-dirty preservation.
  await openPrescriptions(page, 'P001');
  await page.getByRole('button', { name: 'New Prescription' }).click();
  let dialog = page.getByRole('dialog', { name: 'New Prescription' });
  await dialog.getByLabel('Medication').fill('   ');
  const beforeInvalid = await state(page);
  await dialog.getByRole('button', { name: 'Issue Prescription' }).click();
  assert(await dialog.getByLabel('Medication').getAttribute('aria-invalid') === 'true' && (await dirtySources(page)).includes('prescription'), 'Invalid Prescription did not remain dirty with inline validation.');
  assert((await state(page)).prescriptions.length === beforeInvalid.prescriptions.length && !(await page.locator('body').innerText()).includes('Prescription issued.'), 'Invalid Prescription created state or a success toast.');
  await page.locator('a[href="#/dashboard"]').first().evaluate(link => link.click());
  let prompt = page.getByRole('dialog', { name: 'Discard prescription changes?' }); await prompt.waitFor();
  await prompt.getByRole('button', { name: 'Cancel' }).click();
  assert(dialog.isVisible() && page.url().endsWith('#/patients/P001/prescriptions'), 'Prescription Stay did not preserve the form and route.');
  await dialog.getByRole('button', { name: 'Cancel' }).click(); prompt = page.getByRole('dialog', { name: 'Discard prescription changes?' }); await prompt.waitFor(); await prompt.getByRole('button', { name: 'Discard Changes' }).click(); await dialog.waitFor({ state: 'detached' });

  await page.getByRole('button', { name: 'New Prescription' }).click(); dialog = page.getByRole('dialog', { name: 'New Prescription' });
  const safeMedication = '<em data-rx-xss>Extremely long demonstration medication name that must wrap safely without changing any clinical decision</em>';
  const safeInstructions = '<img data-rx-instructions src=x> Follow Dentist instructions only; this is intentionally long responsive text.';
  await dialog.getByLabel('Medication').fill(safeMedication);
  await dialog.getByLabel('Item Instructions').fill(safeInstructions);
  await dialog.getByLabel('General Prescription Note').fill('<script>not executable</script> Metadata only.');
  await page.evaluate(async () => { const { dirtyState } = await import('/assets/js/core/dirty-state.js'); ['clinical-document', 'clinical-encounter', 'medical-history', 'odontogram', 'treatment-plan', 'procedure'].forEach(source => dirtyState.markUnsavedChanges(source)); });
  await dialog.getByRole('button', { name: 'Issue Prescription' }).evaluate(button => { button.click(); button.click(); });
  await dialog.waitFor({ state: 'detached' });
  await page.getByText('Prescription issued.').waitFor();
  const afterRx = await state(page), runtimeRx = afterRx.prescriptions.find(record => record.id === 'RX-000502');
  assert(runtimeRx?.patientId === 'P001' && runtimeRx.dentistUserId === 'U002' && runtimeRx.encounterId === null && runtimeRx.status === 'ISSUED', 'Runtime Prescription relationships or stale encounter resolution are incorrect.');
  assert(afterRx.prescriptions.length === canonicalCount.prescriptions + 1 && afterRx.prescriptionItems.length === canonicalCount.items + 1, 'Runtime Prescription double save was not atomic.');
  assert(afterRx.auditLogs.filter(event => event.actionCode === 'PRESCRIPTION_CREATED' && event.entityId === runtimeRx.id).length === 1 && await page.getByText('Prescription issued.').count() === 1, 'Runtime Prescription audit/toast duplicated.');
  assert(!(await dirtySources(page)).includes('prescription'), 'Prescription dirty source did not clear independently.');
  const postRxDirty = await dirtySources(page); assert(['clinical-document', 'clinical-encounter', 'medical-history', 'odontogram', 'treatment-plan', 'procedure'].every(source => postRxDirty.includes(source)), 'Prescription save cleared another dirty source.');
  body = await safeBody(page); assert(body.includes(safeMedication) && body.includes(safeInstructions) && await page.locator('[data-rx-xss], [data-rx-instructions]').count() === 0, 'Prescription text was not rendered safely.');
  assert(snapshotProtected(afterRx) === isolationBaseline, 'Prescription creation changed another clinical, operational, or finance domain.');
  await page.evaluate(async () => { const { dirtyState } = await import('/assets/js/core/dirty-state.js'); dirtyState.clear(); });
  await page.getByRole('button', { name: 'Patient Profile' }).click(); await page.waitForURL(url => url.hash === '#/patients/P001'); await page.locator('.patient-profile').waitFor(); assert(await page.locator('.patient-profile').count() === 1, 'Prescription Patient Profile action did not open the patient overview.');
  await openPrescriptions(page, 'P001'); assert((await safeBody(page)).includes('RX-000502'), 'Runtime Prescription did not persist across navigation.');

  // Canonical Documents, runtime metadata, session preview, refresh honesty, and reverse dirty coexistence.
  await openDocuments(page, 'P001'); body = await safeBody(page); assert(body.includes('Upper Left Posterior X-Ray') && body.includes('Preview unavailable'), 'Amina canonical Document or fallback is incorrect.');
  await openDocuments(page, 'P002'); body = await safeBody(page); assert(body.includes('Tooth 36 Pre-RCT X-Ray') && body.includes('Tooth 36 Post-RCT X-Ray'), 'Peter canonical Documents are missing or merged.');
  await openDocuments(page, 'P005'); body = await safeBody(page); assert(body.includes('Tooth 21 Fracture') && body.includes('Clinical Photo') && !body.includes('Tooth 21:'), 'Esther canonical Document or schema-safe display is incorrect.');
  await openDocuments(page, 'P999'); body = await safeBody(page); assert(body.includes('Patient Not Found') && !body.includes('Upper Left Posterior X-Ray'), 'Invalid Document patient exposed stale PHI.');
  await openDocuments(page, 'P001');
  await page.getByRole('button', { name: 'Add Document' }).click();
  dialog = page.getByRole('dialog', { name: 'Add Document' });
  const safeFilename = `${'long-clinical-document-'.repeat(7)}<sample>&.png`;
  const safeTitle = '<em data-doc-xss>Runtime Clinical Photo With A Long Responsive Title</em>';
  await dialog.locator('#clinical-document-file').setInputFiles({ name: safeFilename, mimeType: 'image/png', buffer: fixtureBuffer });
  await dialog.getByLabel('Type').selectOption('CLINICAL_PHOTO');
  await dialog.getByLabel('Title').fill(safeTitle);
  await dialog.getByLabel('Related Encounter').selectOption('ENC-000201');
  await dialog.getByLabel('Notes').fill('<script>not executable</script> Metadata only.');
  const draftPreview = dialog.locator('.documents__preview img'); await waitForImage(draftPreview); const objectUrl = await draftPreview.getAttribute('src'); assert(objectUrl.startsWith('blob:'), 'Runtime Document preview did not use an object URL.');
  await page.evaluate(async () => { const { dirtyState } = await import('/assets/js/core/dirty-state.js'); ['prescription', 'clinical-encounter', 'medical-history', 'odontogram', 'treatment-plan', 'procedure'].forEach(source => dirtyState.markUnsavedChanges(source)); });
  await dialog.getByRole('button', { name: 'Save Document' }).evaluate(button => { button.click(); button.click(); });
  await dialog.waitFor({ state: 'detached' }); await page.getByText('Document added.').waitFor();
  const afterDocument = await state(page), runtimeDocument = afterDocument.patientDocuments.find(record => record.id === 'DOC-005');
  assert(runtimeDocument?.patientId === 'P001' && runtimeDocument.encounterId === 'ENC-000201' && runtimeDocument.type === 'CLINICAL_PHOTO' && runtimeDocument.fileName === safeFilename && runtimeDocument.mimeType === 'image/png', 'Runtime Document metadata is incorrect.');
  assert(afterDocument.patientDocuments.length === canonicalCount.documents + 1 && afterDocument.auditLogs.filter(event => event.actionCode === 'CLINICAL_DOCUMENT_CREATED' && event.entityId === runtimeDocument.id).length === 1 && await page.getByText('Document added.').count() === 1, 'Runtime Document double save, audit, or toast is incorrect.');
  const postDocumentDirty = await dirtySources(page); assert(!postDocumentDirty.includes('clinical-document') && ['prescription', 'clinical-encounter', 'medical-history', 'odontogram', 'treatment-plan', 'procedure'].every(source => postDocumentDirty.includes(source)), 'Document save cleared another dirty source.');
  assert(snapshotProtected(afterDocument) === isolationBaseline, 'Document creation changed another clinical, operational, or finance domain.');
  const storageText = await page.evaluate(() => localStorage.getItem('pearl-smile-dental.demo-state') || '');
  assert(!storageText.includes('blob:') && !storageText.includes('data:image') && !storageText.includes('base64') && !/\/(?:uploads?|storage|patient-files|documents\/files)\//i.test(storageText), 'Persistent state contains a binary, object URL, or fake storage path.');
  const sessionPreview = page.locator('.documents__detail-region .documents__preview img'); await waitForImage(sessionPreview); assert(await sessionPreview.getAttribute('src') === objectUrl, 'Saved same-session Document preview is unavailable.');
  body = await safeBody(page); assert(body.includes(safeTitle) && body.includes(safeFilename) && await page.locator('[data-doc-xss]').count() === 0, 'Document metadata was not rendered safely.');
  await page.evaluate(async () => { const { dirtyState } = await import('/assets/js/core/dirty-state.js'); dirtyState.clear(); });
  await page.reload({ waitUntil: 'networkidle' }); body = await safeBody(page); assert(body.includes(safeTitle) && body.includes('Preview unavailable') && await page.locator(`img[src="${objectUrl}"]`).count() === 0, 'Document refresh did not preserve metadata with an honest preview fallback.');

  for (const check of [['P001', 'Upper Left Posterior X-Ray'], ['P002', 'Tooth 36 Pre-RCT X-Ray'], ['P005', 'Tooth 21 Fracture'], ['P004', 'No clinical documents have been recorded'], ['P001', 'Upper Left Posterior X-Ray']]) { await openDocuments(page, check[0]); body = await safeBody(page); assert(body.includes(check[1]), `Document patient switch ${check[0]} failed.`); }

  // Exact cross-role behavior for both Phase 14 modules.
  const roleChecks = [
    ['administrator', 'P001', true, false],
    ['daniel', 'P001', true, true],
    ['sarah', 'P005', true, true],
    ['receptionist', 'P001', false, false],
    ['cashier', 'P001', false, false]
  ];
  for (const [role, patientId, canView, canCreate] of roleChecks) {
    const roleContext = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const rolePage = await roleContext.newPage(); observe(rolePage); await login(rolePage, accounts[role]); await dismissWelcome(rolePage);
    await rolePage.goto(`${baseUrl}/app.html#/patients/${patientId}/prescriptions`, { waitUntil: 'networkidle' }); let roleBody = await safeBody(rolePage);
    assert(canView ? roleBody.includes('Clinical Safety Summary') : roleBody.includes('Access Denied'), `${role} Prescription view permission is incorrect.`);
    assert((await rolePage.getByRole('button', { name: 'New Prescription' }).count() > 0) === canCreate, `${role} Prescription create permission is incorrect.`);
    await rolePage.goto(`${baseUrl}/app.html#/patients/${patientId}/documents`, { waitUntil: 'networkidle' }); roleBody = await safeBody(rolePage);
    assert(canView ? roleBody.includes('Document Library') : roleBody.includes('Access Denied'), `${role} Document view permission is incorrect.`);
    assert((await rolePage.getByRole('button', { name: 'Add Document' }).count() > 0) === canCreate, `${role} Document create permission is incorrect.`);
    if (!canView) assert(!/Penicillin|Upper Left Posterior X-Ray|\.jpg|Preview unavailable/.test(roleBody), `${role} unauthorized DOM contains Phase 14 PHI.`);
    await roleContext.close();
  }

  // Role-session leakage: preserve central state but deny all Phase 14 PHI after Dentist logout.
  await page.evaluate(async () => { const { dirtyState } = await import('/assets/js/core/dirty-state.js'); dirtyState.clear(); });
  await logout(page); await loginFromIndex(page, accounts.cashier);
  await page.goto(`${baseUrl}/app.html#/patients/P001/prescriptions`, { waitUntil: 'networkidle' }); body = await safeBody(page); assert(body.includes('Access Denied') && !body.includes('Penicillin') && !body.includes(safeMedication), 'Cashier received Prescription PHI after role transition.');
  await page.goto(`${baseUrl}/app.html#/patients/P001/documents`, { waitUntil: 'networkidle' }); body = await safeBody(page); assert(body.includes('Access Denied') && !body.includes('Upper Left Posterior X-Ray') && !body.includes(safeTitle) && !body.includes(safeFilename), 'Cashier received Document PHI after role transition.');
  await logout(page); await loginFromIndex(page, accounts.daniel); await dismissWelcome(page);

  // Responsive, long-content, accessibility, shell, and privacy checks for both modules.
  const viewports = [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 390, height: 844 }];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await openPrescriptions(page, 'P001'); body = await safeBody(page);
    assert(await noOverflow(page) && body.includes('Clinical Safety Summary') && body.includes(safeMedication) && await page.getByText('Issued', { exact: true }).count(), `Prescription responsive/accessibility audit failed at ${viewport.width}px.`);
    assert(await page.title() === 'Prescriptions | Pearl Smile Dental Clinic' && !page.url().includes('Amina') && !page.url().includes('Medication'), 'Prescription URL or browser title is not privacy safe.');
    if (viewport.width === 1366 || viewport.width === 390) await screenshot(page, `prescriptions-${viewport.width}`);
    await openDocuments(page, 'P001'); body = await safeBody(page);
    assert(await noOverflow(page) && body.includes(safeFilename) && await page.locator('.documents__filters[role="group"]').count() === 1 && await page.locator('.documents__item[aria-pressed]').count() > 0, `Document responsive/accessibility audit failed at ${viewport.width}px.`);
    assert(await page.title() === 'Documents | Pearl Smile Dental Clinic' && !page.url().includes('Amina') && !page.url().includes('clinical-photo'), 'Document URL or browser title is not privacy safe.');
    if (viewport.width === 1366 || viewport.width === 390) await screenshot(page, `documents-${viewport.width}`);
  }

  await page.setViewportSize({ width: 390, height: 844 }); await openPrescriptions(page, 'P001'); await page.getByRole('button', { name: 'New Prescription' }).click(); dialog = page.getByRole('dialog', { name: 'New Prescription' });
  await dialog.getByLabel('Medication').fill('Mobile responsive unsaved medication'); assert(await noOverflow(page) && await dialog.getByLabel('Medication').evaluate(control => document.activeElement === control), 'Mobile Prescription modal overflow or focus failed.'); await screenshot(page, 'prescription-modal-390'); await dialog.getByRole('button', { name: 'Cancel' }).click(); prompt = page.getByRole('dialog', { name: 'Discard prescription changes?' }); await prompt.getByRole('button', { name: 'Discard Changes' }).click();
  await openDocuments(page, 'P001'); await page.getByRole('button', { name: 'Add Document' }).click(); dialog = page.getByRole('dialog', { name: 'Add Document' }); await dialog.locator('#clinical-document-file').setInputFiles({ name: 'mobile-preview.png', mimeType: 'image/png', buffer: fixtureBuffer }); await dialog.getByLabel('Title').fill('Mobile preview'); await waitForImage(dialog.locator('.documents__preview img')); assert(await noOverflow(page), 'Mobile Document modal overflow failed.'); await screenshot(page, 'document-modal-390'); await dialog.getByRole('button', { name: 'Cancel' }).click(); prompt = page.getByRole('dialog', { name: 'Discard document changes?' }); await prompt.getByRole('button', { name: 'Discard' }).click();

  await page.setViewportSize({ width: 1366, height: 768 }); await page.goto(`${baseUrl}/app.html#/waiting-room`, { waitUntil: 'networkidle' });
  const treatment = page.getByRole('heading', { name: 'In Treatment', exact: true }).locator('xpath=ancestor::section[contains(concat(" ", normalize-space(@class), " "), " card ")]');
  const row = treatment.locator('.waiting-room__queue-row').first(); const status = row.locator('.badge', { hasText: 'In Treatment' }); const action = row.getByRole('button', { name: 'Open Clinical Encounter' });
  const statusBox = await status.boundingBox(), actionBox = await action.boundingBox();
  assert(statusBox && actionBox && (statusBox.x + statusBox.width <= actionBox.x || actionBox.x + actionBox.width <= statusBox.x || statusBox.y + statusBox.height <= actionBox.y || actionBox.y + actionBox.height <= statusBox.y) && await noOverflow(page), 'Waiting Room In Treatment status/action overlap regressed.');
  await action.click(); await page.waitForURL('**/app.html#/patients/P001/clinical');
  assert(await page.locator('.shell-sidebar').count() && await page.locator('.shell-header').count() && await page.locator('.header-notifications').count() && await page.locator('.dropdown').count() && (await page.locator('body').innerText()).includes('Developed with'), 'Shell integration regressed.');

  // Runtime integrity before reset, then canonical reset and Phase 5/global validation.
  const runtimeValidation = await page.evaluate(async () => { const { validateRuntimeState } = await import('/assets/js/data/integrity.js'); return validateRuntimeState(window.DentalAppDev.getState()); });
  assert(runtimeValidation.valid, `Runtime Phase 14 integrity failed: ${runtimeValidation.errors.join(' | ')}`);
  await page.evaluate(() => window.DentalAppDev.resetDemoData());
  const reset = await state(page), resetValidation = await page.evaluate(async () => { const { validateCanonicalDemoState } = await import('/assets/js/data/integrity.js'); return validateCanonicalDemoState(window.DentalAppDev.getState()); });
  assert(reset.prescriptions.length === canonicalCount.prescriptions && reset.prescriptionItems.length === canonicalCount.items && reset.patientDocuments.length === canonicalCount.documents && !reset.prescriptions.some(record => record.id === 'RX-000502') && !reset.patientDocuments.some(record => record.id === 'DOC-005'), 'Demo reset did not remove runtime Phase 14 records.');
  assert(reset.prescriptions.some(record => record.id === 'RX-000501' && record.patientId === 'P004') && reset.patientDocuments.some(record => record.id === 'DOC-001') && reset.patientDocuments.filter(record => record.patientId === 'P002').length === 2 && reset.patientDocuments.some(record => record.id === 'DOC-004'), 'Demo reset did not restore canonical Phase 14 records.');
  assert((await dirtySources(page)).length === 0 && resetValidation.valid && resetValidation.errors.length === 0 && snapshotProtected(reset) === isolationBaseline, 'Reset did not restore dirty, upstream, finance, or validator integrity.');
  assert(!Object.values(findings).some(records => records.length), JSON.stringify(findings));

  const result = {
    status: 'pass',
    browser: 'Chromium via Playwright 1.63.0',
    canonicalPrescription: 'Samuel pass',
    medicalSafety: 'Amina, Peter, Samuel, Joseph pass',
    runtimePrescription: { id: runtimeRx.id, patientId: runtimeRx.patientId, dentistUserId: runtimeRx.dentistUserId, encounterId: runtimeRx.encounterId },
    canonicalDocuments: 'Amina, Peter pre/post RCT, Esther pass',
    runtimeDocument: { id: runtimeDocument.id, patientId: runtimeDocument.patientId, type: runtimeDocument.type, encounterId: runtimeDocument.encounterId },
    frontendFileModel: 'metadata only; temporary blob preview; honest refresh fallback',
    dirtyCoexistence: 'prescription, clinical-document, clinical-encounter, medical-history, odontogram, treatment-plan, procedure pass',
    roleMatrixAndSessionLeakage: 'pass',
    patientSwitchAndPrivacy: 'pass',
    crossModuleAndFinanceIsolation: 'pass',
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
