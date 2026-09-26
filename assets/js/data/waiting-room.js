import { calculateWaitMinutes, getActiveQueueEntries, getAppointmentById, getAppointmentsForDate } from './scheduling.js';
import { canStartQueueTreatment, isEligibleForCheckIn, queueAccess, queueReferenceTimestamp } from './queue-workflows.js';

const sortArrival = records => [...records].sort((left, right) => left.arrivalAt.localeCompare(right.arrivalAt));
const resolve = (state, entry) => {
  const appointment = getAppointmentById(state, entry.appointmentId);
  return { ...entry, appointment, patient: state.patients.find(patient => patient.id === entry.patientId) || null, dentist: state.users.find(user => user.id === entry.dentistUserId) || null, appointmentType: state.appointmentTypes.find(type => type.id === appointment?.appointmentTypeId) || null, waitingMinutes: entry.status === 'WAITING' ? calculateWaitMinutes(entry, queueReferenceTimestamp(state)) : null };
};

export const getWaitingRoomData = ({ state, role, userId }) => {
  const access = queueAccess({ role, userId });
  const withinScope = record => access.clinicWide || record.dentistUserId === access.dentistUserId;
  const activeQueue = sortArrival(getActiveQueueEntries(state).filter(entry => entry.arrivalAt.slice(0, 10) === state.referenceDate && withinScope(entry))).map(entry => {
    const resolved = resolve(state, entry);
    return { ...resolved, canStartTreatment: canStartQueueTreatment({ state, queueEntry: entry, actor: { role, userId } }) };
  });
  const waiting = activeQueue.filter(entry => entry.status === 'WAITING').map((entry, index) => ({ ...entry, position: index + 1 }));
  const inTreatment = activeQueue.filter(entry => entry.status === 'IN_TREATMENT');
  const queuedIds = new Set(activeQueue.map(entry => entry.appointmentId));
  const eligibleArrivals = getAppointmentsForDate(state, state.referenceDate).filter(appointment => withinScope(appointment) && isEligibleForCheckIn(appointment) && !queuedIds.has(appointment.id)).map(appointment => ({ appointment, patient: state.patients.find(patient => patient.id === appointment.patientId) || null, dentist: state.users.find(user => user.id === appointment.dentistUserId) || null, appointmentType: state.appointmentTypes.find(type => type.id === appointment.appointmentTypeId) || null }));
  return { access, activeQueue, waiting, inTreatment, eligibleArrivals };
};
