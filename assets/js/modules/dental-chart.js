import { clear, element } from '../components/dom.js';
import { createOdontogramArch } from '../components/odontogram.js';
import { createButton, createCard, createEmptyState, createField, createPageHeader, createPatientContext } from '../components/primitives.js';
import { createPrintDocument, createPrintSection, createPrintTable, printCurrentDocument } from '../components/print-documents.js';
import { confirm, openModal, showToast } from '../components/overlays.js';
import { dirtyState } from '../core/dirty-state.js';
import { state as appState } from '../core/state.js';
import { dentalChartLegend, getDentalChartDefaultDentition, getDentalChartViewModel } from '../data/dental-chart.js';
import { canEditDentalFinding, canMutateDentalChart, getDentalChartingContext, getDentalFindingCatalogue, getDentalFindingRule } from '../data/dental-chart-workflows.js';
import { formatDate, formatStatus } from '../utils/formatters.js';

const DIRTY_SOURCE = 'odontogram';
const surfaceText = surfaces => surfaces.length ? surfaces.join('') : 'Whole tooth';
const setFieldError = (field, message = '') => {
  field.element.classList.toggle('field--error', Boolean(message));
  field.control.setAttribute('aria-invalid', String(Boolean(message)));
  const id = `${field.control.id}-hint`;
  field.element.querySelector(`#${id}`)?.remove();
  if (message) { field.control.setAttribute('aria-describedby', id); field.element.append(element('p', { id, className: 'field__hint field__hint--error', role: 'alert', text: message })); }
  else field.control.removeAttribute('aria-describedby');
};

const findingRow = (entry, { canEdit = false, onEdit } = {}) => element('article', { className: `dental-chart__finding dental-chart__finding--${entry.visual.key}`, 'data-entry-type': entry.entryType, 'data-finding-id': entry.id }, [
  element('span', { className: 'dental-chart__finding-cue', text: entry.visual.marker, 'aria-hidden': 'true' }),
  element('div', { className: 'dental-chart__finding-content' }, [
    element('strong', { text: entry.label }),
    element('span', { text: `${surfaceText(entry.surfaces)} · ${formatStatus(entry.entryType)}` }),
    element('small', { text: `${formatDate(entry.recordedAt)} · ${entry.recordedBy}${entry.encounterId ? ` · ${entry.encounterId}` : ''}` }),
    entry.notes ? element('p', { className: 'dental-chart__finding-note', text: entry.notes }) : null
  ]),
  canEdit ? createButton({ label: `Edit ${entry.label} on tooth ${entry.toothCode}`, variant: 'secondary', size: 'small', onClick: () => onEdit?.(entry) }) : null
]);
const plannedRow = item => element('article', { className: 'dental-chart__finding dental-chart__finding--planned', 'data-plan-item-id': item.id }, [
  element('span', { className: 'dental-chart__finding-cue', text: item.visual.marker, 'aria-hidden': 'true' }),
  element('div', {}, [element('strong', { text: item.label }), element('span', { text: `${surfaceText(item.surfaces)} · ${item.treatmentPlanNumber}` }), element('small', { text: `${formatStatus(item.acceptanceStatus)} · ${formatStatus(item.progressStatus)}` })])
]);
const stat = (label, value) => element('div', { className: 'dental-chart__stat' }, [element('span', { text: label }), element('strong', { text: String(value) })]);

