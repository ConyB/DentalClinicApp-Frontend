import { canTransitionAppointment, hasAppointmentConflict } from './scheduling.js';

const blockingStatuses = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']);
const numberSuffix = value => Number(String(value || '').match(/(\d+)$/)?.[1] || 0);
const pad = value => String(value).padStart(6, '0');
const atReferenceTime = state => `${state.referenceDate}T12:00:00+03:00`;
const activeDentist = (state, id) => state.users.find(user => user.id === id && user.status === 'active' && user.roleId === 'ROLE-DENTIST') || null;
const activePatient = (state, id) => state.patients.find(patient => patient.id === id && patient.status === 'active') || null;
const activeType = (state, id) => state.appointmentTypes.find(type => type.id === id && type.status === 'active') || null;
const timeValid = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
const dateValid = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
const dateAfter = (date, days) => new Date(`${date}T00:00:00Z`).setUTCDate(new Date(`${date}T00:00:00Z`).getUTCDate() + days) && new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const slotEnd = (date, time, duration) => {
  const [hour, minute] = time.split(':').map(Number);
  const total = hour * 60 + minute + duration;
  return `${dateAfter(date, Math.floor(total / 1440))}T${String(Math.floor((total % 1440) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00+03:00`;
};
const slotStart = (date, time) => `${date}T${time}:00+03:00`;
const uniqueId = (records, prefix) => `${prefix}-${pad(Math.max(0, ...records.map(record => numberSuffix(record.id))) + 1)}`;
const appendAudit = (state, { actorUserId, actionCode, appointment, summary }) => state.auditLogs.push({
  id: uniqueId(state.auditLogs, 'AUDIT'), organizationId: state.organization.id, branchId: appointment.branchId,
  actorUserId, actionCode, entityType: 'APPOINTMENT', entityId: appointment.id, occurredAt: atReferenceTime(state), summary, metadata: null
});
const appendHistory = (state, { appointment, fromStatus, toStatus, actorUserId, reason = null }) => state.appointmentStatusHistory.push({
  id: uniqueId(state.appointmentStatusHistory, 'APSH'), appointmentId: appointment.id, fromStatus, toStatus,
  changedAt: atReferenceTime(state), changedByUserId: actorUserId, reason
});
const appendContact = (state, { appointment, actorUserId, outcome, notes = null }) => state.appointmentContactLogs.push({
  id: uniqueId(state.appointmentContactLogs, 'APCL'), appointmentId: appointment.id, contactMethod: 'PHONE', outcome,
  notes, contactedByUserId: actorUserId, contactedAt: atReferenceTime(state)
});

export const generateNextAppointmentNumber = state => `APT-${pad(Math.max(0, ...state.appointments.map(appointment => numberSuffix(appointment.appointmentNumber))) + 1)}`;

export const appointmentActionAllowed = ({ role, userId, appointment = null, action }) => {
  if (!['create', 'edit', 'confirm', 'cancel', 'reschedule'].includes(action)) return false;
  if (role === 'Clinic Administrator' || role === 'Receptionist') return true;
  return role === 'Dentist' && (action === 'create' || appointment?.dentistUserId === userId);
};

export const validateAppointmentInput = ({ state, values = {}, excludeAppointmentId = null }) => {
  const errors = {};
  const patient = activePatient(state, values.patientId);
  const dentist = activeDentist(state, values.dentistUserId);
  const type = activeType(state, values.appointmentTypeId);
  const date = String(values.date || '');
  const time = String(values.time || '');
  if (!patient) errors.patientId = values.patientId ? 'The selected patient is inactive or no longer available.' : 'Select a patient.';
  if (!dentist) errors.dentistUserId = 'Select an active Dentist.';
  if (!type) errors.appointmentTypeId = 'Select an active appointment type.';
  if (!date) errors.date = 'Choose an appointment date.';
  else if (!dateValid(date) || date < state.referenceDate) errors.date = 'Choose a valid current or future appointment date.';
  if (!time) errors.time = 'Choose an appointment time.';
  else if (!timeValid(time)) errors.time = 'Choose a valid appointment time.';
  if (Object.keys(errors).length) return { errors, normalized: null };
  const startDateTime = slotStart(date, time);
  const endDateTime = slotEnd(date, time, type.defaultDurationMinutes || 30);
  const dentistConflict = hasAppointmentConflict(state, { dentistUserId: dentist.id, startDateTime, endDateTime, excludeAppointmentId });
  if (dentistConflict) errors.time = `${dentist.fullName} already has an appointment at this time.`;
  const patientConflict = state.appointments.some(appointment => appointment.id !== excludeAppointmentId && appointment.patientId === patient.id && !blockingStatuses.has(appointment.status) && Date.parse(startDateTime) < Date.parse(appointment.endDateTime) && Date.parse(endDateTime) > Date.parse(appointment.startDateTime));
  if (patientConflict) errors.patientId = 'This patient already has another appointment at this time.';
  return { errors, normalized: { patient, dentist, type, startDateTime, endDateTime, reason: String(values.reason || '').trim() || null, notes: String(values.notes || '').trim() || null } };
};

