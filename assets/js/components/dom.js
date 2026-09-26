export const element = (tag, options = {}, children = []) => {
  const node = document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  });
  [...children].flat().filter(Boolean).forEach(child => node.append(child instanceof Node ? child : document.createTextNode(String(child))));
  return node;
};

export const icon = (symbol, label = '') => element('span', { className: 'ui-icon', 'aria-hidden': label ? 'true' : 'true', text: symbol });
const lucidePaths = {
  user: 'M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 6v4l3 2',
  clinical: 'M4 3v18m0-9h16m-8-9v18',
  wallet: 'M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6m15 7h2',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4',
  reports: 'M3 3v18h18M7 16v-5m5 5V7m5 9v-3',
  logout: 'M10 17l5-5-5-5m5 5H3m12 7h4a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4'
};
const iconAliases = { '▦': 'dashboard', '♙': 'user', '◷': 'calendar', '◉': 'clock', '⌁': 'clinical', '¤': 'wallet', '↻': 'bell', '▤': 'reports', '♧': 'user', '⚙': 'settings', '●': 'user' };
lucidePaths.heart = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.32.83-4.5 2.11C10.82 3.83 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';
lucidePaths.camera = 'M14.5 4 16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2h5ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z';
lucidePaths['scan-line'] = 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10';
lucidePaths.image = 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm0 12 5-5 4 4 2-2 7 7M8.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z';
// Keep the shared icon renderer; these multi-shape definitions match Lucide's ISC-licensed SVGs.
lucidePaths['users-round'] = [
  ['path', { d: 'M18 21a8 8 0 0 0-16 0' }],
  ['circle', { cx: '10', cy: '8', r: '5' }],
  ['path', { d: 'M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3' }]
];
lucidePaths['circle-user-round'] = [
  ['path', { d: 'M18 20a6 6 0 0 0-12 0' }],
  ['circle', { cx: '12', cy: '10', r: '4' }],
  ['circle', { cx: '12', cy: '12', r: '10' }]
];
lucidePaths.stethoscope = [
  ['path', { d: 'M11 2v2' }],
  ['path', { d: 'M5 2v2' }],
  ['path', { d: 'M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1' }],
  ['path', { d: 'M8 15a6 6 0 0 0 12 0v-3' }],
  ['circle', { cx: '20', cy: '10', r: '2' }]
];
lucidePaths['key-round'] = [
  ['path', { d: 'M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z' }],
  ['circle', { cx: '16.5', cy: '7.5', r: '.5', fill: 'currentColor' }]
];
lucidePaths.settings = [
  ['path', { d: 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915' }],
  ['circle', { cx: '12', cy: '12', r: '3' }]
];
lucidePaths['file-text'] = [
  ['path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }],
  ['path', { d: 'M10 9H8' }],
  ['path', { d: 'M16 13H8' }],
  ['path', { d: 'M16 17H8' }]
];
lucidePaths['credit-card'] = [
  ['rect', { width: '20', height: '14', x: '2', y: '5', rx: '2' }],
  ['line', { x1: '2', x2: '22', y1: '10', y2: '10' }],
  ['path', { d: 'M6 14h2' }]
];
lucidePaths['receipt-text'] = [
  ['path', { d: 'M13 16H8' }],
  ['path', { d: 'M14 8H8' }],
  ['path', { d: 'M16 12H8' }],
  ['path', { d: 'M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z' }]
];
lucidePaths['circle-dollar-sign'] = [
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8' }],
  ['path', { d: 'M12 18V6' }]
];
lucidePaths['chart-no-axes-column'] = [
  ['path', { d: 'M5 21v-6' }],
  ['path', { d: 'M12 21V3' }],
  ['path', { d: 'M19 21V9' }]
];
export const lucideIcon = name => {
  const key = iconAliases[name] || name;
  const definition = lucidePaths[key] || lucidePaths.user;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'lucide-icon');
  svg.setAttribute('data-lucide', key);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const [tag, attributes] of typeof definition === 'string' ? [['path', { d: definition }]] : definition) {
    const shape = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [attribute, value] of Object.entries(attributes)) shape.setAttribute(attribute, value);
    svg.append(shape);
  }
  return svg;
};
export const createBrandFooter = className => { const heart = lucideIcon('heart'); heart.classList.add('footer-heart'); return element('footer', { className }, [element('span', { text: 'Developed with' }), element('span', { className: 'visually-hidden', text: ' love ' }), heart, element('span', { text: 'by BaCorn Tech' })]); };
export const clear = node => node.replaceChildren();
