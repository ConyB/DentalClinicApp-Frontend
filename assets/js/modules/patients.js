import { element } from '../components/dom.js';
import { createAlert, createBadge, createButton, createCard, createEmptyState, createField, createFilterBar, createKpiCard, createPageHeader, createSearch } from '../components/primitives.js';
import { createPagination, createTable } from '../components/data-display.js';
import { permissions } from '../core/permissions.js';
import { dirtyState } from '../core/dirty-state.js';
import { state as applicationState } from '../core/state.js';
import { confirm, showToast } from '../components/overlays.js';
import { getPatientAge, paginate, searchPatients } from '../data/patients.js';
import { findPotentialDuplicatePatients, validatePatientRegistration } from '../data/patient-registration.js';
import { formatDate } from '../utils/formatters.js';

const statusVariant = status => status === 'active' ? 'success' : 'neutral';
const sexLabel = sex => sex ? sex[0].toUpperCase() + sex.slice(1) : 'Not recorded';
const patientRoute = patient => `patients/${patient.id}`;
const patientEditRoute = patient => `patients/${patient.id}/edit`;

// Read-only registry composition over the frozen Phase 5 patient collection.
export const getPatientRegistryData = ({ state, search = '', status = 'all', sex = 'all', sort = 'registered-desc', page = 1, pageSize = 10 } = {}) => {
  const filtered = searchPatients(state, search).filter(patient => (status === 'all' || patient.status === status) && (sex === 'all' || patient.sex === sex));
  const sorted = [...filtered].sort((left, right) => {
    if (sort === 'number-asc') return left.patientNumber.localeCompare(right.patientNumber);
    if (sort === 'name-asc') return left.fullName.localeCompare(right.fullName);
    return right.registeredAt.localeCompare(left.registeredAt) || left.patientNumber.localeCompare(right.patientNumber);
  });
  const pagination = paginate(sorted, page, pageSize);
  return {
    ...pagination,
    totalPatients: state.patients.length,
    activePatients: state.patients.filter(patient => patient.status === 'active').length,
    guardianPatients: new Set(state.patientGuardians.map(guardian => guardian.patientId)).size,
    filteredCount: filtered.length
  };
};

const registryCard = ({ patient, role, referenceDate }) => {
  const canEdit = permissions.can(role, 'patients.edit');
  const age = getPatientAge(patient, referenceDate);
  const actions = [element('a', { className: 'button button--secondary button--small', href: `#/${patientRoute(patient)}`, text: 'View' })];
  if (canEdit) actions.push(element('a', { className: 'button button--ghost button--small', href: `#/${patientEditRoute(patient)}`, text: 'Edit' }));
  return createCard({
    title: patient.fullName,
    subtitle: patient.patientNumber,
    content: element('div', { className: 'patient-registry__card-details' }, [
      element('span', { text: `${sexLabel(patient.sex)} · ${age ?? '—'} years` }),
      element('span', { text: patient.phone || 'No phone number' }),
      createBadge({ label: patient.status === 'active' ? 'Active' : 'Inactive', variant: statusVariant(patient.status) }),
      element('div', { className: 'patient-registry__card-actions' }, actions)
    ])
  });
};

const rowActions = (patient, role) => {
  const actions = [{ label: 'View patient', icon: 'user', onClick: () => { location.hash = `#/${patientRoute(patient)}`; } }];
  if (permissions.can(role, 'patients.edit')) actions.push({ label: 'Edit patient', icon: 'user', onClick: () => { location.hash = `#/${patientEditRoute(patient)}`; } });
  return actions;
};

