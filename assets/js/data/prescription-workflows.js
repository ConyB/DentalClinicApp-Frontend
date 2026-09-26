import { getClinicalVisitContext } from './clinical-workflows.js';

export const PRESCRIPTION_STATUSES = Object.freeze(['DRAFT', 'ISSUED', 'VOID']);
const numericSuffix = value => Number(String(value || '').match(/(\d+)$/)?.[1] || 0);
const timestamp = state => `${state.referenceDate}T10:00:00+03:00`;
const nextId = (records, prefix, width = 6) => `${prefix}-${String(Math.max(0, ...records.map(record => numericSuffix(record.id || record.prescriptionNumber))) + 1).padStart(width, '0')}`;
const activeDentist = (state, userId) => state.users.find(user => user.id === userId && user.roleCode === 'dentist' && user.status === 'active') || null;
const fieldError = errors => { const error = new Error(Object.values(errors)[0] || 'Prescription details are invalid.'); error.fieldErrors = errors; throw error; };

export const getPrescriptionPermissions = ({ state, patientId, actor }) => ({
  canView: Boolean(['Clinic Administrator', 'Dentist'].includes(actor?.role) && state.patients.some(patient => patient.id === patientId)),
  canCreate: Boolean(actor?.role === 'Dentist' && activeDentist(state, actor.userId))
});

export const validatePrescriptionInput = ({ state, patientId, items, notes = '', actor }) => {
  const errors = {}, patient = state.patients.find(record => record.id === patientId) || null, dentist = activeDentist(state, actor?.userId);
  if (!patient) errors.patientId = 'The selected patient record is invalid.';
  if (actor?.role !== 'Dentist' || !dentist) errors.permission = 'Only an active Dentist may issue a prescription.';
  const visit = patient ? getClinicalVisitContext(state, patientId) : null;
  if (visit?.appointment && visit.appointment.dentistUserId !== actor?.userId) errors.permission = 'Only the assigned Dentist may prescribe for this active clinical visit.';
  const normalizedItems = Array.isArray(items) ? items.map(item => ({ medicineName: String(item?.medicineName || '').trim(), strength: String(item?.strength || '').trim() || null, dose: String(item?.dose || '').trim() || null, route: String(item?.route || '').trim() || null, frequency: String(item?.frequency || '').trim() || null, duration: String(item?.duration || '').trim() || null, quantity: String(item?.quantity || '').trim() || null, instructions: String(item?.instructions || '').trim() || null })) : [];
  if (!normalizedItems.length) errors.items = 'Add at least one prescription item.';
  normalizedItems.forEach((item, index) => { if (!item.medicineName) errors[`item-${index}-medicineName`] = 'Medication is required.'; });
  if (Object.keys(errors).length) fieldError(errors);
  return { patient, dentist, visit, items: normalizedItems, notes: String(notes || '').trim() || null };
};

// Phase 14A prescription mutation: clinical medication history, procedures, plans, and finance remain separate records.
export const createPrescription = ({ state, patientId, items, notes, actor }) => {
  const valid = validatePrescriptionInput({ state, patientId, items, notes, actor });
  const now = timestamp(state), id = nextId(state.prescriptions, 'RX'), encounter = valid.visit?.encounter || null;
  if (encounter && (encounter.patientId !== valid.patient.id || encounter.dentistUserId !== actor.userId)) throw new Error('The current encounter does not match the prescription context.');
  const prescription = { id, prescriptionNumber: id, organizationId: state.organization.id, branchId: encounter?.branchId || valid.visit?.appointment?.branchId || actor.branchId || state.branches[0]?.id, patientId: valid.patient.id, encounterId: encounter?.id || null, dentistUserId: actor.userId, status: 'ISSUED', issuedAt: now, notes: valid.notes, createdAt: now, createdByUserId: actor.userId, updatedAt: now };
  const prescriptionItems = valid.items.map((item, index) => ({ id: `RXI-${String(numericSuffix(id)).padStart(6, '0')}-${String(index + 1).padStart(2, '0')}`, prescriptionId: id, ...item, createdAt: now, updatedAt: now }));
  state.prescriptions.push(prescription); state.prescriptionItems.push(...prescriptionItems);
  const audit = { id: nextId(state.auditLogs, 'AUDIT', 3), organizationId: state.organization.id, branchId: prescription.branchId, actorUserId: actor.userId, actionCode: 'PRESCRIPTION_CREATED', entityType: 'PRESCRIPTION', entityId: prescription.id, occurredAt: now, summary: `Prescription ${prescription.prescriptionNumber} issued for ${valid.patient.fullName}.`, metadata: { patientId: prescription.patientId, encounterId: prescription.encounterId, itemCount: prescriptionItems.length } };
  state.auditLogs.push(audit);
  return { prescription, items: prescriptionItems, audit };
};

export const validatePrescriptionRuntime = state => {
  const errors = [], ids = new Set(), itemIds = new Set();
  state.prescriptions.forEach(prescription => {
    if (ids.has(prescription.id)) errors.push(`Duplicate prescription ID ${prescription.id}.`); else ids.add(prescription.id);
    const dentist = activeDentist(state, prescription.dentistUserId), encounter = prescription.encounterId && state.clinicalEncounters.find(item => item.id === prescription.encounterId);
    if (!/^RX-\d{6}$/.test(prescription.id) || prescription.prescriptionNumber !== prescription.id || !state.patients.some(patient => patient.id === prescription.patientId) || !dentist || !PRESCRIPTION_STATUSES.includes(prescription.status) || (encounter && (encounter.patientId !== prescription.patientId || encounter.dentistUserId !== prescription.dentistUserId))) errors.push(`Invalid prescription ${prescription.id}.`);
    if (!state.prescriptionItems.some(item => item.prescriptionId === prescription.id)) errors.push(`Prescription ${prescription.id} has no items.`);
  });
  state.prescriptionItems.forEach(item => { if (itemIds.has(item.id)) errors.push(`Duplicate prescription item ID ${item.id}.`); else itemIds.add(item.id); if (!state.prescriptions.some(prescription => prescription.id === item.prescriptionId) || !String(item.medicineName || '').trim()) errors.push(`Invalid prescription item ${item.id}.`); });
  return { valid: errors.length === 0, errors };
};
