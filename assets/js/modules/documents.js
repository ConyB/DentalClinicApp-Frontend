import { element, lucideIcon } from '../components/dom.js';
import { createBadge, createButton, createCard, createEmptyState, createField, createPageHeader, createPatientContext } from '../components/primitives.js';
import { confirm, openModal, showToast } from '../components/overlays.js';
import { dirtyState } from '../core/dirty-state.js';
import { state as appState } from '../core/state.js';
import { getDocumentsForPatient, getEncountersForPatient, getPatientAllergies } from '../data/clinical.js';
import { getClinicalVisitContext } from '../data/clinical-workflows.js';
import { DOCUMENT_TYPES, getDocumentPermissions, getRuntimeDocumentPreview, registerRuntimeDocumentPreview } from '../data/document-workflows.js';
import { getPatientAge, getPatientById } from '../data/patients.js';
import { formatDate, formatStatus } from '../utils/formatters.js';

const DIRTY_SOURCE = 'clinical-document';
const FILTERS = Object.freeze([
  { value: 'ALL', label: 'All' },
  { value: 'X_RAY', label: 'X-Rays' },
  { value: 'CLINICAL_PHOTO', label: 'Clinical Photos' }
]);

const person = (state, id) => state.users.find(user => user.id === id)?.fullName || 'Not recorded';
const formatBytes = value => Number.isFinite(value) ? `${new Intl.NumberFormat('en-UG', { maximumFractionDigits: 1 }).format(value / 1024)} KB` : 'Not recorded';
const documentType = type => DOCUMENT_TYPES[type] || { label: formatStatus(type), icon: 'image' };
const detail = (label, value) => element('div', { className: 'documents__detail' }, [element('dt', { text: label }), element('dd', { text: value })]);
const newestFirst = records => records.slice().sort((left, right) => right.capturedAt.localeCompare(left.capturedAt) || right.id.localeCompare(left.id));

const preview = ({ record, objectUrl, temporary = false }) => {
  const region = element('section', { className: 'documents__preview', 'aria-label': temporary ? 'Selected file preview' : 'Document preview' });
  if (objectUrl) {
    region.append(element('img', { src: objectUrl, alt: temporary ? 'Selected clinical document preview' : 'Clinical document preview' }));
    if (temporary) region.append(element('p', { className: 'documents__preview-caption', text: 'Temporary preview for this browser session.' }));
    return region;
  }
  const icon = lucideIcon(documentType(record?.type).icon);
  region.classList.add('documents__preview--unavailable');
  region.append(icon, element('strong', { text: 'Preview unavailable' }), element('p', { text: 'Preview unavailable in the frontend demo.' }));
  return region;
};

const fieldWithHint = (field, fallback = '') => ({ ...field, hint: field.element.querySelector('.field__hint'), fallback });
const setFieldError = (field, message) => {
  field.element.classList.toggle('field--error', Boolean(message));
  if (message) field.control.setAttribute('aria-invalid', 'true'); else field.control.removeAttribute('aria-invalid');
  if (!field.hint) {
    field.hint = element('p', { id: `${field.control.id}-hint`, className: 'field__hint' });
    field.element.append(field.hint);
    field.control.setAttribute('aria-describedby', field.hint.id);
  }
  field.hint.classList.toggle('field__hint--error', Boolean(message));
  if (message) field.hint.setAttribute('role', 'alert'); else field.hint.removeAttribute('role');
  field.hint.textContent = message || field.fallback;
};

