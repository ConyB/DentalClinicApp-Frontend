import { APPOINTMENT_STATUSES, getAppointmentById, getAppointmentContactLogs, getAppointmentsForDate } from './scheduling.js';

const matches = (value, term) => String(value || '').toLowerCase().includes(term);
const dentistUsers = state => state.users.filter(user => user.status === 'active' && user.roleId === 'ROLE-DENTIST');
const patientFor = (state, id) => state.patients.find(patient => patient.id === id) || null;
const typeFor = (state, id) => state.appointmentTypes.find(type => type.id === id) || null;
const userFor = (state, id) => state.users.find(user => user.id === id) || null;

export const getAppointmentCalendarAccess = ({ role, userId }) => ({
  isClinicSchedule: role === 'Clinic Administrator' || role === 'Receptionist',
  dentistId: role === 'Dentist' ? userId : null,
  canViewPhone: ['Clinic Administrator', 'Receptionist', 'Dentist'].includes(role)
});

export const getAppointmentScheduleData = ({ state, role, userId, date, dentistId = 'all', status = 'all', appointmentTypeId = 'all', search = '' }) => {
  const access = getAppointmentCalendarAccess({ role, userId });
  const allowedDentists = access.isClinicSchedule ? dentistUsers(state) : dentistUsers(state).filter(dentist => dentist.id === access.dentistId);
  const effectiveDentistId = access.isClinicSchedule ? dentistId : access.dentistId;
  const query = search.trim().toLowerCase();
  const appointments = getAppointmentsForDate(state, date).filter(appointment => {
    const patient = patientFor(state, appointment.patientId);
    if (!allowedDentists.some(dentist => dentist.id === appointment.dentistUserId)) return false;
    if (effectiveDentistId !== 'all' && appointment.dentistUserId !== effectiveDentistId) return false;
    if (status !== 'all' && appointment.status !== status) return false;
    if (appointmentTypeId !== 'all' && appointment.appointmentTypeId !== appointmentTypeId) return false;
    return !query || [appointment.appointmentNumber, patient?.fullName, patient?.patientNumber, patient?.phone].some(value => matches(value, query));
  });
  const groups = allowedDentists.filter(dentist => effectiveDentistId === 'all' || dentist.id === effectiveDentistId).map(dentist => ({ dentist, appointments: appointments.filter(appointment => appointment.dentistUserId === dentist.id) }));
  const times = [...new Set(appointments.map(appointment => appointment.startDateTime.slice(11, 16)))];
  const statusCounts = Object.fromEntries(APPOINTMENT_STATUSES.map(item => [item, appointments.filter(appointment => appointment.status === item).length]));
  return { access, date, appointments, dentists: allowedDentists, groups, times, statusCounts, isFiltered: Boolean(search || dentistId !== 'all' || status !== 'all' || appointmentTypeId !== 'all') };
};

export const getAppointmentDetailData = (state, appointmentId) => {
  const appointment = getAppointmentById(state, appointmentId);
  if (!appointment) return null;
  const replacement = state.appointments.find(candidate => candidate.rescheduledFromAppointmentId === appointment.id) || null;
  return { appointment, patient: patientFor(state, appointment.patientId), dentist: userFor(state, appointment.dentistUserId), type: typeFor(state, appointment.appointmentTypeId), contactLogs: getAppointmentContactLogs(state, appointment.id).map(log => ({ ...log, actor: userFor(state, log.contactedByUserId) })), replacement };
};
