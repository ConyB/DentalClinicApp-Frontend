import { clear, element } from '../components/dom.js';
import { createBadge, createButton, createCard, createEmptyState, createField, createFilterBar, createKpiCard, createPageHeader } from '../components/primitives.js';
import { createPagination, createTable } from '../components/data-display.js';
import { createPrintDocument, createPrintSection, createPrintTable, printCurrentDocument } from '../components/print-documents.js';
import { buildReport, REPORT_TYPES, reportDentists, reportTypesForRole } from '../data/reports.js';
import { formatDate, formatStatus, formatTime, formatUGX } from '../utils/formatters.js';

const PAGE_SIZE = 8;
const statusVariant = status => ({ COMPLETED: 'success', CONFIRMED: 'success', WAITING: 'warning', IN_TREATMENT: 'warning', SCHEDULED: 'info', CANCELLED: 'danger', NO_SHOW: 'danger', UPCOMING: 'info', OVERDUE: 'danger', active: 'success', inactive: 'neutral' }[status] || 'neutral');
const csvCell = value => { const text = String(value ?? ''); const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"`; };
const exportCsv = ({ report, type }) => {
  const headers = report.columns.map(([label]) => label), rows = report.rows.map(row => report.columns.map(([, key]) => row[key]));
  const blob = new Blob([[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob), link = element('a', { href: url, download: `pearl-smile-${type}-report.csv` }); document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
};
const displayValue = (value, type) => type === 'currency' ? formatUGX(value) : type === 'date' ? formatDate(value) : type === 'time' ? formatTime(value) : value;
const tableFor = report => {
  const rows = report.rows.map(row => Object.fromEntries(report.columns.map(([, key, type]) => [key, type === 'status' ? { label: formatStatus(row[key]), variant: statusVariant(row[key]) } : displayValue(row[key], type)])));
  const columns = report.columns.map(([label, key, type]) => ({ label, key, type: type === 'status' ? 'badge' : undefined, numeric: type === 'numeric' || type === 'currency' }));
  return createTable({ stickyHeader: true, columns, rows, empty: { title: 'No records found', message: 'No records found for the selected filters.' } });
};
const tableCard = ({ title, report }) => createCard({ title, subtitle: `${report.rows.length} record${report.rows.length === 1 ? '' : 's'}`, content: tableFor(report) });
const currencyMetric = label => ['Total Payments', 'Payments Received'].includes(label) || /Outstanding|Collections|Value/.test(label);
const formattedMetric = ([label, value]) => [label, currencyMetric(label) ? formatUGX(value) : String(value)];
const printTableFor = report => createPrintTable({
  columns: report.columns.map(([label, key, type]) => ({ label, key, numeric: type === 'numeric' || type === 'currency' })),
  rows: report.rows.map(row => Object.fromEntries(report.columns.map(([, key, type]) => [key, type === 'status' ? formatStatus(row[key]) : displayValue(row[key], type)]))),
  emptyMessage: 'No records found for the selected filters.'
});
const reportPrintDocument = ({ state, report, filters }) => {
  const dentist = filters.dentistId ? reportDentists(state).find(item => item.id === filters.dentistId)?.name : '';
  const period = filters.from && filters.to ? `${formatDate(filters.from)} to ${formatDate(filters.to)}` : filters.from ? `From ${formatDate(filters.from)}` : filters.to ? `Up to ${formatDate(filters.to)}` : 'All available dates';
  const context = [['Period', period], filters.status ? ['Status', formatStatus(filters.status)] : null, dentist ? ['Dentist', dentist] : null, filters.paymentMethod ? ['Payment Method', formatStatus(filters.paymentMethod)] : null].filter(Boolean);
  const groups = [{ title: 'Report Details', report }, report.breakdown, report.secondary, report.tertiary].filter(Boolean);
  const document = createPrintDocument({
    state,
    kind: 'reports',
    title: report.title,
    reference: 'Clinic Report',
    subtitle: `Reference date ${formatDate(state.referenceDate)}`,
    context,
    metrics: report.metrics.map(formattedMetric),
    sections: groups.map(group => { const data = group.report || group; return createPrintSection({ title: group.title, subtitle: `${data.rows.length} record${data.rows.length === 1 ? '' : 's'}`, content: printTableFor(data) }); })
  });
  document.classList.add('reports-print');
  return document;
};

export const renderReportsWorkspace = ({ state, session }) => {
  const types = reportTypesForRole(session.role); if (!types.length) return createEmptyState({ title: 'Access Denied', message: 'You do not have permission to view reports.' });
  let selectedType = types.some(type => type.id === 'appointments') ? 'appointments' : types[0].id, pageNumber = 1;
  const filters = { from: selectedType === 'appointments' ? state.referenceDate : '', to: selectedType === 'appointments' ? state.referenceDate : '', status: '', dentistId: '', paymentMethod: '' };
  const page = element('section', { className: 'reports-workspace' }); const region = element('div', { className: 'reports-workspace__region', 'aria-live': 'polite' });
  const resetForType = () => { filters.from = selectedType === 'appointments' ? state.referenceDate : ''; filters.to = selectedType === 'appointments' ? state.referenceDate : ''; filters.status = ''; filters.dentistId = ''; filters.paymentMethod = ''; pageNumber = 1; };
  const render = () => {
    clear(region); page.querySelector('[data-print-document]')?.remove(); const report = buildReport({ state, role: session.role, userId: session.userId, type: selectedType, filters });
    const typeField = createField({ id: 'report-type', label: 'Report type', type: 'select', options: types.map(type => ({ value: type.id, label: type.label })) }); typeField.control.value = selectedType;
    const from = createField({ id: 'report-from', label: 'From date', type: 'date', value: filters.from }); const to = createField({ id: 'report-to', label: 'To date', type: 'date', value: filters.to });
    const statusOptions = selectedType === 'appointments' ? ['COMPLETED', 'WAITING', 'IN_TREATMENT', 'CONFIRMED', 'SCHEDULED', 'CANCELLED', 'NO_SHOW'] : selectedType === 'patients' ? ['active', 'inactive'] : selectedType === 'recalls' ? ['UPCOMING', 'OVERDUE', 'SCHEDULED', 'COMPLETED', 'CONTACTED', 'CANCELLED'] : [];
    const status = statusOptions.length ? createField({ id: 'report-status', label: 'Status', type: 'select', options: [{ value: '', label: 'All statuses' }, ...statusOptions.map(value => ({ value, label: formatStatus(value) }))] }) : null; if (status) status.control.value = filters.status;
    const showDentist = ['appointments', 'clinical'].includes(selectedType) && session.role !== 'Dentist'; const dentist = showDentist ? createField({ id: 'report-dentist', label: 'Dentist', type: 'select', options: [{ value: '', label: 'All Dentists' }, ...reportDentists(state).map(item => ({ value: item.id, label: item.name }))] }) : null; if (dentist) dentist.control.value = filters.dentistId;
    const method = selectedType === 'finance' ? createField({ id: 'report-payment-method', label: 'Payment method', type: 'select', options: [{ value: '', label: 'All payment methods' }, ...state.paymentMethods.map(item => ({ value: item.code, label: formatStatus(item.code) }))] }) : null; if (method) method.control.value = filters.paymentMethod;
    typeField.element.classList.add('reports-filter__type');
    from.element.classList.add('reports-filter__date');
    to.element.classList.add('reports-filter__date');
    status?.element.classList.add('reports-filter__secondary');
    dentist?.element.classList.add('reports-filter__secondary');
    method?.element.classList.add('reports-filter__payment-method');
    const controls = [typeField.element, from.element, to.element, status?.element, dentist?.element, method?.element].filter(Boolean);
    typeField.control.addEventListener('change', () => { selectedType = typeField.control.value; resetForType(); render(); });
    const update = () => { filters.from = from.control.value; filters.to = to.control.value; filters.status = status?.control.value || ''; filters.dentistId = dentist?.control.value || ''; filters.paymentMethod = method?.control.value || ''; pageNumber = 1; render(); };
    [from, to, status, dentist, method].filter(Boolean).forEach(field => field.control.addEventListener('change', update));
    const toolbar = createFilterBar({ children: controls, onReset: () => { resetForType(); render(); } });
    toolbar.classList.add('reports-filter-bar', `reports-filter-bar--${controls.length}-controls`);
    if (report?.error) { region.append(toolbar, createCard({ title: REPORT_TYPES[selectedType].label, content: element('div', { className: 'reports__validation', role: 'alert', text: report.error }) })); return; }
    const totalPages = Math.max(1, Math.ceil(report.rows.length / PAGE_SIZE)); pageNumber = Math.min(pageNumber, totalPages); const visible = { ...report, rows: report.rows.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE) };
    const metrics = report.metrics.map(([label, value]) => createKpiCard({ label, value: currencyMetric(label) ? formatUGX(value) : String(value), icon: label.includes('Payment') || label.includes('Collections') || label.includes('Outstanding') || label.includes('Value') ? 'wallet' : 'reports' }));
    region.append(...[
      toolbar,
      element('div', { className: 'reports-workspace__heading' }, [element('div', {}, [element('h2', { text: report.title }), element('p', { text: report.description })]), element('div', { className: 'button-group' }, [createButton({ label: 'Print Report', variant: 'secondary', onClick: printCurrentDocument }), createButton({ label: 'Export CSV', variant: 'secondary', onClick: () => exportCsv({ report, type: selectedType }) })])]),
      element('div', { className: 'reports-workspace__metrics' }, metrics),
      tableCard({ title: 'Report Details', report: visible }),
      createPagination({ page: pageNumber, totalPages, summary: `Showing ${report.rows.length ? (pageNumber - 1) * PAGE_SIZE + 1 : 0}–${Math.min(pageNumber * PAGE_SIZE, report.rows.length)} of ${report.rows.length}`, onChange: next => { pageNumber = next; render(); } }),
      report.breakdown ? tableCard({ title: report.breakdown.title, report: report.breakdown }) : null,
      report.secondary ? tableCard({ title: report.secondary.title, report: report.secondary }) : null,
      report.tertiary ? tableCard({ title: report.tertiary.title, report: report.tertiary }) : null
    ].filter(Boolean));
    page.append(reportPrintDocument({ state, report, filters }));
  };
  page.append(createPageHeader({ title: 'Reports', description: 'Read-only operational and management reporting derived from current clinic records.' }), region); render(); return page;
};
