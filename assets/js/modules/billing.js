import { clear, element } from '../components/dom.js';
import { createBadge, createButton, createCard, createEmptyState, createField, createFilterBar, createKpiCard, createPageHeader, createSearch } from '../components/primitives.js';
import { createPagination, createTable } from '../components/data-display.js';
import { createPrintDocument, createPrintSection, createPrintTable, printCurrentDocument } from '../components/print-documents.js';
import { confirm, openDrawer, openModal, showToast } from '../components/overlays.js';
import { dirtyState } from '../core/dirty-state.js';
import { state as appState } from '../core/state.js';
import { storage } from '../core/storage.js';
import { getInvoicePermissions } from '../data/invoice-workflows.js';
import { calculateInvoiceBalance, calculateInvoicePaid, calculateInvoiceTotal, deriveInvoiceStatus, getInvoiceItems, getPaymentsForInvoice, getReceiptsForInvoice, getOutstandingBalance } from '../data/finance.js';
import { formatDate, formatStatus, formatUGX } from '../utils/formatters.js';
import { openPaymentModal } from './payments.js';

const DIRTY_SOURCE = 'invoice';
const PAYMENT_DIRTY_SOURCE = 'payment';
const PAGE_SIZE = 8;
const statusVariant = status => ({ PAID: 'success', PARTIALLY_PAID: 'warning', ISSUED: 'info', VOID: 'neutral' }[status] || 'neutral');
const patientFor = (state, id) => state.patients.find(patient => patient.id === id) || null;
const serviceFor = (state, id) => state.services.find(service => service.id === id) || null;
const procedureLabel = (state, procedure) => `${procedure.procedureNumber} — ${serviceFor(state, procedure.serviceId)?.name || procedure.serviceCode}${procedure.toothCode ? ` · Tooth ${procedure.toothCode}` : ''}`;
const setFieldError = (field, message = '') => {
  field.element.classList.toggle('field--error', Boolean(message));
  field.control.setAttribute('aria-invalid', String(Boolean(message)));
  let hint = field.element.querySelector('.field__hint');
  if (!hint && message) { hint = element('p', { className: 'field__hint field__hint--error', role: 'alert' }); field.element.append(hint); }
  if (hint) { hint.textContent = message; hint.classList.toggle('field__hint--error', Boolean(message)); hint.toggleAttribute('role', Boolean(message)); }
};

const invoiceMetrics = (state, invoice) => ({ total: calculateInvoiceTotal(state, invoice.id), paid: calculateInvoicePaid(state, invoice.id), balance: calculateInvoiceBalance(state, invoice.id), status: deriveInvoiceStatus(state, invoice.id) });

const invoicePrintDocument = (state, invoice, patient, metrics, items) => createPrintDocument({
  state,
  kind: 'invoice',
  title: 'Invoice',
  reference: invoice.invoiceNumber,
  subtitle: `Issued ${formatDate(invoice.issuedAt)}`,
  context: [
    ['Patient', patient.fullName],
    ['Patient ID', patient.patientNumber],
    ['Status', formatStatus(metrics.status)]
  ],
  metrics: [['Invoice Total', formatUGX(metrics.total)], ['Paid', formatUGX(metrics.paid)], ['Balance', formatUGX(metrics.balance), true]],
  sections: [
    createPrintSection({
      title: 'Invoice Items',
      content: createPrintTable({
        columns: [{ label: 'Description', key: 'description' }, { label: 'Qty', key: 'quantity', numeric: true }, { label: 'Unit Price', key: 'unitPrice', numeric: true }, { label: 'Line Total', key: 'lineTotal', numeric: true }],
        rows: items.map(item => ({ description: item.description, quantity: item.quantity, unitPrice: formatUGX(item.unitPrice), lineTotal: formatUGX(item.lineTotal) })),
        emptyMessage: 'No line items recorded.'
      })
    }),
    invoice.notes ? createPrintSection({ title: 'Invoice Note', content: element('p', { text: invoice.notes }) }) : null
  ].filter(Boolean),
  note: 'Amounts are shown in Uganda Shillings (UGX).'
});