const assertAllowed = ({ role, userId, appointment, action }) => {
  if (!appointmentActionAllowed({ role, userId, appointment, action })) throw new Error('You do not have permission to perform this appointment action.');
};
const newAppointment = ({ state, normalized, actorUserId, appointmentNumber = generateNextAppointmentNumber(state), rescheduledFromAppointmentId = null }) => ({
  id: appointmentNumber, appointmentNumber, organizationId: state.organization.id, branchId: state.branches.find(branch => branch.isMain)?.id || state.branches[0]?.id,
  patientId: normalized.patient.id, dentistUserId: normalized.dentist.id, appointmentTypeId: normalized.type.id,
  startDateTime: normalized.startDateTime, endDateTime: normalized.endDateTime, status: 'SCHEDULED', reason: normalized.reason,
  notes: normalized.notes, bookingSource: 'APPOINTMENT', bookedByUserId: actorUserId, createdAt: atReferenceTime(state), updatedAt: atReferenceTime(state),
  confirmedAt: null, checkedInAt: null, completedAt: null, cancelledAt: null, cancellationReason: null, rescheduledFromAppointmentId
});

export const createAppointment = ({ state, values, actor }) => {
  assertAllowed({ ...actor, appointment: null, action: 'create' });
  const requestedDentistId = actor.role === 'Dentist' ? actor.userId : values.dentistUserId;
  const validation = validateAppointmentInput({ state, values: { ...values, dentistUserId: requestedDentistId } });
  if (Object.keys(validation.errors).length) return { errors: validation.errors };
  const appointment = newAppointment({ state, normalized: validation.normalized, actorUserId: actor.userId });
  state.appointments.push(appointment);
  appendHistory(state, { appointment, fromStatus: null, toStatus: 'SCHEDULED', actorUserId: actor.userId });
  appendAudit(state, { actorUserId: actor.userId, actionCode: 'APPOINTMENT_CREATED', appointment, summary: `${appointment.appointmentNumber} booked.` });
  return { appointment, errors: {} };
};

export const editAppointment = ({ state, appointmentId, values, actor }) => {
  const index = state.appointments.findIndex(appointment => appointment.id === appointmentId);
  const current = state.appointments[index];
  if (!current) throw new Error('Appointment record was not found.');
  assertAllowed({ ...actor, appointment: current, action: 'edit' });
  if (!['SCHEDULED', 'CONFIRMED'].includes(current.status)) throw new Error('This appointment is read-only at its current workflow status.');
  const requestedDentistId = actor.role === 'Dentist' ? actor.userId : values.dentistUserId;
  const validation = validateAppointmentInput({ state, values: { ...values, dentistUserId: requestedDentistId }, excludeAppointmentId: current.id });
  if (Object.keys(validation.errors).length) return { errors: validation.errors };
  const updated = { ...current, patientId: validation.normalized.patient.id, dentistUserId: validation.normalized.dentist.id, appointmentTypeId: validation.normalized.type.id, startDateTime: validation.normalized.startDateTime, endDateTime: validation.normalized.endDateTime, reason: validation.normalized.reason, notes: validation.normalized.notes, updatedAt: atReferenceTime(state), updatedByUserId: actor.userId };
  state.appointments[index] = updated;
  appendAudit(state, { actorUserId: actor.userId, actionCode: 'APPOINTMENT_UPDATED', appointment: updated, summary: `${updated.appointmentNumber} updated.` });
  return { appointment: updated, errors: {} };
};