const dentalChartPrintDocument = (state, model) => createPrintDocument({
  state,
  kind: 'dental-chart',
  title: 'Dental Chart Summary',
  reference: model.patient.patientNumber,
  subtitle: `${model.dentition === 'primary' ? 'Primary' : 'Permanent'} dentition - FDI numbering`,
  context: [
    ['Patient', model.patient.fullName],
    ['Patient ID', model.patient.patientNumber],
    ['Age / Sex', `${model.age ?? 'Age not recorded'} years - ${formatStatus(model.patient.sex)}`],
    ['Recorded Allergies', model.allergies.length ? model.allergies.map(item => item.allergen).join(', ') : 'None recorded']
  ],
  metrics: [['Recorded Findings', model.summary.recordedFindings], ['Teeth With Findings', model.summary.teethWithFindings], ['Planned Items', model.summary.plannedItems]],
  sections: [
    createPrintSection({
      title: 'Current Chart Findings',
      content: createPrintTable({
        columns: [{ label: 'Tooth', key: 'tooth' }, { label: 'Finding', key: 'finding' }, { label: 'Type', key: 'type' }, { label: 'Surfaces', key: 'surfaces' }, { label: 'Recorded', key: 'recorded' }, { label: 'Recorded By', key: 'recordedBy' }],
        rows: model.history.entries.map(entry => ({ tooth: entry.toothCode, finding: entry.label, type: formatStatus(entry.entryType), surfaces: surfaceText(entry.surfaces), recorded: formatDate(entry.recordedAt), recordedBy: entry.recordedBy })),
        emptyMessage: 'No current findings recorded for this dentition.'
      })
    }),
    createPrintSection({
      title: 'Planned Treatment',
      content: createPrintTable({
        columns: [{ label: 'Tooth', key: 'tooth' }, { label: 'Treatment', key: 'treatment' }, { label: 'Surfaces', key: 'surfaces' }, { label: 'Plan', key: 'plan' }, { label: 'Acceptance', key: 'acceptance' }, { label: 'Progress', key: 'progress' }],
        rows: model.history.planned.map(item => ({ tooth: item.toothCode, treatment: item.label, surfaces: surfaceText(item.surfaces), plan: item.treatmentPlanNumber, acceptance: formatStatus(item.acceptanceStatus), progress: formatStatus(item.progressStatus) })),
        emptyMessage: 'No planned treatment recorded for this dentition.'
      })
    })
  ],
  note: 'This summary preserves recorded findings and planned treatment as separate clinical facts.'
});

const selectedPanel = (tooth, { editable, canEditEntry, onAdd, onEdit, onPlans } = {}) => {
  if (!tooth) { const card = createCard({ title: 'Selected Tooth', subtitle: `Choose a tooth to review${editable ? ' or record' : ''} its chart details.`, content: element('p', { className: 'dental-chart__empty', text: 'No tooth selected.' }) }); card.classList.add('dental-chart__selected'); return card; }
  const recorded = tooth.entries.length ? element('div', { className: 'dental-chart__finding-list' }, tooth.entries.map(entry => findingRow(entry, { canEdit: canEditEntry?.(entry), onEdit }))) : element('p', { className: 'dental-chart__empty', text: 'No recorded findings.' });
  const planned = tooth.planned.length ? element('div', { className: 'dental-chart__finding-list' }, tooth.planned.map(plannedRow)) : element('p', { className: 'dental-chart__empty', text: 'No planned treatment for this tooth.' });
  return element('section', { className: 'card dental-chart__selected', 'aria-labelledby': 'selected-tooth-title' }, [
    element('header', { className: 'card__header' }, [
      element('div', {}, [element('h3', { id: 'selected-tooth-title', className: 'card__title', text: `Tooth ${tooth.code}` }), element('p', { className: 'card__subtitle', text: `${tooth.dentition === 'primary' ? 'Primary' : 'Permanent'} · ${tooth.displayName}` })]),
      editable ? createButton({ label: `Add Finding — Tooth ${tooth.code}`, size: 'small', onClick: () => onAdd?.(tooth) }) : null
    ]),
    onPlans ? element('div', { className: 'card__body' }, [createButton({ label: 'View Treatment Plans', variant: 'secondary', size: 'small', onClick: onPlans })]) : null,
    element('div', { className: 'card__body dental-chart__selected-body' }, [
      element('section', {}, [element('h4', { text: 'Recorded Findings' }), recorded]),
      element('section', {}, [element('h4', { text: 'Planned Treatment' }), planned])
    ])
  ]);
};

