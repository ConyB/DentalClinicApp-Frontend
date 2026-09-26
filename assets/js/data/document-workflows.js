export const DOCUMENT_TYPES = Object.freeze({
  X_RAY: Object.freeze({ label: 'X-Ray', icon: 'scan-line', accept: Object.freeze(['image/jpeg', 'image/png']) }),
  CLINICAL_PHOTO: Object.freeze({ label: 'Clinical Photo', icon: 'camera', accept: Object.freeze(['image/jpeg', 'image/png']) })
});

const runtimePreviews = new Map();
const numericSuffix = value => Number(String(value || '').match(/(\d+)$/)?.[1] || 0);
const timestamp = state => `${state.referenceDate}T10:00:00+03:00`;
const nextId = (records, prefix, width = 3) => `${prefix}-${String(Math.max(0, ...records.map(record => numericSuffix(record.id))) + 1).padStart(width, '0')}`;
const activeUser = (state, id) => state.users.find(user => user.id === id && user.status === 'active') || null;
const roleCode = role => ({ 'Clinic Administrator': 'clinic_administrator', Dentist: 'dentist' }[role] || null);
const validDateOnly = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const revoke = url => { if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url); };
const fail = errors => { const error = new Error(Object.values(errors)[0] || 'Document metadata is invalid.'); error.fieldErrors = errors; throw error; };

export const getDocumentPermissions = ({ state, patientId, actor }) => {
  const user = activeUser(state, actor?.userId);
  const authenticatedRole = user && user.roleCode === roleCode(actor?.role);
  const patientExists = state.patients.some(patient => patient.id === patientId);
  return {
    canView: Boolean(authenticatedRole && patientExists && ['Clinic Administrator', 'Dentist'].includes(actor.role)),
    canCreate: Boolean(authenticatedRole && patientExists && actor.role === 'Dentist')
  };
};

export const getRuntimeDocumentPreview = (documentId, patientId) => {
  const preview = runtimePreviews.get(documentId);
  return preview?.patientId === patientId ? preview.objectUrl : null;
};

export const registerRuntimeDocumentPreview = ({ documentId, patientId, objectUrl }) => {
  const previous = runtimePreviews.get(documentId);
  if (previous?.objectUrl && previous.objectUrl !== objectUrl) revoke(previous.objectUrl);
  runtimePreviews.set(documentId, { patientId, objectUrl });
};

export const releaseRuntimeDocumentPreview = documentId => {
  const preview = runtimePreviews.get(documentId);
  revoke(preview?.objectUrl);
  runtimePreviews.delete(documentId);
};

export const clearRuntimeDocumentPreviews = () => {
  [...runtimePreviews.keys()].forEach(releaseRuntimeDocumentPreview);
};

export const validateClinicalDocumentRuntime = state => {
  const errors = [];
  state.patientDocuments.forEach(document => {
    if (!DOCUMENT_TYPES[document.type]) errors.push(`Document ${document.id} has an unsupported type.`);
    if (!String(document.title || '').trim()) errors.push(`Document ${document.id} has no title.`);
    if (!document.capturedAt || Number.isNaN(Date.parse(document.capturedAt))) errors.push(`Document ${document.id} has an invalid date.`);
    if (!String(document.fileName || '').trim() || !DOCUMENT_TYPES[document.type]?.accept.includes(document.mimeType)) errors.push(`Document ${document.id} has invalid file metadata.`);
    if (document.fileSizeBytes !== undefined && (!Number.isFinite(document.fileSizeBytes) || document.fileSizeBytes <= 0)) errors.push(`Document ${document.id} has an invalid file size.`);
  });
  return { valid: errors.length === 0, errors };
};

export const createClinicalDocument = ({ state, patientId, type, title, capturedAt, encounterId = null, notes = '', fileMetadata, actor }) => {
  const errors = {};
  const patient = state.patients.find(item => item.id === patientId);
  const user = activeUser(state, actor?.userId);
  const config = DOCUMENT_TYPES[type];
  const encounter = encounterId ? state.clinicalEncounters.find(item => item.id === encounterId) : null;
  const documentPermissions = getDocumentPermissions({ state, patientId, actor });

  if (!patient) errors.patientId = 'The selected patient record is invalid.';
  if (!documentPermissions.canCreate || user?.roleCode !== 'dentist') errors.permission = 'Only an active Dentist may add a clinical image.';
  if (!config) errors.type = 'Select a supported clinical document type.';
  if (!String(title || '').trim()) errors.title = 'Document title is required.';
  if (!validDateOnly(capturedAt) || capturedAt > state.referenceDate) errors.capturedAt = 'Select a valid document date on or before the reference date.';
  if (!fileMetadata?.fileName || !fileMetadata?.mimeType || !fileMetadata?.size) errors.file = 'Select a non-empty supported image file.';
  if (fileMetadata && (!config?.accept.includes(fileMetadata.mimeType) || Number(fileMetadata.size) <= 0)) errors.file = 'Select a supported non-empty JPEG or PNG image.';
  if (encounterId && (!encounter || encounter.patientId !== patientId)) errors.encounterId = 'The selected encounter does not belong to this patient.';
  if (Object.keys(errors).length) fail(errors);

  const now = timestamp(state);
  const document = {
    id: nextId(state.patientDocuments, 'DOC'),
    organizationId: state.organization.id,
    branchId: encounter?.branchId || actor.branchId || state.branches[0]?.id,
    patientId,
    encounterId: encounter?.id || null,
    type,
    title: String(title).trim(),
    fileName: String(fileMetadata.fileName).trim(),
    mimeType: fileMetadata.mimeType,
    fileSizeBytes: Number(fileMetadata.size),
    placeholderAssetPath: null,
    capturedAt: `${capturedAt}T10:00:00+03:00`,
    uploadedByUserId: actor.userId,
    notes: String(notes || '').trim() || null,
    createdAt: now,
    updatedAt: now
  };
  state.patientDocuments.push(document);
  const audit = {
    id: nextId(state.auditLogs, 'AUDIT'),
    organizationId: state.organization.id,
    branchId: document.branchId,
    actorUserId: actor.userId,
    actionCode: 'CLINICAL_DOCUMENT_CREATED',
    entityType: 'PATIENT_DOCUMENT',
    entityId: document.id,
    occurredAt: now,
    summary: `Clinical document ${document.id} added for ${patient.fullName}.`,
    metadata: { patientId, type, encounterId: document.encounterId }
  };
  state.auditLogs.push(audit);
  return { document, audit };
};