export const confirmAppointment = ({ state, appointmentId, actor }) => {
  const appointment = state.appointments.find(item => item.id === appointmentId);
  if (!appointment) throw new Error('Appointment record was not found.');
  assertAllowed({ ...actor, appointment, action: 'confirm' });
  if (!canTransitionAppointment(appointment.status, 'CONFIRMED')) throw new Error('Only scheduled appointments can be confirmed.');
  appointment.status = 'CONFIRMED'; appointment.confirmedAt = atReferenceTime(state); appointment.updatedAt = atReferenceTime(state); appointment.updatedByUserId = actor.userId;
  appendHistory(state, { appointment, fromStatus: 'SCHEDULED', toStatus: 'CONFIRMED', actorUserId: actor.userId });
  appendContact(state, { appointment, actorUserId: actor.userId, outcome: 'CONFIRMED' });
  appendAudit(state, { actorUserId: actor.userId, actionCode: 'APPOINTMENT_CONFIRMED', appointment, summary: `${appointment.appointmentNumber} confirmed.` });
  return appointment;
};

export const cancelAppointment = ({ state, appointmentId, reason, actor }) => {
  const appointment = state.appointments.find(item => item.id === appointmentId);
  if (!appointment) throw new Error('Appointment record was not found.');
  assertAllowed({ ...actor, appointment, action: 'cancel' });
  if (!canTransitionAppointment(appointment.status, 'CANCELLED')) throw new Error('This appointment cannot be cancelled at its current workflow status.');
  const cancellationReason = String(reason || '').trim() || 'Appointment cancelled.';
  const previous = appointment.status; appointment.status = 'CANCELLED'; appointment.cancellationReason = cancellationReason; appointment.cancelledAt = atReferenceTime(state); appointment.updatedAt = atReferenceTime(state); appointment.updatedByUserId = actor.userId;
  appendHistory(state, { appointment, fromStatus: previous, toStatus: 'CANCELLED', actorUserId: actor.userId, reason: cancellationReason });
  appendContact(state, { appointment, actorUserId: actor.userId, outcome: 'CANCELLED', notes: cancellationReason });
  appendAudit(state, { actorUserId: actor.userId, actionCode: 'APPOINTMENT_CANCELLED', appointment, summary: `${appointment.appointmentNumber} cancelled.` });
  return appointment;
};

export const rescheduleAppointment = ({ state, appointmentId, values, actor }) => {
  const original = state.appointments.find(item => item.id === appointmentId);
  if (!original) throw new Error('Appointment record was not found.');
  assertAllowed({ ...actor, appointment: original, action: 'reschedule' });
  if (!canTransitionAppointment(original.status, 'RESCHEDULED')) throw new Error('This appointment cannot be rescheduled at its current workflow status.');
  const requestedDentistId = actor.role === 'Dentist' ? actor.userId : values.dentistUserId;
  const validation = validateAppointmentInput({ state, values: { ...values, patientId: original.patientId, appointmentTypeId: original.appointmentTypeId, reason: original.reason, notes: original.notes, dentistUserId: requestedDentistId }, excludeAppointmentId: original.id });
  if (Object.keys(validation.errors).length) return { errors: validation.errors };
  const replacement = newAppointment({ state, normalized: validation.normalized, actorUserId: actor.userId, rescheduledFromAppointmentId: original.id });
  const previous = original.status;
  // Validate before mutating either record so a failed reschedule leaves the original intact.
  state.appointments.push(replacement);
  original.status = 'RESCHEDULED'; original.updatedAt = atReferenceTime(state); original.updatedByUserId = actor.userId;
  state.recalls.filter(recall => recall.scheduledAppointmentId === original.id).forEach(recall => { recall.scheduledAppointmentId = replacement.id; recall.updatedAt = atReferenceTime(state); });
  appendHistory(state, { appointment: replacement, fromStatus: null, toStatus: 'SCHEDULED', actorUserId: actor.userId, reason: `Rescheduled from ${original.appointmentNumber}` });
  appendHistory(state, { appointment: original, fromStatus: previous, toStatus: 'RESCHEDULED', actorUserId: actor.userId, reason: `Moved to ${replacement.appointmentNumber}` });
  appendContact(state, { appointment: original, actorUserId: actor.userId, outcome: 'RESCHEDULED', notes: `Replacement ${replacement.appointmentNumber}` });
  appendAudit(state, { actorUserId: actor.userId, actionCode: 'APPOINTMENT_RESCHEDULED', appointment: original, summary: `${original.appointmentNumber} rescheduled to ${replacement.appointmentNumber}.` });
  return { original, replacement, errors: {} };
};