export const renderDocumentWorkspace = ({ state, session, patientId }) => {
  window.__documentGuardCleanup?.();
  const patient = getPatientById(state, patientId);
  if (!patient) return createEmptyState({ title: 'Patient Not Found', message: 'This document route does not expose another patient’s records.', action: { label: 'Back to Patients', onClick: () => { location.hash = '#/patients'; } } });
  const initialPermissions = getDocumentPermissions({ state, patientId, actor: session });
  if (!initialPermissions.canView) return createEmptyState({ title: 'Access Denied', message: 'You do not have permission to view this patient’s clinical documents.', action: { label: 'Return to Dashboard', onClick: () => { location.hash = '#/dashboard'; } } });

  let currentState = state;
  let filter = 'ALL';
  let selectedId = newestFirst(getDocumentsForPatient(currentState, patientId))[0]?.id || null;
  let activeModal = null;
  const page = element('section', { className: 'documents-workspace' });

  const cleanupGuard = () => {
    document.removeEventListener('click', guardNavigation, true);
    window.removeEventListener('beforeunload', guardUnload);
    if (window.__documentGuardCleanup === cleanupGuard) delete window.__documentGuardCleanup;
  };

  const discard = async () => {
    if (!dirtyState.isDirty(DIRTY_SOURCE)) return true;
    const choice = await confirm({ title: 'Discard document changes?', message: 'Your selected file and unsaved document information will be lost.', cancelLabel: 'Stay', confirmLabel: 'Discard', variant: 'danger' });
    if (choice) dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
    return choice;
  };

  const navigate = async route => {
    if (activeModal && !await activeModal.requestClose()) return false;
    if (!activeModal && !await discard()) return false;
    cleanupGuard();
    location.hash = `#/${route}`;
    return true;
  };

  const guardNavigation = async event => {
    const target = event.target.closest('a[href^="#/"]')?.getAttribute('href')?.replace(/^#\//, '');
    if (!target || !dirtyState.isDirty(DIRTY_SOURCE)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    await navigate(target);
  };
  const guardUnload = event => { if (dirtyState.isDirty(DIRTY_SOURCE)) { event.preventDefault(); event.returnValue = ''; } };

  const openCreate = () => {
    const encounters = getEncountersForPatient(currentState, patientId).slice().reverse();
    const fileControl = element('input', { id: 'clinical-document-file', type: 'file', accept: 'image/jpeg,image/png', required: true, 'aria-describedby': 'clinical-document-file-hint' });
    const fileHint = element('p', { id: 'clinical-document-file-hint', className: 'field__hint', text: 'Select one non-empty JPEG or PNG image.' });
    const fileField = { element: element('div', { className: 'field' }, [element('label', { for: fileControl.id, className: 'field__label' }, ['File', element('span', { className: 'field__required', text: ' *', 'aria-label': 'required' })]), fileControl, fileHint]), control: fileControl, hint: fileHint, fallback: 'Select one non-empty JPEG or PNG image.' };
    const typeField = fieldWithHint(createField({ id: 'clinical-document-type', label: 'Type', type: 'select', required: true, value: 'X_RAY', helper: 'Supported types are limited to the current clinical-image model.', options: Object.entries(DOCUMENT_TYPES).map(([value, config]) => ({ value, label: config.label })) }), 'Supported types are limited to the current clinical-image model.');
    const titleField = fieldWithHint(createField({ id: 'clinical-document-title', label: 'Title', required: true, helper: 'Use a concise description of the image.' }), 'Use a concise description of the image.');
    const dateField = fieldWithHint(createField({ id: 'clinical-document-date', label: 'Document Date', type: 'date', value: currentState.referenceDate, max: currentState.referenceDate, required: true, helper: 'Date the image was captured.' }), 'Date the image was captured.');
    const encounterField = fieldWithHint(createField({ id: 'clinical-document-encounter', label: 'Related Encounter', type: 'select', value: '', helper: 'Optional. Historical encounters for this patient are available.', options: [{ value: '', label: 'Not linked to an encounter' }, ...encounters.map(encounter => ({ value: encounter.id, label: `${encounter.encounterNumber} · ${formatDate(encounter.startedAt)}` }))] }), 'Optional. Historical encounters for this patient are available.');
    const notesField = fieldWithHint(createField({ id: 'clinical-document-notes', label: 'Notes', type: 'textarea', helper: 'Optional clinical context only.' }), 'Optional clinical context only.');
    const fields = { file: fileField, type: typeField, title: titleField, capturedAt: dateField, encounterId: encounterField, notes: notesField };
    typeField.control.required = true;
    const validationSummary = element('div', { className: 'alert alert--danger documents-form__validation', role: 'alert', hidden: true }, [element('div', {}, [element('strong', { text: 'Please review the highlighted fields.' }), element('p', { text: 'The document has not been saved.' })])]);
    const previewSlot = element('div', { className: 'documents-form__preview-slot' });
    let selectedFile = null;
    let draftObjectUrl = null;
    let saving = false;
    const objectUrlSupported = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof URL.revokeObjectURL === 'function';
    const baseline = JSON.stringify({ type: 'X_RAY', title: '', capturedAt: currentState.referenceDate, encounterId: '', notes: '', file: null });
    const values = () => ({ type: typeField.control.value, title: titleField.control.value, capturedAt: dateField.control.value, encounterId: encounterField.control.value, notes: notesField.control.value, file: selectedFile ? { name: selectedFile.name, type: selectedFile.type, size: selectedFile.size } : null });
    const cleanupDraftPreview = () => { if (draftObjectUrl && objectUrlSupported) URL.revokeObjectURL(draftObjectUrl); draftObjectUrl = null; };
    const markDirty = () => dirtyState.setUnsavedChanges(JSON.stringify(values()) !== baseline, DIRTY_SOURCE);
    const renderDraftPreview = () => {
      previewSlot.replaceChildren();
      if (draftObjectUrl) previewSlot.append(preview({ record: { type: typeField.control.value }, objectUrl: draftObjectUrl, temporary: true }));
      else previewSlot.append(element('p', { className: 'documents-form__preview-empty', text: selectedFile ? 'A preview is not available for this selection.' : 'Select an image to preview it.' }));
    };
    const clearErrors = () => { Object.values(fields).forEach(field => setFieldError(field, '')); validationSummary.hidden = true; };
    const showErrors = errors => {
      validationSummary.hidden = !Object.keys(errors).length;
      Object.entries(fields).forEach(([key, field]) => setFieldError(field, errors[key] || ''));
      (Object.entries(fields).find(([key]) => errors[key])?.[1].control || fileControl).focus();
    };
    const validateFile = () => {
      if (!selectedFile) return 'Select an image file.';
      if (selectedFile.size <= 0) return 'The selected file is empty.';
      if (!DOCUMENT_TYPES[typeField.control.value]?.accept.includes(selectedFile.type)) return 'Select a supported JPEG or PNG image.';
      return '';
    };
    const requestClose = async () => {
      if (!await discard()) return false;
      cleanupDraftPreview();
      selectedFile = null;
      return true;
    };
    const save = () => {
      if (saving) return;
      clearErrors();
      const uiErrors = {};
      const fileError = validateFile();
      if (fileError) uiErrors.file = fileError;
      if (!DOCUMENT_TYPES[typeField.control.value]) uiErrors.type = 'Select a supported clinical document type.';
      if (!titleField.control.value.trim()) uiErrors.title = 'Document title is required.';
      if (!dateField.control.value) uiErrors.capturedAt = 'Document date is required.';
      if (Object.keys(uiErrors).length) { dirtyState.markUnsavedChanges(DIRTY_SOURCE); showErrors(uiErrors); return; }
      saving = true;
      saveButton.disabled = true;
      try {
        const result = appState.createClinicalDocument({ patientId, type: typeField.control.value, title: titleField.control.value, capturedAt: dateField.control.value, encounterId: encounterField.control.value || null, notes: notesField.control.value, fileMetadata: { fileName: selectedFile.name, mimeType: selectedFile.type, size: selectedFile.size }, actor: session });
        if (draftObjectUrl) {
          registerRuntimeDocumentPreview({ documentId: result.document.id, patientId, objectUrl: draftObjectUrl });
          draftObjectUrl = null;
        }
        dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
        selectedId = result.document.id;
        activeModal?.close();
        activeModal = null;
        currentState = appState.get();
        render();
        showToast({ title: 'Document added.', message: `${DOCUMENT_TYPES[result.document.type].label} metadata saved.`, variant: 'success' });
      } catch (error) {
        const errors = error.fieldErrors || { file: error.message };
        dirtyState.markUnsavedChanges(DIRTY_SOURCE);
        showErrors(errors);
        saving = false;
        saveButton.disabled = false;
      }
    };
    const saveButton = createButton({ label: 'Save Document', onClick: save });
    const form = element('form', { className: 'documents-form', onsubmit: event => { event.preventDefault(); save(); } }, [
      validationSummary,
      element('p', { className: 'documents-form__context', text: `Patient: ${patient.fullName} · ${patient.patientNumber}` }),
      fileField.element,
      previewSlot,
      element('div', { className: 'documents-form__grid' }, [typeField.element, dateField.element]),
      titleField.element,
      encounterField.element,
      notesField.element
    ]);
    renderDraftPreview();
    fileControl.addEventListener('change', () => {
      cleanupDraftPreview();
      selectedFile = fileControl.files?.[0] || null;
      if (objectUrlSupported && selectedFile && selectedFile.size > 0 && DOCUMENT_TYPES[typeField.control.value]?.accept.includes(selectedFile.type)) draftObjectUrl = URL.createObjectURL(selectedFile);
      setFieldError(fileField, validateFile());
      renderDraftPreview();
      markDirty();
    });
    [typeField, titleField, dateField, encounterField, notesField].forEach(field => field.control.addEventListener(field.control.tagName === 'SELECT' ? 'change' : 'input', () => {
      setFieldError(field, '');
      if (field === typeField && selectedFile) setFieldError(fileField, validateFile());
      markDirty();
    }));
    activeModal = openModal({ title: 'Add Document', size: 'large', content: form, footer: element('div', { className: 'button-group documents-form__actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: () => activeModal?.requestClose() }), saveButton]), onRequestClose: requestClose, onClose: () => { cleanupDraftPreview(); activeModal = null; } });
    dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
  };

  const render = () => {
    const documentPermissions = getDocumentPermissions({ state: currentState, patientId, actor: session });
    const allDocuments = newestFirst(getDocumentsForPatient(currentState, patientId));
    const visibleDocuments = filter === 'ALL' ? allDocuments : allDocuments.filter(record => record.type === filter);
    if (!visibleDocuments.some(record => record.id === selectedId)) selectedId = visibleDocuments[0]?.id || null;
    const selected = visibleDocuments.find(record => record.id === selectedId) || null;
    const visit = getClinicalVisitContext(currentState, patientId);
    const allergies = getPatientAllergies(currentState, patientId);
    const context = createPatientContext({ patient: { name: patient.fullName, number: patient.patientNumber, ageSex: `${getPatientAge(patient, currentState.referenceDate)} years · ${formatStatus(patient.sex)}`, status: formatStatus(patient.status), appointment: visit.appointment?.appointmentNumber, dentist: visit.dentist?.fullName, alert: allergies.length ? `Allergy: ${allergies.map(record => record.allergen).join(', ')}` : null }, fields: ['number', 'ageSex', 'appointment', 'dentist'], showAlert: true, actions: [{ label: 'Patient Profile', variant: 'secondary', onClick: () => navigate(`patients/${patientId}`) }, { label: 'Clinical Workspace', variant: 'secondary', onClick: () => navigate(`patients/${patientId}/clinical`) }] });
    const filters = element('div', { className: 'documents__filters', role: 'group', 'aria-label': 'Filter documents by type' }, FILTERS.map(item => {
      const count = item.value === 'ALL' ? allDocuments.length : allDocuments.filter(record => record.type === item.value).length;
      return element('button', { type: 'button', className: `documents__filter${filter === item.value ? ' is-active' : ''}`, 'aria-pressed': String(filter === item.value), text: `${item.label} (${count})`, onclick: () => { filter = item.value; render(); requestAnimationFrame(() => page.querySelector(`.documents__filter[aria-pressed="true"]`)?.focus()); } });
    }));
    const list = visibleDocuments.length ? element('div', { className: 'documents__list', 'aria-label': 'Patient clinical documents' }, visibleDocuments.map(record => {
      const config = documentType(record.type);
      const typeIcon = lucideIcon(config.icon);
      return element('button', { type: 'button', className: `documents__item${record.id === selectedId ? ' is-selected' : ''}`, 'aria-pressed': String(record.id === selectedId), onclick: () => { selectedId = record.id; render(); requestAnimationFrame(() => page.querySelector(`.documents__item[aria-pressed="true"]`)?.focus()); } }, [element('span', { className: 'documents__item-icon' }, [typeIcon]), element('span', { className: 'documents__item-copy' }, [element('strong', { text: record.title }), element('span', { text: `${config.label} · ${formatDate(record.capturedAt)}` }), element('small', { text: record.fileName })]), createBadge({ label: config.label, variant: record.type === 'X_RAY' ? 'info' : 'neutral' })]);
    })) : createEmptyState({ title: 'No documents in this view', message: filter === 'ALL' ? 'No clinical documents have been recorded for this patient.' : 'Try another document type filter.' });
    const listCard = createCard({ title: 'Document Library', subtitle: `${allDocuments.length} document${allDocuments.length === 1 ? '' : 's'} recorded.`, content: element('div', { className: 'documents__library' }, [filters, list]) });
    const detailCard = selected ? (() => {
      const encounter = selected.encounterId ? currentState.clinicalEncounters.find(item => item.id === selected.encounterId) : null;
      const objectUrl = getRuntimeDocumentPreview(selected.id, patientId);
      return createCard({ title: selected.title, subtitle: `${documentType(selected.type).label} · ${formatDate(selected.capturedAt)}`, content: element('div', { className: 'documents__selected' }, [preview({ record: selected, objectUrl }), element('dl', { className: 'documents__details' }, [detail('Type', documentType(selected.type).label), detail('Document Date', formatDate(selected.capturedAt)), detail('Uploaded By', person(currentState, selected.uploadedByUserId)), detail('Related Encounter', encounter?.encounterNumber || 'Not linked'), detail('Filename', selected.fileName || 'Not recorded'), detail('File Type', selected.mimeType || 'Not recorded'), detail('File Size', formatBytes(selected.fileSizeBytes)), detail('Notes', selected.notes || 'No notes recorded.')])]) });
    })() : createEmptyState({ title: 'No document selected', message: visibleDocuments.length ? 'Select a document to review its metadata.' : 'Document details will appear here.' });
    page.replaceChildren(createPageHeader({ title: 'Documents', description: 'Review clinical image metadata and available temporary previews.', actions: documentPermissions.canCreate ? [{ label: 'Add Document', onClick: openCreate }] : [] }), context, element('div', { className: 'documents__grid' }, [listCard, element('div', { className: 'documents__detail-region', 'aria-live': 'polite' }, [detailCard]) ]));
  };

  document.addEventListener('click', guardNavigation, true);
  window.addEventListener('beforeunload', guardUnload);
  window.__documentGuardCleanup = cleanupGuard;
  render();
  return page;
};
