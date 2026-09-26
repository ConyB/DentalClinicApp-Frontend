import { clear, element } from '../components/dom.js';
import { createAlert, createBadge, createButton, createCard, createEmptyState, createField, createPageHeader, createPatientContext } from '../components/primitives.js';
import { createPrintDocument, createPrintSection, createPrintTable, printCurrentDocument } from '../components/print-documents.js';
import { confirm, openModal, showToast } from '../components/overlays.js';
import { dirtyState } from '../core/dirty-state.js';
import { state as appState } from '../core/state.js';
import { getClinicalVisitContext } from '../data/clinical-workflows.js';
import { getPatientAllergies, getPatientMedicalConditions, getPatientMedications, getPrescriptionItems, getPrescriptionsForPatient } from '../data/clinical.js';
import { getPatientAge, getPatientById } from '../data/patients.js';
import { getPrescriptionPermissions } from '../data/prescription-workflows.js';
import { formatDate, formatStatus, formatTime } from '../utils/formatters.js';

const DIRTY_SOURCE = 'prescription';
const person = (state, id) => state.users.find(user => user.id === id)?.fullName || 'Not recorded';
const statusVariant = status => ({ DRAFT: 'warning', ISSUED: 'success', VOID: 'danger' }[status] || 'neutral');
const setError = (field, message = '') => { field.element.classList.toggle('field--error', Boolean(message)); field.control.setAttribute('aria-invalid', String(Boolean(message))); const hint = field.element.querySelector('.field__hint'); if (hint) { hint.textContent = message || hint.dataset.helper || ''; hint.classList.toggle('field__hint--error', Boolean(message)); hint.toggleAttribute('role', Boolean(message)); } };
const safetyList = (title, records, value, empty) => element('section', { className: 'prescriptions__safety-item' }, [element('h3', { text: title }), records.length ? element('ul', {}, records.map(record => element('li', { text: record[value] }))) : element('p', { text: empty })]);
const prescriptionDetails = (state, prescription) => {
  const items = getPrescriptionItems(state, prescription.id), encounter = prescription.encounterId ? state.clinicalEncounters.find(record => record.id === prescription.encounterId) : null;
  return element('div', { className: 'prescriptions__details' }, [element('dl', {}, [['Patient', getPatientById(state, prescription.patientId)?.fullName || 'Unknown patient'], ['Dentist', person(state, prescription.dentistUserId)], ['Encounter', encounter?.encounterNumber || 'Not linked'], ['Issued', `${formatDate(prescription.issuedAt)} · ${formatTime(prescription.issuedAt)}`], ['Status', formatStatus(prescription.status)], ['General note', prescription.notes || 'No general note.']].map(([label, value]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: value })]))), element('section', { className: 'prescriptions__item-history' }, [element('h3', { text: 'Prescription Items' }), element('div', { className: 'prescriptions__item-list' }, items.map(item => element('article', { className: 'prescriptions__item' }, [element('strong', { text: item.medicineName }), element('dl', {}, [['Strength', item.strength], ['Dose', item.dose], ['Route', item.route], ['Frequency', item.frequency], ['Duration', item.duration], ['Quantity', item.quantity], ['Instructions', item.instructions]].filter(([, value]) => value).map(([label, value]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: value })])))])))] )]);
};

