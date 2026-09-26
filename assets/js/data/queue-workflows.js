import { canTransitionAppointment, getAppointmentById, getQueueEntryByAppointmentId } from './scheduling.js';

const suffix = value => Number(String(value || '').match(/(\d+)$/)?.[1] || 0);
const padded = value => String(value).padStart(3, '0');
export const queueReferenceTimestamp = state => `${state.referenceDate}T10:00:00+03:00`;
const nextQueueId = state => `QUEUE-${padded(Math.max(0, ...state.queueEntries.map(entry => suffix(entry.id))) + 1)}`;
const nextHistoryId = state => `APSH-QUEUE-${padded(state.appointmentStatusHistory.length + 1)}`;
const nextAuditId = state => `AUDIT-${padded(Math.max(0, ...state.auditLogs.map(event => suffix(event.id))) + 1)}`;

export const queueAccess = ({ role, userId }) => ({
  clinicWide: ['Clinic Administrator', 'Receptionist'].includes(role),
  dentistUserId: role === 'Dentist' ? userId : null,
  canCheckIn: ['Clinic Administrator', 'Receptionist'].includes(role),
  canStartTreatment: ['Clinic Administrator', 'Dentist'].includes(role)
});

// Phase 10 Waiting Room audited and frozen: check-in reaches WAITING, treatment reaches IN_TREATMENT; encounters begin in Phase 11.
export const isEligibleForCheckIn = appointment => ['SCHEDULED', 'CONFIRMED'].includes(appointment?.status);

export const checkInAppointment = ({ state, appointmentId, actor }) => {
  const access = queueAccess(actor);
  if (!access.canCheckIn) throw new Error('You do not have permission to check in patients.');
  const appointment = getAppointmentById(state, appointmentId);
  if (!appointment) throw new Error('Appointment record was not found.');
  if (!isEligibleForCheckIn(appointment)) throw new Error('This appointment is not eligible for check-in.');
  if (getQueueEntryByAppointmentId(state, appointment.id)) throw new Error('This appointment has already been checked in.');
  if (!canTransitionAppointment(appointment.status, 'WAITING')) throw new Error('This appointment cannot enter the waiting queue from its current status.');
  const patient = state.patients.find(item => item.id === appointment.patientId);
  const dentist = state.users.find(item => item.id === appointment.dentistUserId && item.roleId === 'ROLE-DENTIST' && item.status === 'active');
  if (!patient || patient.status !== 'active' || !dentist) throw new Error('The appointment has invalid patient or Dentist information.');
  const checkedInAt = queueReferenceTimestamp(state);
  const queueEntry = { id: nextQueueId(state), organizationId: state.organization.id, branchId: appointment.branchId, appointmentId: appointment.id, patientId: appointment.patientId, dentistUserId: appointment.dentistUserId, status: 'WAITING', arrivalAt: checkedInAt, waitingAt: checkedInAt, treatmentStartedAt: null, readyForCheckoutAt: null, completedAt: null, reason: appointment.reason, updatedByUserId: actor.userId, createdAt: checkedInAt, updatedAt: checkedInAt };
  const previousStatus = appointment.status;
  // State.update commits only after this complete mutation succeeds, keeping check-in atomic.
  state.queueEntries.push(queueEntry);
  appointment.status = 'WAITING'; appointment.checkedInAt = checkedInAt; appointment.updatedAt = checkedInAt; appointment.updatedByUserId = actor.userId;
  state.appointmentStatusHistory.push({ id: nextHistoryId(state), appointmentId: appointment.id, fromStatus: previousStatus, toStatus: 'WAITING', changedAt: checkedInAt, changedByUserId: actor.userId, reason: 'Patient checked in.' });
  state.auditLogs.push({ id: nextAuditId(state), organizationId: state.organization.id, branchId: appointment.branchId, actorUserId: actor.userId, actionCode: 'PATIENT_CHECKED_IN', entityType: 'APPOINTMENT', entityId: appointment.id, occurredAt: checkedInAt, summary: `${patient.fullName} checked in.`, metadata: { queueEntryId: queueEntry.id } });
  return { appointment, queueEntry };
};

