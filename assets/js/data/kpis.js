import { getAppointmentsByStatus, getAppointmentsForDate, getActiveQueueEntries, getInTreatmentPatients, getWaitingPatients } from './scheduling.js';
import { getOutstandingBalance, getOverdueRecalls, getTodayCollections, getUpcomingRecalls } from './finance.js';
import { DEMO_REFERENCE_DATE } from './clinic.js';

export const getTodayAppointmentCount = state => getAppointmentsForDate(state, DEMO_REFERENCE_DATE).length;
export const getAppointmentStatusCounts = (state, date = DEMO_REFERENCE_DATE) => Object.fromEntries(['COMPLETED', 'WAITING', 'IN_TREATMENT', 'CONFIRMED', 'SCHEDULED', 'CANCELLED', 'NO_SHOW'].map(status => [status, getAppointmentsByStatus(state, status, date).length]));
export const getActiveQueueCount = state => getActiveQueueEntries(state).length;
export const getWaitingPatientCount = state => getWaitingPatients(state).length;
export const getInTreatmentPatientCount = state => getInTreatmentPatients(state).length;
export const getUpcomingRecallCount = state => getUpcomingRecalls(state).length;
export const getOverdueRecallCount = state => getOverdueRecalls(state).length;
export const getDentistSchedule = (state, userId, date = DEMO_REFERENCE_DATE) => getAppointmentsForDate(state, date).filter(appointment => appointment.dentistUserId === userId);
export { getTodayCollections, getOutstandingBalance };
