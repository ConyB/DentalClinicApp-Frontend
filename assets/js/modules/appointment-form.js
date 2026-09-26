import { element } from '../components/dom.js';
import { createAlert, createButton, createEmptyState, createField, createPageHeader } from '../components/primitives.js';
import { confirm, showToast } from '../components/overlays.js';
import { dirtyState } from '../core/dirty-state.js';
import { state as appState } from '../core/state.js';
import { appointmentActionAllowed } from '../data/appointment-workflows.js';
import { searchPatients } from '../data/patients.js';
import { storage } from '../core/storage.js';

const activeDentists = state => state.users.filter(user => user.status === 'active' && user.roleId === 'ROLE-DENTIST');
const activeTypes = state => state.appointmentTypes.filter(type => type.status === 'active');
const byId = (records, id) => records.find(record => record.id === id) || null;
const datePart = value => value?.slice(0, 10) || '';
const timePart = value => value?.slice(11, 16) || '';
const patientLabel = patient => `${patient.patientNumber} - ${patient.fullName}${patient.phone ? ` - ${patient.phone}` : ''}`;
const DIRTY_SOURCE = 'legacy-form';

const resolvePatient = (state, value, options) => {
  const term = String(value || '').trim();
  const exact = [...options.entries()].find(([label]) => label === term)?.[1];
  if (exact) return exact;
  const matches = searchPatients(state, term);
  return matches.length === 1 ? matches[0].id : state.patients.find(patient => [patient.id, patient.patientNumber, patient.fullName, patient.phone].includes(term))?.id || '';
};