const legend = () => element('section', { className: 'dental-chart__legend', 'aria-labelledby': 'dental-chart-legend-title' }, [
  element('h3', { id: 'dental-chart-legend-title', text: 'Dental Chart Legend' }),
  element('ul', {}, dentalChartLegend.map(item => element('li', {}, [element('span', { className: `dental-chart__legend-cue dental-chart__legend-cue--${item.key}`, text: item.marker, 'aria-hidden': 'true' }), element('span', { text: item.label })])))
]);

const chartHistory = model => createCard({ title: 'Chart Record Summary', subtitle: 'Non-graphical representation of recorded and planned tooth states.', content: model.history.entries.length || model.history.planned.length ? element('div', { className: 'dental-chart__history' }, [
  ...model.history.entries.map(entry => element('article', { className: 'dental-chart__history-row' }, [element('strong', { text: `Tooth ${entry.toothCode} · ${entry.label}` }), element('span', { text: `${formatStatus(entry.entryType)}${entry.surfaces.length ? ` · ${entry.surfaces.join(', ')}` : ''}` })])),
  ...model.history.planned.map(item => element('article', { className: 'dental-chart__history-row dental-chart__history-row--planned' }, [element('strong', { text: `Tooth ${item.toothCode} · ${item.label}` }), element('span', { text: `Planned Treatment${item.surfaces.length ? ` · ${item.surfaces.join(', ')}` : ''} · ${item.treatmentPlanNumber}` })]))
]) : element('p', { className: 'dental-chart__empty', text: 'No dental chart records for this dentition.' }) });

export const renderDentalChartLanding = () => element('section', { className: 'dental-chart' }, [
  createPageHeader({ title: 'Dental Chart', description: 'Open a patient record to review an odontogram.' }),
  createEmptyState({ title: 'Select a patient', message: 'Dental charts are opened from an authorized patient profile or Clinical Workspace.', action: { label: 'Open Patients', onClick: () => { location.hash = '#/patients'; } } })
]);

