import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { createClinicalDocument, DOCUMENT_TYPES, getDocumentPermissions } from '../assets/js/data/document-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = value => JSON.stringify(value);
const daniel = { role: 'Dentist', userId: 'U002', branchId: 'BR-MAIN' };
const sarah = { role: 'Dentist', userId: 'U003', branchId: 'BR-MAIN' };
const administrator = { role: 'Clinic Administrator', userId: 'U001', branchId: 'BR-MAIN' };
const receptionist = { role: 'Receptionist', userId: 'U004', branchId: 'BR-MAIN' };
const cashier = { role: 'Cashier', userId: 'U005', branchId: 'BR-MAIN' };
const validFile = { fileName: 'clinical <image> & demo.jpg', mimeType: 'image/jpeg', size: 2048 };
const rejectWithoutMutation = (state, values, label) => {
  const before = snapshot(state);
  let rejected = false;
  try { createClinicalDocument({ state, ...values }); } catch { rejected = true; }
  assert(rejected, `${label} was accepted.`);
  assert(snapshot(state) === before, `${label} changed state after rejection.`);
};

const canonical = createCanonicalDemoState();
const canonicalResult = validateCanonicalDemoState(canonical);
assert(canonicalResult.valid, canonicalResult.errors.join(' | '));
assert(Object.keys(DOCUMENT_TYPES).join(',') === 'X_RAY,CLINICAL_PHOTO', 'Supported document types changed.');
assert(canonical.patientDocuments.length === 4, 'Canonical document count changed.');
assert(canonical.patientDocuments.find(record => record.id === 'DOC-001')?.title === 'Upper Left Posterior X-Ray', 'Amina canonical X-Ray is incorrect.');
assert(canonical.patientDocuments.find(record => record.id === 'DOC-002')?.title === 'Tooth 36 Pre-RCT X-Ray', 'Peter pre-RCT X-Ray is incorrect.');
assert(canonical.patientDocuments.find(record => record.id === 'DOC-003')?.title === 'Tooth 36 Post-RCT X-Ray', 'Peter post-RCT X-Ray is incorrect.');
assert(canonical.patientDocuments.find(record => record.id === 'DOC-004')?.type === 'CLINICAL_PHOTO', 'Esther canonical Clinical Photo is incorrect.');
assert(canonical.patientDocuments.every(record => record.placeholderAssetPath === null && !('procedureId' in record) && !('toothCode' in record)), 'Canonical document schema constraints changed.');

assert(getDocumentPermissions({ state: canonical, patientId: 'P001', actor: administrator }).canView && !getDocumentPermissions({ state: canonical, patientId: 'P001', actor: administrator }).canCreate, 'Administrator document permissions are incorrect.');
assert(getDocumentPermissions({ state: canonical, patientId: 'P001', actor: daniel }).canCreate && getDocumentPermissions({ state: canonical, patientId: 'P001', actor: sarah }).canCreate, 'Dentist document permissions are incorrect.');
assert(!getDocumentPermissions({ state: canonical, patientId: 'P001', actor: receptionist }).canView && !getDocumentPermissions({ state: canonical, patientId: 'P001', actor: cashier }).canView, 'Non-clinical roles can view documents.');

const runtime = createCanonicalDemoState();
const isolated = snapshot({ medicalHistory: [runtime.patientAllergies, runtime.patientConditions, runtime.patientMedications], findings: runtime.dentalChartEntries, plans: [runtime.treatmentPlans, runtime.treatmentPlanItems], procedures: runtime.proceduresPerformed, prescriptions: [runtime.prescriptions, runtime.prescriptionItems], appointments: runtime.appointments, queue: runtime.queueEntries, encounters: runtime.clinicalEncounters, finance: [runtime.invoices, runtime.payments, runtime.receipts] });
const beforeAudit = runtime.auditLogs.length;
const result = createClinicalDocument({ state: runtime, patientId: 'P001', type: 'X_RAY', title: '<img src=x onerror=alert(1)> & X-Ray', capturedAt: '2026-09-21', encounterId: 'ENC-000201', notes: '<b>Metadata only</b>', fileMetadata: validFile, actor: daniel });
assert(result.document.id === 'DOC-005' && result.document.patientId === 'P001' && result.document.encounterId === 'ENC-000201', 'Runtime document relationships are incorrect.');
assert(result.document.fileName === validFile.fileName && result.document.fileSizeBytes === validFile.size && result.document.capturedAt === '2026-09-21T10:00:00+03:00', 'Runtime file metadata is incorrect.');
assert(!('procedureId' in result.document) && !('toothCode' in result.document) && !('storageUrl' in result.document) && !('runtimeFileUnavailable' in result.document), 'Runtime document contains an unsupported schema field.');
assert(!snapshot(result.document).includes('blob:') && !snapshot(result.document).includes('data:'), 'Ephemeral or encoded binary content entered persistent state.');
assert(result.audit.actionCode === 'CLINICAL_DOCUMENT_CREATED' && result.audit.actorUserId === 'U002' && result.audit.occurredAt === '2026-09-21T10:00:00+03:00' && runtime.auditLogs.length === beforeAudit + 1, 'Document audit event is incorrect.');
assert(snapshot({ medicalHistory: [runtime.patientAllergies, runtime.patientConditions, runtime.patientMedications], findings: runtime.dentalChartEntries, plans: [runtime.treatmentPlans, runtime.treatmentPlanItems], procedures: runtime.proceduresPerformed, prescriptions: [runtime.prescriptions, runtime.prescriptionItems], appointments: runtime.appointments, queue: runtime.queueEntries, encounters: runtime.clinicalEncounters, finance: [runtime.invoices, runtime.payments, runtime.receipts] }) === isolated, 'Document creation changed an isolated domain.');
const runtimeResult = validateRuntimeState(runtime);
assert(runtimeResult.valid, runtimeResult.errors.join(' | '));

const guards = createCanonicalDemoState();
const base = { patientId: 'P001', type: 'X_RAY', title: 'Audit image', capturedAt: '2026-09-21', fileMetadata: validFile, actor: daniel };
rejectWithoutMutation(guards, { ...base, patientId: 'P999' }, 'Invalid patient');
rejectWithoutMutation(guards, { ...base, type: 'PDF' }, 'Unsupported type');
rejectWithoutMutation(guards, { ...base, title: '  ' }, 'Whitespace title');
rejectWithoutMutation(guards, { ...base, capturedAt: '2026-09-22' }, 'Future date');
rejectWithoutMutation(guards, { ...base, encounterId: 'ENC-000204' }, 'Encounter/patient mismatch');
rejectWithoutMutation(guards, { ...base, fileMetadata: { ...validFile, mimeType: 'application/pdf' } }, 'Unsupported MIME');
rejectWithoutMutation(guards, { ...base, fileMetadata: { ...validFile, size: 0 } }, 'Zero-byte file');
rejectWithoutMutation(guards, { ...base, actor: administrator }, 'Administrator creation');
rejectWithoutMutation(guards, { ...base, actor: receptionist }, 'Receptionist creation');
rejectWithoutMutation(guards, { ...base, actor: cashier }, 'Cashier creation');

console.log(JSON.stringify({ status: 'pass', canonicalDocuments: 'pass', schemaFreeze: 'pass', typeSet: 'pass', permissions: 'pass', metadataCreation: 'pass', audit: 'pass', crossDomainIsolation: 'pass', validationAtomicity: 'pass', runtimeIntegrity: 'pass' }, null, 2));
