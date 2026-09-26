import { clear, element } from '../components/dom.js';
import { createBadge, createButton, createCard, createField, createFilterBar, createPageHeader, createSearch } from '../components/primitives.js';
import { createPagination, createTable } from '../components/data-display.js';
import { confirm, openDrawer, openModal, showToast } from '../components/overlays.js';
import { dirtyState } from '../core/dirty-state.js';
import { state as appState } from '../core/state.js';
import { getInvoiceById, calculateInvoiceBalance, calculateInvoicePaid, calculateInvoiceTotal, getReceiptsForPayment } from '../data/finance.js';
import { getPaymentPermissions, paymentMethodLabel } from '../data/payment-workflows.js';
import { clinicBranding } from '../data/branding.js';
import { formatDate, formatStatus, formatTime, formatUGX } from '../utils/formatters.js';

const DIRTY_SOURCE = 'payment';
const PAGE_SIZE = 8;
const patientFor = (state, id) => state.patients.find(patient => patient.id === id) || null;
const personFor = (state, id) => state.users.find(user => user.id === id)?.fullName || 'Not recorded';
const statusVariant = status => status === 'POSTED' || status === 'ISSUED' ? 'success' : 'neutral';
const metrics = (state, invoice) => ({ total: calculateInvoiceTotal(state, invoice.id), paid: calculateInvoicePaid(state, invoice.id), balance: calculateInvoiceBalance(state, invoice.id) });
const setError = (field, message = '') => { field.element.classList.toggle('field--error', Boolean(message)); field.control.setAttribute('aria-invalid', String(Boolean(message))); let hint = field.element.querySelector('.field__hint'); if (!hint && message) { hint = element('p', { className: 'field__hint field__hint--error', role: 'alert' }); field.element.append(hint); } if (hint) { hint.textContent = message; hint.classList.toggle('field__hint--error', Boolean(message)); hint.toggleAttribute('role', Boolean(message)); } };

export const openReceiptDrawer = ({ state, receipt, onClose } = {}) => {
  const payment = state.payments.find(item => item.id === receipt.paymentId), invoice = payment && getInvoiceById(state, payment.invoiceId), patient = payment && patientFor(state, payment.patientId);
  if (!payment || !invoice || !patient) return null;
  const branch = state.branches.find(item => item.id === receipt.branchId), receiptDate = `${formatDate(receipt.issuedAt)} - ${formatTime(receipt.issuedAt)}`;
  const detail = (key, label, value, attributes = {}) => element('div', { className: `receipt-print__field receipt-print__field--${key}`, ...attributes }, [element('dt', { text: label }), element('dd', { text: value })]);
  const printable = element('article', { className: 'receipt-print', 'aria-label': `Receipt ${receipt.receiptNumber}` }, [
    element('header', { className: 'receipt-print__brand' }, [
      element('img', { src: clinicBranding.logoUrl, alt: `${clinicBranding.clinicName} logo`, onerror: event => { event.currentTarget.hidden = true; } }),
      element('div', {}, [
        element('h1', { text: clinicBranding.clinicName }),
        element('p', { text: branch?.name || 'Kampala Main Branch' }),
        element('p', { text: [branch?.phone || state.organization.phone, branch?.email || state.organization.email].filter(Boolean).join(' - ') })
      ])
    ]),
    element('div', { className: 'receipt-print__title' }, [
      element('h2', { text: 'Payment Receipt' }),
      element('strong', { text: receipt.receiptNumber }),
      element('time', { datetime: receipt.issuedAt, text: receiptDate, 'data-print-only': true })
    ]),
    element('div', { className: 'receipt-print__details' }, [
      element('section', { className: 'receipt-print__context', 'aria-labelledby': 'receipt-context-title' }, [
        element('h3', { id: 'receipt-context-title', text: 'Billed to / received from', 'data-print-only': true }),
        element('dl', {}, [
          detail('patient', 'Patient', patient.fullName),
          detail('patient-id', 'Patient ID', patient.patientNumber),
          detail('invoice', 'Invoice', invoice.invoiceNumber)
        ])
      ]),
      element('dl', { className: 'receipt-print__amount', 'aria-label': 'Amount received' }, [detail('amount', 'Amount received', formatUGX(receipt.amount))]),
      element('section', { className: 'receipt-print__payment', 'aria-labelledby': 'receipt-payment-title' }, [
        element('h3', { id: 'receipt-payment-title', text: 'Payment details', 'data-print-only': true }),
        element('dl', {}, [
          detail('method', 'Payment method', paymentMethodLabel(payment.paymentMethodCode)),
          detail('reference', 'Reference', payment.transactionReference || 'Not provided'),
          detail('received-by', 'Received by', personFor(state, payment.receivedByUserId)),
          detail('receipt-date', 'Receipt date', receiptDate, { 'data-print-screen-only': true }),
          detail('balance', 'Remaining balance', formatUGX(calculateInvoiceBalance(state, invoice.id)))
        ])
      ])
    ])
  ]);
  let overlay = openDrawer({ title: `Receipt ${receipt.receiptNumber}`, size: 'large', content: printable, footer: element('div', { className: 'button-group' }, [createButton({ label: 'Print Receipt', onClick: () => window.print() }), createButton({ label: 'Close', variant: 'secondary', onClick: () => overlay.close() })]), onClose });
  return overlay;
};

