import { element, icon, lucideIcon } from './dom.js';

const variants = new Set(['primary', 'secondary', 'ghost', 'success', 'danger']);
export const createButton = ({ label, variant = 'primary', size = 'default', icon: iconName, iconOnly = false, disabled = false, onClick, type = 'button' } = {}) => {
  const button = element('button', { className: `button button--${variants.has(variant) ? variant : 'primary'} button--${size}${iconOnly ? ' button--icon' : ''}`, type, disabled, onClick, 'aria-label': iconOnly ? label : undefined, title: iconOnly ? label : undefined });
  if (iconName) button.append(icon(iconName));
  if (!iconOnly) button.append(document.createTextNode(label || 'Action'));
  return button;
};

export const setButtonLoading = (button, loading, label = 'Working…') => {
  button.disabled = loading;
  button.classList.toggle('is-loading', loading);
  button.setAttribute('aria-busy', String(loading));
  if (loading) button.dataset.label = button.textContent;
  button.replaceChildren(loading ? icon('◌') : document.createTextNode(loading ? label : (button.dataset.label || label)));
};

export const createField = ({ id, label, type = 'text', value = '', placeholder = '', required = false, helper, error, options = [], disabled = false, readOnly = false, autocomplete, inputMode, min, max } = {}) => {
  const inputId = id || `field-${crypto.randomUUID()}`;
  const control = type === 'textarea' ? element('textarea', { id: inputId, placeholder, disabled, readonly: readOnly, autocomplete, inputmode: inputMode, 'aria-describedby': helper || error ? `${inputId}-hint` : undefined, text: value }) : type === 'select' ? element('select', { id: inputId, disabled, 'aria-describedby': helper || error ? `${inputId}-hint` : undefined }, options.map(option => element('option', { value: option.value, text: option.label, selected: option.value === value }))) : element('input', { id: inputId, type, value, placeholder, disabled, readonly: readOnly, required, autocomplete, inputmode: inputMode, min, max, 'aria-describedby': helper || error ? `${inputId}-hint` : undefined });
  const labelNode = element('label', { for: inputId, className: 'field__label' }, [label || 'Field', required ? element('span', { className: 'field__required', text: ' *', 'aria-label': 'required' }) : null]);
  const hint = helper || error ? element('p', { id: `${inputId}-hint`, className: `field__hint${error ? ' field__hint--error' : ''}`, text: error || helper, role: error ? 'alert' : undefined }) : null;
  return { element: element('div', { className: `field${error ? ' field--error' : ''}` }, [labelNode, control, hint]), control };
};

export const createSearch = ({ label = 'Search', placeholder = 'Search…', value = '', onInput } = {}) => {
  const input = element('input', { type: 'text', role: 'searchbox', value, placeholder, autocomplete: 'off', enterkeyhint: 'search', 'aria-label': label, oninput: event => { clearButton.hidden = !event.target.value; onInput?.(event.target.value); } });
  const clearButton = createButton({ label: 'Clear search', variant: 'ghost', size: 'small', icon: '×', iconOnly: true, onClick: () => { input.value = ''; clearButton.hidden = true; input.dispatchEvent(new Event('input')); input.focus(); } });
  clearButton.hidden = !value;
  return element('div', { className: 'search-control', role: 'search' }, [icon('⌕'), input, clearButton]);
};

export const createFilterBar = ({ children = [], primaryAction, onReset } = {}) => element('div', { className: 'filter-bar' }, [element('div', { className: 'filter-bar__controls' }, children), onReset ? createButton({ label: 'Reset', variant: 'ghost', size: 'small', onClick: onReset }) : null, primaryAction ? createButton(primaryAction) : null]);

export const createCard = ({ title, subtitle, content, actions, variant = 'standard', interactive = false } = {}) => element(interactive ? 'button' : 'section', { className: `card card--${variant}${interactive ? ' card--interactive' : ''}`, type: interactive ? 'button' : undefined }, [title || subtitle || actions ? element('header', { className: 'card__header' }, [element('div', {}, [title ? element('h3', { className: 'card__title', text: title }) : null, subtitle ? element('p', { className: 'card__subtitle', text: subtitle }) : null]), actions]) : null, content ? element('div', { className: 'card__body' }, [content]) : null]);

export const createKpiCard = ({ label, value, icon: iconName, context } = {}) => element('section', { className: 'kpi-card' }, [element('div', { className: 'kpi-card__top' }, [element('p', { className: 'kpi-card__label', text: label }), iconName ? lucideIcon(iconName) : null]), element('p', { className: 'kpi-card__value', text: value }), context ? element('p', { className: 'kpi-card__context', text: context }) : null]);