const activeActor = (state, actor) => state.users.find(user => user.id === actor?.userId && user.status === 'active') || null;
const activePatient = (state, patientId) => state.patients.find(patient => patient.id === patientId && patient.status === 'active') || null;
const activeDentist = (state, dentistUserId) => state.users.find(user => user.id === dentistUserId && user.roleId === 'ROLE-DENTIST' && user.status === 'active') || null;

const assertStartTreatmentAllowed = ({ state, queueEntry, actor }) => {
  const user = activeActor(state, actor);
  if (!user) throw new Error('Your active user session could not be verified.');
  if (!queueEntry) throw new Error('The queue record was not found.');
  if (queueEntry.status !== 'WAITING') throw new Error('Only waiting patients can start treatment.');
  const appointment = getAppointmentById(state, queueEntry.appointmentId);
  if (!appointment) throw new Error('The linked appointment record was not found.');
  if (appointment.status !== 'WAITING' || !canTransitionAppointment(appointment.status, 'IN_TREATMENT')) throw new Error('This appointment is no longer eligible to start treatment.');
  const patient = activePatient(state, queueEntry.patientId);
  const dentist = activeDentist(state, queueEntry.dentistUserId);
  if (!patient || !dentist || appointment.patientId !== queueEntry.patientId || appointment.dentistUserId !== queueEntry.dentistUserId || appointment.branchId !== queueEntry.branchId) throw new Error('The queue record has invalid patient, Dentist, or appointment information.');
  const isAdministrator = user.roleId === 'ROLE-CLINIC-ADMINISTRATOR';
  const isAssignedDentist = user.roleId === 'ROLE-DENTIST' && user.id === queueEntry.dentistUserId;
  if (!isAdministrator && !isAssignedDentist) throw new Error('Only the assigned Dentist or Clinic Administrator can start treatment.');
  const treatmentStartedAt = queueReferenceTimestamp(state);
  if (Date.parse(treatmentStartedAt) < Date.parse(queueEntry.arrivalAt)) throw new Error('Treatment cannot start before the recorded arrival time.');
  return { appointment, patient, dentist, user, treatmentStartedAt };
};

export const canStartQueueTreatment = ({ state, queueEntry, actor }) => {
  try { assertStartTreatmentAllowed({ state, queueEntry, actor }); return true; } catch { return false; }
};

export const startQueueTreatment = ({ state, queueEntryId, actor }) => {
  const queueEntry = state.queueEntries.find(entry => entry.id === queueEntryId) || null;
  const { appointment, patient, dentist, treatmentStartedAt } = assertStartTreatmentAllowed({ state, queueEntry, actor });
  const previousStatus = appointment.status;
  // All guards complete before these shared records mutate; state.update persists the completed transaction once.
  queueEntry.status = 'IN_TREATMENT'; queueEntry.treatmentStartedAt = treatmentStartedAt; queueEntry.updatedAt = treatmentStartedAt; queueEntry.updatedByUserId = actor.userId;
  appointment.status = 'IN_TREATMENT'; appointment.updatedAt = treatmentStartedAt; appointment.updatedByUserId = actor.userId;
  state.appointmentStatusHistory.push({ id: nextHistoryId(state), appointmentId: appointment.id, fromStatus: previousStatus, toStatus: 'IN_TREATMENT', changedAt: treatmentStartedAt, changedByUserId: actor.userId, reason: 'Treatment started from the waiting room.' });
  state.auditLogs.push({ id: nextAuditId(state), organizationId: state.organization.id, branchId: appointment.branchId, actorUserId: actor.userId, actionCode: 'TREATMENT_STARTED', entityType: 'APPOINTMENT', entityId: appointment.id, occurredAt: treatmentStartedAt, summary: `Treatment started for ${patient.fullName} with ${dentist.fullName}.`, metadata: { queueEntryId: queueEntry.id } });
  return { appointment, queueEntry };
};