export const openPaymentModal = ({ state: initialState, session, invoiceId = '', onRecorded } = {}) => {
  let currentState = initialState, saving = false, overlay;
  const eligible = () => currentState.invoices.filter(invoice => calculateInvoiceBalance(currentState, invoice.id) > 0 && invoice.status !== 'VOID');
  const invoice = createField({ id: 'payment-invoice', label: 'Invoice', type: 'select', required: true, options: [{ value: '', label: 'Select outstanding invoice' }, ...eligible().map(item => ({ value: item.id, label: `${item.invoiceNumber} — ${patientFor(currentState, item.patientId)?.fullName || 'Unknown patient'} (${formatUGX(calculateInvoiceBalance(currentState, item.id))})` }))] }); invoice.control.value = eligible().some(item => item.id === invoiceId) ? invoiceId : '';
  const amount = createField({ id: 'payment-amount', label: 'Amount Received (UGX)', type: 'number', required: true, min: 1, inputMode: 'numeric', helper: 'Whole UGX amount; it cannot exceed the outstanding balance.' });
  const method = createField({ id: 'payment-method', label: 'Payment Method', type: 'select', required: true, options: [{ value: '', label: 'Select payment method' }, ...currentState.paymentMethods.filter(item => item.status === 'active').map(item => ({ value: item.code, label: item.name }))] });
  const reference = createField({ id: 'payment-reference', label: 'Transaction Reference', helper: 'Optional for cash; this is not verified against an external provider.' });
  const notes = createField({ id: 'payment-notes', label: 'Payment Note', type: 'textarea', helper: 'Optional operational note. Do not enter clinical notes.' });
  const context = element('dl', { className: 'payment-form__context', 'aria-label': 'Invoice settlement summary' }), error = element('p', { className: 'billing__form-error', role: 'alert', hidden: true });
  const values = () => ({ invoiceId: invoice.control.value, amount: amount.control.value, paymentMethodCode: method.control.value, transactionReference: reference.control.value, notes: notes.control.value }); const initial = JSON.stringify(values()); const markDirty = () => dirtyState.setUnsavedChanges(JSON.stringify(values()) !== initial, DIRTY_SOURCE);
  const renderContext = () => { clear(context); const chosen = getInvoiceById(currentState, invoice.control.value); if (!chosen) { context.append(element('div', { className: 'payment-form__context-empty', text: 'Select an outstanding invoice to view patient and settlement details.' })); return; } const patient = patientFor(currentState, chosen.patientId), totals = metrics(currentState, chosen); amount.control.max = String(totals.balance); context.append(...[['Patient', patient ? `${patient.fullName} · ${patient.patientNumber}` : 'Not found'], ['Invoice', chosen.invoiceNumber], ['Invoice Total', formatUGX(totals.total)], ['Already Paid', formatUGX(totals.paid)], ['Current Balance', formatUGX(totals.balance)]].map(([label, value]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: value })]))); };
  const discard = async () => { if (!dirtyState.isDirty(DIRTY_SOURCE)) return true; const answer = await confirm({ title: 'Discard payment entry?', message: 'The payment has not been recorded. Your unsaved entry will be lost.', confirmLabel: 'Discard Payment', cancelLabel: 'Stay', variant: 'danger' }); if (answer) dirtyState.clearUnsavedChanges(DIRTY_SOURCE); return answer; };
  const save = () => { if (saving) return; saving = true; saveButton.disabled = true; error.hidden = true; try { const result = appState.recordPayment({ ...values(), amount: Number(amount.control.value), actor: session }); dirtyState.clearUnsavedChanges(DIRTY_SOURCE); overlay?.close(); currentState = appState.get(); onRecorded?.(result); showToast({ title: 'Payment recorded.', message: `${result.payment.paymentNumber} posted and receipt ${result.receipt.receiptNumber} issued.`, variant: 'success' }); } catch (caught) { const errors = caught.fieldErrors || {}; setError(invoice, errors.invoiceId); setError(amount, errors.amount); setError(method, errors.paymentMethodCode); setError(reference, errors.transactionReference); setError(notes, errors.notes); error.textContent = Object.values(errors)[0] || caught.message; error.hidden = false; dirtyState.markUnsavedChanges(DIRTY_SOURCE); saving = false; saveButton.disabled = false; (errors.invoiceId ? invoice.control : errors.amount ? amount.control : errors.paymentMethodCode ? method.control : invoice.control).focus(); } };
  [invoice.control, amount.control, method.control, reference.control, notes.control].forEach(control => control.addEventListener(control === invoice.control || control === method.control ? 'change' : 'input', () => { markDirty(); if (control === invoice.control) renderContext(); }));
  const saveButton = createButton({ label: 'Record Payment', onClick: save }); overlay = openModal({ title: 'Record Payment', size: 'large', content: element('form', { className: 'payment-form', onsubmit: event => { event.preventDefault(); save(); } }, [error, context, invoice.element, amount.element, method.element, reference.element, notes.element]), footer: element('div', { className: 'button-group billing-form__actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: () => overlay?.requestClose() }), saveButton]), onRequestClose: discard, onClose: () => { overlay = null; } }); dirtyState.clearUnsavedChanges(DIRTY_SOURCE); renderContext(); return overlay;
};

const paymentDetails = ({ state, payment, session }) => { const invoice = getInvoiceById(state, payment.invoiceId), patient = patientFor(state, payment.patientId), receipt = getReceiptsForPayment(state, payment.id)[0]; let overlay; overlay = openDrawer({ title: `Payment ${payment.paymentNumber}`, size: 'large', content: element('div', { className: 'billing__detail' }, [element('dl', { className: 'payment-detail__grid' }, [['Patient', patient ? `${patient.fullName} · ${patient.patientNumber}` : 'Not found'], ['Invoice', invoice?.invoiceNumber || 'Not found'], ['Amount', formatUGX(payment.amount)], ['Method', paymentMethodLabel(payment.paymentMethodCode)], ['Status', formatStatus(payment.status)], ['Received', `${formatDate(payment.receivedAt)} · ${formatTime(payment.receivedAt)}`], ['Received by', personFor(state, payment.receivedByUserId)], ['Reference', payment.transactionReference || 'Not provided'], ['Note', payment.notes || 'No payment note recorded.']].map(([label, value]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: value })]))), receipt ? createButton({ label: `View Receipt ${receipt.receiptNumber}`, variant: 'secondary', onClick: () => openReceiptDrawer({ state, receipt }) }) : null]), footer: createButton({ label: 'Close', variant: 'secondary', onClick: () => overlay.close() }) }); return overlay; };