export const createBadge = ({ label, variant = 'neutral' } = {}) => element('span', { className: `badge badge--${variant}`, text: label || 'Status' });
export const createAlert = ({ title, message, variant = 'info' } = {}) => element('div', { className: `alert alert--${variant}`, role: variant === 'danger' || variant === 'clinical' ? 'alert' : 'status' }, [icon(variant === 'clinical' ? '!' : 'i'), element('div', {}, [title ? element('strong', { text: title }) : null, element('p', { text: message || '' })])]);
export const createEmptyState = ({ icon: iconName = '○', title = 'Nothing here yet', message = '', action } = {}) => element('section', { className: 'empty-state' }, [icon(iconName), element('h3', { text: title }), element('p', { text: message }), action ? createButton(action) : null]);
export const createLoadingState = ({ label = 'Loading', table = false } = {}) => table ? element('div', { className: 'table-loading', 'aria-label': label, role: 'status' }, Array.from({ length: 4 }, () => element('span', { className: 'skeleton' }))) : element('span', { className: 'loading', role: 'status' }, [icon('◌'), element('span', { className: 'visually-hidden', text: label })]);
export const createAvatar = ({ name = 'User', image, size = 'md', status } = {}) => { const avatar = element('span', { className: `avatar avatar--${size}`, 'aria-label': name, role: 'img' }); if (image) avatar.style.backgroundImage = `url("${image}")`; else avatar.textContent = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); if (status) avatar.append(element('i', { className: `avatar__status avatar__status--${status}`, 'aria-hidden': 'true' })); return avatar; };

export const createBreadcrumb = ({ items = [] } = {}) => element('nav', { className: 'breadcrumb', 'aria-label': 'Breadcrumb' }, [element('ol', {}, items.map((item, index) => element('li', {}, [index === items.length - 1 ? element('span', { 'aria-current': 'page', text: item.label }) : element('a', { href: item.href || '#', text: item.label })])))]);
export const createPageHeader = ({ title, description, breadcrumb, actions = [] } = {}) => element('header', { className: 'page-header' }, [element('div', {}, [breadcrumb, element('h1', { text: title }), description ? element('p', { className: 'page-header__description', text: description }) : null]), actions.length ? element('div', { className: 'page-header__actions' }, actions.map(createButton)) : null]);

export const createPatientContext = ({ patient = {}, fields = ['number', 'ageSex', 'phone', 'appointment', 'dentist'], showAlert = true, actions = [] } = {}) => element('section', { className: 'patient-context' }, [createAvatar({ name: patient.name || 'Patient', size: 'lg' }), element('div', { className: 'patient-context__identity' }, [element('h2', { text: patient.name || 'Patient' }), patient.status ? createBadge({ label: patient.status, variant: 'active' }) : null, element('div', { className: 'patient-context__meta' }, fields.map(field => patient[field] ? element('span', { text: patient[field] }) : null))]), showAlert && patient.alert ? createAlert({ title: 'Clinical alert', message: patient.alert, variant: 'clinical' }) : null, actions.length ? element('div', { className: 'patient-context__actions' }, actions.map(createButton)) : null]);

export const createTabs = ({ tabs = [], onChange } = {}) => { const tablist = element('div', { className: 'tabs', role: 'tablist', 'aria-label': 'Content sections' }); tabs.forEach((tab, index) => { const button = element('button', { className: `tabs__tab${index === 0 ? ' is-active' : ''}`, role: 'tab', type: 'button', 'aria-selected': String(index === 0), text: tab.label, onclick: () => { [...tablist.children].forEach(item => { item.classList.remove('is-active'); item.setAttribute('aria-selected', 'false'); }); button.classList.add('is-active'); button.setAttribute('aria-selected', 'true'); onChange?.(tab, index); } }); tablist.append(button); }); return tablist; };

export const createDropdown = ({ label = 'More actions', trigger, items = [] } = {}) => { const details = element('details', { className: 'dropdown' }); const summary = element('summary', { className: 'button button--ghost button--small dropdown__trigger', 'aria-label': label }); if (trigger) summary.append(...(Array.isArray(trigger) ? trigger : [trigger])); else summary.textContent = label; details.append(summary, element('div', { className: 'dropdown__menu', role: 'menu' }, items.map(item => element('button', { className: `${item.divider ? 'dropdown__item--divider ' : ''}${item.variant === 'danger' ? 'dropdown__item--danger' : ''}`, type: 'button', role: 'menuitem', onclick: () => { details.open = false; item.onClick?.(); } }, [item.icon ? lucideIcon(item.icon) : null, element('span', { text: item.label })])))); return details; };
