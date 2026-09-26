import { readdir, readFile } from 'node:fs/promises';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { createPrescription, getPrescriptionPermissions, PRESCRIPTION_STATUSES } from '../assets/js/data/prescription-workflows.js';
import { createClinicalDocument, DOCUMENT_TYPES, getDocumentPermissions } from '../assets/js/data/document-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = value => JSON.stringify(value);
const unique = records => new Set(records.map(record => record.id)).size === records.length;
const actor = (role, userId) => ({ role, userId, branchId: 'BR-MAIN' });
const daniel = actor('Dentist', 'U002');
const sarah = actor('Dentist', 'U003');
const administrator = actor('Clinic Administrator', 'U001');
const receptionist = actor('Receptionist', 'U004');
const cashier = actor('Cashier', 'U005');
const allowed = (record, fields, label) => Object.keys(record).forEach(field => assert(fields.has(field), `${label} contains unsupported field ${field}.`));
const protectedState = state => snapshot({ medicalHistory: [state.patientAllergies, state.patientConditions, state.patientMedications], findings: [state.encounterFindings, state.dentalChartEntries, state.dentalChartEntrySurfaces], plans: [state.treatmentPlans, state.treatmentPlanItems], procedures: state.proceduresPerformed, appointments: state.appointments, queue: state.queueEntries, encounters: state.clinicalEncounters, finance: [state.invoices, state.invoiceItems, state.payments, state.receipts] });
const rejectAtomically = (state, action, label) => { const before = snapshot(state); let rejected = false; try { action(); } catch { rejected = true; } assert(rejected, `${label} was accepted.`); assert(snapshot(state) === before, `${label} mutated state.`); };

const canonical = createCanonicalDemoState();
const canonicalIntegrity = validateCanonicalDemoState(canonical);
assert(canonicalIntegrity.valid, canonicalIntegrity.errors.join(' | '));

const prescriptionFields = new Set(['id', 'prescriptionNumber', 'organizationId', 'branchId', 'patientId', 'encounterId', 'dentistUserId', 'status', 'issuedAt', 'notes', 'createdAt', 'createdByUserId', 'updatedAt']);
const itemFields = new Set(['id', 'prescriptionId', 'medicineName', 'strength', 'dose', 'route', 'frequency', 'duration', 'quantity', 'instructions', 'createdAt', 'updatedAt']);
const documentFields = new Set(['id', 'organizationId', 'branchId', 'patientId', 'encounterId', 'type', 'title', 'fileName', 'mimeType', 'fileSizeBytes', 'placeholderAssetPath', 'capturedAt', 'uploadedByUserId', 'notes', 'createdAt', 'updatedAt']);
canonical.prescriptions.forEach(record => allowed(record, prescriptionFields, `Prescription ${record.id}`));
canonical.prescriptionItems.forEach(record => allowed(record, itemFields, `Prescription item ${record.id}`));
canonical.patientDocuments.forEach(record => allowed(record, documentFields, `Document ${record.id}`));
assert(unique(canonical.prescriptions) && unique(canonical.prescriptionItems) && unique(canonical.patientDocuments), 'Canonical Phase 14 IDs are not unique.');
assert(canonical.prescriptions.every(record => /^RX-\d{6}$/.test(record.id) && PRESCRIPTION_STATUSES.includes(record.status)), 'Prescription ID or status catalogue is invalid.');
assert(canonical.prescriptionItems.every(item => canonical.prescriptions.some(record => record.id === item.prescriptionId)), 'Orphan prescription item found.');

const samuel = canonical.prescriptions.find(record => record.id === 'RX-000501');
assert(samuel?.patientId === 'P004' && samuel.dentistUserId === 'U002' && samuel.encounterId === null && samuel.status === 'ISSUED', 'Canonical Samuel prescription does not reconcile.');
assert(canonical.prescriptionItems.filter(item => item.prescriptionId === samuel.id).length === 1, 'Canonical Samuel prescription item does not reconcile.');
const medications = Object.fromEntries(canonical.patientMedications.map(record => [record.patientId, record.medicationName]));
assert(medications.P002 === 'Amlodipine' && medications.P004 === 'Metformin' && medications.P010 === 'Losartan', 'Canonical Medical History medication safety data changed.');
assert(!canonical.prescriptions.some(record => ['P002', 'P010'].includes(record.patientId)), 'Medical History medication was duplicated as a clinic Prescription.');
assert(canonical.patientAllergies.some(record => record.patientId === 'P001' && record.allergen === 'Penicillin'), 'Amina Penicillin allergy is absent.');

