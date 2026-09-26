import { element } from './dom.js';
import { createBadge, createEmptyState, createButton, createDropdown } from './primitives.js';

export const createTable = ({ columns = [], rows = [], empty, stickyHeader = false } = {}) => {
  if (!rows.length) return createEmptyState(empty || {});
  const table = element('table', { className: `data-table${stickyHeader ? ' data-table--sticky' : ''}` });
  table.append(element('thead', {}, [element('tr', {}, columns.map(column => element('th', { className: column.numeric ? 'text-right' : '', scope: 'col', text: column.label })))]));
  table.append(element('tbody', {}, rows.map(row => element('tr', {}, columns.map(column => { const value = typeof column.render === 'function' ? column.render(row) : row[column.key]; const cell = element('td', { className: column.numeric ? 'text-right' : '' }); if (column.type === 'badge') cell.append(createBadge({ label: value.label || value, variant: value.variant || 'neutral' })); else if (column.type === 'actions') cell.append(createDropdown({ label: 'More actions', items: value || [] })); else cell.textContent = value ?? '—'; return cell; })))));
  return element('div', { className: 'table-wrap', tabindex: '0', 'aria-label': 'Scrollable table region' }, [table]);
};

export const createPagination = ({ page = 1, totalPages = 1, summary, onChange } = {}) => {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(number => number === 1 || number === totalPages || Math.abs(number - page) <= 1);
  const controls = [createButton({ label: 'Previous', variant: 'secondary', size: 'small', disabled: page <= 1, onClick: () => onChange?.(page - 1) })];
  pages.forEach((number, index) => { if (index && number - pages[index - 1] > 1) controls.push(element('span', { className: 'pagination__ellipsis', text: '…' })); controls.push(createButton({ label: String(number), variant: number === page ? 'primary' : 'ghost', size: 'small', onClick: () => onChange?.(number) })); });
  controls.push(createButton({ label: 'Next', variant: 'secondary', size: 'small', disabled: page >= totalPages, onClick: () => onChange?.(page + 1) }));
  return element('nav', { className: 'pagination', 'aria-label': 'Pagination' }, [summary ? element('p', { className: 'pagination__summary', text: summary }) : null, element('div', { className: 'pagination__controls' }, controls)]);
};
