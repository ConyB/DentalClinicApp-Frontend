import { clear, element } from '../components/dom.js';
import { createBadge, createBreadcrumb, createButton, createCard, createEmptyState, createField, createFilterBar, createKpiCard, createPageHeader, createPatientContext, createSearch } from '../components/primitives.js';
import { createPagination, createTable } from '../components/data-display.js';
import { createPrintDocument, createPrintSection, createPrintTable, printCurrentDocument } from '../components/print-documents.js';
import { confirm, openModal, showToast } from '../components/overlays.js';
import { dirtyState } from '../core/dirty-state.js';
import { state as appState } from '../core/state.js';
import { getPatientAge } from '../data/patients.js';
import { getDentalChartEntrySurfaces, getDentalChartForPatient, getProceduresForPatient, getTreatmentPlanById, getTreatmentPlanItems, getTreatmentPlanRegister, getTreatmentPlansForPatient } from '../data/clinical.js';
import { calculateTreatmentPlanAcceptedTotal, calculateTreatmentPlanCompletedValue, calculateTreatmentPlanProposedTotal } from '../data/clinical.js';
import { getTreatmentPlanPermissions } from '../data/treatment-plan-workflows.js';
import { getClinicalVisitContext } from '../data/clinical-workflows.js';
import { formatDate, formatStatus, formatUGX } from '../utils/formatters.js';

const DIRTY_SOURCE = 'treatment-plan';
const PROCEDURE_DIRTY_SOURCE = 'procedure-recording';
const REGISTER_PAGE_SIZE = 8;
const PLAN_STATUSES = ['DRAFT', 'PROPOSED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const statusVariant = status => ({ DRAFT: 'neutral', PROPOSED: 'info', ACCEPTED: 'success', PARTIALLY_ACCEPTED: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success', DECLINED: 'danger', CANCELLED: 'neutral' }[status] || 'neutral');
const itemSurfaces = (state, item) => state.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === item.id).map(surface => surface.surfaceCode).join('') || 'Whole treatment area';
const dentistName = (state, id) => state.users.find(user => user.id === id)?.fullName || 'Not recorded';
const serviceName = (state, item) => state.services.find(service => service.id === item.serviceId)?.name || item.serviceCode;
const procedureForItem = (state, item) => state.proceduresPerformed.find(procedure => procedure.treatmentPlanItemId === item.id && procedure.status === 'COMPLETED') || null;

const moneySummary = (state, plan) => element('dl', { className: 'treatment-plan__totals', 'aria-label': 'Treatment plan totals' }, [
  ['Proposed', calculateTreatmentPlanProposedTotal(state, plan.id)], ['Accepted', calculateTreatmentPlanAcceptedTotal(state, plan.id)], ['Completed', calculateTreatmentPlanCompletedValue(state, plan.id)]
].map(([label, amount]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: formatUGX(amount) })])));

const treatmentPlanPrintDocument = (state, plan, patient) => {
  const items = getTreatmentPlanItems(state, plan.id);
  return createPrintDocument({
    state,
    kind: 'treatment-plan',
    title: 'Treatment Plan',
    reference: plan.treatmentPlanNumber,
    subtitle: `Created ${formatDate(plan.createdAt)}`,
    context: [
      ['Patient', patient.fullName],
      ['Patient ID', patient.patientNumber],
      ['Dentist', dentistName(state, plan.dentistUserId)],
      ['Plan Status', formatStatus(plan.status)]
    ],
    metrics: [
      ['Proposed', formatUGX(calculateTreatmentPlanProposedTotal(state, plan.id))],
      ['Accepted', formatUGX(calculateTreatmentPlanAcceptedTotal(state, plan.id))],
      ['Completed', formatUGX(calculateTreatmentPlanCompletedValue(state, plan.id))]
    ],
    sections: [
      createPrintSection({
        title: 'Treatment Items',
        subtitle: 'Acceptance and clinical progress are recorded independently.',
        content: createPrintTable({
          columns: [{ label: 'Treatment', key: 'treatment' }, { label: 'Tooth / Surfaces', key: 'site' }, { label: 'Acceptance', key: 'acceptance' }, { label: 'Progress', key: 'progress' }, { label: 'Amount', key: 'amount', numeric: true }],
          rows: items.map(item => ({ treatment: serviceName(state, item), site: item.toothCode ? `Tooth ${item.toothCode} - ${itemSurfaces(state, item)}` : 'General treatment', acceptance: formatStatus(item.acceptanceStatus), progress: formatStatus(item.progressStatus), amount: formatUGX(item.lineTotal) })),
          emptyMessage: 'No treatment items recorded.'
        })
      }),
      plan.notes ? createPrintSection({ title: 'Plan Note', content: element('p', { text: plan.notes }) }) : null
    ].filter(Boolean),
    note: 'This document records the current treatment plan and item-level decisions; it is not proof of completed care or payment.'
  });
};