assert(Object.keys(DOCUMENT_TYPES).join(',') === 'X_RAY,CLINICAL_PHOTO', 'Document type catalogue expanded.');
assert(canonical.patientDocuments.length === 4, 'Canonical Document count changed.');
assert(canonical.patientDocuments.find(record => record.id === 'DOC-001')?.title === 'Upper Left Posterior X-Ray', 'Amina Document mismatch.');
assert(canonical.patientDocuments.find(record => record.id === 'DOC-002')?.title === 'Tooth 36 Pre-RCT X-Ray' && canonical.patientDocuments.find(record => record.id === 'DOC-003')?.title === 'Tooth 36 Post-RCT X-Ray', 'Peter Documents are missing or merged.');
assert(canonical.patientDocuments.find(record => record.id === 'DOC-004')?.type === 'CLINICAL_PHOTO', 'Esther Document mismatch.');
assert(canonical.patientDocuments.every(record => !('procedureId' in record) && !('toothCode' in record) && record.placeholderAssetPath === null), 'Document schema freeze was violated.');

assert(getPrescriptionPermissions({ state: canonical, patientId: 'P001', actor: administrator }).canView && !getPrescriptionPermissions({ state: canonical, patientId: 'P001', actor: administrator }).canCreate, 'Administrator Prescription permissions changed.');
assert(getPrescriptionPermissions({ state: canonical, patientId: 'P001', actor: daniel }).canCreate && getPrescriptionPermissions({ state: canonical, patientId: 'P005', actor: sarah }).canCreate, 'Dentist Prescription permissions changed.');
assert(!getPrescriptionPermissions({ state: canonical, patientId: 'P001', actor: receptionist }).canView && !getPrescriptionPermissions({ state: canonical, patientId: 'P001', actor: cashier }).canView, 'Non-clinical role can view Prescriptions.');
assert(getDocumentPermissions({ state: canonical, patientId: 'P001', actor: administrator }).canView && !getDocumentPermissions({ state: canonical, patientId: 'P001', actor: administrator }).canCreate, 'Administrator Document permissions changed.');
assert(getDocumentPermissions({ state: canonical, patientId: 'P001', actor: daniel }).canCreate && getDocumentPermissions({ state: canonical, patientId: 'P005', actor: sarah }).canCreate, 'Dentist Document permissions changed.');
assert(!getDocumentPermissions({ state: canonical, patientId: 'P001', actor: receptionist }).canView && !getDocumentPermissions({ state: canonical, patientId: 'P001', actor: cashier }).canView, 'Non-clinical role can view Documents.');

const runtime = createCanonicalDemoState();
const baseline = protectedState(runtime);
const rx = createPrescription({ state: runtime, patientId: 'P001', notes: '<b>Metadata only</b>', items: [{ medicineName: '<em>Long safe medication name</em>', strength: 'Demo', dose: 'As directed', route: 'Oral', frequency: 'Demo', duration: 'Demo', quantity: '1', instructions: '<img src=x> Follow Dentist instructions.' }], actor: daniel });
assert(rx.prescription.id === 'RX-000502' && rx.items[0].id === 'RXI-000502-01' && rx.prescription.encounterId === null, 'Runtime Prescription ID, item, or encounter resolution is incorrect.');
assert(rx.audit.actionCode === 'PRESCRIPTION_CREATED' && rx.audit.actorUserId === 'U002' && rx.audit.occurredAt === '2026-09-21T10:00:00+03:00', 'Runtime Prescription audit event is incorrect.');
const document = createClinicalDocument({ state: runtime, patientId: 'P001', type: 'CLINICAL_PHOTO', title: '<em>Safe clinical photo</em>', capturedAt: '2026-09-21', encounterId: 'ENC-000201', notes: '<script>text only</script>', fileMetadata: { fileName: 'safe-<image>&.png', mimeType: 'image/png', size: 157 }, actor: daniel });
assert(document.document.id === 'DOC-005' && document.document.encounterId === 'ENC-000201', 'Runtime Document relationships are incorrect.');
assert(document.audit.actionCode === 'CLINICAL_DOCUMENT_CREATED' && document.audit.actorUserId === 'U002' && document.audit.occurredAt === '2026-09-21T10:00:00+03:00', 'Runtime Document audit event is incorrect.');
assert(protectedState(runtime) === baseline, 'Phase 14 mutations changed an upstream or finance domain.');
const runtimeIntegrity = validateRuntimeState(runtime);
assert(runtimeIntegrity.valid, runtimeIntegrity.errors.join(' | '));
assert(runtime.auditLogs.filter(event => event.entityId === rx.prescription.id && event.actionCode === 'PRESCRIPTION_CREATED').length === 1 && runtime.auditLogs.filter(event => event.entityId === document.document.id && event.actionCode === 'CLINICAL_DOCUMENT_CREATED').length === 1, 'Phase 14 audit event duplicated.');

