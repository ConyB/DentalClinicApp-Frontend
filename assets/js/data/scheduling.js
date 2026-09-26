import { DEMO_REFERENCE_DATE } from './clinic.js';

export const APPOINTMENT_STATUSES = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_TREATMENT', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'];
export const QUEUE_STATUSES = ['CHECKED_IN', 'WAITING', 'IN_TREATMENT', 'READY_FOR_CHECKOUT', 'COMPLETED'];
export const ACTIVE_QUEUE_STATUSES = new Set(['WAITING', 'IN_TREATMENT']);
export const APPOINTMENT_TRANSITIONS = {
  SCHEDULED: ['CONFIRMED', 'CHECKED_IN', 'WAITING', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  CONFIRMED: ['CHECKED_IN', 'WAITING', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  CHECKED_IN: ['WAITING'],
  WAITING: ['IN_TREATMENT'],
  IN_TREATMENT: ['COMPLETED'],
  COMPLETED: [], CANCELLED: [], NO_SHOW: [], RESCHEDULED: []
};
const dateOf = value => value ? value.slice(0, 10) : null;
const sortByStart = records => [...records].sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));

export const getAppointmentById = (state, id) => state.appointments.find(appointment => appointment.id === id) || null;
export const getAppointmentByNumber = (state, number) => state.appointments.find(appointment => appointment.appointmentNumber === number) || null;
export const getAppointmentsForDate = (state, date) => sortByStart(state.appointments.filter(appointment => dateOf(appointment.startDateTime) === date));
export const getAppointmentsForDentist = (state, userId, date = null) => sortByStart(state.appointments.filter(appointment => appointment.dentistUserId === userId && (!date || dateOf(appointment.startDateTime) === date)));
export const getAppointmentsForPatient = (state, patientId) => sortByStart(state.appointments.filter(appointment => appointment.patientId === patientId));
export const getAppointmentsByStatus = (state, status, date = null) => sortByStart(state.appointments.filter(appointment => appointment.status === status && (!date || dateOf(appointment.startDateTime) === date)));
export const getAppointmentStatusHistory = (state, appointmentId) => [...state.appointmentStatusHistory.filter(record => record.appointmentId === appointmentId)].sort((a, b) => a.changedAt.localeCompare(b.changedAt));
export const getAppointmentContactLogs = (state, appointmentId) => [...state.appointmentContactLogs.filter(record => record.appointmentId === appointmentId)].sort((a, b) => a.contactedAt.localeCompare(b.contactedAt));
export const getTodayAppointments = state => getAppointmentsForDate(state, DEMO_REFERENCE_DATE);

export const getQueueEntries = state => [...state.queueEntries].sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt));
export const getActiveQueueEntries = state => getQueueEntries(state).filter(entry => {
  const appointment = getAppointmentById(state, entry.appointmentId);
  return appointment && ACTIVE_QUEUE_STATUSES.has(entry.status) && entry.status === appointment.status;
});
export const getQueueEntryByAppointmentId = (state, appointmentId) => state.queueEntries.find(entry => entry.appointmentId === appointmentId) || null;
export const getQueueForDentist = (state, userId) => getActiveQueueEntries(state).filter(entry => entry.dentistUserId === userId);
export const getWaitingPatients = state => getActiveQueueEntries(state).filter(entry => entry.status === 'WAITING');
export const getInTreatmentPatients = state => getActiveQueueEntries(state).filter(entry => entry.status === 'IN_TREATMENT');

export const calculateWaitMinutes = (queueEntry, referenceDateTime) => {
  if (!queueEntry?.waitingAt || !referenceDateTime) return null;
  const minutes = Math.floor((Date.parse(referenceDateTime) - Date.parse(queueEntry.waitingAt)) / 60000);
  return Number.isFinite(minutes) ? Math.max(0, minutes) : null;
};

export const hasAppointmentConflict = (state, { dentistUserId, startDateTime, endDateTime, excludeAppointmentId = null }) => {
  const start = Date.parse(startDateTime);
  const end = Date.parse(endDateTime);
  if (!dentistUserId || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  const nonBlockingStatuses = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']);
  return state.appointments.some(appointment => appointment.dentistUserId === dentistUserId && appointment.id !== excludeAppointmentId && !nonBlockingStatuses.has(appointment.status) && start < Date.parse(appointment.endDateTime) && end > Date.parse(appointment.startDateTime));
};

export const canTransitionAppointment = (fromStatus, toStatus) => Boolean(APPOINTMENT_TRANSITIONS[fromStatus]?.includes(toStatus));