const setFieldError = (field, message = '') => {
  field.element.classList.toggle('field--error', Boolean(message)); field.control.setAttribute('aria-invalid', String(Boolean(message)));
  const hint = field.element.querySelector('.field__hint'); if (hint) { hint.textContent = message || hint.dataset.helper || ''; hint.classList.toggle('field__hint--error', Boolean(message)); hint.toggleAttribute('role', Boolean(message)); }
};

export const renderTreatmentPlanRegister = ({ state, session } = {}) => {
  if (!['Clinic Administrator', 'Dentist'].includes(session?.role)) return element('section', { className: 'treatment-plan-register-access-guard', 'aria-hidden': 'true' });
  let pageNumber = 1;
  const filters = { search: '', status: '', dentistId: '', sort: 'newest' };
  const plans = getTreatmentPlanRegister(state, session);
  const page = element('section', { className: 'treatment-plan-register' });
  const results = element('div', { className: 'treatment-plan-register__results', 'aria-live': 'polite' });
  const search = createSearch({ label: 'Search treatment plans by patient name, patient number, or treatment plan ID', placeholder: 'Search patient or treatment plan…', onInput: value => { filters.search = value; pageNumber = 1; renderResults(); } });
  const searchInput = search.querySelector('input'), clearSearch = search.querySelector('[aria-label="Clear search"]');
  const status = createField({ id: 'treatment-plan-status-filter', label: 'Status', type: 'select', options: [{ value: '', label: 'All statuses' }, ...PLAN_STATUSES.map(value => ({ value, label: formatStatus(value) }))] });
  const planDentists = [...new Set(plans.map(plan => plan.dentistUserId))].map(id => state.users.find(user => user.id === id)).filter(Boolean).sort((left, right) => left.fullName.localeCompare(right.fullName));
  const dentist = createField({ id: 'treatment-plan-dentist-filter', label: 'Dentist', type: 'select', options: [{ value: '', label: 'All Dentists' }, ...planDentists.map(user => ({ value: user.id, label: user.fullName }))] });
  const sort = createField({ id: 'treatment-plan-sort', label: 'Sort by', type: 'select', options: [{ value: 'newest', label: 'Newest plan' }, { value: 'oldest', label: 'Oldest plan' }, { value: 'patient', label: 'Patient A–Z' }, { value: 'value', label: 'Highest proposed value' }] });
  const reset = () => {
    filters.search = ''; filters.status = ''; filters.dentistId = ''; filters.sort = 'newest'; pageNumber = 1;
    searchInput.value = ''; clearSearch.hidden = true; status.control.value = ''; dentist.control.value = ''; sort.control.value = 'newest'; renderResults();
  };
  status.control.addEventListener('change', () => { filters.status = status.control.value; pageNumber = 1; renderResults(); });
  dentist.control.addEventListener('change', () => { filters.dentistId = dentist.control.value; pageNumber = 1; renderResults(); });
  sort.control.addEventListener('change', () => { filters.sort = sort.control.value; pageNumber = 1; renderResults(); });
  const metric = (label, statusCode, icon, context) => createKpiCard({ label, value: String(statusCode ? plans.filter(plan => plan.status === statusCode).length : plans.length), icon, context });
  const metrics = element('div', { className: 'treatment-plan-register__metrics', 'aria-label': 'Treatment plan summary' }, [
    metric('Total Plans', null, 'clinical', 'Read-only clinic register'),
    metric('Proposed', 'PROPOSED', 'file-text', 'Awaiting a treatment decision'),
    metric('Accepted', 'ACCEPTED', 'check', 'Accepted care not automatically completed'),
    metric('Partially Accepted', 'PARTIALLY_ACCEPTED', 'reports', 'Items progress independently')
  ]);
  const list = element('div', { className: 'treatment-plan-register__list' }, [createFilterBar({ children: [search, status.element, dentist.element, sort.element], onReset: reset }), results]);
  const card = createCard({ title: 'Treatment Plan Register', subtitle: 'Existing plans are shown read-only. Open a plan to continue in its patient clinical context.', content: list });
  const subtitle = card.querySelector('.card__subtitle');

  const renderResults = () => {
    const query = filters.search.trim().toLowerCase();
    const visible = plans.filter(plan => {
      const patient = state.patients.find(item => item.id === plan.patientId);
      return (!filters.status || plan.status === filters.status) && (!filters.dentistId || plan.dentistUserId === filters.dentistId) && (!query || [plan.id, plan.treatmentPlanNumber, patient?.fullName, patient?.patientNumber].some(value => String(value || '').toLowerCase().includes(query)));
    });
    if (filters.sort === 'oldest') visible.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.treatmentPlanNumber.localeCompare(right.treatmentPlanNumber));
    if (filters.sort === 'patient') visible.sort((left, right) => (state.patients.find(patient => patient.id === left.patientId)?.fullName || '').localeCompare(state.patients.find(patient => patient.id === right.patientId)?.fullName || ''));
    if (filters.sort === 'value') visible.sort((left, right) => calculateTreatmentPlanProposedTotal(state, right.id) - calculateTreatmentPlanProposedTotal(state, left.id) || right.createdAt.localeCompare(left.createdAt));
    const totalPages = Math.max(1, Math.ceil(visible.length / REGISTER_PAGE_SIZE)); pageNumber = Math.min(pageNumber, totalPages);
    const displayed = visible.slice((pageNumber - 1) * REGISTER_PAGE_SIZE, pageNumber * REGISTER_PAGE_SIZE);
    const records = displayed.map(plan => {
      const patient = state.patients.find(item => item.id === plan.patientId), items = getTreatmentPlanItems(state, plan.id);
      const row = { plan: plan.treatmentPlanNumber, patient: patient ? `${patient.fullName} · ${patient.patientNumber}` : 'Unknown patient', date: formatDate(plan.createdAt), dentist: dentistName(state, plan.dentistUserId), items: String(items.length), proposed: formatUGX(calculateTreatmentPlanProposedTotal(state, plan.id)), accepted: formatUGX(calculateTreatmentPlanAcceptedTotal(state, plan.id)), completed: formatUGX(calculateTreatmentPlanCompletedValue(state, plan.id)), status: { label: formatStatus(plan.status), variant: statusVariant(plan.status) }, actions: [{ label: 'View Plan', icon: 'file-text', onClick: () => { location.hash = `#/treatment-plans/${plan.id}`; } }, ...(patient ? [{ label: 'Open Patient', icon: 'user', onClick: () => { location.hash = `#/patients/${patient.id}`; } }] : [])] };
      return { plan, patient, row };
    });
    const columns = [{ label: 'Plan ID', key: 'plan' }, { label: 'Patient', key: 'patient' }, { label: 'Date', key: 'date' }, { label: 'Dentist', key: 'dentist' }, { label: 'Items', key: 'items', numeric: true }, { label: 'Proposed', key: 'proposed', numeric: true }, { label: 'Accepted', key: 'accepted', numeric: true }, { label: 'Completed', key: 'completed', numeric: true }, { label: 'Status', key: 'status', type: 'badge' }, { label: 'Actions', key: 'actions', type: 'actions' }];
    const table = element('div', { className: 'treatment-plan-register__table' }, [createTable({ stickyHeader: true, columns, rows: records.map(record => record.row), empty: { title: plans.length ? 'No matching treatment plans' : 'No treatment plans available', message: plans.length ? 'Try another search or filter.' : 'Plans will appear after a Dentist creates them in patient context.' } })]);
    const cards = element('div', { className: 'treatment-plan-register__cards' }, records.length ? records.map(({ plan, patient, row }) => element('article', { className: 'treatment-plan-register__card' }, [element('header', {}, [element('div', {}, [element('strong', { text: row.plan }), element('span', { text: row.date })]), createBadge(row.status)]), element('p', { className: 'treatment-plan-register__patient', text: row.patient }), element('dl', {}, [['Dentist', row.dentist], ['Items', row.items], ['Proposed', row.proposed], ['Accepted', row.accepted], ['Completed', row.completed]].map(([label, value]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: value })]))), element('div', { className: 'treatment-plan-register__card-actions' }, [createButton({ label: 'View Plan', size: 'small', onClick: () => { location.hash = `#/treatment-plans/${plan.id}`; } }), patient ? createButton({ label: 'Open Patient', variant: 'secondary', size: 'small', onClick: () => { location.hash = `#/patients/${patient.id}`; } }) : null])])) : [createEmptyState({ title: plans.length ? 'No matching treatment plans' : 'No treatment plans available', message: plans.length ? 'Try another search or filter.' : 'Plans will appear after a Dentist creates them in patient context.' })]);
    subtitle.textContent = `${visible.length} plan${visible.length === 1 ? '' : 's'} shown. Existing clinical mutation remains in patient context.`;
    results.replaceChildren(table, cards, createPagination({ page: pageNumber, totalPages, summary: `Showing ${visible.length ? (pageNumber - 1) * REGISTER_PAGE_SIZE + 1 : 0}–${Math.min(pageNumber * REGISTER_PAGE_SIZE, visible.length)} of ${visible.length}`, onChange: value => { pageNumber = value; renderResults(); } }));
  };

  page.append(createPageHeader({ title: 'Treatment Plans', description: 'Review existing plans, acceptance decisions, and clinical fulfilment without leaving the approved treatment workflow.', breadcrumb: createBreadcrumb({ items: [{ label: 'Clinical Overview', href: '#/clinical/encounters' }, { label: 'Treatment Plans' }] }), actions: [{ label: session.role === 'Dentist' ? 'Create Treatment Plan' : 'Open Patients', variant: session.role === 'Dentist' ? 'primary' : 'secondary', onClick: () => { location.hash = '#/patients'; } }] }), metrics, card);
  renderResults();
  return page;
};

