import { element } from '../components/dom.js';
import { createBadge, createButton, createEmptyState, createField, createPageHeader, createSearch } from '../components/primitives.js';
import { confirm, openModal, showToast } from '../components/overlays.js';
import { state as appState } from '../core/state.js';
import { appointmentActionAllowed } from '../data/appointment-workflows.js';
import { getAppointmentDetailData, getAppointmentScheduleData } from '../data/appointment-calendar.js';
import { APPOINTMENT_STATUSES } from '../data/scheduling.js';
import { formatDate, formatStatus, formatTime } from '../utils/formatters.js';

const separator = ' - ';
const statusVariant = status => ({ COMPLETED: 'success', CONFIRMED: 'success', WAITING: 'warning', IN_TREATMENT: 'warning', CANCELLED: 'danger', NO_SHOW: 'danger', RESCHEDULED: 'neutral', SCHEDULED: 'info' }[status] || 'neutral');
const dateShift = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const weekday = date => new Intl.DateTimeFormat('en-UG', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const appointmentLabel = ({ appointment, patient, type }) => `${formatTime(appointment.startDateTime)}${separator}${patient?.fullName || 'Patient'}${separator}${type?.name || 'Appointment'}${separator}${formatStatus(appointment.status)}`;
const detailRow = (label, content) => element('div', { className: 'appointment-detail__row' }, [element('dt', { text: label }), element('dd', { text: content || 'Not recorded' })]);
const action = ({ label, variant = 'secondary', onClick }) => createButton({ label, variant, size: 'small', onClick });

const appointmentBlock = ({ state, appointment, onOpen }) => {
  const patient = state.patients.find(item => item.id === appointment.patientId);
  const type = state.appointmentTypes.find(item => item.id === appointment.appointmentTypeId);
  return element('button', { className: `appointment-block appointment-block--${appointment.status.toLowerCase()}`, type: 'button', 'aria-label': appointmentLabel({ appointment, patient, type }), onClick: () => onOpen(appointment.id) }, [element('time', { text: formatTime(appointment.startDateTime) }), element('strong', { text: patient?.fullName || 'Patient' }), element('span', { text: type?.name || 'Appointment' }), createBadge({ label: formatStatus(appointment.status), variant: statusVariant(appointment.status) })]);
};

const refreshCalendar = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const openCancellation = ({ appointment, session, closeDetails }) => {
  const reason = createField({ id: 'appointment-cancellation-reason', label: 'Cancellation reason (optional)', type: 'textarea', placeholder: 'Optional operational reason' });
  let modal; let saving = false;
  const save = async () => {
    if (saving) return; saving = true;
    if (!await confirm({ title: 'Cancel this appointment?', message: 'The appointment will remain in history and its time slot will become available.', confirmLabel: 'Cancel Appointment', variant: 'danger' })) { saving = false; return; }
    try { appState.cancelAppointment({ appointmentId: appointment.id, reason: reason.control.value, actor: { role: session.role, userId: session.userId } }); modal?.close(); closeDetails?.(); showToast({ title: 'Appointment cancelled.', message: appointment.appointmentNumber, variant: 'success' }); refreshCalendar(); } catch (error) { saving = false; showToast({ title: 'Unable to cancel appointment.', message: error.message, variant: 'error' }); }
  };
  modal = openModal({ title: `Cancel ${appointment.appointmentNumber}`, content: element('div', { className: 'stack' }, [element('p', { text: 'This action does not delete the appointment.' }), reason.element]), footer: element('div', { className: 'button-group' }, [createButton({ label: 'Keep Appointment', variant: 'secondary', onClick: () => modal.close() }), createButton({ label: 'Cancel Appointment', variant: 'danger', onClick: save })]) });
};

const openDetails = ({ state, appointmentId, session, canViewPhone }) => {
  const data = getAppointmentDetailData(state, appointmentId); if (!data) return;
  const { appointment, patient, dentist, type, contactLogs, replacement } = data;
  const original = appointment.rescheduledFromAppointmentId ? state.appointments.find(candidate => candidate.id === appointment.rescheduledFromAppointmentId) : null;
  const rows = [detailRow('Appointment Number', appointment.appointmentNumber), detailRow('Patient', patient?.fullName), detailRow('Patient Number', patient?.patientNumber), canViewPhone ? detailRow('Phone', patient?.phone) : null, detailRow('Date', formatDate(appointment.startDateTime)), detailRow('Time', formatTime(appointment.startDateTime)), detailRow('Dentist', dentist?.fullName), detailRow('Appointment Type', type?.name), detailRow('Status', formatStatus(appointment.status)), detailRow('Reason', appointment.reason), appointment.status === 'RESCHEDULED' && replacement ? detailRow('Rescheduled to', replacement.appointmentNumber) : null, original ? detailRow('Rescheduled from', original.appointmentNumber) : null].filter(Boolean);
  const contactHistory = contactLogs.length ? element('ul', { className: 'appointment-detail__contacts' }, contactLogs.map(log => element('li', { text: `${formatStatus(log.outcome)} by ${formatStatus(log.contactMethod)}${separator}${log.actor?.fullName || 'Staff member'}${separator}${formatDate(log.contactedAt)} ${formatTime(log.contactedAt)}${log.notes ? `${separator}${log.notes}` : ''}` }))) : element('p', { className: 'appointment-detail__empty', text: 'No contact history recorded.' });
  const content = element('div', { className: 'appointment-detail' }, [element('dl', { className: 'appointment-detail__details' }, rows), element('section', { className: 'appointment-detail__contact-history' }, [element('h3', { text: 'Contact History' }), contactHistory])]);
  let modal; let confirming = false;
  const close = () => modal?.close();
  const actions = [
    patient ? action({ label: 'View Patient Profile', onClick: () => { close(); location.hash = `#/patients/${patient.id}`; } }) : null,
    appointment.status === 'RESCHEDULED' && replacement ? action({ label: 'View Replacement', onClick: () => { close(); openDetails({ state, appointmentId: replacement.id, session, canViewPhone }); } }) : null,
    appointmentActionAllowed({ role: session.role, userId: session.userId, appointment, action: 'edit' }) && ['SCHEDULED', 'CONFIRMED'].includes(appointment.status) ? action({ label: 'Edit', onClick: () => { close(); location.hash = `#/appointments/${appointment.id}/edit`; } }) : null,
    appointmentActionAllowed({ role: session.role, userId: session.userId, appointment, action: 'confirm' }) && appointment.status === 'SCHEDULED' ? action({ label: 'Confirm', onClick: async () => { if (confirming) return; confirming = true; if (!await confirm({ title: 'Confirm appointment?', message: 'A phone confirmation record will be added to the appointment history.', confirmLabel: 'Confirm Appointment' })) { confirming = false; return; } try { appState.confirmAppointment({ appointmentId: appointment.id, actor: { role: session.role, userId: session.userId } }); close(); showToast({ title: 'Appointment confirmed.', message: appointment.appointmentNumber, variant: 'success' }); refreshCalendar(); } catch (error) { confirming = false; showToast({ title: 'Unable to confirm appointment.', message: error.message, variant: 'error' }); } } }) : null,
    appointmentActionAllowed({ role: session.role, userId: session.userId, appointment, action: 'reschedule' }) && ['SCHEDULED', 'CONFIRMED'].includes(appointment.status) ? action({ label: 'Reschedule', onClick: () => { close(); location.hash = `#/appointments/${appointment.id}/reschedule`; } }) : null,
    appointmentActionAllowed({ role: session.role, userId: session.userId, appointment, action: 'cancel' }) && ['SCHEDULED', 'CONFIRMED'].includes(appointment.status) ? action({ label: 'Cancel', variant: 'danger', onClick: () => openCancellation({ appointment, session, closeDetails: close }) }) : null
  ].filter(Boolean);
  modal = openModal({ title: `Appointment ${appointment.appointmentNumber}`, content, footer: element('div', { className: 'appointment-detail__actions' }, actions), size: 'medium' });
};

export const renderAppointments = ({ state, session }) => {
  const view = { date: state.referenceDate, dentistId: 'all', status: 'all', appointmentTypeId: 'all', search: '', mode: 'schedule' };
  const page = element('section', { className: 'appointments-workspace' });
  const dateField = createField({ id: 'appointment-calendar-date', label: 'Schedule date', type: 'date', value: view.date });
  const dentistField = createField({ id: 'appointment-calendar-dentist', label: 'Dentist', type: 'select', options: [] });
  const statusField = createField({ id: 'appointment-calendar-status', label: 'Status', type: 'select', options: [{ value: 'all', label: 'All statuses' }, ...APPOINTMENT_STATUSES.map(status => ({ value: status, label: formatStatus(status) }))] });
  const typeField = createField({ id: 'appointment-calendar-type', label: 'Appointment type', type: 'select', options: [{ value: 'all', label: 'All appointment types' }, ...state.appointmentTypes.filter(type => type.status === 'active').map(type => ({ value: type.id, label: type.name }))] });
  const searchField = createSearch({ label: 'Search appointments by patient, patient number, phone, or appointment number', placeholder: 'Search patient or appointment…', onInput: value => { view.search = value; renderResults(); } });
  const summary = element('p', { className: 'appointments-workspace__summary', role: 'status' });
  const content = element('div', { className: 'appointments-workspace__content' });
  const viewToggle = element('div', { className: 'appointments-workspace__view-toggle', role: 'group', 'aria-label': 'Schedule view' });
  const reset = () => { view.dentistId = 'all'; view.status = 'all'; view.appointmentTypeId = 'all'; view.search = ''; dentistField.control.value = 'all'; statusField.control.value = 'all'; typeField.control.value = 'all'; searchField.querySelector('input').value = ''; renderResults(); };
  const renderViewToggle = () => viewToggle.replaceChildren(...['schedule', 'list'].map(mode => createButton({ label: mode === 'schedule' ? 'Schedule' : 'List', variant: mode === view.mode ? 'primary' : 'secondary', size: 'small', onClick: () => { view.mode = mode; renderResults(); } })));
  const toolbar = element('section', { className: 'appointments-workspace__toolbar', 'aria-label': 'Appointment schedule controls' }, [element('div', { className: 'appointments-workspace__date-controls' }, [createButton({ label: 'Previous Day', variant: 'secondary', size: 'small', onClick: () => { view.date = dateShift(view.date, -1); dateField.control.value = view.date; renderResults(); } }), createButton({ label: 'Today', variant: 'secondary', size: 'small', onClick: () => { view.date = state.referenceDate; dateField.control.value = view.date; renderResults(); } }), createButton({ label: 'Next Day', variant: 'secondary', size: 'small', onClick: () => { view.date = dateShift(view.date, 1); dateField.control.value = view.date; renderResults(); } }), dateField.element]), element('div', { className: 'appointments-workspace__filters' }, [dentistField.element, statusField.element, typeField.element, searchField, createButton({ label: 'Clear Filters', variant: 'ghost', size: 'small', onClick: reset })]), viewToggle]);
  const renderResults = () => {
    const data = getAppointmentScheduleData({ state, role: session.role, userId: session.userId, ...view });
    dentistField.control.replaceChildren(...[{ value: 'all', label: 'All Dentists' }, ...data.dentists.map(dentist => ({ value: dentist.id, label: dentist.fullName }))].map(option => element('option', { value: option.value, text: option.label }))); dentistField.control.value = view.dentistId;
    dentistField.element.hidden = !data.access.isClinicSchedule;
    renderViewToggle(); content.replaceChildren(); summary.textContent = `${data.appointments.length} appointment${data.appointments.length === 1 ? '' : 's'}${view.date === state.referenceDate ? ' today' : ''}`;
    if (!data.appointments.length) { content.append(createEmptyState({ title: data.isFiltered ? 'No appointments match these filters.' : 'No appointments scheduled for this date.', message: data.isFiltered ? 'Adjust or clear the selected filters to see appointments.' : 'Use Today to return to the current clinic schedule.', action: data.isFiltered ? { label: 'Clear Filters', onClick: reset } : { label: 'Today', onClick: () => { view.date = state.referenceDate; dateField.control.value = view.date; renderResults(); } } })); return; }
    const onOpen = appointmentId => openDetails({ state, appointmentId, session, canViewPhone: data.access.canViewPhone });
    const schedule = element('section', { className: `appointments-schedule${view.mode === 'schedule' ? ' is-active' : ''}`, style: `--calendar-columns: ${data.groups.length}`, 'aria-label': 'Day schedule' }, [element('div', { className: 'appointments-schedule__header' }, [element('span', { text: 'Time' }), ...data.groups.map(group => element('strong', { text: group.dentist.fullName }))]), ...data.times.flatMap(time => [element('div', { className: 'appointments-schedule__time', text: time }), ...data.groups.map(group => element('div', { className: 'appointments-schedule__cell' }, group.appointments.filter(appointment => appointment.startDateTime.slice(11, 16) === time).map(appointment => appointmentBlock({ state, appointment, onOpen }))))])]);
    const agenda = element('section', { className: `appointments-agenda${view.mode === 'list' ? ' is-active' : ''}`, 'aria-label': 'Appointment list' }, data.appointments.map(appointment => { const patient = state.patients.find(item => item.id === appointment.patientId); const dentist = state.users.find(item => item.id === appointment.dentistUserId); const type = state.appointmentTypes.find(item => item.id === appointment.appointmentTypeId); return element('button', { className: `appointments-agenda__row${appointment.status === 'CANCELLED' ? ' is-muted' : ''}`, type: 'button', 'aria-label': appointmentLabel({ appointment, patient, type }), onClick: () => onOpen(appointment.id) }, [element('time', { text: formatTime(appointment.startDateTime) }), element('span', { className: 'appointments-agenda__patient', text: patient?.fullName || 'Patient' }), element('span', { text: dentist?.fullName || 'Dentist' }), element('span', { text: type?.name || 'Appointment' }), createBadge({ label: formatStatus(appointment.status), variant: statusVariant(appointment.status) })]); }));
    content.append(element('p', { className: 'appointments-workspace__date-heading', text: `${weekday(view.date)}, ${formatDate(view.date)}` }), schedule, agenda);
  };
  dateField.control.addEventListener('change', event => { view.date = event.target.value; renderResults(); });
  dentistField.control.addEventListener('change', event => { view.dentistId = event.target.value; renderResults(); });
  statusField.control.addEventListener('change', event => { view.status = event.target.value; renderResults(); });
  typeField.control.addEventListener('change', event => { view.appointmentTypeId = event.target.value; renderResults(); });
  page.append(createPageHeader({ title: 'Appointments', description: 'Manage and review the clinic schedule.', actions: appointmentActionAllowed({ role: session.role, userId: session.userId, action: 'create' }) ? [{ label: 'Book Appointment', onClick: () => { location.hash = '#/appointments/new'; } }] : [] }), toolbar, summary, content);
  renderResults(); return page;
};
