import { element } from './dom.js';
import { clinicBranding } from '../data/branding.js';

const safe = value => value === 0 ? '0' : String(value ?? '').trim();

export const createPrintHeader = ({ state, title, reference = '', subtitle = '' }) => {
  const branch = state.branches.find(item => item.isMain) || state.branches[0];
  const logo = element('img', {
    src: state.organization.logoPath || clinicBranding.logoUrl,
    alt: `${state.organization.name || clinicBranding.clinicName} logo`,
    onerror: event => { event.currentTarget.hidden = true; }
  });
  return element('header', { className: 'document-print__header' }, [
    element('div', { className: 'document-print__brand' }, [
      logo,
      element('div', {}, [
        element('h1', { text: state.organization.name || clinicBranding.clinicName }),
        element('p', { text: branch?.name || 'Kampala Main Branch' }),
        element('p', { text: [branch?.phone || state.organization.phone, branch?.email || state.organization.email].filter(Boolean).join(' - ') })
      ])
    ]),
    element('div', { className: 'document-print__identity' }, [
      element('h2', { text: title }),
      reference ? element('strong', { text: reference }) : null,
      subtitle ? element('p', { text: subtitle }) : null
    ])
  ].filter(Boolean));
};

export const createPrintFields = (fields, { label = 'Document context' } = {}) => element('dl', { className: 'document-print__fields', 'aria-label': label }, fields
  .filter(([, value]) => safe(value))
  .map(([name, value, emphasis = false]) => element('div', { className: emphasis ? 'document-print__field document-print__field--emphasis' : 'document-print__field' }, [
    element('dt', { text: name }),
    element('dd', { text: safe(value) })
  ])));

export const createPrintMetrics = metrics => element('section', { className: 'document-print__metrics', 'aria-label': 'Document summary' }, metrics.map(([label, value, emphasis = false]) => element('div', { className: emphasis ? 'document-print__metric document-print__metric--emphasis' : 'document-print__metric' }, [
  element('span', { text: label }),
  element('strong', { text: safe(value) })
])));

export const createPrintTable = ({ columns, rows, emptyMessage = 'No records found.' }) => {
  const head = element('thead', {}, [element('tr', {}, columns.map(column => element('th', { scope: 'col', className: column.numeric ? 'is-numeric' : '', text: column.label })))]);
  const body = element('tbody', {}, rows.length ? rows.map(row => element('tr', {}, columns.map(column => element('td', { className: column.numeric ? 'is-numeric' : '', text: safe(row[column.key]) })))) : [element('tr', {}, [element('td', { colspan: String(columns.length), className: 'document-print__empty', text: emptyMessage })])]);
  return element('div', { className: 'document-print__table-wrap' }, [element('table', { className: 'document-print__table' }, [head, body])]);
};

export const createPrintSection = ({ title, subtitle = '', content }) => element('section', { className: 'document-print__section' }, [
  element('header', { className: 'document-print__section-heading' }, [element('h3', { text: title }), subtitle ? element('p', { text: subtitle }) : null]),
  content
].filter(Boolean));

export const createPrintDocument = ({ state, kind, title, reference = '', subtitle = '', context = [], metrics = [], sections = [], note = '' }) => element('article', {
  className: `document-print document-print--${kind}`,
  'data-print-document': kind,
  'aria-label': `${title} printable document`
}, [
  createPrintHeader({ state, title, reference, subtitle }),
  context.length ? createPrintFields(context) : null,
  metrics.length ? createPrintMetrics(metrics) : null,
  ...sections,
  note ? element('footer', { className: 'document-print__footer', text: note }) : null
].filter(Boolean));

export const printCurrentDocument = () => window.print();