const prescriptionPrintDocument = (state, prescription) => {
  const patient = getPatientById(state, prescription.patientId), items = getPrescriptionItems(state, prescription.id), encounter = prescription.encounterId ? state.clinicalEncounters.find(record => record.id === prescription.encounterId) : null;
  return createPrintDocument({
    state,
    kind: 'prescription',
    title: 'Prescription',
    reference: prescription.prescriptionNumber,
    subtitle: `Issued ${formatDate(prescription.issuedAt)} - ${formatTime(prescription.issuedAt)}`,
    context: [
      ['Patient', patient?.fullName || 'Unknown patient'],
      ['Patient ID', patient?.patientNumber || 'Not recorded'],
      ['Prescribing Dentist', person(state, prescription.dentistUserId)],
      ['Encounter', encounter?.encounterNumber || 'Not linked'],
      ['Status', formatStatus(prescription.status)]
    ],
    sections: [
      createPrintSection({
        title: 'Medication Instructions',
        content: createPrintTable({
          columns: [{ label: 'Medication', key: 'medicine' }, { label: 'Dose and Route', key: 'dose' }, { label: 'Frequency', key: 'frequency' }, { label: 'Duration', key: 'duration' }, { label: 'Quantity', key: 'quantity' }, { label: 'Instructions', key: 'instructions' }],
          rows: items.map(item => ({ medicine: [item.medicineName, item.strength].filter(Boolean).join(' '), dose: [item.dose, item.route].filter(Boolean).join(' / ') || 'Not specified', frequency: item.frequency || 'Not specified', duration: item.duration || 'Not specified', quantity: item.quantity || 'Not specified', instructions: item.instructions || 'No additional instructions' })),
          emptyMessage: 'No medication items recorded.'
        })
      }),
      prescription.notes ? createPrintSection({ title: 'General Note', content: element('p', { text: prescription.notes }) }) : null
    ].filter(Boolean),
    note: 'This prescription reflects the issued clinical record. Contact the clinic if any instruction is unclear.'
  });
};

export const renderPrescriptionLanding = () => element('section', { className: 'prescriptions' }, [createPageHeader({ title: 'Prescriptions', description: 'Open an authorized patient’s clinical record to review or issue a prescription.' }), createEmptyState({ title: 'Select a patient', message: 'Prescription history and authoring use the existing patient clinical context.', action: { label: 'Open Patients', onClick: () => { location.hash = '#/patients'; } } })]);

