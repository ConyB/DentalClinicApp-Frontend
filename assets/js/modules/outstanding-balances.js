import { element } from '../components/dom.js';
import { createCard, createField, createFilterBar, createKpiCard, createPageHeader, createSearch } from '../components/primitives.js';
import { createPagination, createTable } from '../components/data-display.js';
import { dirtyState } from '../core/dirty-state.js';
import { state as appState } from '../core/state.js';
import { getInvoicePermissions } from '../data/invoice-workflows.js';
import { getPaymentPermissions } from '../data/payment-workflows.js';
import { calculateInvoiceBalance, calculateInvoicePaid, calculateInvoiceTotal, deriveInvoiceStatus, getOutstandingBalance, getOutstandingInvoices } from '../data/finance.js';
import { formatDate, formatStatus, formatUGX } from '../utils/formatters.js';
import { openInvoiceDetails } from './billing.js';
import { openPaymentModal } from './payments.js';

const PAGE_SIZE = 8;
const PAYMENT_DIRTY_SOURCE = 'payment';
const statusVariant = status => ({ PARTIALLY_PAID: 'warning', ISSUED: 'info' }[status] || 'neutral');
const patientFor = (state, id) => state.patients.find(patient => patient.id === id) || null;

export const renderOutstandingBalancesWorkspace = ({ state: initialState, session }) => {
  const invoicePermissions = getInvoicePermissions({ state: initialState, actor: session });
  if (!invoicePermissions.canView) return element('section', { className: 'outstanding-balances-access-guard', 'aria-hidden': 'true' });

  let currentState = initialState, activeOverlay = null, pageNumber = 1;
  const filters = { search: '', status: '', sort: 'balance-desc' };
  const page = element('section', { className: 'billing-workspace outstanding-balances' });
  const region = element('div', { className: 'billing-workspace__region', 'aria-live': 'polite' });

  const cleanup = () => {
    document.removeEventListener('click', guardNavigation, true);
    window.removeEventListener('beforeunload', guardUnload);
    window.removeEventListener('hashchange', cleanup);
  };
  const guardNavigation = async event => {
    const link = event.target.closest('a[href^="#/"]'), target = link?.getAttribute('href')?.replace(/^#\//, '');
    if (!target) return;
    if (!dirtyState.isDirty(PAYMENT_DIRTY_SOURCE)) {
      activeOverlay?.close();
      activeOverlay = null;
      cleanup();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (activeOverlay && !await activeOverlay.requestClose()) return;
    activeOverlay = null;
    cleanup();
    location.hash = `#/${target}`;
  };
  const guardUnload = event => {
    if (!dirtyState.isDirty(PAYMENT_DIRTY_SOURCE)) return;
    event.preventDefault();
    event.returnValue = '';
  };

  const metricsRegion = element('div', { className: 'billing-workspace__metrics outstanding-balances__metrics', 'aria-label': 'Outstanding balance summary' });
  const results = element('div', { className: 'billing-workspace__results', 'aria-live': 'polite' });
  const search = createSearch({ label: 'Search balances by invoice number, patient name, or patient ID', placeholder: 'Search invoice or patient…', value: filters.search, onInput: value => { filters.search = value; pageNumber = 1; renderResults(); } });
  const searchInput = search.querySelector('input'), clearSearch = search.querySelector('[aria-label="Clear search"]');
  const status = createField({ id: 'outstanding-status-filter', label: 'Status', type: 'select', options: [{ value: '', label: 'All outstanding statuses' }, { value: 'ISSUED', label: 'Issued' }, { value: 'PARTIALLY_PAID', label: 'Partially Paid' }] });
  const sort = createField({ id: 'outstanding-sort', label: 'Sort by', type: 'select', options: [{ value: 'balance-desc', label: 'Highest balance' }, { value: 'date-oldest', label: 'Oldest invoice' }, { value: 'date-newest', label: 'Newest invoice' }, { value: 'patient-asc', label: 'Patient A–Z' }] });
  status.control.value = filters.status; sort.control.value = filters.sort;
  status.control.addEventListener('change', () => { filters.status = status.control.value; pageNumber = 1; renderResults(); });
  sort.control.addEventListener('change', () => { filters.sort = sort.control.value; pageNumber = 1; renderResults(); });
  const reset = () => {
    filters.search = ''; filters.status = ''; filters.sort = 'balance-desc'; pageNumber = 1;
    searchInput.value = ''; clearSearch.hidden = true; status.control.value = ''; sort.control.value = 'balance-desc';
    renderResults();
  };
  const card = createCard({ title: 'Outstanding Balance Register', subtitle: 'Outstanding invoices shown, ordered by highest balance by default.', content: element('div', { className: 'billing-workspace__list' }, [createFilterBar({ children: [search, status.element, sort.element], onReset: reset }), results]) });
  const subtitle = card.querySelector('.card__subtitle');

  const renderResults = () => {
    const allOutstanding = getOutstandingInvoices(currentState);
    const query = filters.search.trim().toLowerCase();
    const visible = allOutstanding.filter(invoice => {
      const patient = patientFor(currentState, invoice.patientId), status = deriveInvoiceStatus(currentState, invoice.id);
      return (!filters.status || status === filters.status) && (!query || [invoice.invoiceNumber, patient?.fullName, patient?.patientNumber].some(value => String(value || '').toLowerCase().includes(query)));
    });
    if (filters.sort === 'date-oldest') visible.sort((left, right) => left.issuedAt.localeCompare(right.issuedAt) || left.invoiceNumber.localeCompare(right.invoiceNumber));
    if (filters.sort === 'date-newest') visible.sort((left, right) => right.issuedAt.localeCompare(left.issuedAt) || right.invoiceNumber.localeCompare(left.invoiceNumber));
    if (filters.sort === 'patient-asc') visible.sort((left, right) => (patientFor(currentState, left.patientId)?.fullName || '').localeCompare(patientFor(currentState, right.patientId)?.fullName || ''));

    const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    pageNumber = Math.min(pageNumber, totalPages);
    const pageInvoices = visible.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);
    const uniquePatients = new Set(allOutstanding.map(invoice => invoice.patientId)).size;

    const canRecord = getPaymentPermissions({ state: currentState, actor: session }).canRecord;
    const rows = pageInvoices.map(invoice => {
      const patient = patientFor(currentState, invoice.patientId), status = deriveInvoiceStatus(currentState, invoice.id);
      return {
        number: invoice.invoiceNumber,
        patient: patient ? `${patient.fullName} · ${patient.patientNumber}` : 'Unknown patient',
        date: formatDate(invoice.issuedAt),
        total: formatUGX(calculateInvoiceTotal(currentState, invoice.id)),
        paid: formatUGX(calculateInvoicePaid(currentState, invoice.id)),
        balance: formatUGX(calculateInvoiceBalance(currentState, invoice.id)),
        status: { label: formatStatus(status), variant: statusVariant(status) },
        actions: [{ label: 'View Invoice', icon: 'file-text', onClick: () => { activeOverlay = openInvoiceDetails({ state: currentState, invoice, onClose: () => { activeOverlay = null; } }); } }, ...(canRecord ? [{ label: 'Record Payment', icon: 'wallet', onClick: () => { activeOverlay = openPaymentModal({ state: currentState, session, invoiceId: invoice.id, onRecorded: () => { currentState = appState.get(); activeOverlay = null; renderResults(); } }); } }] : [])]
      };
    });
    const empty = allOutstanding.length ? { title: 'No matching outstanding balances', message: 'Try another search, status, or sort option.' } : { title: 'No outstanding balances', message: 'All active invoices are fully settled.' };
    const table = createTable({ stickyHeader: true, rows, columns: [{ label: 'Invoice', key: 'number' }, { label: 'Patient', key: 'patient' }, { label: 'Date', key: 'date' }, { label: 'Total', key: 'total', numeric: true }, { label: 'Paid', key: 'paid', numeric: true }, { label: 'Balance', key: 'balance', numeric: true }, { label: 'Status', key: 'status', type: 'badge' }, { label: 'Actions', key: 'actions', type: 'actions' }], empty });

    metricsRegion.replaceChildren(
      createKpiCard({ label: 'Total Outstanding', value: formatUGX(getOutstandingBalance(currentState)), icon: 'wallet', context: 'Derived from active invoice balances' }),
      createKpiCard({ label: 'Outstanding Invoices', value: String(allOutstanding.length), icon: 'file-text', context: 'Invoices with a remaining balance' }),
      createKpiCard({ label: 'Patients with Balances', value: String(uniquePatients), icon: 'users', context: 'Unique patients requiring settlement' })
    );
    subtitle.textContent = `${visible.length} outstanding invoice${visible.length === 1 ? '' : 's'} shown, ordered by highest balance by default.`;
    results.replaceChildren(table, createPagination({ page: pageNumber, totalPages, summary: `Showing ${visible.length ? (pageNumber - 1) * PAGE_SIZE + 1 : 0}–${Math.min(pageNumber * PAGE_SIZE, visible.length)} of ${visible.length}`, onChange: value => { pageNumber = value; renderResults(); } }));
  };

  region.append(metricsRegion, card);
  page.append(createPageHeader({ title: 'Outstanding Balances', description: 'Review unpaid and partially paid invoices, then continue into the existing settlement workflow.' }), region);
  document.addEventListener('click', guardNavigation, true);
  window.addEventListener('beforeunload', guardUnload);
  window.addEventListener('hashchange', cleanup, { once: true });
  renderResults();
  return page;
};
