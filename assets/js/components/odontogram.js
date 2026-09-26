import { element } from './dom.js';

const svgNode = (tag, attributes = {}) => { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value)); return node; };
const visualKeys = tooth => [...new Set([...tooth.entries.map(entry => entry.visual.key), ...tooth.planned.map(item => item.visual.key)])];
const surfaceKinds = (tooth, code) => [...new Set([...tooth.entries.filter(entry => entry.surfaces.includes(code)).map(entry => entry.visual.key), ...tooth.planned.filter(item => item.surfaces.includes(code)).map(item => item.visual.key)])];

const createToothGraphic = tooth => {
  const svg = svgNode('svg', { class: 'odontogram-tooth__graphic', viewBox: '0 0 48 54', 'aria-hidden': 'true' });
  const outline = tooth.isAnterior ? 'M16 4C11 9 10 17 13 25l4 23h14l4-23c3-8 2-16-3-21-5-3-11-3-16 0Z' : 'M9 7c-2 7 0 15 3 20l3 21h18l3-21c3-5 5-13 3-20-8-5-22-5-30 0Z';
  svg.append(svgNode('path', { d: outline, class: 'odontogram-tooth__outline' }), svgNode('path', { d: 'M14 20c7 4 13 4 20 0', class: 'odontogram-tooth__detail' }));
  return svg;
};

const markerFor = visual => element('span', { className: `odontogram-tooth__marker odontogram-tooth__marker--${visual.key}`, text: visual.marker, title: visual.label, 'aria-hidden': 'true' });

export const createOdontogramTooth = ({ tooth, selected = false, onSelect }) => {
  const keys = visualKeys(tooth);
  const button = element('button', {
    className: `odontogram-tooth${selected ? ' is-selected' : ''}${tooth.entries.length || tooth.planned.length ? ' has-record' : ' is-unrecorded'} ${keys.map(key => `has-${key}`).join(' ')}`.trim(),
    type: 'button',
    'aria-label': tooth.accessibleLabel,
    'aria-pressed': String(selected),
    'data-tooth-code': tooth.code,
    onclick: () => onSelect(tooth.code)
  }, [
    element('span', { className: 'odontogram-tooth__number', text: tooth.code, 'aria-hidden': 'true' }),
    createToothGraphic(tooth),
    element('span', { className: 'odontogram-tooth__surfaces', 'aria-hidden': 'true' }, tooth.permittedSurfaces.map(surface => element('span', { className: `odontogram-tooth__surface odontogram-tooth__surface--${surface.code.toLowerCase()} ${surfaceKinds(tooth, surface.code).map(key => `is-${key}`).join(' ')}`.trim(), text: surface.code }))),
    element('span', { className: 'odontogram-tooth__markers', 'aria-hidden': 'true' }, [...tooth.entries.map(entry => markerFor(entry.visual)), ...tooth.planned.map(item => markerFor(item.visual))])
  ]);
  return button;
};

export const createOdontogramArch = ({ label, teeth, selectedCode, onSelect }) => element('section', { className: `odontogram__arch odontogram__arch--${teeth[0]?.arch || ''}`, 'aria-label': `${label} arch` }, [
  element('h3', { text: label }),
  element('div', { className: 'odontogram__orientation', 'aria-hidden': 'true' }, [element('span', { text: 'Patient Right' }), element('span', { text: 'Patient Left' })]),
  element('div', { className: 'odontogram__teeth', role: 'group', 'aria-label': `${label} teeth` }, teeth.map(tooth => createOdontogramTooth({ tooth, selected: tooth.code === selectedCode, onSelect })))
]);