export const renderAppointmentForm = ({ state, session, mode = 'create', appointmentId = null, preselectedPatientId = null }) => {
  const recallContext = mode === 'create' ? storage.get('recall-booking-context', null) : null;
  if (recallContext && recallContext.patientId !== preselectedPatientId) storage.remove('recall-booking-context');
  const appointment = appointmentId ? state.appointments.find(item => item.id === appointmentId) : null;
  const isReschedule = mode === 'reschedule';
  const isEdit = mode === 'edit';
  const title = isReschedule ? 'Reschedule Appointment' : isEdit ? 'Edit Appointment' : 'Book Appointment';
  if (appointmentId && !appointment) return createEmptyState({ title: 'Appointment Not Found', message: 'The requested appointment record could not be found.', action: { label: 'Return to Appointments', onClick: () => { location.hash = '#/appointments'; } } });
  if (!appointmentActionAllowed({ role: session.role, userId: session.userId, appointment, action: isReschedule ? 'reschedule' : isEdit ? 'edit' : 'create' })) return createAlert({ title: 'Access Denied', message: 'You do not have permission to use this scheduling workflow.', variant: 'danger' });
  if (appointment && !['SCHEDULED', 'CONFIRMED'].includes(appointment.status)) return createAlert({ title: 'Appointment is read-only', message: 'Scheduling changes are not available at this workflow status.', variant: 'warning' });

  const initialPatient = byId(state.patients, appointment?.patientId || preselectedPatientId);
  const initial = {
    patientId: initialPatient?.id || '', dentistUserId: appointment?.dentistUserId || (session.role === 'Dentist' ? session.userId : ''), appointmentTypeId: appointment?.appointmentTypeId || '',
    date: datePart(appointment?.startDateTime) || state.referenceDate, time: timePart(appointment?.startDateTime) || '09:00', reason: appointment?.reason || recallContext?.reason || '', notes: appointment?.notes || ''
  };
  const patientOptions = new Map(state.patients.filter(patient => patient.status === 'active').map(patient => [patientLabel(patient), patient.id]));
  const patientField = createField({ id: 'appointment-patient', label: 'Patient', type: 'text', value: initialPatient ? patientLabel(initialPatient) : '', placeholder: 'Search by name, patient number, or phone', required: true, disabled: isReschedule });
  const patientList = element('datalist', { id: 'appointment-patient-options' }, [...patientOptions.keys()].map(label => element('option', { value: label })));
  patientField.control.setAttribute('list', 'appointment-patient-options');
  const dentistField = createField({ id: 'appointment-dentist', label: 'Dentist', type: 'select', value: initial.dentistUserId, required: true, disabled: session.role === 'Dentist', options: [{ value: '', label: 'Select Dentist' }, ...activeDentists(state).map(dentist => ({ value: dentist.id, label: dentist.fullName }))] });
  const typeField = createField({ id: 'appointment-type', label: 'Appointment Type', type: 'select', value: initial.appointmentTypeId, required: true, disabled: isReschedule, options: [{ value: '', label: 'Select appointment type' }, ...activeTypes(state).map(type => ({ value: type.id, label: type.name }))] });
  const dateField = createField({ id: 'appointment-date', label: isReschedule ? 'New appointment date' : 'Appointment date', type: 'date', value: initial.date, required: true, min: state.referenceDate });
  const timeField = createField({ id: 'appointment-time', label: isReschedule ? 'New appointment time' : 'Appointment time', type: 'time', value: initial.time, required: true });
  const reasonField = createField({ id: 'appointment-reason', label: 'Reason', type: 'text', value: initial.reason, placeholder: 'Operational appointment reason', disabled: isReschedule });
  const notesField = createField({ id: 'appointment-notes', label: 'Notes (optional)', type: 'textarea', value: initial.notes, placeholder: 'Optional scheduling or contact context', disabled: isReschedule });
  const error = element('div', { className: 'appointment-form__errors', role: 'alert', hidden: true });
  const form = element('form', { className: 'appointment-form', novalidate: true });
  let submitting = false;
  const fields = [patientField, dentistField, typeField, dateField, timeField, reasonField, notesField];
  const initialValues = () => JSON.stringify(readValues());
  const readValues = () => ({ patientId: isReschedule ? appointment.patientId : resolvePatient(state, patientField.control.value, patientOptions), dentistUserId: dentistField.control.value, appointmentTypeId: isReschedule ? appointment.appointmentTypeId : typeField.control.value, date: dateField.control.value, time: timeField.control.value, reason: reasonField.control.value, notes: notesField.control.value });
  const baseline = JSON.stringify({ ...initial, patientId: initial.patientId });
  const setErrors = errors => {
    error.textContent = Object.values(errors).join(' ');
    error.hidden = !error.textContent;
    Object.entries({ patientId: patientField, dentistUserId: dentistField, appointmentTypeId: typeField, date: dateField, time: timeField }).forEach(([key, field]) => field.control.setAttribute('aria-invalid', errors[key] ? 'true' : 'false'));
  };
  const clearErrors = () => { error.textContent = ''; error.hidden = true; fields.forEach(field => field.control.setAttribute('aria-invalid', 'false')); };
  const cleanUpNavigationGuard = () => { document.removeEventListener('click', guardNavigation, true); window.removeEventListener('beforeunload', guardUnload); };
  const leaveForm = async target => {
    if (dirtyState.isDirty(DIRTY_SOURCE) && !await confirm({ title: 'Discard appointment changes?', message: 'Your scheduling changes have not been saved.', confirmLabel: 'Discard Changes', variant: 'danger' })) return;
    dirtyState.clearUnsavedChanges(DIRTY_SOURCE); cleanUpNavigationGuard(); location.hash = `#/${target}`;
  };
  const guardNavigation = event => {
    const link = event.target.closest('a[href^="#/"]'); const target = link?.getAttribute('href')?.replace(/^#\//, '');
    if (!target || !dirtyState.isDirty(DIRTY_SOURCE)) return;
    event.preventDefault(); event.stopImmediatePropagation(); leaveForm(target);
  };
  const guardUnload = event => { if (!dirtyState.isDirty(DIRTY_SOURCE)) return; event.preventDefault(); event.returnValue = ''; };
  document.addEventListener('click', guardNavigation, true); window.addEventListener('beforeunload', guardUnload);
  const cancel = async () => {
    if (dirtyState.isDirty(DIRTY_SOURCE) && !await confirm({ title: 'Discard appointment changes?', message: 'Your scheduling changes have not been saved.', confirmLabel: 'Discard Changes', variant: 'danger' })) return;
    dirtyState.clearUnsavedChanges(DIRTY_SOURCE); cleanUpNavigationGuard(); location.hash = '#/appointments';
  };
  const submitButton = createButton({ label: isReschedule ? 'Create Replacement' : isEdit ? 'Save Appointment' : 'Book Appointment', type: 'submit' });
  form.append(...[
    isReschedule ? createAlert({ title: `Rescheduling ${appointment.appointmentNumber}`, message: 'The original appointment will remain in history and a new scheduled replacement will be created.', variant: 'info' }) : null,
    isEdit ? createAlert({ title: appointment.appointmentNumber, message: 'Appointment number is permanent and cannot be changed.', variant: 'info' }) : null,
    error,
    element('section', { className: 'appointment-form__section' }, [element('h2', { text: 'Patient' }), patientField.element, patientList]),
    element('section', { className: 'appointment-form__section' }, [element('h2', { text: 'Appointment Details' }), element('div', { className: 'appointment-form__grid' }, [dentistField.element, typeField.element, reasonField.element, notesField.element])]),
    element('section', { className: 'appointment-form__section' }, [element('h2', { text: 'Scheduling' }), element('div', { className: 'appointment-form__grid' }, [dateField.element, timeField.element])]),
    element('div', { className: 'appointment-form__actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: cancel }), submitButton])
  ].filter(Boolean));
  form.addEventListener('input', () => { clearErrors(); dirtyState.setUnsavedChanges(JSON.stringify(readValues()) !== baseline, DIRTY_SOURCE); });
  form.addEventListener('submit', event => {
    event.preventDefault(); if (submitting) return; submitting = true; submitButton.disabled = true; clearErrors();
    const values = readValues();
    try {
      const actor = { role: session.role, userId: session.userId };
      const result = isReschedule ? appState.rescheduleAppointment({ appointmentId: appointment.id, values, actor }) : isEdit ? appState.updateAppointment({ appointmentId: appointment.id, values, actor }) : recallContext ? appState.createRecallAppointment({ recallId: recallContext.recallId, values, actor }) : appState.addAppointment({ values, actor });
      if (result.errors && Object.keys(result.errors).length) { setErrors(result.errors); submitting = false; submitButton.disabled = false; return; }
      dirtyState.clearUnsavedChanges(DIRTY_SOURCE); storage.remove('recall-booking-context'); cleanUpNavigationGuard();
      const saved = isReschedule ? result.replacement : result.appointment;
      showToast({ title: isReschedule ? 'Appointment rescheduled successfully.' : isEdit ? 'Appointment updated successfully.' : 'Appointment booked successfully.', message: saved.appointmentNumber, variant: 'success' });
      location.hash = '#/appointments';
    } catch (exception) { error.textContent = exception.message || 'Unable to save the appointment.'; error.hidden = false; submitting = false; submitButton.disabled = false; }
  });
  const page = element('section', { className: 'appointment-form-page' }, [createPageHeader({ title, description: isReschedule ? 'Choose a new appointment slot. The original record will be retained.' : 'Schedule operational appointment details only.' }), form]);
  return page;
};