export const renderPaymentsWorkspace = ({ state: initialState, session }) => {
  let currentState = initialState, pageNumber = 1, activeModal = null; const filters = { search: '', method: '' }, page = element('section', { className: 'billing-workspace' }), region = element('div', { className: 'billing-workspace__region', 'aria-live': 'polite' });
  const cleanup = () => { document.removeEventListener('click', guardNavigation, true); window.removeEventListener('beforeunload', guardUnload); window.removeEventListener('hashchange', cleanup); };
  const guardNavigation = async event => { const link = event.target.closest('a[href^="#/"]'), target = link?.getAttribute('href')?.replace(/^#\//, ''); if (!target || !dirtyState.isDirty(DIRTY_SOURCE)) { if (target) cleanup(); return; } event.preventDefault(); event.stopImmediatePropagation(); if (activeModal && !await activeModal.requestClose()) return; if (!activeModal) { const discard = await confirm({ title: 'Discard payment entry?', message: 'Your unsaved payment entry will be lost.', confirmLabel: 'Discard Payment', cancelLabel: 'Stay', variant: 'danger' }); if (!discard) return; dirtyState.clearUnsavedChanges(DIRTY_SOURCE); } cleanup(); location.hash = `#/${target}`; };
  const guardUnload = event => { if (!dirtyState.isDirty(DIRTY_SOURCE)) return; event.preventDefault(); event.returnValue = ''; };
  const results = element('div', { className: 'billing-workspace__results', 'aria-live': 'polite' });
  const search = createSearch({ label: 'Search payments by number, patient, or invoice', placeholder: 'Search payment or invoice…', value: filters.search, onInput: value => { filters.search = value; pageNumber = 1; renderResults(); } });
  const searchInput = search.querySelector('input'), clearSearch = search.querySelector('[aria-label="Clear search"]');
  const method = createField({ id: 'payment-method-filter', label: 'Method', type: 'select', options: [{ value: '', label: 'All methods' }, ...currentState.paymentMethods.map(item => ({ value: item.code, label: item.name }))] });
  method.control.value = filters.method;
  method.control.addEventListener('change', () => { filters.method = method.control.value; pageNumber = 1; renderResults(); });
  const reset = () => { filters.search = ''; filters.method = ''; pageNumber = 1; searchInput.value = ''; clearSearch.hidden = true; method.control.value = ''; renderResults(); };
  const card = createCard({ title: 'Payment History', subtitle: 'Posted payments shown. Posted payments and their receipts are immutable history.', content: element('div', { className: 'billing-workspace__list' }, [createFilterBar({ children: [search, method.element], onReset: reset }), results]) });
  const subtitle = card.querySelector('.card__subtitle');
  const renderResults = () => { const query = filters.search.trim().toLowerCase(), list = currentState.payments.slice().sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.paymentNumber.localeCompare(a.paymentNumber)).filter(payment => { const patient = patientFor(currentState, payment.patientId), invoice = getInvoiceById(currentState, payment.invoiceId); return (!filters.method || payment.paymentMethodCode === filters.method) && (!query || [payment.paymentNumber, patient?.fullName, patient?.patientNumber, invoice?.invoiceNumber].some(value => String(value || '').toLowerCase().includes(query))); }); const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE)); pageNumber = Math.min(pageNumber, pages);
    const rows = list.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE).map(payment => { const patient = patientFor(currentState, payment.patientId), invoice = getInvoiceById(currentState, payment.invoiceId), receipt = getReceiptsForPayment(currentState, payment.id)[0]; return { number: payment.paymentNumber, patient: patient ? `${patient.fullName} · ${patient.patientNumber}` : 'Unknown patient', invoice: invoice?.invoiceNumber || 'Unknown invoice', date: formatDate(payment.receivedAt), amount: formatUGX(payment.amount), method: paymentMethodLabel(payment.paymentMethodCode), status: { label: formatStatus(payment.status), variant: statusVariant(payment.status) }, actions: [{ label: 'View payment details', icon: 'file-text', onClick: () => paymentDetails({ state: currentState, payment, session }) }, ...(receipt ? [{ label: `View receipt ${receipt.receiptNumber}`, icon: 'receipt', onClick: () => openReceiptDrawer({ state: currentState, receipt }) }] : [])] }; });
    subtitle.textContent = `${list.length} posted payment${list.length === 1 ? '' : 's'} shown. Posted payments and their receipts are immutable history.`;
    results.replaceChildren(createTable({ stickyHeader: true, rows, columns: [{ label: 'Payment', key: 'number' }, { label: 'Patient', key: 'patient' }, { label: 'Invoice', key: 'invoice' }, { label: 'Date', key: 'date' }, { label: 'Amount', key: 'amount', numeric: true }, { label: 'Method', key: 'method' }, { label: 'Status', key: 'status', type: 'badge' }, { label: 'Actions', key: 'actions', type: 'actions' }], empty: { title: 'No payments found', message: 'Try another search or filter.' } }), createPagination({ page: pageNumber, totalPages: pages, summary: `Showing ${list.length ? (pageNumber - 1) * PAGE_SIZE + 1 : 0}–${Math.min(pageNumber * PAGE_SIZE, list.length)} of ${list.length}`, onChange: value => { pageNumber = value; renderResults(); } })); };
  region.append(card);
  page.append(createPageHeader({ title: 'Payments', description: 'Review posted clinic payments and record money received only against an outstanding invoice.', actions: getPaymentPermissions({ state: currentState, actor: session }).canRecord ? [{ label: 'Record Payment', onClick: () => { activeModal = openPaymentModal({ state: currentState, session, onRecorded: () => { currentState = appState.get(); activeModal = null; renderResults(); } }); } }] : [] }), region); document.addEventListener('click', guardNavigation, true); window.addEventListener('beforeunload', guardUnload); window.addEventListener('hashchange', cleanup, { once: true }); renderResults(); return page;
};