export const renderPatientRegistry = ({ state, role }) => {
  const page = element('div', { className: 'patient-registry' });
  const canCreate = permissions.can(role, 'patients.create');
  const viewState = { search: '', status: 'all', sex: 'all', sort: 'registered-desc', page: 1, pageSize: 10 };
  const searchControl = createSearch({ label: 'Search patients', placeholder: 'Search name, ID, or phone…', onInput: value => { viewState.search = value; viewState.page = 1; renderResults(); } });
  const statusField = createField({ label: 'Status', type: 'select', value: viewState.status, options: [{ value: 'all', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] });
  const sexField = createField({ label: 'Sex', type: 'select', value: viewState.sex, options: [{ value: 'all', label: 'All sexes' }, { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }] });
  const sortField = createField({ label: 'Sort by', type: 'select', value: viewState.sort, options: [{ value: 'registered-desc', label: 'Recently registered' }, { value: 'number-asc', label: 'Patient number' }, { value: 'name-asc', label: 'Name' }] });
  [statusField.control, sexField.control, sortField.control].forEach(control => control.addEventListener('change', event => { viewState[{ [statusField.control.id]: 'status', [sexField.control.id]: 'sex', [sortField.control.id]: 'sort' }[event.currentTarget.id]] = event.currentTarget.value; viewState.page = 1; renderResults(); }));
  const clearFilters = () => { viewState.search = ''; viewState.status = 'all'; viewState.sex = 'all'; viewState.sort = 'registered-desc'; viewState.page = 1; searchControl.querySelector('input').value = ''; statusField.control.value = 'all'; sexField.control.value = 'all'; sortField.control.value = 'registered-desc'; renderResults(); };
  const toolbar = createFilterBar({ children: [searchControl, statusField.element, sexField.element, sortField.element], onReset: clearFilters });
  const results = element('div', { className: 'patient-registry__results' });
  const renderResults = () => {
    const data = getPatientRegistryData({ state, ...viewState });
    viewState.page = data.page;
    results.replaceChildren();
    if (!data.totalPatients) {
      results.append(createEmptyState({ title: 'No patients yet', message: 'Patient records will appear here once they are registered.', action: canCreate ? { label: 'Add First Patient', onClick: () => { location.hash = '#/patients/new'; } } : null }));
      return;
    }
    if (!data.filteredCount) {
      results.append(createEmptyState({ title: 'No patients found', message: 'Try adjusting your search or filters.', action: { label: 'Clear Filters', variant: 'secondary', onClick: clearFilters } }));
      return;
    }
    const rows = data.items.map(patient => ({
      patient: patient.fullName,
      patientNumber: patient.patientNumber,
      sexAge: `${sexLabel(patient.sex)} · ${getPatientAge(patient, state.referenceDate) ?? '—'}`,
      phone: patient.phone || '—',
      registeredAt: formatDate(patient.registeredAt),
      status: { label: patient.status === 'active' ? 'Active' : 'Inactive', variant: statusVariant(patient.status) },
      actions: rowActions(patient, role),
      source: patient
    }));
    const table = createTable({
      stickyHeader: true,
      columns: [
        { label: 'Patient', key: 'patient' }, { label: 'Patient Number', key: 'patientNumber' }, { label: 'Sex / Age', key: 'sexAge' },
        { label: 'Phone', key: 'phone' }, { label: 'Registration Date', key: 'registeredAt' }, { label: 'Status', key: 'status', type: 'badge' }, { label: 'Actions', key: 'actions', type: 'actions' }
      ],
      rows
    });
    table.classList.add('patient-registry__table');
    const cards = element('div', { className: 'patient-registry__cards' }, data.items.map(patient => registryCard({ patient, role, referenceDate: state.referenceDate })));
    const start = (data.page - 1) * data.pageSize + 1, end = start + data.items.length - 1;
    results.append(table, cards, createPagination({ page: data.page, totalPages: data.totalPages, summary: `Showing ${start}–${end} of ${data.filteredCount} patient${data.filteredCount === 1 ? '' : 's'}`, onChange: nextPage => { viewState.page = nextPage; renderResults(); } }));
  };
  const actions = canCreate ? [{ label: 'Add Patient', onClick: () => { location.hash = '#/patients/new'; } }] : [];
  page.append(createPageHeader({ title: 'Patients', description: 'Manage patient records and quickly access patient information.', actions }));
  const summary = getPatientRegistryData({ state });
  page.append(element('section', { className: 'patient-registry__summary', 'aria-label': 'Patient registry summary' }, [
    createKpiCard({ label: 'Total Patients', value: String(summary.totalPatients), icon: 'user', context: 'All registered patient records' }),
    createKpiCard({ label: 'Active Patients', value: String(summary.activePatients), icon: 'user', context: 'Currently active records' }),
    createKpiCard({ label: 'Patients Requiring Guardian', value: String(summary.guardianPatients), icon: 'user', context: 'Minor patient records with a guardian' })
  ]));
  page.append(toolbar, results);
  renderResults();
  return page;
};

const registrationField = options => {
  const field = createField(options);
  const errorId = `${field.control.id}-error`;
  const setError = message => {
    let error = field.element.querySelector(`#${errorId}`);
    if (message) {
      if (!error) { error = element('p', { id: errorId, className: 'field__hint field__hint--error', role: 'alert' }); field.element.append(error); }
      error.textContent = message; field.element.classList.add('field--error'); field.control.setAttribute('aria-invalid', 'true'); field.control.setAttribute('aria-describedby', errorId);
    } else if (error) { error.remove(); field.element.classList.remove('field--error'); field.control.removeAttribute('aria-invalid'); field.control.removeAttribute('aria-describedby'); }
  };
  return { ...field, setError };
};

const duplicatePanel = (state, matches, { isEdit = false } = {}) => {
  const records = [...matches.exactMatches, ...matches.possibleMatches];
  if (!records.length) return null;
  const exact = matches.exactMatches.length > 0;
  return element('section', { className: 'patient-registration__duplicates' }, [
    createAlert({ title: exact ? 'Matching patient record found' : 'Possible duplicate patient', message: exact ? `This patient matches an existing name, date of birth, and phone number. ${isEdit ? 'Saving cannot continue.' : 'Registration cannot continue.'}` : `A similar patient record was found. Confirm this is not the same person before ${isEdit ? 'saving.' : 'registering.'}`, variant: exact ? 'warning' : 'info' }),
    element('div', { className: 'patient-registration__duplicate-list' }, records.map(patient => element('article', { className: 'patient-registration__duplicate' }, [
      element('strong', { text: patient.fullName }), element('span', { text: `${patient.patientNumber} · ${formatDate(patient.dateOfBirth)} · ${patient.phone || 'No phone number'}` }), element('a', { className: 'button button--ghost button--small', href: `#/${patientRoute(patient)}`, text: 'View Existing Patient' })
    ])))
  ]);
};

const renderPatientForm = ({ state, session, patient = null }) => {
  const role = session?.role, isEdit = Boolean(patient);
  const existingGuardian = patient ? state.patientGuardians.find(guardian => guardian.patientId === patient.id && guardian.isPrimary) || null : null;
  const page = element('div', { className: `patient-registration${isEdit ? ' patient-edit' : ''}` });
  const form = element('form', { className: 'patient-registration__form', novalidate: true });
  const formMessage = element('div', { className: 'patient-registration__message', 'aria-live': 'polite' });
  const firstName = registrationField({ id: 'patient-first-name', label: 'First Name', required: true, autocomplete: 'given-name', value: patient?.firstName || '' });
  const lastName = registrationField({ id: 'patient-last-name', label: 'Last Name', required: true, autocomplete: 'family-name', value: patient?.lastName || '' });
  const otherName = registrationField({ id: 'patient-other-name', label: 'Other / Middle Name', autocomplete: 'additional-name', value: patient?.otherName || '' });
  const dateOfBirth = registrationField({ id: 'patient-date-of-birth', label: 'Date of Birth', type: 'date', required: true, max: state.referenceDate, value: patient?.dateOfBirth || '' });
  const sex = registrationField({ id: 'patient-sex', label: 'Sex', type: 'select', required: true, value: patient?.sex || '', options: [{ value: '', label: 'Select sex' }, { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }] });
  const phone = registrationField({ id: 'patient-phone', label: 'Primary Phone', required: true, autocomplete: 'tel', inputMode: 'tel', placeholder: '0712345678 or +256712345678', value: patient?.phone || '' });
  const alternatePhone = registrationField({ id: 'patient-alternate-phone', label: 'Alternate Phone', autocomplete: 'tel', inputMode: 'tel', value: patient?.alternatePhone || '' });
  const email = registrationField({ id: 'patient-email', label: 'Email', type: 'email', autocomplete: 'email', value: patient?.email || '' });
  const occupation = registrationField({ id: 'patient-occupation', label: 'Occupation', autocomplete: 'organization-title', value: patient?.occupation || '' });
  const district = registrationField({ id: 'patient-district', label: 'District', value: patient?.district || '' });
  const address = registrationField({ id: 'patient-address', label: 'Address / Landmark', type: 'textarea', autocomplete: 'street-address', value: patient?.addressLandmark || '' });
  const guardianFullName = registrationField({ id: 'guardian-full-name', label: 'Guardian Full Name', required: true, autocomplete: 'name', value: existingGuardian?.fullName || '' });
  const guardianRelationship = registrationField({ id: 'guardian-relationship', label: 'Relationship', type: 'select', required: true, value: existingGuardian?.relationship || '', options: [{ value: '', label: 'Select relationship' }, { value: 'Mother', label: 'Mother' }, { value: 'Father', label: 'Father' }, { value: 'Guardian', label: 'Guardian' }, { value: 'Relative', label: 'Relative' }, { value: 'Other', label: 'Other' }] });
  const guardianPhone = registrationField({ id: 'guardian-phone', label: 'Guardian Phone', required: true, autocomplete: 'tel', inputMode: 'tel', value: existingGuardian?.phone || '' });
  const fields = { firstName, lastName, otherName, dateOfBirth, sex, phone, alternatePhone, email, occupation, district, address, guardianFullName, guardianRelationship, guardianPhone };
  const personalSection = element('section', { className: 'patient-registration__section' }, [element('header', {}, [element('h2', { text: 'Personal Information' }), element('p', { text: 'Capture the patient’s core demographic information.' })]), element('div', { className: 'patient-registration__grid' }, [firstName.element, lastName.element, otherName.element, dateOfBirth.element, sex.element])]);
  const contactSection = element('section', { className: 'patient-registration__section' }, [element('header', {}, [element('h2', { text: 'Contact Information' }), element('p', { text: 'Use a practical contact method for follow-up and administration.' })]), element('div', { className: 'patient-registration__grid' }, [phone.element, alternatePhone.element, email.element, occupation.element, district.element]), address.element]);
  const guardianSection = element('section', { className: 'patient-registration__section patient-registration__section--guardian', hidden: true }, [element('header', {}, [element('h2', { text: 'Guardian Information' }), element('p', { text: 'A primary guardian is required for patients under 18 years old.' })]), element('div', { className: 'patient-registration__grid' }, [guardianFullName.element, guardianRelationship.element, guardianPhone.element])]);
  const duplicateContainer = element('div', { className: 'patient-registration__duplicate-container' });
  const readValues = () => Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.control.value]));
  const initialValues = JSON.stringify(readValues());
  let minorWasShown = false;
  const updateMinorState = () => {
    const result = validatePatientRegistration({ state, values: readValues() });
    guardianSection.hidden = !result.isMinor;
    [guardianFullName.control, guardianRelationship.control, guardianPhone.control].forEach(control => { control.required = result.isMinor; });
    if (!result.isMinor && minorWasShown && !isEdit) { guardianFullName.control.value = ''; guardianRelationship.control.value = ''; guardianPhone.control.value = ''; [guardianFullName, guardianRelationship, guardianPhone].forEach(field => field.setError('')); }
    minorWasShown = result.isMinor;
    return result;
  };
  const refreshDuplicates = () => {
    const values = readValues();
    duplicateContainer.replaceChildren();
    if (!values.firstName.trim() || !values.lastName.trim() || !values.dateOfBirth || !values.phone.trim()) return { exactMatches: [], possibleMatches: [] };
    const matches = findPotentialDuplicatePatients(state, values, { excludePatientId: patient?.id });
    const panel = duplicatePanel(state, matches, { isEdit }); if (panel) duplicateContainer.append(panel);
    return matches;
  };
  const markDirty = event => { dirtyState.setUnsavedChanges(JSON.stringify(readValues()) !== initialValues); fields[{ [firstName.control.id]: 'firstName', [lastName.control.id]: 'lastName', [otherName.control.id]: 'otherName', [dateOfBirth.control.id]: 'dateOfBirth', [sex.control.id]: 'sex', [phone.control.id]: 'phone', [alternatePhone.control.id]: 'alternatePhone', [email.control.id]: 'email', [occupation.control.id]: 'occupation', [district.control.id]: 'district', [address.control.id]: 'address', [guardianFullName.control.id]: 'guardianFullName', [guardianRelationship.control.id]: 'guardianRelationship', [guardianPhone.control.id]: 'guardianPhone' }[event.currentTarget.id]]?.setError(''); if (event.currentTarget === dateOfBirth.control) updateMinorState(); refreshDuplicates(); };
  Object.values(fields).forEach(field => field.control.addEventListener(field.control.tagName === 'SELECT' ? 'change' : 'input', markDirty));
  const cleanUpNavigationGuard = () => { document.removeEventListener('click', guardNavigation, true); window.removeEventListener('beforeunload', guardUnload); };
  const leavePatientForm = async target => { if (dirtyState.hasUnsavedChanges() && !await confirm({ title: 'Unsaved patient information', message: 'You have unsaved patient information. Leaving now will discard your changes.', confirmLabel: isEdit ? 'Leave Edit' : 'Leave Registration', variant: 'danger' })) return; dirtyState.clear(); cleanUpNavigationGuard(); location.hash = `#/${target}`; };
  const guardNavigation = async event => { const link = event.target.closest('a[href^="#/"]'); const target = link?.getAttribute('href')?.replace(/^#\//, ''); if (!target || target === (isEdit ? patientEditRoute(patient) : 'patients/new') || !dirtyState.hasUnsavedChanges()) return; event.preventDefault(); event.stopImmediatePropagation(); await leavePatientForm(target); };
  const guardUnload = event => { if (!dirtyState.hasUnsavedChanges()) return; event.preventDefault(); event.returnValue = ''; };
  document.addEventListener('click', guardNavigation, true); window.addEventListener('beforeunload', guardUnload);
  form.addEventListener('submit', event => {
    event.preventDefault(); formMessage.replaceChildren(); const values = readValues(); const validation = updateMinorState(); Object.entries(fields).forEach(([name, field]) => field.setError(validation.errors[name] || ''));
    if (Object.keys(validation.errors).length) { formMessage.append(createAlert({ title: 'Review the highlighted fields', message: `Complete the required patient information before ${isEdit ? 'saving.' : 'registering.'}`, variant: 'danger' })); return; }
    const matches = refreshDuplicates();
    if (matches.exactMatches.length) { formMessage.append(createAlert({ title: 'Duplicate registration blocked', message: 'A matching patient record already exists.', variant: 'warning' })); return; }
    if (isEdit && !dirtyState.hasUnsavedChanges()) { showToast({ title: 'No changes to save.', message: patient.patientNumber, variant: 'info' }); return; }
    const actor = { userId: session?.userId, role: session?.role };
    const registration = isEdit ? applicationState.updatePatient({ patientId: patient.id, values, actor }) : applicationState.addPatient({ values, actor });
    dirtyState.clear(); cleanUpNavigationGuard(); showToast({ title: isEdit ? 'Patient updated successfully.' : 'Patient registered successfully.', message: registration.patient.patientNumber, variant: 'success' }); location.hash = '#/patients';
  });
  const cancel = createButton({ label: 'Cancel', variant: 'secondary', onClick: () => leavePatientForm('patients') });
  const submit = createButton({ label: isEdit ? 'Save Changes' : 'Register Patient', variant: 'primary', type: 'submit' });
  form.append(personalSection, contactSection, guardianSection, duplicateContainer, formMessage, element('footer', { className: 'patient-registration__actions' }, [cancel, submit]));
  const identity = isEdit ? element('section', { className: 'patient-edit__identity', 'aria-label': 'Patient identity' }, [element('span', { text: 'Patient Number' }), element('strong', { text: patient.patientNumber })]) : null;
  const statusManagement = isEdit && permissions.can(role, 'patients.status') ? element('section', { className: 'patient-edit__status', 'aria-label': 'Patient status management' }) : null;
  if (statusManagement) {
    const renderStatusManagement = () => {
      const isActive = patient.status === 'active';
      const actionLabel = isActive ? 'Deactivate Patient' : 'Reactivate Patient';
      statusManagement.replaceChildren(element('div', {}, [element('h2', { text: 'Patient Status' }), element('p', { text: 'Inactive patients remain retained for historical continuity.' })]), createBadge({ label: isActive ? 'Active' : 'Inactive', variant: statusVariant(patient.status) }), createButton({ label: actionLabel, variant: isActive ? 'danger' : 'primary', onClick: async () => {
        if (dirtyState.hasUnsavedChanges()) { showToast({ title: 'Save or discard changes first.', message: 'Patient status cannot change while this form has unsaved edits.', variant: 'warning' }); return; }
        const nextStatus = isActive ? 'inactive' : 'active';
        const confirmed = await confirm({ title: actionLabel, message: isActive ? 'This patient will remain in the system but will be marked inactive.' : 'This patient will be restored as an active patient record.', confirmLabel: actionLabel, variant: isActive ? 'danger' : 'default' });
        if (!confirmed) return;
        const updated = applicationState.setPatientStatus({ patientId: patient.id, status: nextStatus, actor: { userId: session?.userId, role: session?.role } });
        patient.status = updated.status; renderStatusManagement(); showToast({ title: isActive ? 'Patient deactivated.' : 'Patient reactivated.', message: patient.patientNumber, variant: 'success' });
      }}));
    };
    renderStatusManagement();
  }
  page.append(...[createPageHeader({ title: isEdit ? 'Edit Patient' : 'Register Patient', description: isEdit ? 'Update patient demographic and contact information.' : 'Create a new patient record for Pearl Smile Dental Clinic.', actions: [{ label: 'Back to Patients', variant: 'secondary', onClick: () => leavePatientForm('patients') }] }), identity, statusManagement, form].filter(Boolean));
  return page;
};

export const renderPatientRegistration = options => renderPatientForm(options);

export const renderPatientEdit = ({ state, session, patientId }) => {
  const patient = state.patients.find(candidate => candidate.id === patientId);
  if (!patient) return createEmptyState({ title: 'Patient Not Found', message: 'The requested patient record could not be found.', action: { label: 'Return to Patients', onClick: () => { location.hash = '#/patients'; } } });
  return renderPatientForm({ state, session, patient });
};

export const renderPatientPlaceholder = route => {
  const isEdit = route.endsWith('/edit');
  return createEmptyState({
    title: isEdit ? 'Edit Patient' : 'Patient Profile',
    message: isEdit ? 'Patient editing will be implemented in Phase 7C.' : 'Patient profile details will be implemented in Phase 8.',
    action: { label: 'Return to Patients', onClick: () => { location.hash = '#/patients'; } }
  });
};