export const renderDentalChart = ({ state: initialState, session, patientId }) => {
  let currentState = initialState;
  const initial = getDentalChartViewModel(currentState, patientId, getDentalChartDefaultDentition(currentState, patientId));
  if (!initial) return element('section', { className: 'dental-chart' }, [createPageHeader({ title: 'Dental Chart', description: 'Clinical visualization.' }), createEmptyState({ title: 'Patient Not Found', message: 'The requested patient record could not be found.', action: { label: 'Back to Patients', onClick: () => { location.hash = '#/patients'; } } })]);
  let dentition = initial.dentition;
  let selectedCode = null;
  let findingModal = null;
  const page = element('section', { className: 'dental-chart' });
  const chartRegion = element('div', { className: 'dental-chart__render-region' });
  const controls = element('div', { className: 'dental-chart__dentition', role: 'group', 'aria-label': 'Dentition view' });
  const canEditChart = () => canMutateDentalChart({ state: currentState, patientId, actor: session });

  const cleanup = () => { document.removeEventListener('click', guardNavigation, true); window.removeEventListener('beforeunload', guardUnload); window.removeEventListener('hashchange', cleanup); };
  const discardOdontogram = async () => {
    if (!dirtyState.isDirty(DIRTY_SOURCE)) return true;
    const discard = await confirm({ title: 'Discard dental finding changes?', message: 'Your unsaved Odontogram changes will be lost.', confirmLabel: 'Discard Changes', variant: 'danger' });
    if (discard) dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
    return discard;
  };
  const requestNavigate = async target => {
    if (findingModal && !await findingModal.requestClose()) return;
    if (!findingModal && !await discardOdontogram()) return;
    cleanup();
    location.hash = `#/${target}`;
  };
  const guardNavigation = async event => {
    const link = event.target.closest('a[href^="#/"]');
    const target = link?.getAttribute('href')?.replace(/^#\//, '');
    if (!target) return;
    if (!dirtyState.isDirty(DIRTY_SOURCE)) { cleanup(); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    if (await discardOdontogram()) { findingModal?.close(); findingModal = null; cleanup(); location.hash = `#/${target}`; }
  };
  const guardUnload = event => { if (!dirtyState.isDirty(DIRTY_SOURCE)) return; event.preventDefault(); event.returnValue = ''; };

  const openFindingForm = ({ tooth, entry = null }) => {
    if (!canEditChart() || (entry && !canEditDentalFinding({ state: currentState, entry, actor: session }))) return;
    const catalogue = getDentalFindingCatalogue(currentState);
    const initialSurfaces = entry?.surfaces || [];
    const condition = createField({ id: 'dental-finding-condition', label: 'Condition / Finding', type: 'select', required: true, value: entry?.conceptCode || '', options: [{ value: '', label: 'Select a finding' }, ...catalogue.map(item => ({ value: item.code, label: `${item.name} — ${item.entryType === 'existing_treatment' ? 'Existing treatment' : item.code === 'HEALTHY' ? 'Observation' : 'Condition'}` }))] });
    const notes = createField({ id: 'dental-finding-notes', label: 'Short Clinical Note', type: 'textarea', value: entry?.notes || '', helper: 'Optional. Detailed narrative belongs in the Clinical Encounter.' });
    const surfaceError = element('p', { id: 'dental-finding-surfaces-error', className: 'field__hint field__hint--error', role: 'alert', hidden: true });
    const surfaceOptions = element('div', { className: 'dental-finding-form__surfaces' });
    const surfaceHelp = element('p', { className: 'field__hint', id: 'dental-finding-surfaces-help' });
    const surfaceField = element('fieldset', { className: 'dental-finding-form__surface-field', 'aria-describedby': 'dental-finding-surfaces-help dental-finding-surfaces-error' }, [element('legend', { className: 'field__label', text: 'Tooth Surfaces' }), surfaceOptions, surfaceHelp, surfaceError]);
    const errorSummary = element('div', { className: 'alert alert--danger dental-finding-form__error', role: 'alert', tabindex: '-1', hidden: true });
    const context = getDentalChartingContext(currentState, patientId, session);
    const contextSummary = element('dl', { className: 'dental-finding-form__context' }, [
      element('div', {}, [element('dt', { text: 'Patient' }), element('dd', { text: initial.patient.fullName })]),
      element('div', {}, [element('dt', { text: 'Tooth' }), element('dd', { text: `${tooth.code} · ${tooth.displayName}` })]),
      element('div', {}, [element('dt', { text: 'Dentist' }), element('dd', { text: session.name })]),
      element('div', {}, [element('dt', { text: 'Context' }), element('dd', { text: context.encounter?.encounterNumber || 'Baseline / standalone charting' })])
    ]);
    let selectedSurfaces = new Set(initialSurfaces);
    let saving = false;
    const readValues = () => ({ conditionCode: condition.control.value, surfaces: [...selectedSurfaces], notes: notes.control.value });
    const baseline = JSON.stringify(readValues());
    const markDirty = () => dirtyState.setUnsavedChanges(JSON.stringify(readValues()) !== baseline, DIRTY_SOURCE);
    const clearErrors = () => { setFieldError(condition); surfaceField.classList.remove('field--error'); surfaceError.hidden = true; surfaceError.textContent = ''; errorSummary.hidden = true; errorSummary.replaceChildren(); };
    const showSurfaceError = message => { surfaceField.classList.add('field--error'); surfaceError.textContent = message; surfaceError.hidden = false; };
    const renderSurfaces = () => {
      const rule = getDentalFindingRule(currentState, condition.control.value);
      if (rule?.surfaceMode === 'whole_tooth') selectedSurfaces = new Set();
      clear(surfaceOptions);
      tooth.permittedSurfaces.forEach(surface => {
        const input = element('input', { type: 'checkbox', value: surface.code, checked: selectedSurfaces.has(surface.code), disabled: !rule || rule.surfaceMode === 'whole_tooth', 'aria-label': `${surface.name} surface` });
        input.addEventListener('change', () => { input.checked ? selectedSurfaces.add(surface.code) : selectedSurfaces.delete(surface.code); clearErrors(); markDirty(); });
        surfaceOptions.append(element('label', { className: 'dental-finding-form__surface-option' }, [input, element('span', { 'aria-hidden': 'true', text: surface.code }), element('small', { text: surface.name })]));
      });
      surfaceHelp.textContent = !rule ? 'Choose a finding to see its surface requirements.' : rule.surfaceMode === 'whole_tooth' ? 'This finding applies to the whole tooth.' : rule.surfaceMode === 'surface' ? 'Select one or more applicable surfaces.' : 'Surface selection is optional for this finding.';
    };
    condition.control.addEventListener('change', () => { clearErrors(); renderSurfaces(); markDirty(); });
    notes.control.addEventListener('input', () => { clearErrors(); markDirty(); });
    renderSurfaces();
    const requestClose = async () => discardOdontogram();
    const save = () => {
      if (saving) return;
      clearErrors(); saving = true; saveButton.disabled = true;
      try {
        const values = readValues();
        const result = entry
          ? appState.updateDentalFinding({ entryId: entry.id, ...values, actor: session })
          : appState.addDentalFinding({ patientId, toothCode: tooth.code, ...values, actor: session });
        dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
        findingModal.close(); findingModal = null;
        currentState = appState.get();
        renderRegion({ focusSelected: true });
        showToast({ title: result.changed === false ? 'No finding changes to save.' : entry ? 'Dental finding updated.' : 'Dental finding recorded.', message: `Tooth ${tooth.code}`, variant: result.changed === false ? 'info' : 'success' });
      } catch (error) {
        const errors = error.fieldErrors || {};
        if (errors.conditionCode) setFieldError(condition, errors.conditionCode);
        if (errors.surfaces) showSurfaceError(errors.surfaces);
        const general = errors.permission || errors.patientId || errors.toothCode || errors.duplicate || errors.conflict || (!errors.conditionCode && !errors.surfaces ? error.message : '');
        if (general) { errorSummary.hidden = false; errorSummary.append(element('div', {}, [element('strong', { text: 'Finding not saved' }), element('p', { text: general })])); }
        dirtyState.markUnsavedChanges(DIRTY_SOURCE);
        (errors.conditionCode ? condition.control : errors.surfaces ? surfaceOptions.querySelector('input:not([disabled])') : errorSummary)?.focus();
        saving = false; saveButton.disabled = false;
      }
    };
    const saveButton = createButton({ label: entry ? 'Save Finding Changes' : 'Save Finding', onClick: save });
    const form = element('form', { className: 'dental-finding-form', onsubmit: event => { event.preventDefault(); save(); } }, [errorSummary, contextSummary, condition.element, surfaceField, notes.element]);
    findingModal = openModal({ title: `${entry ? 'Edit Finding' : 'Add Finding'} — Tooth ${tooth.code}`, size: 'medium', content: form, onRequestClose: requestClose, onClose: () => { findingModal = null; }, footer: element('div', { className: 'button-group dental-finding-form__actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: () => findingModal?.requestClose() }), saveButton]) });
    dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
  };

  const patientContext = createPatientContext({
    patient: { name: initial.patient.fullName, number: initial.patient.patientNumber, ageSex: `${initial.age ?? 'Age not recorded'} years · ${formatStatus(initial.patient.sex)}`, status: formatStatus(initial.patient.status), alert: initial.allergies.length ? `Allergy: ${initial.allergies.map(item => item.allergen).join(', ')}` : null },
    fields: ['number', 'ageSex'], showAlert: true,
    actions: [
      { label: 'Patient Profile', variant: 'secondary', onClick: () => requestNavigate(`patients/${patientId}`) },
      { label: 'Clinical Workspace', variant: 'secondary', onClick: () => requestNavigate(`patients/${patientId}/clinical`) },
      { label: 'Treatment Plans', variant: 'secondary', onClick: () => requestNavigate(`patients/${patientId}/treatment-plans/workspace`) }
    ]
  });

  const renderRegion = ({ focusSelected = false } = {}) => {
    const model = getDentalChartViewModel(currentState, patientId, dentition);
    if (!model) return;
    const allTeeth = [...model.arches.upper, ...model.arches.lower];
    if (!allTeeth.some(tooth => tooth.code === selectedCode)) selectedCode = null;
    const selected = allTeeth.find(tooth => tooth.code === selectedCode) || null;
    clear(controls);
    controls.append(...model.availableDentitions.map(option => createButton({ label: option === 'permanent' ? 'Permanent Dentition' : 'Primary Dentition', variant: dentition === option ? 'primary' : 'secondary', size: 'small', onClick: () => { if (dentition === option) return; dentition = option; selectedCode = null; renderRegion(); } })));
    [...controls.children].forEach((button, index) => button.setAttribute('aria-pressed', String(model.availableDentitions[index] === dentition)));
    const selectTooth = code => { selectedCode = code; renderRegion({ focusSelected: true }); };
    const editable = canEditChart();
    const chart = element('section', { className: `odontogram odontogram--${dentition}`, 'aria-labelledby': 'odontogram-title' }, [
      element('div', { className: 'odontogram__heading' }, [element('div', {}, [element('h2', { id: 'odontogram-title', text: `${dentition === 'primary' ? 'Primary' : 'Permanent'} Odontogram` }), element('p', { text: `FDI numbering · Patient perspective · ${editable ? 'Clinical editing enabled' : 'Read-only'}` })]), element('div', { className: 'dental-chart__stats' }, [stat('Recorded Findings', model.summary.recordedFindings), stat('Teeth With Findings', model.summary.teethWithFindings), stat('Planned Items', model.summary.plannedItems)])]),
      element('div', { className: 'odontogram__scroll', tabindex: '0', 'aria-label': `${dentition === 'primary' ? 'Primary' : 'Permanent'} dental arches; scroll horizontally when needed` }, [
        createOdontogramArch({ label: 'Upper', teeth: model.arches.upper, selectedCode, onSelect: selectTooth }),
        element('div', { className: 'odontogram__midline', 'aria-hidden': 'true' }),
        createOdontogramArch({ label: 'Lower', teeth: model.arches.lower, selectedCode, onSelect: selectTooth })
      ])
    ]);
    chartRegion.replaceChildren(chart, legend(), selectedPanel(selected, { editable, canEditEntry: entry => canEditDentalFinding({ state: currentState, entry, actor: session }), onAdd: tooth => openFindingForm({ tooth }), onEdit: entry => openFindingForm({ tooth: selected, entry }), onPlans: () => requestNavigate(`patients/${patientId}/treatment-plans/workspace`) }), chartHistory(model));
    page.querySelector('[data-print-document]')?.remove();
    page.append(dentalChartPrintDocument(currentState, model));
    if (focusSelected && selectedCode) requestAnimationFrame(() => chartRegion.querySelector(`[data-tooth-code="${selectedCode}"]`)?.focus());
  };

  page.append(
    createPageHeader({ title: 'Dental Chart', description: canEditChart() ? 'Record structured clinical findings using FDI two-digit tooth numbering.' : 'Read-only clinical visualization using FDI two-digit tooth numbering.', actions: [{ label: 'Print Dental Chart Summary', variant: 'secondary', onClick: printCurrentDocument }, { label: 'Back to Clinical Workspace', variant: 'secondary', onClick: () => requestNavigate(`patients/${patientId}/clinical`) }] }),
    patientContext,
    element('section', { className: 'dental-chart__toolbar', 'aria-label': 'Dental chart controls' }, [element('div', {}, [element('h2', { text: 'Dentition View' }), element('p', { text: 'Tooth selection and dentition switching do not change clinical records.' })]), controls]),
    chartRegion
  );
  document.addEventListener('click', guardNavigation, true);
  window.addEventListener('beforeunload', guardUnload);
  window.addEventListener('hashchange', cleanup, { once: true });
  renderRegion();
  return page;
};