export const openInvoiceDetails = ({ state, invoice, onClose } = {}) => {
  const patient = invoice && patientFor(state, invoice.patientId);
  if (!patient) return null;
  const metrics = invoiceMetrics(state, invoice), items = getInvoiceItems(state, invoice.id), payments = getPaymentsForInvoice(state, invoice.id), receipts = getReceiptsForInvoice(state, invoice.id);
  const summary = element('dl', { className: 'billing__summary', 'aria-label': 'Invoice financial summary' }, [['Invoice total', metrics.total], ['Paid', metrics.paid], ['Balance', metrics.balance]].map(([label, amount]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: formatUGX(amount) })])));
  const itemRows = items.map(item => element('li', { className: 'billing__item' }, [element('div', {}, [element('strong', { text: item.description }), element('span', { text: `${item.quantity} × ${formatUGX(item.unitPrice)}` })]), element('strong', { text: formatUGX(item.lineTotal) })]));
  const paymentRows = payments.length ? element('ul', { className: 'billing__history-list' }, payments.map(payment => element('li', {}, [element('strong', { text: `${payment.paymentNumber} · ${formatUGX(payment.amount)}` }), element('span', { text: `${formatDate(payment.receivedAt)} · ${formatStatus(payment.paymentMethodCode)}` })]))) : element('p', { className: 'billing__muted', text: 'No payments have been recorded for this invoice.' });
  const receiptText = receipts.length ? receipts.map(receipt => receipt.receiptNumber).join(', ') : 'No receipts issued.';
  let overlay;
  overlay = openDrawer({ title: `Invoice ${invoice.invoiceNumber}`, size: 'large', content: element('div', { className: 'billing__detail' }, [element('div', { className: 'billing__detail-heading' }, [element('div', {}, [element('p', { className: 'eyebrow', text: `${patient.fullName} · ${patient.patientNumber}` }), element('p', { text: `Issued ${formatDate(invoice.issuedAt)}` })]), createBadge({ label: formatStatus(metrics.status), variant: statusVariant(metrics.status) })]), summary, createCard({ title: 'Line Items', content: items.length ? element('ul', { className: 'billing__items' }, itemRows) : element('p', { className: 'billing__muted', text: 'No line items recorded.' }) }), createCard({ title: 'Payment History', subtitle: 'Posted payments are immutable financial history.', content: paymentRows }), createCard({ title: 'Receipt References', content: element('p', { className: 'billing__muted', text: receiptText }) }), invoice.notes ? createCard({ title: 'Invoice Note', content: element('p', { className: 'billing__notes', text: invoice.notes }) }) : null, invoicePrintDocument(state, invoice, patient, metrics, items)]), footer: element('div', { className: 'button-group' }, [createButton({ label: 'Print Invoice', onClick: printCurrentDocument }), createButton({ label: 'Close', variant: 'secondary', onClick: () => overlay?.close() })]), onClose });
  return overlay;
};

