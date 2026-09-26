import { element } from '../components/dom.js';
import { createBreadcrumb, createCard, createField, createFilterBar, createKpiCard, createPageHeader, createSearch } from '../components/primitives.js';
import { createPagination, createTable } from '../components/data-display.js';
import { getEncounterRegister } from '../data/clinical.js';
import { getActiveDentists } from '../data/user-management.js';
import { formatDate, formatStatus } from '../utils/formatters.js';

const PAGE_SIZE = 8;
const ENCOUNTER_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED'];
const statusVariant = status => ({ DRAFT: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success' }[status] || 'neutral');
const patientFor = (state, id) => state.patients.find(patient => patient.id === id) || null;
const dentistFor = (state, id) => state.users.find(user => user.id === id) || null;
const appointmentFor = (state, id) => id ? state.appointments.find(appointment => appointment.id === id) || null : null;

export const renderEncountersRegister = ({ state, session }) => {
  if (!['Clinic Administrator', 'Dentist'].includes(session?.role)) return element('section', { className: 'encounters-register-access-guard', 'aria-hidden': 'true' });
  let pageNumber = 1;
  const filters = { search: '', status: '', dentistId: '', sort: 'newest' };
  const page = element('section', { className: 'encounters-register' });
  const region = element('div', { className: 'encounters-register__region', 'aria-live': 'polite' });
  const all = getEncounterRegister(state, session);
  const results = element('div', { className: 'encounters-register__results', 'aria-live': 'polite' });
  const search = createSearch({ label: 'Search encounters by patient name, patient number, or encounter ID', placeholder: 'Search patient or encounter…', onInput: value => { filters.search = value; pageNumber = 1; renderResults(); } });
  const searchInput = search.querySelector('input'), clearSearch = search.querySelector('[aria-label="Clear search"]');
  const status = createField({ id: 'encounter-status-filter', label: 'Status', type: 'select', options: [{ value: '', label: 'All statuses' }, ...ENCOUNTER_STATUSES.map(value => ({ value, label: formatStatus(value) }))] });
  const sort = createField({ id: 'encounter-sort', label: 'Sort by', type: 'select', options: [{ value: 'newest', label: 'Newest encounter' }, { value: 'oldest', label: 'Oldest encounter' }, { value: 'patient', label: 'Patient A–Z' }] });
  const dentist = session.role === 'Clinic Administrator' ? createField({ id: 'encounter-dentist-filter', label: 'Dentist', type: 'select', options: [{ value: '', label: 'All Dentists' }, ...getActiveDentists(state).map(user => ({ value: user.id, label: user.fullName }))] }) : null;
  const reset = () => {
    filters.search = ''; filters.status = ''; filters.dentistId = ''; filters.sort = 'newest'; pageNumber = 1;
    searchInput.value = ''; clearSearch.hidden = true; status.control.value = ''; sort.control.value = 'newest'; if (dentist) dentist.control.value = '';
    renderResults();
  };
  status.control.addEventListener('change', () => { filters.status = status.control.value; pageNumber = 1; renderResults(); });
  sort.control.addEventListener('change', () => { filters.sort = sort.control.value; pageNumber = 1; renderResults(); });
  if (dentist) dentist.control.addEventListener('change', () => { filters.dentistId = dentist.control.value; pageNumber = 1; renderResults(); });
  const draftCount = all.filter(encounter => encounter.status === 'DRAFT').length, completedCount = all.filter(encounter => encounter.status === 'COMPLETED').length, todayCount = all.filter(encounter => encounter.startedAt.slice(0, 10) === state.referenceDate).length;
  const metrics = element('div', { className: 'encounters-register__metrics', 'aria-label': 'Encounter summary' }, [
    createKpiCard({ label: 'Total Encounters', value: String(all.length), icon: 'file-text', context: session.role === 'Dentist' ? 'Assigned to you' : 'Across the clinic' }),
    createKpiCard({ label: 'Draft', value: String(draftCount), icon: 'edit', context: 'Clinical documentation in progress' }),
    createKpiCard({ label: 'Completed', value: String(completedCount), icon: 'check', context: 'Locked historical records' }),
    createKpiCard({ label: "Today's Encounters", value: String(todayCount), icon: 'calendar', context: formatDate(state.referenceDate) })
  ]);
  const card = createCard({ title: 'Encounter Register', subtitle: 'Encounter records shown. Clinical detail remains inside the existing Clinical Workspace.', content: element('div', { className: 'encounters-register__list' }, [createFilterBar({ children: [search, status.element, dentist?.element, sort.element].filter(Boolean), onReset: reset }), results]) });
  const subtitle = card.querySelector('.card__subtitle');

  const renderResults = () => {
    const query = filters.search.trim().toLowerCase();
    const visible = all.filter(encounter => {
      const patient = patientFor(state, encounter.patientId);
      return (!filters.status || encounter.status === filters.status) && (!filters.dentistId || encounter.dentistUserId === filters.dentistId) && (!query || [encounter.id, encounter.encounterNumber, patient?.fullName, patient?.patientNumber].some(value => String(value || '').toLowerCase().includes(query)));
    });
    if (filters.sort === 'oldest') visible.sort((left, right) => left.startedAt.localeCompare(right.startedAt) || left.encounterNumber.localeCompare(right.encounterNumber));
    if (filters.sort === 'patient') visible.sort((left, right) => (patientFor(state, left.patientId)?.fullName || '').localeCompare(patientFor(state, right.patientId)?.fullName || ''));
    const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    pageNumber = Math.min(pageNumber, totalPages);
    const pageEncounters = visible.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);
    const rows = pageEncounters.map(encounter => {
      const patient = patientFor(state, encounter.patientId), dentistUser = dentistFor(state, encounter.dentistUserId), appointment = appointmentFor(state, encounter.appointmentId);
      const ownsDraft = session.role === 'Dentist' && encounter.dentistUserId === session.userId && encounter.status === 'DRAFT';
      return {
        encounter: encounter.encounterNumber,
        patient: patient ? `${patient.fullName} · ${patient.patientNumber}` : 'Unknown patient',
        date: formatDate(encounter.startedAt),
        dentist: dentistUser?.fullName || 'Not recorded',
        appointment: appointment?.appointmentNumber || 'Not linked',
        status: { label: formatStatus(encounter.status), variant: statusVariant(encounter.status) },
        actions: [
          { label: ownsDraft ? 'Resume Encounter' : 'View Encounter', icon: ownsDraft ? 'edit' : 'file-text', onClick: () => { location.hash = `#/clinical/encounters/${encounter.id}`; } },
          ...(patient ? [{ label: 'View Patient', icon: 'user', onClick: () => { location.hash = `#/patients/${patient.id}`; } }] : []),
          ...(appointment ? [{ label: 'Open Appointment Workspace', icon: 'calendar', onClick: () => { location.hash = '#/appointments'; } }] : [])
        ]
      };
    });
    const table = createTable({ stickyHeader: true, rows, columns: [{ label: 'Encounter', key: 'encounter' }, { label: 'Patient', key: 'patient' }, { label: 'Date', key: 'date' }, { label: 'Dentist', key: 'dentist' }, { label: 'Linked Appointment', key: 'appointment' }, { label: 'Status', key: 'status', type: 'badge' }, { label: 'Actions', key: 'actions', type: 'actions' }], empty: { title: all.length ? 'No matching encounters' : 'No encounters available', message: all.length ? 'Try another search or filter.' : 'Encounter records will appear after the approved clinical workflow creates them.' } });
    subtitle.textContent = `${visible.length} encounter${visible.length === 1 ? '' : 's'} shown. Clinical detail remains inside the existing Clinical Workspace.`;
    results.replaceChildren(table, createPagination({ page: pageNumber, totalPages, summary: `Showing ${visible.length ? (pageNumber - 1) * PAGE_SIZE + 1 : 0}–${Math.min(pageNumber * PAGE_SIZE, visible.length)} of ${visible.length}`, onChange: value => { pageNumber = value; renderResults(); } }));
  };

  region.append(metrics, card);
  page.append(createPageHeader({ title: 'Encounters', description: 'Review encounter records and continue into the existing patient Clinical Workspace.', breadcrumb: createBreadcrumb({ items: [{ label: 'Clinical Overview', href: '#/clinical/encounters' }, { label: 'Encounters' }] }) }), region);
  renderResults();
  return page;
};