// Retained for the frozen Phase 13 import contract; the global route now uses the register above.
export const renderTreatmentPlanLanding = renderTreatmentPlanRegister;

export const renderTreatmentPlanWorkspace = ({ state: initialState, session, patientId = null, planId = null }) => {
  const requestedPlan = planId ? getTreatmentPlanById(initialState, planId) : null;
  if (planId && !requestedPlan) return createEmptyState({ title: 'Treatment Plan Not Found', message: 'The requested treatment plan record could not be found.', action: { label: 'Back to Treatment Plans', onClick: () => { location.hash = '#/treatment-plans'; } } });
  if (requestedPlan && patientId && requestedPlan.patientId !== patientId) return createEmptyState({ title: 'Treatment Plan Relationship Unavailable', message: 'The treatment plan does not belong to the requested patient.', action: { label: 'Back to Treatment Plans', onClick: () => { location.hash = '#/treatment-plans'; } } });
  patientId = requestedPlan?.patientId || patientId;
  let currentState = initialState, selectedPlanId = requestedPlan?.id || getTreatmentPlansForPatient(initialState, patientId).at(-1)?.id || null, activeModal = null;
  const patient = currentState.patients.find(item => item.id === patientId);
  if (!patient) return createEmptyState({ title: 'Patient Not Found', message: 'The requested patient record could not be found.', action: { label: 'Back to Patients', onClick: () => { location.hash = '#/patients'; } } });
  const page = element('section', { className: 'treatment-plan' }), region = element('div', { className: 'treatment-plan__region' });
  const can = () => getTreatmentPlanPermissions({ state: currentState, patientId, actor: session });
  const cleanup = () => { document.removeEventListener('click', guardNavigation, true); window.removeEventListener('beforeunload', guardUnload); window.removeEventListener('hashchange', cleanup); };
  const discard = async () => { if (!dirtyState.isDirty(DIRTY_SOURCE)) return true; const choice = await confirm({ title: 'Discard treatment plan changes?', message: 'Your unsaved treatment planning changes will be lost.', confirmLabel: 'Discard Changes', variant: 'danger' }); if (choice) dirtyState.clearUnsavedChanges(DIRTY_SOURCE); return choice; };
  const anyDirty = () => dirtyState.isDirty(DIRTY_SOURCE) || dirtyState.isDirty(PROCEDURE_DIRTY_SOURCE);
  const navigate = async target => { if (activeModal && !await activeModal.requestClose()) return; if (!activeModal && !await discard()) return; cleanup(); location.hash = `#/${target}`; };
  const guardNavigation = async event => { const link = event.target.closest('a[href^="#/"]'), target = link?.getAttribute('href')?.replace(/^#\//, ''); if (!target) return; if (!anyDirty()) { cleanup(); return; } event.preventDefault(); event.stopImmediatePropagation(); if (activeModal && !await activeModal.requestClose()) return; if (!await discard()) return; cleanup(); location.hash = `#/${target}`; };
  const guardUnload = event => { if (!anyDirty()) return; event.preventDefault(); event.returnValue = ''; };

  const closeAfterSave = (message, detail) => { dirtyState.clearUnsavedChanges(DIRTY_SOURCE); activeModal?.close(); activeModal = null; currentState = appState.get(); render(); showToast({ title: message, message: detail, variant: 'success' }); };
  const openCreatePlan = () => {
    const notes = createField({ id: 'treatment-plan-notes', label: 'Plan Note', type: 'textarea', helper: 'Optional clinical planning context. Detailed clinical notes remain in the Encounter.' });
    const baseline = notes.control.value, save = () => { try { const result = appState.createTreatmentPlan({ patientId, notes: notes.control.value, actor: session }); selectedPlanId = result.plan.id; closeAfterSave('Treatment plan created.', result.plan.treatmentPlanNumber); } catch (error) { setFieldError(notes, error.message); dirtyState.markUnsavedChanges(DIRTY_SOURCE); } };
    notes.control.addEventListener('input', () => dirtyState.setUnsavedChanges(notes.control.value !== baseline, DIRTY_SOURCE));
    activeModal = openModal({ title: 'Create Treatment Plan', content: element('form', { className: 'treatment-plan-form', onsubmit: event => { event.preventDefault(); save(); } }, [notes.element]), footer: element('div', { className: 'button-group treatment-plan-form__actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: () => activeModal?.requestClose() }), createButton({ label: 'Create Plan', onClick: save })]), onRequestClose: discard, onClose: () => { activeModal = null; } });
    dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
  };
  const openItemForm = (plan, item = null) => {
    const service = createField({ id: 'treatment-item-service', label: 'Service', type: 'select', required: true, options: [{ value: '', label: 'Select a service' }, ...currentState.services.filter(item => item.status === 'active').map(item => ({ value: item.id, label: `${item.code} — ${item.name} (${formatUGX(item.defaultPrice)})` }))] });
    const tooth = createField({ id: 'treatment-item-tooth', label: 'FDI Tooth', type: 'select', options: [{ value: '', label: 'Not applicable' }, ...currentState.toothDefinitions.map(item => ({ value: item.code, label: `${item.code} — ${item.dentition === 'primary' ? 'Primary' : 'Permanent'} ${item.name}` }))] });
    const notes = createField({ id: 'treatment-item-notes', label: 'Item Note', type: 'textarea', helper: 'Optional treatment-planning note.' });
    service.control.value = item?.serviceId || ''; tooth.control.value = item?.toothCode || ''; notes.control.value = item?.notes || '';
    const surfaceHelp = element('p', { className: 'field__hint', text: 'Choose a service and tooth to see surface requirements.' }), surfaceOptions = element('div', { className: 'treatment-plan-form__surfaces' });
    const surfaceField = element('fieldset', { className: 'treatment-plan-form__surface-field' }, [element('legend', { className: 'field__label', text: 'Tooth Surfaces' }), surfaceOptions, surfaceHelp]);
    const amount = element('p', { className: 'treatment-plan-form__amount', role: 'status', text: 'Price will be taken from the selected service catalogue.' });
    let selectedSurfaces = new Set(item ? currentState.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === item.id).map(surface => surface.surfaceCode) : []), saving = false;
    const values = () => ({ serviceId: service.control.value, toothCode: tooth.control.value || null, surfaces: [...selectedSurfaces], notes: notes.control.value }); const baseline = JSON.stringify(values());
    const markDirty = () => dirtyState.setUnsavedChanges(JSON.stringify(values()) !== baseline, DIRTY_SOURCE);
    const renderSurfaces = () => {
      const chosenService = currentState.services.find(item => item.id === service.control.value), chosenTooth = currentState.toothDefinitions.find(item => item.code === tooth.control.value);
      tooth.control.disabled = Boolean(chosenService && !chosenService.requiresTooth);
      if (tooth.control.disabled) tooth.control.value = '';
      if (!chosenService?.supportsSurfaces || !chosenTooth) selectedSurfaces = new Set(); clear(surfaceOptions);
      if (chosenService?.supportsSurfaces && chosenTooth) currentState.toothSurfaceDefinitions[chosenTooth.isPosterior ? 'posterior' : 'anterior'].forEach(surface => {
        const input = element('input', { type: 'checkbox', value: surface.code, checked: selectedSurfaces.has(surface.code), 'aria-label': `${surface.name} surface` }); input.addEventListener('change', () => { input.checked ? selectedSurfaces.add(surface.code) : selectedSurfaces.delete(surface.code); markDirty(); }); surfaceOptions.append(element('label', { className: 'treatment-plan-form__surface-option' }, [input, element('strong', { text: surface.code }), element('small', { text: surface.name })]));
      });
      const requirement = chosenService?.surfaceRequirement; surfaceHelp.textContent = !chosenService ? 'Choose a service and tooth to see surface requirements.' : !chosenService.requiresTooth ? 'This general service does not use a tooth or surfaces.' : requirement === 'single' ? 'Select exactly one applicable tooth surface.' : requirement === 'multiple' ? 'Select at least two applicable tooth surfaces.' : 'This treatment applies to the whole selected tooth.';
      amount.textContent = chosenService ? `Catalogue price: ${formatUGX(chosenService.defaultPrice)}${chosenService.requiresTooth ? '' : ' · General service'}` : 'Price will be taken from the selected service catalogue.';
    };
    [service.control, tooth.control].forEach(control => control.addEventListener('change', () => { renderSurfaces(); markDirty(); })); notes.control.addEventListener('input', markDirty); renderSurfaces();
    const save = () => { if (saving) return; saving = true; saveButton.disabled = true; try { const result = item ? appState.updateTreatmentPlanItem({ itemId: item.id, ...values(), actor: session }) : appState.addTreatmentPlanItem({ planId: plan.id, ...values(), actor: session }); closeAfterSave(item ? 'Treatment item updated.' : 'Treatment added to plan.', result.item.id); } catch (error) { const errors = error.fieldErrors || {}; setFieldError(service, errors.serviceId); setFieldError(tooth, errors.toothCode); surfaceField.classList.toggle('field--error', Boolean(errors.surfaces)); surfaceHelp.textContent = errors.surfaces || surfaceHelp.textContent; dirtyState.markUnsavedChanges(DIRTY_SOURCE); saving = false; saveButton.disabled = false; (errors.serviceId ? service.control : errors.toothCode ? tooth.control : surfaceOptions.querySelector('input') || service.control).focus(); } };
    const saveButton = createButton({ label: item ? 'Save Treatment Changes' : 'Add Treatment', onClick: save });
    activeModal = openModal({ title: `Add Treatment — ${plan.treatmentPlanNumber}`, content: element('form', { className: 'treatment-plan-form', onsubmit: event => { event.preventDefault(); save(); } }, [service.element, tooth.element, surfaceField, amount, notes.element]), footer: element('div', { className: 'button-group treatment-plan-form__actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: () => activeModal?.requestClose() }), saveButton]), onRequestClose: discard, onClose: () => { activeModal = null; } }); dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
  };
  const decide = async (item, decision) => { if (!await confirm({ title: `${decision === 'ACCEPTED' ? 'Accept' : 'Decline'} treatment?`, message: 'This records the patient’s treatment decision and preserves the item in plan history.', confirmLabel: decision === 'ACCEPTED' ? 'Accept Treatment' : 'Decline Treatment', variant: decision === 'DECLINED' ? 'danger' : 'default' })) return; try { appState.decideTreatmentPlanItem({ itemId: item.id, decision, actor: session }); currentState = appState.get(); render(); showToast({ title: decision === 'ACCEPTED' ? 'Treatment accepted.' : 'Treatment declined.', message: item.id, variant: 'success' }); } catch (error) { showToast({ title: 'Unable to update treatment decision.', message: error.message, variant: 'error' }); } };
  const openAddItem = plan => openItemForm(plan);
  const openProcedureForm = (plan, item) => {
    const service = currentState.services.find(candidate => candidate.id === item.serviceId);
    const visit = getClinicalVisitContext(currentState, patientId);
    const encounter = plan.encounterId ? currentState.clinicalEncounters.find(candidate => candidate.id === plan.encounterId) : visit.encounter;
    const surfaces = currentState.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === item.id).map(surface => surface.surfaceCode);
    const notes = createField({ id: 'procedure-notes', label: 'Procedure Note', type: 'textarea', helper: 'Optional concise completion note. Clinical encounter documentation remains separate.' });
    const context = element('dl', { className: 'treatment-plan__procedure-context', 'aria-label': 'Procedure context' }, [
      ['Patient', `${patient.fullName} (${patient.patientNumber})`], ['Service', service ? `${service.code} — ${service.name}` : item.serviceCode], ['Treatment plan', plan.treatmentPlanNumber], ['Tooth', item.toothCode || 'General procedure'], ['Surfaces', surfaces.join(', ') || 'Not applicable'], ['Dentist', dentistName(currentState, session.userId)], ['Encounter', encounter?.encounterNumber || 'No encounter linked']
    ].map(([label, value]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: value })])));
    const baseline = notes.control.value;
    const discardProcedure = async () => { if (!dirtyState.isDirty(PROCEDURE_DIRTY_SOURCE)) return true; const choice = await confirm({ title: 'Discard procedure note?', message: 'The procedure has not been recorded. Your unsaved note will be lost.', confirmLabel: 'Discard Note', variant: 'danger' }); if (choice) dirtyState.clearUnsavedChanges(PROCEDURE_DIRTY_SOURCE); return choice; };
    notes.control.addEventListener('input', () => dirtyState.setUnsavedChanges(notes.control.value !== baseline, PROCEDURE_DIRTY_SOURCE));
    let saving = false;
    const save = () => { if (saving) return; saving = true; saveButton.disabled = true; try { const result = appState.recordProcedure({ patientId, serviceId: item.serviceId, treatmentPlanItemId: item.id, encounterId: encounter?.id || null, toothCode: item.toothCode, surfaces, notes: notes.control.value, actor: session }); dirtyState.clearUnsavedChanges(PROCEDURE_DIRTY_SOURCE); activeModal?.close(); activeModal = null; currentState = appState.get(); render(); showToast({ title: 'Procedure recorded.', message: `${result.procedure.procedureNumber} completed and linked to the treatment plan.`, variant: 'success' }); } catch (error) { setFieldError(notes, error.message); saving = false; saveButton.disabled = false; notes.control.focus(); } };
    const saveButton = createButton({ label: 'Record Completed Procedure', onClick: save });
    activeModal = openModal({ title: 'Record Procedure', content: element('form', { className: 'treatment-plan-form', onsubmit: event => { event.preventDefault(); save(); } }, [context, notes.element]), footer: element('div', { className: 'button-group treatment-plan-form__actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: () => activeModal?.requestClose() }), saveButton]), onRequestClose: discardProcedure, onClose: () => { activeModal = null; } });
    dirtyState.clearUnsavedChanges(PROCEDURE_DIRTY_SOURCE);
  };
  const renderItem = (plan, item, editable) => {
    const procedure = procedureForItem(currentState, item), actions = item.acceptanceStatus === 'PROPOSED' && editable ? element('div', { className: 'treatment-plan__item-actions' }, [createButton({ label: 'Edit', variant: 'secondary', size: 'small', onClick: () => openItemForm(plan, item) }), createButton({ label: 'Accept', variant: 'success', size: 'small', onClick: () => decide(item, 'ACCEPTED') }), createButton({ label: 'Decline', variant: 'secondary', size: 'small', onClick: () => decide(item, 'DECLINED') })]) : editable && item.acceptanceStatus === 'ACCEPTED' && item.progressStatus !== 'COMPLETED' && !procedure ? element('div', { className: 'treatment-plan__item-actions' }, [createButton({ label: 'Record Procedure', variant: 'success', size: 'small', onClick: () => openProcedureForm(plan, item) })]) : null;
    return element('article', { className: 'treatment-plan__item', 'data-plan-item-id': item.id }, [element('div', { className: 'treatment-plan__item-main' }, [element('strong', { text: serviceName(currentState, item) }), element('span', { text: item.toothCode ? `Tooth ${item.toothCode} · ${itemSurfaces(currentState, item)}` : 'General treatment' }), item.notes ? element('small', { text: item.notes }) : null]), element('div', { className: 'treatment-plan__item-status' }, [createBadge({ label: formatStatus(item.acceptanceStatus), variant: statusVariant(item.acceptanceStatus) }), createBadge({ label: formatStatus(item.progressStatus), variant: statusVariant(item.progressStatus) })]), element('strong', { className: 'treatment-plan__item-amount', text: formatUGX(item.lineTotal) }), procedure ? element('small', { className: 'treatment-plan__procedure', text: `Fulfilled by ${procedure.procedureNumber}` }) : element('small', { className: 'treatment-plan__procedure', text: item.progressStatus === 'COMPLETED' ? 'Completion record unavailable' : 'No completed procedure recorded' }), actions]);
  };
  const render = () => {
    const plans = getTreatmentPlansForPatient(currentState, patientId).slice().reverse(); if (selectedPlanId && !plans.some(plan => plan.id === selectedPlanId)) selectedPlanId = plans[0]?.id || null; const selected = plans.find(plan => plan.id === selectedPlanId) || null, permissions = can();
    const planList = createCard({ title: 'Patient Treatment Plans', subtitle: `${plans.length} plan${plans.length === 1 ? '' : 's'} recorded.`, actions: permissions.canCreate ? createButton({ label: 'Create Treatment Plan', onClick: openCreatePlan }) : null, content: plans.length ? element('div', { className: 'treatment-plan__list' }, plans.map(plan => element('button', { type: 'button', className: `treatment-plan__list-row${plan.id === selectedPlanId ? ' is-selected' : ''}`, 'aria-pressed': String(plan.id === selectedPlanId), onClick: () => { selectedPlanId = plan.id; render(); } }, [element('strong', { text: plan.treatmentPlanNumber }), element('span', { text: `${formatDate(plan.createdAt)} · ${dentistName(currentState, plan.dentistUserId)}` }), createBadge({ label: formatStatus(plan.status), variant: statusVariant(plan.status) }), element('span', { text: formatUGX(calculateTreatmentPlanProposedTotal(currentState, plan.id)) })]))) : element('p', { className: 'treatment-plan__empty', text: 'No treatment plans recorded for this patient.' }) });
    const detail = selected ? (() => { const items = getTreatmentPlanItems(currentState, selected.id), editable = permissions.canEdit(selected), canPresent = editable && selected.status === 'DRAFT' && items.length > 0; return element('section', { className: 'treatment-plan__detail' }, [createCard({ title: selected.treatmentPlanNumber, subtitle: `${dentistName(currentState, selected.dentistUserId)} · Created ${formatDate(selected.createdAt)}`, actions: element('div', { className: 'button-group' }, [createBadge({ label: formatStatus(selected.status), variant: statusVariant(selected.status) }), createButton({ label: 'Print Treatment Plan', variant: 'secondary', size: 'small', onClick: printCurrentDocument }), canPresent ? createButton({ label: 'Present Plan', variant: 'secondary', size: 'small', onClick: () => { try { appState.presentTreatmentPlan({ planId: selected.id, actor: session }); currentState = appState.get(); render(); showToast({ title: 'Treatment plan presented.' }); } catch (error) { showToast({ title: 'Unable to present plan.', message: error.message, variant: 'error' }); } } }) : null].filter(Boolean)), content: element('div', { className: 'treatment-plan__header-body' }, [moneySummary(currentState, selected), selected.notes ? element('p', { className: 'treatment-plan__notes', text: selected.notes }) : element('p', { className: 'treatment-plan__notes', text: 'No additional plan note.' })]) }), createCard({ title: 'Treatment Items', subtitle: 'Acceptance and fulfilment are shown separately.', actions: editable && ['DRAFT', 'PROPOSED'].includes(selected.status) ? createButton({ label: 'Add Treatment', onClick: () => openAddItem(selected) }) : null, content: items.length ? element('div', { className: 'treatment-plan__items' }, items.map(item => renderItem(selected, item, editable))) : element('p', { className: 'treatment-plan__empty', text: 'Add planned treatment before presenting this plan to the patient.' }) })]); })() : createEmptyState({ title: 'No plan selected', message: 'Choose a treatment plan to review its proposed treatment and acceptance decisions.' });
    region.replaceChildren(element('div', { className: 'treatment-plan__grid' }, [planList, detail]));
    page.querySelector('[data-print-document]')?.remove();
    if (selected) page.append(treatmentPlanPrintDocument(currentState, selected, patient));
  };
  const age = getPatientAge(patient, currentState.referenceDate), allergies = currentState.patientAllergies.filter(record => record.patientId === patientId && record.status === 'active');
  page.append(createPageHeader({ title: 'Treatment Plans', description: 'Propose treatment intentionally; acceptance and completed procedures remain separate facts.', actions: [requestedPlan ? { label: 'Back to Treatment Plan Register', variant: 'secondary', onClick: () => navigate('treatment-plans') } : { label: 'Back to Clinical Workspace', variant: 'secondary', onClick: () => navigate(`patients/${patientId}/clinical`) }] }), createPatientContext({ patient: { name: patient.fullName, number: patient.patientNumber, ageSex: `${age ?? 'Age not recorded'} years · ${formatStatus(patient.sex)}`, status: formatStatus(patient.status), alert: allergies.length ? `Allergy: ${allergies.map(item => item.allergen).join(', ')}` : null }, fields: ['number', 'ageSex'], showAlert: true, actions: [{ label: 'Patient Profile', variant: 'secondary', onClick: () => navigate(`patients/${patientId}`) }, { label: 'Dental Chart', variant: 'secondary', onClick: () => navigate(`patients/${patientId}/dental-chart`) }] }), region);
  document.addEventListener('click', guardNavigation, true); window.addEventListener('beforeunload', guardUnload); window.addEventListener('hashchange', cleanup, { once: true }); render(); return page;
};