export const renderBillingWorkspace = ({ state: initialState, session }) => {
  let currentState = initialState, activeOverlay = null, pageNumber = 1;
  const contextualPatientId = storage.get('billing-patient-context', null);
  const filters = { search: '', status: '', patientId: contextualPatientId && patientFor(initialState, contextualPatientId) ? contextualPatientId : '' };
  storage.remove('billing-patient-context');
  const page = element('section', { className: 'billing-workspace' });
  const region = element('div', { className: 'billing-workspace__region', 'aria-live': 'polite' });
  const can = () => getInvoicePermissions({ state: currentState, actor: session });
  const closeGuard = async () => {
    if (!dirtyState.isDirty(DIRTY_SOURCE)) return true;
    const discard = await confirm({ title: 'Discard invoice draft?', message: 'Your unsaved invoice and line items will be lost.', confirmLabel: 'Discard Draft', variant: 'danger' });
    if (discard) dirtyState.clearUnsavedChanges(DIRTY_SOURCE);
    return discard;
  };
  const cleanup = () => { document.removeEventListener('click', guardNavigation, true); window.removeEventListener('beforeunload', guardUnload); window.removeEventListener('hashchange', cleanup); };
  const guardNavigation = async event => {
    const link = event.target.closest('a[href^="#/"]'); const target = link?.getAttribute('href')?.replace(/^#\//, '');
    if (!target || (!dirtyState.isDirty(DIRTY_SOURCE) && !dirtyState.isDirty(PAYMENT_DIRTY_SOURCE))) { if (target) cleanup(); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    if (activeOverlay && !await activeOverlay.requestClose()) return;
    if (!activeOverlay && dirtyState.isDirty(DIRTY_SOURCE) && !await closeGuard()) return;
    cleanup(); location.hash = `#/${target}`;
  };
  const guardUnload = event => { if (!dirtyState.isDirty(DIRTY_SOURCE)) return; event.preventDefault(); event.returnValue = ''; };

  const openCreateInvoice = () => {
    const draft = { patientId: filters.patientId || '', notes: '', items: [] };
    const baseline = () => JSON.stringify(draft);
    const initial = baseline();
    const patient = createField({ id: 'invoice-patient', label: 'Patient', type: 'select', required: true, options: [{ value: '', label: 'Select patient' }, ...currentState.patients.map(item => ({ value: item.id, label: `${item.fullName} — ${item.patientNumber}` }))] });
    patient.control.value = draft.patientId;
    const notes = createField({ id: 'invoice-notes', label: 'Invoice Note', type: 'textarea', helper: 'Optional billing context only; do not enter clinical notes.' });
    const formError = element('p', { className: 'billing__form-error', role: 'alert', hidden: true });
    const itemList = element('div', { className: 'billing-form__items' });
    const totals = element('dl', { className: 'billing__summary billing__summary--draft', 'aria-label': 'Draft invoice totals' });
    let saving = false;
    const setDirty = () => dirtyState.setUnsavedChanges(baseline() !== initial, DIRTY_SOURCE);
    const eligibleProcedures = () => currentState.proceduresPerformed.filter(procedure => procedure.status === 'COMPLETED' && procedure.patientId === draft.patientId && !currentState.invoiceItems.some(item => item.procedureId === procedure.id));
    const renderDraft = () => {
      clear(itemList);
      draft.items.forEach((draftItem, index) => {
        const source = createField({ id: `invoice-source-${draftItem.key}`, label: `Line ${index + 1} source`, type: 'select', options: [{ value: 'service', label: 'Service catalogue' }, { value: 'procedure', label: 'Completed procedure' }] }); source.control.value = draftItem.source;
        const sourceOptions = draftItem.source === 'procedure' ? [{ value: '', label: draft.patientId ? 'Select completed procedure' : 'Select a patient first' }, ...eligibleProcedures().map(procedure => ({ value: procedure.id, label: procedureLabel(currentState, procedure) }))] : [{ value: '', label: 'Select service' }, ...currentState.services.filter(service => service.status === 'active').map(service => ({ value: service.id, label: `${service.code} — ${service.name} (${formatUGX(service.defaultPrice)})` }))];
        const service = createField({ id: `invoice-service-${draftItem.key}`, label: draftItem.source === 'procedure' ? 'Completed procedure' : 'Service', type: 'select', required: true, disabled: draftItem.source === 'procedure' && !draft.patientId, options: sourceOptions });
        service.control.value = draftItem.source === 'procedure' ? draftItem.procedureId : draftItem.serviceId;
        const quantity = createField({ id: `invoice-quantity-${draftItem.key}`, label: 'Quantity', type: 'number', required: true, value: String(draftItem.quantity), min: 1, inputMode: 'numeric', disabled: draftItem.source === 'procedure' });
        const chosenProcedure = draftItem.procedureId ? currentState.proceduresPerformed.find(procedure => procedure.id === draftItem.procedureId) : null;
        const chosenService = serviceFor(currentState, draftItem.serviceId || chosenProcedure?.serviceId);
        const unitPrice = chosenProcedure ? chosenProcedure.amountSnapshot : chosenService?.defaultPrice;
        const amount = Number.isInteger(Number(draftItem.quantity)) && Number.isSafeInteger(unitPrice) ? Number(draftItem.quantity) * unitPrice : 0;
        const remove = createButton({ label: `Remove line ${index + 1}`, variant: 'ghost', size: 'small', icon: '×', iconOnly: true, onClick: () => { draft.items.splice(index, 1); setDirty(); renderDraft(); } });
        const row = element('section', { className: 'billing-form__item', 'aria-label': `Invoice line ${index + 1}` }, [element('header', {}, [element('strong', { text: `Line item ${index + 1}` }), remove]), source.element, service.element, quantity.element, element('p', { className: 'billing-form__amount', text: `Line total: ${formatUGX(amount)}` })]);
        source.control.addEventListener('change', () => { draftItem.source = source.control.value; draftItem.serviceId = ''; draftItem.procedureId = ''; draftItem.quantity = 1; setDirty(); renderDraft(); });
        service.control.addEventListener('change', () => { if (draftItem.source === 'procedure') { const procedure = currentState.proceduresPerformed.find(item => item.id === service.control.value); draftItem.procedureId = procedure?.id || ''; draftItem.serviceId = procedure?.serviceId || ''; draftItem.quantity = 1; } else draftItem.serviceId = service.control.value; setDirty(); renderDraft(); });
        quantity.control.addEventListener('input', () => { draftItem.quantity = quantity.control.value; setDirty(); renderDraft(); });
        itemList.append(row);
      });
      const sum = draft.items.reduce((total, item) => { const procedure = item.procedureId ? currentState.proceduresPerformed.find(candidate => candidate.id === item.procedureId) : null; const service = serviceFor(currentState, item.serviceId); const price = procedure?.amountSnapshot ?? service?.defaultPrice; const quantity = Number(item.quantity); return total + (Number.isSafeInteger(price) && Number.isInteger(quantity) && quantity > 0 ? price * quantity : 0); }, 0);
      totals.replaceChildren(...[['Subtotal', sum], ['Paid', 0], ['Balance', sum]].map(([label, amount]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: formatUGX(amount) })])));
    };
    patient.control.addEventListener('change', () => { draft.patientId = patient.control.value; draft.items.forEach(item => { if (item.source === 'procedure') { item.serviceId = ''; item.procedureId = ''; } }); setDirty(); renderDraft(); });
    notes.control.addEventListener('input', () => { draft.notes = notes.control.value; setDirty(); });
    const addItem = () => { draft.items.push({ key: crypto.randomUUID(), source: 'service', serviceId: '', procedureId: '', quantity: 1 }); setDirty(); renderDraft(); };
    const save = () => {
      if (saving) return; saving = true; saveButton.disabled = true; formError.hidden = true;
      try {
        const result = appState.createInvoice({ patientId: draft.patientId, notes: draft.notes, items: draft.items.map(item => ({ serviceId: item.serviceId, procedureId: item.procedureId || null, quantity: Number(item.quantity) })), actor: session });
        dirtyState.clearUnsavedChanges(DIRTY_SOURCE); activeOverlay?.close(); activeOverlay = null; currentState = appState.get(); pageNumber = 1; renderResults(); showToast({ title: 'Invoice created.', message: `${result.invoice.invoiceNumber} is ready for payment collection.`, variant: 'success' });
      } catch (error) {
        const errors = error.fieldErrors || {}; setFieldError(patient, errors.patientId); formError.textContent = Object.values(errors)[0] || error.message; formError.hidden = false; dirtyState.markUnsavedChanges(DIRTY_SOURCE); saving = false; saveButton.disabled = false; (errors.patientId ? patient.control : itemList.querySelector('select, input') || patient.control).focus();
      }
    };
    const saveButton = createButton({ label: 'Create Invoice', onClick: save });
    const addButton = createButton({ label: 'Add Line Item', variant: 'secondary', onClick: addItem });
    const content = element('form', { className: 'billing-form', onsubmit: event => { event.preventDefault(); save(); } }, [formError, patient.element, element('section', { className: 'billing-form__line-items' }, [element('header', {}, [element('div', {}, [element('h3', { text: 'Line Items' }), element('p', { text: 'Select a catalogue service or explicitly bill one eligible completed procedure.' })]), addButton]), itemList]), totals, notes.element]);
    activeOverlay = openModal({ title: 'Create Invoice', size: 'large', content, footer: element('div', { className: 'button-group billing-form__actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: () => activeOverlay?.requestClose() }), saveButton]), onRequestClose: closeGuard, onClose: () => { activeOverlay = null; } });
    dirtyState.clearUnsavedChanges(DIRTY_SOURCE); renderDraft();
  };

  const metricsRegion = element('div', { className: 'billing-workspace__metrics' });
  const results = element('div', { className: 'billing-workspace__results', 'aria-live': 'polite' });
  const search = createSearch({ label: 'Search invoices by invoice number, patient, or phone', placeholder: 'Search invoice or patient…', value: filters.search, onInput: value => { filters.search = value; pageNumber = 1; renderResults(); } });
  const searchInput = search.querySelector('input'), clearSearch = search.querySelector('[aria-label="Clear search"]');
  const status = createField({ id: 'invoice-status-filter', label: 'Status', type: 'select', options: [{ value: '', label: 'All statuses' }, ...['ISSUED', 'PARTIALLY_PAID', 'PAID'].map(value => ({ value, label: formatStatus(value) }))] });
  const patientFilter = createField({ id: 'invoice-patient-filter', label: 'Patient', type: 'select', options: [{ value: '', label: 'All patients' }, ...currentState.patients.map(patient => ({ value: patient.id, label: `${patient.fullName} — ${patient.patientNumber}` }))] });
  status.control.value = filters.status; patientFilter.control.value = filters.patientId;
  status.control.addEventListener('change', () => { filters.status = status.control.value; pageNumber = 1; renderResults(); });
  patientFilter.control.addEventListener('change', () => { filters.patientId = patientFilter.control.value; pageNumber = 1; renderResults(); });
  const reset = () => {
    filters.search = ''; filters.status = ''; filters.patientId = ''; pageNumber = 1;
    searchInput.value = ''; clearSearch.hidden = true; status.control.value = ''; patientFilter.control.value = '';
    renderResults();
  };
  const card = createCard({ title: 'Invoice Register', subtitle: 'Invoices shown. Financial totals are derived from invoice items and posted payments.', content: element('div', { className: 'billing-workspace__list' }, [createFilterBar({ children: [search, status.element, patientFilter.element], onReset: reset }), results]) });
  const subtitle = card.querySelector('.card__subtitle');

  const renderResults = () => {
    const all = currentState.invoices.slice().sort((left, right) => right.issuedAt.localeCompare(left.issuedAt) || right.invoiceNumber.localeCompare(left.invoiceNumber));
    const query = filters.search.trim().toLowerCase();
    const visible = all.filter(invoice => { const patient = patientFor(currentState, invoice.patientId); const metrics = invoiceMetrics(currentState, invoice); return (!filters.status || metrics.status === filters.status) && (!filters.patientId || invoice.patientId === filters.patientId) && (!query || [invoice.invoiceNumber, patient?.fullName, patient?.patientNumber, patient?.phone].some(value => String(value || '').toLowerCase().includes(query))); });
    const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE)); pageNumber = Math.min(pageNumber, totalPages);
    const pageInvoices = visible.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);
    const rows = pageInvoices.map(invoice => { const patient = patientFor(currentState, invoice.patientId), metrics = invoiceMetrics(currentState, invoice); return { number: invoice.invoiceNumber, patient: patient ? `${patient.fullName} · ${patient.patientNumber}` : 'Unknown patient', date: formatDate(invoice.issuedAt), total: formatUGX(metrics.total), paid: formatUGX(metrics.paid), balance: formatUGX(metrics.balance), status: { label: formatStatus(metrics.status), variant: statusVariant(metrics.status) }, actions: [{ label: 'View invoice details', icon: 'file-text', onClick: () => { activeOverlay = openInvoiceDetails({ state: currentState, invoice, onClose: () => { activeOverlay = null; } }); } }, ...(can().canCreate && metrics.balance > 0 ? [{ label: 'Record payment', icon: 'wallet', onClick: () => { activeOverlay = openPaymentModal({ state: currentState, session, invoiceId: invoice.id, onRecorded: () => { currentState = appState.get(); activeOverlay = null; renderResults(); } }); } }] : [])] }; });
    const table = createTable({ stickyHeader: true, rows, columns: [{ label: 'Invoice', key: 'number' }, { label: 'Patient', key: 'patient' }, { label: 'Date', key: 'date' }, { label: 'Total', key: 'total', numeric: true }, { label: 'Paid', key: 'paid', numeric: true }, { label: 'Balance', key: 'balance', numeric: true }, { label: 'Status', key: 'status', type: 'badge' }, { label: 'Actions', key: 'actions', type: 'actions' }], empty: { title: 'No invoices found', message: 'Try another search or filter.' } });
    const outstanding = getOutstandingBalance(currentState), issuedCount = currentState.invoices.filter(invoice => deriveInvoiceStatus(currentState, invoice.id) === 'ISSUED').length;
    metricsRegion.replaceChildren(createKpiCard({ label: 'Outstanding Balance', value: formatUGX(outstanding), icon: 'wallet', context: 'Across active invoice balances' }), createKpiCard({ label: 'Invoices', value: String(currentState.invoices.length), icon: 'file-text', context: `${issuedCount} awaiting payment` }));
    subtitle.textContent = `${visible.length} invoice${visible.length === 1 ? '' : 's'} shown. Financial totals are derived from invoice items and posted payments.`;
    results.replaceChildren(table, createPagination({ page: pageNumber, totalPages, summary: `Showing ${visible.length ? (pageNumber - 1) * PAGE_SIZE + 1 : 0}–${Math.min(pageNumber * PAGE_SIZE, visible.length)} of ${visible.length}`, onChange: nextPage => { pageNumber = nextPage; renderResults(); } }));
  };
  region.append(metricsRegion, card);
  page.append(createPageHeader({ title: 'Invoices', description: 'Review financial obligations, payment-derived balances, and explicit billable items.', actions: can().canCreate ? [{ label: 'Create Invoice', onClick: openCreateInvoice }] : [] }), region);
  document.addEventListener('click', guardNavigation, true); window.addEventListener('beforeunload', guardUnload); window.addEventListener('hashchange', cleanup, { once: true });
  renderResults(); return page;
};
