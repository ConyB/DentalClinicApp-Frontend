import { createAppointment } from './appointment-workflows.js';

const RECALL_STATUSES = ['UPCOMING', 'DUE', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'OVERDUE', 'CANCELLED'];
// Phase 16 Recalls and Follow-Up audited and frozen: a Recall is follow-up intent; an Appointment is the actual booking.
const LINKABLE_APPOINTMENT_STATUSES = new Set(['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_TREATMENT']);
const suffix = value => Number(String(value || '').match(/(\d+)$/)?.[1] || 0);
const nextId = (records, prefix) => `${prefix}-${String(Math.max(0, ...records.map(record => suffix(record.id))) + 1).padStart(6, '0')}`;
const timestamp = state => `${state.referenceDate}T12:00:00+03:00`;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00+03:00`));
const activePatient = (state, id) => state.patients.find(patient => patient.id === id && patient.status === 'active') || null;
const activeDentist = (state, id) => state.users.find(user => user.id === id && user.status === 'active' && user.roleId === 'ROLE-DENTIST') || null;
const activeType = (state, id) => state.recallTypes.find(type => type.id === id && type.status === 'active') || null;

export const getRecallPermissions = ({ state, actor }) => {
  const own = recall => actor.role !== 'Dentist' || recall.dentistUserId === actor.userId;
  return {
    canView: ['Clinic Administrator', 'Dentist', 'Receptionist'].includes(actor.role),
    canCreate: ['Clinic Administrator', 'Dentist', 'Receptionist'].includes(actor.role),
    canEdit: recall => ['Clinic Administrator', 'Receptionist'].includes(actor.role) || (actor.role === 'Dentist' && own(recall)),
    canContact: recall => ['Clinic Administrator', 'Receptionist'].includes(actor.role) || (actor.role === 'Dentist' && own(recall)),
    canSchedule: recall => ['Clinic Administrator', 'Receptionist'].includes(actor.role) || (actor.role === 'Dentist' && own(recall)),
    canComplete: recall => ['Clinic Administrator', 'Receptionist'].includes(actor.role) || (actor.role === 'Dentist' && own(recall)),
    canCancel: recall => ['Clinic Administrator', 'Receptionist'].includes(actor.role) || (actor.role === 'Dentist' && own(recall))
  };
};

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const assertActor = ({ state, actor, capability, recall = null }) => {
  const permissions = getRecallPermissions({ state, actor });
  const granted = typeof permissions[capability] === 'function' ? permissions[capability](recall) : permissions[capability];
  assert(granted, 'You do not have permission to perform this recall action.');
};
const appendAudit = (state, { actor, recall, actionCode, metadata = {} }) => {
  const audit = { id: nextId(state.auditLogs, 'AUDIT'), organizationId: state.organization.id, branchId: recall.branchId, actorUserId: actor.userId, actionCode, entityType: 'RECALL', entityId: recall.id, occurredAt: timestamp(state), summary: `${recall.recallNumber} ${actionCode.replace('RECALL_', '').toLowerCase().replaceAll('_', ' ')}.`, metadata: { patientId: recall.patientId, ...metadata } };
  state.auditLogs.push(audit); return audit;
};
const validation = ({ state, values, allowPast = false }) => {
  const errors = {}, patient = activePatient(state, values.patientId), dentist = activeDentist(state, values.dentistUserId), type = activeType(state, values.recallTypeId), dueDate = String(values.dueDate || ''), notes = String(values.notes || '').trim();
  if (!patient) errors.patientId = values.patientId ? 'The selected patient is inactive or unavailable.' : 'Select a patient.';
  if (!type) errors.recallTypeId = 'Select an active recall type.';
  if (!dentist) errors.dentistUserId = 'Select an active Dentist.';
  if (!validDate(dueDate)) errors.dueDate = 'Choose a valid due date.';
  else if (!allowPast && dueDate < state.referenceDate) errors.dueDate = 'New active recalls cannot have a past due date.';
  if (values.status && !RECALL_STATUSES.includes(values.status)) errors.status = 'Recall status is invalid.';
  return { errors, normalized: { patient, dentist, type, dueDate, notes: notes || null } };
};

export const createRecall = ({ state, values, actor }) => {
  assertActor({ state, actor, capability: 'canCreate' });
  const result = validation({ state, values }); if (Object.keys(result.errors).length) return result;
  const recallNumber = nextId(state.recalls, 'REC');
  const recall = { id: recallNumber, recallNumber, organizationId: state.organization.id, branchId: state.branches.find(branch => branch.isMain)?.id || state.branches[0]?.id, patientId: result.normalized.patient.id, recallTypeId: result.normalized.type.id, dentistUserId: result.normalized.dentist.id, sourceEncounterId: null, dueDate: result.normalized.dueDate, status: 'UPCOMING', scheduledAppointmentId: null, contactOutcome: null, notes: result.normalized.notes, createdAt: timestamp(state), createdByUserId: actor.userId, updatedAt: timestamp(state), updatedByUserId: actor.userId, contactedAt: null, completedAt: null };
  state.recalls.push(recall); const audit = appendAudit(state, { actor, recall, actionCode: 'RECALL_CREATED' }); return { recall, audit, errors: {} };
};

export const updateRecall = ({ state, recallId, values, actor }) => {
  const recall = state.recalls.find(item => item.id === recallId); assert(recall, 'Recall record was not found.'); assertActor({ state, actor, capability: 'canEdit', recall });
  assert(!['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(recall.status), 'This recall is read-only at its current workflow status.');
  const result = validation({ state, values, allowPast: true }); if (Object.keys(result.errors).length) return result;
  assert(result.normalized.patient.id === recall.patientId, 'A recall cannot be moved to another patient.');
  Object.assign(recall, { recallTypeId: result.normalized.type.id, dentistUserId: result.normalized.dentist.id, dueDate: result.normalized.dueDate, notes: result.normalized.notes, updatedAt: timestamp(state), updatedByUserId: actor.userId });
  const audit = appendAudit(state, { actor, recall, actionCode: 'RECALL_UPDATED' }); return { recall, audit, errors: {} };
};

export const contactRecall = ({ state, recallId, contactOutcome, actor }) => {
  const recall = state.recalls.find(item => item.id === recallId); assert(recall, 'Recall record was not found.'); assertActor({ state, actor, capability: 'canContact', recall });
  assert(['UPCOMING', 'DUE', 'OVERDUE', 'CONTACTED'].includes(recall.status), 'This recall cannot be contacted at its current workflow status.');
  const outcome = String(contactOutcome || '').trim(); assert(outcome, 'Select a contact outcome.');
  Object.assign(recall, { status: 'CONTACTED', contactOutcome: outcome, contactedAt: timestamp(state), updatedAt: timestamp(state), updatedByUserId: actor.userId });
  const audit = appendAudit(state, { actor, recall, actionCode: 'RECALL_CONTACTED', metadata: { contactOutcome: outcome } }); return { recall, audit };
};

export const linkRecallAppointment = ({ state, recallId, appointmentId, actor }) => {
  const recall = state.recalls.find(item => item.id === recallId), appointment = state.appointments.find(item => item.id === appointmentId); assert(recall, 'Recall record was not found.'); assertActor({ state, actor, capability: 'canSchedule', recall });
  assert(!recall.scheduledAppointmentId, 'This recall already has a linked appointment.'); assert(appointment, 'Appointment record was not found.');
  assert(appointment.patientId === recall.patientId, 'The selected appointment belongs to a different patient.'); assert(LINKABLE_APPOINTMENT_STATUSES.has(appointment.status), 'Only an active or completed appointment can satisfy this recall.');
  Object.assign(recall, { status: 'SCHEDULED', scheduledAppointmentId: appointment.id, updatedAt: timestamp(state), updatedByUserId: actor.userId });
  const audit = appendAudit(state, { actor, recall, actionCode: 'RECALL_SCHEDULED', metadata: { appointmentId: appointment.id } }); return { recall, appointment, audit };
};

// Appointment creation remains owned by the frozen scheduling workflow; this wrapper keeps the recall link in the same store transaction.
export const createRecallAppointment = ({ state, recallId, values, actor }) => {
  const recall = state.recalls.find(item => item.id === recallId); assert(recall, 'Recall record was not found.'); assertActor({ state, actor, capability: 'canSchedule', recall });
  assert(!recall.scheduledAppointmentId, 'This recall already has a linked appointment.'); assert(values.patientId === recall.patientId, 'The appointment patient does not match the recall patient.');
  const result = createAppointment({ state, values, actor }); if (Object.keys(result.errors).length) return result;
  const linked = linkRecallAppointment({ state, recallId, appointmentId: result.appointment.id, actor }); return { ...result, recall: linked.recall, recallAudit: linked.audit };
};

export const completeRecall = ({ state, recallId, actor }) => {
  const recall = state.recalls.find(item => item.id === recallId); assert(recall, 'Recall record was not found.'); assertActor({ state, actor, capability: 'canComplete', recall });
  assert(['SCHEDULED', 'CONTACTED', 'OVERDUE', 'DUE'].includes(recall.status), 'This recall cannot be completed at its current workflow status.');
  Object.assign(recall, { status: 'COMPLETED', completedAt: timestamp(state), updatedAt: timestamp(state), updatedByUserId: actor.userId });
  const audit = appendAudit(state, { actor, recall, actionCode: 'RECALL_COMPLETED' }); return { recall, audit };
};

export const cancelRecall = ({ state, recallId, actor }) => {
  const recall = state.recalls.find(item => item.id === recallId); assert(recall, 'Recall record was not found.'); assertActor({ state, actor, capability: 'canCancel', recall });
  assert(['UPCOMING', 'DUE', 'CONTACTED', 'OVERDUE'].includes(recall.status), 'This recall cannot be cancelled at its current workflow status.');
  Object.assign(recall, { status: 'CANCELLED', updatedAt: timestamp(state), updatedByUserId: actor.userId });
  const audit = appendAudit(state, { actor, recall, actionCode: 'RECALL_CANCELLED' }); return { recall, audit };
};

export const recallStatus = (recall, referenceDate) => {
  if (recall.status === 'UPCOMING' && recall.dueDate === referenceDate) return 'DUE';
  if (recall.status === 'UPCOMING' && recall.dueDate < referenceDate) return 'OVERDUE';
  return recall.status;
};
export const isEligibleRecallAppointment = appointment => Boolean(appointment && LINKABLE_APPOINTMENT_STATUSES.has(appointment.status));
export { RECALL_STATUSES };