export const renderReceiptsWorkspace = ({ state, session }) => { const receipts = state.receipts.slice().sort((a, b) => b.issuedAt.localeCompare(a.issuedAt) || b.receiptNumber.localeCompare(a.receiptNumber)); const rows = receipts.map(receipt => { const payment = state.payments.find(item => item.id === receipt.paymentId), patient = payment && patientFor(state, payment.patientId), invoice = payment && getInvoiceById(state, payment.invoiceId); return { number: receipt.receiptNumber, patient: patient ? `${patient.fullName} · ${patient.patientNumber}` : 'Unknown patient', invoice: invoice?.invoiceNumber || 'Unknown invoice', date: formatDate(receipt.issuedAt), amount: formatUGX(receipt.amount), status: { label: formatStatus(receipt.status), variant: statusVariant(receipt.status) }, actions: [{ label: 'View receipt', icon: 'receipt', onClick: () => openReceiptDrawer({ state, receipt }) }] }; }); return element('section', { className: 'billing-workspace' }, [createPageHeader({ title: 'Receipts', description: 'Read-only evidence that a payment was received. A receipt is not an invoice.' }), createCard({ title: 'Receipt History', subtitle: `${receipts.length} issued receipt${receipts.length === 1 ? '' : 's'} recorded.`, content: createTable({ stickyHeader: true, rows, columns: [{ label: 'Receipt', key: 'number' }, { label: 'Patient', key: 'patient' }, { label: 'Invoice', key: 'invoice' }, { label: 'Date', key: 'date' }, { label: 'Amount', key: 'amount', numeric: true }, { label: 'Status', key: 'status', type: 'badge' }, { label: 'Actions', key: 'actions', type: 'actions' }], empty: { title: 'No receipts found', message: 'Receipts are issued automatically when a payment is posted.' } }) })]); };