rejectAtomically(runtime, () => createPrescription({ state: runtime, patientId: 'P999', items: [{ medicineName: 'Example' }], actor: daniel }), 'Invalid Prescription patient');
rejectAtomically(runtime, () => createPrescription({ state: runtime, patientId: 'P001', items: [{ medicineName: '   ' }], actor: daniel }), 'Whitespace Prescription');
rejectAtomically(runtime, () => createPrescription({ state: runtime, patientId: 'P001', items: [{ medicineName: 'Example' }], actor: sarah }), 'Wrong assigned Dentist Prescription');
rejectAtomically(runtime, () => createClinicalDocument({ state: runtime, patientId: 'P999', type: 'X_RAY', title: 'Invalid', capturedAt: '2026-09-21', fileMetadata: { fileName: 'x.png', mimeType: 'image/png', size: 1 }, actor: daniel }), 'Invalid Document patient');
rejectAtomically(runtime, () => createClinicalDocument({ state: runtime, patientId: 'P001', type: 'PDF', title: 'Invalid', capturedAt: '2026-09-21', fileMetadata: { fileName: 'x.pdf', mimeType: 'application/pdf', size: 1 }, actor: daniel }), 'Unsupported Document type');
rejectAtomically(runtime, () => createClinicalDocument({ state: runtime, patientId: 'P001', type: 'X_RAY', title: 'Invalid', capturedAt: '2026-09-21', encounterId: 'ENC-000204', fileMetadata: { fileName: 'x.png', mimeType: 'image/png', size: 1 }, actor: daniel }), 'Mismatched Document encounter');

const phase14Paths = ['assets/js/data/clinical.js', 'assets/js/data/prescription-workflows.js', 'assets/js/data/document-workflows.js', 'assets/js/modules/prescriptions.js', 'assets/js/modules/documents.js'];
const phase14Sources = await Promise.all(phase14Paths.map(path => readFile(path, 'utf8')));
const combinedSource = phase14Sources.join('\n');
assert(!/localStorage\s*\.(?:setItem|removeItem)|fetch\s*\(|XMLHttpRequest|new\s+FormData|\/(?:api|uploads?|storage|documents\/files)\//i.test(combinedSource), 'Phase 14 bypasses centralized persistence or contains upload/backend behavior.');
assert(!/RX-000502|DOC-005/.test(phase14Sources.slice(1).join('\n')), 'Production Phase 14 code assumes the next runtime ID.');
assert(!/medication[^\n]*(?:includes|match|test)[^\n]*penicillin|penicillin[^\n]*(?:includes|match|test)/i.test(combinedSource), 'A fake free-text allergy engine was found.');
assert(!/state\.(?:prescriptions|prescriptionItems|patientDocuments)\.(?:sort|reverse|splice)\s*\(/.test(combinedSource), 'A Phase 14 selector mutates raw state in place.');
const paths = await readdir('.', { recursive: true });
const backend = paths.filter(path => !path.startsWith('node_modules') && !path.startsWith('docs') && (/\.php$/i.test(path) || /^(?:artisan|composer\.json)$/i.test(path) || /^(?:app[\\/]Http|database[\\/]migrations|routes[\\/](?:web|api)\.php)/i.test(path)));
assert(!backend.length, `Backend contamination found: ${backend.join(', ')}`);

const posted = canonical.payments.filter(payment => payment.status === 'POSTED');
const finance = { invoices: canonical.invoices.length, payments: canonical.payments.length, receipts: canonical.receipts.length, totalSeededPayments: posted.reduce((sum, payment) => sum + payment.amount, 0), outstanding: canonical.invoices.reduce((sum, invoice) => sum + invoice.balance, 0), todayCollections: posted.filter(payment => payment.receivedAt.slice(0, 10) === canonical.referenceDate).reduce((sum, payment) => sum + payment.amount, 0), paymentsToday: posted.filter(payment => payment.receivedAt.slice(0, 10) === canonical.referenceDate).length };
assert(finance.invoices === 6 && finance.payments === 7 && finance.receipts === 7 && finance.totalSeededPayments === 2360000 && finance.outstanding === 420000 && finance.todayCollections === 360000 && finance.paymentsToday === 2, 'Canonical finance baseline changed.');

console.log(JSON.stringify({ status: 'pass', canonicalPrescription: 'pass', medicalSafetySeparation: 'pass', canonicalDocuments: 'pass', schemas: 'pass', roleMatrix: 'pass', runtimePrescription: rx.prescription.id, runtimeDocument: document.document.id, crossDomainIsolation: 'pass', auditEvents: 'pass', validationAtomicity: 'pass', selectorAndPersistenceAudit: 'pass', backendContamination: 'none', finance }, null, 2));