export const renderPrescriptionWorkspace = ({ state: initialState, session, patientId }) => {
  let currentState = initialState, activeModal = null, selectedId = getPrescriptionsForPatient(initialState, patientId).at(-1)?.id || null;
  const patient = getPatientById(currentState, patientId);
  if (!patient) return createEmptyState({ title: 'Patient Not Found', message: 'This prescription route does not expose another patient’s records.', action: { label: 'Back to Patients', onClick: () => { location.hash = '#/patients'; } } });
  const page = element('section', { className: 'prescriptions' }), region = element('div', { className: 'prescriptions__region' });
  const can = () => getPrescriptionPermissions({ state: currentState, patientId, actor: session });
  const discard = async () => { if (!dirtyState.isDirty(DIRTY_SOURCE)) return true; const choice = await confirm({ title: 'Discard prescription changes?', message: 'Your unsaved prescription information will be lost.', confirmLabel: 'Discard Changes', variant: 'danger' }); if (choice) dirtyState.clearUnsavedChanges(DIRTY_SOURCE); return choice; };
  const cleanup = () => { document.removeEventListener('click', guardNavigation, true); window.removeEventListener('beforeunload', guardUnload); window.removeEventListener('hashchange', cleanup); };
  const navigate = async route => { if (activeModal && !await activeModal.requestClose()) return; if (!activeModal && !await discard()) return; cleanup(); location.hash = `#/${route}`; };
  const guardNavigation = async event => { const target = event.target.closest('a[href^="#/"]')?.getAttribute('href')?.replace(/^#\//, ''); if (!target || !dirtyState.isDirty(DIRTY_SOURCE)) return; event.preventDefault(); event.stopImmediatePropagation(); if (activeModal && !await activeModal.requestClose()) return; if (!await discard()) return; cleanup(); location.hash = `#/${target}`; };
  const guardUnload = event => { if (!dirtyState.isDirty(DIRTY_SOURCE)) return; event.preventDefault(); event.returnValue = ''; };
  const openDetails = prescription => { let modal; modal = openModal({ title: `Prescription ${prescription.prescriptionNumber}`, size: 'large', content: prescriptionDetails(currentState, prescription), footer: createButton({ label: 'Close', variant: 'secondary', onClick: () => modal.close() }) }); };
  const openCreate = () => {
    const generalNote = createField({ id: 'prescription-note', label: 'General Prescription Note', type: 'textarea', helper: 'Optional. Patient medical history remains separate.' });
    const itemRegion = element('div', { className: 'prescription-form__items' }); let saving = false;
    const addItem = () => {
      const medicineName = createField({ label: 'Medication', required: true, placeholder: 'Enter medication name' }); const strength = createField({ label: 'Strength' }); const dose = createField({ label: 'Dose' }); const route = createField({ label: 'Route' }); const frequency = createField({ label: 'Frequency' }); const duration = createField({ label: 'Duration' }); const quantity = createField({ label: 'Quantity' }); const instructions = createField({ label: 'Item Instructions', type: 'textarea' });
      const row = element('article', { className: 'prescription-form__item' }, [element('div', { className: 'prescription-form__item-heading' }, [element('h3', { text: `Medication ${itemRegion.children.length + 1}` }), createButton({ label: 'Remove medication', variant: 'ghost', size: 'small', onClick: () => { if (itemRegion.children.length > 1) { row.remove(); markDirty(); } } })]), medicineName.element, element('div', { className: 'prescription-form__grid' }, [strength.element, dose.element, route.element, frequency.element, duration.element, quantity.element]), instructions.element]);
      row.fields = { medicineName, strength, dose, route, frequency, duration, quantity, instructions }; itemRegion.append(row); Object.values(row.fields).forEach(field => field.control.addEventListener('input', markDirty)); return row;
    };
    const values = () => ({ notes: generalNote.control.value, items: [...itemRegion.children].map(row => Object.fromEntries(Object.entries(row.fields).map(([key, field]) => [key, field.control.value]))) });
    const baseline = JSON.stringify({ notes: '', items: [] }); const markDirty = () => dirtyState.setUnsavedChanges(JSON.stringify(values()) !== baseline, DIRTY_SOURCE); addItem(); generalNote.control.addEventListener('input', markDirty);
    const save = () => { if (saving) return; saving = true; saveButton.disabled = true; try { const result = appState.createPrescription({ patientId, ...values(), actor: session }); dirtyState.clearUnsavedChanges(DIRTY_SOURCE); selectedId = result.prescription.id; activeModal?.close(); activeModal = null; currentState = appState.get(); render(); showToast({ title: 'Prescription issued.', message: result.prescription.prescriptionNumber, variant: 'success' }); } catch (error) { const errors = error.fieldErrors || {}; setError(generalNote, errors.notes); const firstInvalid = [...itemRegion.children].flatMap(row => Object.entries(row.fields).map(([key, field]) => ({ key, field }))).find(({ key }, index) => errors[`item-${Math.floor(index / 8)}-${key}`]); [...itemRegion.children].forEach((row, index) => setError(row.fields.medicineName, errors[`item-${index}-medicineName`])); dirtyState.markUnsavedChanges(DIRTY_SOURCE); saving = false; saveButton.disabled = false; (firstInvalid?.field.control || itemRegion.children[0].fields.medicineName.control).focus(); } };
    const saveButton = createButton({ label: 'Issue Prescription', onClick: save });
    activeModal = openModal({ title: 'New Prescription', size: 'large', content: element('form', { className: 'prescription-form', onsubmit: event => { event.preventDefault(); save(); } }, [element('p', { className: 'prescription-form__context', text: `Patient: ${patient.fullName}. Prescriber: ${person(currentState, session.userId)}.` }), itemRegion, createButton({ label: 'Add Medication', variant: 'secondary', onClick: () => { addItem(); markDirty(); } }), generalNote.element]), footer: element('div', { className: 'button-group prescription-form__actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: () => activeModal?.requestClose() }), saveButton]), onRequestClose: discard, onClose: () => { activeModal = null; } }); dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
  };
  const render = () => {
    const prescriptions = getPrescriptionsForPatient(currentState, patientId).slice().reverse(); if (selectedId && !prescriptions.some(record => record.id === selectedId)) selectedId = prescriptions[0]?.id || null; const selected = prescriptions.find(record => record.id === selectedId) || null;
    const history = createCard({ title: 'Prescription History', subtitle: `${prescriptions.length} prescription${prescriptions.length === 1 ? '' : 's'} recorded.`, actions: can().canCreate ? createButton({ label: 'New Prescription', onClick: openCreate }) : null, content: prescriptions.length ? element('div', { className: 'prescriptions__history' }, prescriptions.map(record => element('button', { type: 'button', className: `prescriptions__history-row${record.id === selectedId ? ' is-selected' : ''}`, onClick: () => { selectedId = record.id; render(); } }, [element('strong', { text: record.prescriptionNumber }), element('span', { text: `${formatDate(record.issuedAt)} · ${person(currentState, record.dentistUserId)}` }), element('span', { text: `${getPrescriptionItems(currentState, record.id).length} medication item(s)` }), createBadge({ label: formatStatus(record.status), variant: statusVariant(record.status) })]))) : element('p', { className: 'prescriptions__empty', text: 'No prescriptions have been issued for this patient.' }) });
    const detail = selected ? createCard({ title: selected.prescriptionNumber, subtitle: 'Read-only issued clinical record.', actions: element('div', { className: 'button-group' }, [createButton({ label: 'View Details', variant: 'secondary', onClick: () => openDetails(selected) }), createButton({ label: 'Print Prescription', variant: 'secondary', onClick: printCurrentDocument })]), content: prescriptionDetails(currentState, selected) }) : createEmptyState({ title: 'No prescription selected', message: 'Issue a prescription only after reviewing the clinical safety context.' });
    region.replaceChildren(element('div', { className: 'prescriptions__grid' }, [history, detail]));
    page.querySelector('[data-print-document]')?.remove();
    if (selected) page.append(prescriptionPrintDocument(currentState, selected));
  };
  const allergies = getPatientAllergies(currentState, patientId), conditions = getPatientMedicalConditions(currentState, patientId), medications = getPatientMedications(currentState, patientId), visit = getClinicalVisitContext(currentState, patientId);
  const safety = createCard({ title: 'Clinical Safety Summary', subtitle: 'Known recorded history only. This is not a drug-interaction engine.', content: element('div', { className: 'prescriptions__safety' }, [element('section', { className: 'prescriptions__safety-item' }, [element('h3', { text: 'Allergies' }), allergies.length ? createAlert({ title: 'Recorded allergy', message: allergies.map(record => record.allergen).join(', '), variant: 'clinical' }) : element('p', { text: 'No recorded allergies.' })]), safetyList('Medical Conditions', conditions, 'conditionName', 'No recorded medical conditions.'), safetyList('Current Medications', medications, 'medicationName', 'No recorded current medications.')]) });
  page.append(createPageHeader({ title: 'Prescriptions', description: 'Review recorded safety information; medication choice and dosing remain the Dentist’s clinical decision.', actions: [{ label: 'Back to Clinical Workspace', variant: 'secondary', onClick: () => navigate(`patients/${patientId}/clinical`) }] }), createPatientContext({ patient: { name: patient.fullName, number: patient.patientNumber, ageSex: `${getPatientAge(patient, currentState.referenceDate)} years · ${formatStatus(patient.sex)}`, status: formatStatus(patient.status), appointment: visit.appointment?.appointmentNumber, dentist: visit.dentist?.fullName, alert: allergies.length ? `Allergy: ${allergies.map(record => record.allergen).join(', ')}` : null }, fields: ['number', 'ageSex', 'appointment', 'dentist'], showAlert: true, actions: [{ label: 'Patient Profile', variant: 'secondary', onClick: () => navigate(`patients/${patientId}`) }, { label: 'Dental Chart', variant: 'secondary', onClick: () => navigate(`patients/${patientId}/dental-chart`) }] }), safety, region);
  document.addEventListener('click', guardNavigation, true); window.addEventListener('beforeunload', guardUnload); window.addEventListener('hashchange', cleanup, { once: true }); render(); return page;
};
