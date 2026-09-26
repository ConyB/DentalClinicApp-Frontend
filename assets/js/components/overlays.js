import { element, icon } from './dom.js';
import { createButton } from './primitives.js';

const focusable = container => [...container.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
const createOverlay = ({ type, title, content, footer, size = 'medium', dismissible = true, onClose, onRequestClose } = {}) => {
  const sizeClass = { small: 'sm', medium: 'md', large: 'lg' }[size] || 'md';
  const overlay = element('div', { className: `overlay overlay--${type}`, role: 'presentation' });
  const panel = element('section', { className: `${type} ${type}--${sizeClass}`, role: type === 'modal' ? 'dialog' : 'complementary', 'aria-modal': type === 'modal' ? 'true' : undefined, 'aria-label': title || type });
  const previous = document.activeElement;
  let closed = false;
  let onKeydown;
  const close = () => { if (closed) return; closed = true; document.removeEventListener('keydown', onKeydown); overlay.remove(); if (!document.querySelector('.overlay')) document.body.classList.remove('has-overlay'); previous?.focus?.(); onClose?.(); };
  const requestClose = async () => { if (onRequestClose && await onRequestClose() === false) return false; close(); return true; };
  if (dismissible) overlay.addEventListener('click', event => { if (event.target === overlay) requestClose(); });
  panel.append(...[
    element('header', { className: `${type}__header` }, [element('h2', { text: title || '' }), dismissible ? createButton({ label: `Close ${type}`, variant: 'ghost', size: 'small', icon: '×', iconOnly: true, onClick: requestClose }) : null]),
    element('div', { className: `${type}__body` }, [content]),
    footer ? element('footer', { className: `${type}__footer` }, [footer]) : null
  ].filter(Boolean));
  overlay.append(panel); document.body.append(overlay); document.body.classList.add('has-overlay');
  requestAnimationFrame(() => focusable(panel)[0]?.focus());
  onKeydown = event => { if (event.key === 'Escape' && dismissible) requestClose(); if (event.key === 'Tab') { const items = focusable(panel); if (!items.length) return; if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); } else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); } } };
  document.addEventListener('keydown', onKeydown); return { element: overlay, close, requestClose };
};

export const openModal = options => createOverlay({ ...options, type: 'modal' });
export const openDrawer = options => createOverlay({ ...options, type: 'drawer' });
export const confirm = ({ title = 'Confirm action', message = '', cancelLabel = 'Cancel', confirmLabel = 'Confirm', variant = 'default' } = {}) => new Promise(resolve => {
  let instance;
  let settled = false;
  const settle = value => { if (settled) return; settled = true; instance.close(); resolve(value); };
  const content = element('p', { text: message });
  const cancel = createButton({ label: cancelLabel, variant: 'secondary', onClick: () => settle(false) });
  const approve = createButton({ label: confirmLabel, variant: variant === 'danger' ? 'danger' : 'primary', onClick: () => settle(true) });
  instance = openModal({ title, content, footer: element('div', { className: 'button-group' }, [cancel, approve]), onClose: () => { if (!settled) { settled = true; resolve(false); } } });
});

const toastRegion = () => document.querySelector('#toast-region') || (() => { const node = element('div', { id: 'toast-region', className: 'toast-region', 'aria-live': 'polite', 'aria-atomic': 'true' }); document.body.append(node); return node; })();
export const showToast = ({ title, message, variant = 'info', duration = 5000 } = {}) => { let dismissed = false; const dismiss = () => { if (dismissed) return; dismissed = true; toast.classList.add('is-closing'); setTimeout(() => toast.remove(), 180); }; const statusIcon = { success: '✓', warning: '!', error: '×', info: 'i' }[variant] || 'i'; const toast = element('article', { className: `toast toast--${variant}`, role: 'status' }, [icon(statusIcon), element('div', { className: 'toast__content' }, [title ? element('strong', { text: title }) : null, element('p', { text: message || '' })]), createButton({ label: 'Dismiss notification', variant: 'ghost', size: 'small', icon: '×', iconOnly: true, onClick: dismiss })]); toastRegion().append(toast); if (duration > 0) setTimeout(dismiss, duration); return toast; };
