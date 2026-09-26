import { element, clear, createBrandFooter, lucideIcon } from './dom.js';
import { createAvatar, createButton, createDropdown, createEmptyState, createSearch } from './primitives.js';
import { openModal } from './overlays.js';
import { confirm } from './overlays.js';
import { dirtyState } from '../core/dirty-state.js';
import { clinicBranding } from '../data/branding.js';
import { storage } from '../core/storage.js';
import { permissions } from '../core/permissions.js';
import { auth } from '../core/auth.js';
import { searchPatients } from '../data/patients.js';
import { getPatientProfileSectionAccess } from '../data/patient-profile.js';

const roles = ['Clinic Administrator', 'Dentist', 'Receptionist', 'Cashier'];
let cleanupHeaderInteractions = () => {};
// Module identity selects the icon; role navigation only controls order and visibility.
const navigationIcons = Object.freeze({
  dashboard: 'dashboard',
  patients: 'users-round',
  appointments: 'calendar',
  'waiting-room': 'clock',
  clinical: 'stethoscope',
  'clinical/encounters': 'stethoscope',
  'clinical/dental-chart': 'scan-line',
  'treatment-plans': 'file-text',
  procedures: 'clinical',
  prescriptions: 'file-text',
  billing: 'wallet',
  'billing/invoices': 'file-text',
  'billing/payments': 'credit-card',
  'billing/receipts': 'receipt-text',
  'outstanding-balances': 'circle-dollar-sign',
  recalls: 'bell',
  reports: 'chart-no-axes-column',
  users: 'user',
  'clinic-settings': 'settings',
  profile: 'circle-user-round'
});
const navigation = {
  'Clinic Administrator': [['dashboard','Dashboard'],['patients','Patients'],['appointments','Appointments'],['waiting-room','Waiting Room'],{label:'Clinical Overview',iconKey:'clinical',children:[['clinical/encounters','Encounters'],['treatment-plans','Treatment Plans'],['procedures','Procedures Performed']]},{label:'Billing',iconKey:'billing',children:[['billing/invoices','Invoices'],['billing/payments','Payments'],['billing/receipts','Receipts'],['outstanding-balances','Outstanding Balances']]},['recalls','Recalls & Follow-Ups'],['reports','Reports'],['users','Users & Staff'],['clinic-settings','Clinic Settings'],['profile','Profile']],
  Dentist: [['dashboard','Dashboard'],['appointments','My Appointments'],['waiting-room','Waiting Patients'],['patients','Patients'],{label:'Clinical',iconKey:'clinical',children:[['clinical/encounters','Encounters'],['clinical/dental-chart','Dental Chart'],['treatment-plans','Treatment Plans'],['procedures','Procedures Performed'],['prescriptions','Prescriptions']]},['recalls','Recalls & Follow-Ups'],['reports','Reports'],['clinic-settings','Clinic Settings'],['profile','Profile']],
  Receptionist: [['dashboard','Dashboard'],['patients','Patients'],['appointments','Appointments'],['waiting-room','Waiting Room'],['recalls','Recalls & Follow-Ups'],['reports','Selected Reports'],['clinic-settings','Clinic Settings'],['profile','Profile']],
  Cashier: [['dashboard','Dashboard'],['patients','Patient Search'],['billing/invoices','Invoices'],['billing/payments','Payments'],['billing/receipts','Receipts'],['outstanding-balances','Outstanding Balances'],['reports','Selected Reports'],['clinic-settings','Clinic Settings'],['profile','Profile']]
};
const title = route => ({'clinical/encounters':'Clinical Encounters','clinical/dental-chart':'Dental Chart','billing/invoices':'Invoices','billing/payments':'Payments','billing/receipts':'Receipts','waiting-room':'Waiting Room','treatment-plans':'Treatment Plans','outstanding-balances':'Outstanding Balances','clinic-settings':'Clinic Settings'}[route] || route.split('-').map(word => word[0]?.toUpperCase()+word.slice(1)).join(' '));
const actionFor = route => ({ 'clinical/encounters': 'encounters.view', 'clinical/dental-chart': 'dental-chart.view', 'billing/invoices': 'invoices.view', 'billing/payments': 'payments.view', 'billing/receipts': 'receipts.view' }[route] || `${route}.view`);
export const isRouteAllowed = (role, route) => {
  if (!roles.includes(role)) return false;
  if (route === 'component-showcase') return role === 'Clinic Administrator';
  if (/^clinical\/encounters\/ENC-\d{6}$/.test(route)) return permissions.can(role, 'encounters.view');
  if (/^treatment-plans\/TP-\d{6}$/.test(route)) return ['Clinic Administrator', 'Dentist'].includes(role) && permissions.can(role, 'treatment-plans.view');
  if (/^appointments\/new(?:\/P\d{3})?$/.test(route)) return permissions.can(role, 'appointments.create');
  if (/^appointments\/APT-\d{6}\/(?:edit|reschedule)$/.test(route)) return permissions.can(role, route.endsWith('/edit') ? 'appointments.edit' : 'appointments.reschedule');
  if (route === 'patients') return permissions.can(role, 'patients.view');
  const workspaceRoute = route.match(/^patients\/P\d{3}\/treatment-plans\/workspace$/);
  if (workspaceRoute) return ['Clinic Administrator', 'Dentist'].includes(role) && permissions.can(role, 'treatment-plans.view');
  const profileRoute = route.match(/^patients\/P\d{3}(?:\/(appointments|clinical|clinical-history|dental-chart|treatment-plans|prescriptions|documents|billing|recalls))?$/);
  if (profileRoute) return permissions.can(role, 'patients.view') && (!profileRoute[1] || getPatientProfileSectionAccess(role)[profileRoute[1] === 'clinical-history' ? 'clinical' : profileRoute[1]]);
  if (route === 'patients/new') return permissions.can(role, 'patients.create');
  if (/^patients\/P\d{3}\/edit$/.test(route)) return permissions.can(role, 'patients.edit');
  return (navigation[role] || []).some(item => Array.isArray(item) ? item[0] === route : item.children.some(child => child[0] === route)) && permissions.can(role, actionFor(route));
};
const item = (entry, route, close) => {
  if (Array.isArray(entry)) { const active = entry[0] === route || (entry[0] === 'patients' && route.startsWith('patients/')) || (entry[0] === 'appointments' && route.startsWith('appointments/')); return element('a',{className:`shell-nav__item${active?' is-active':''}`,href:`#/${entry[0]}`,onclick:close,'aria-current':active?'page':undefined},[lucideIcon(navigationIcons[entry[0]]),element('span',{text:entry[1]})]); }
  const matches = child => child[0] === route || (child[0] === 'clinical/encounters' && route.startsWith('clinical/encounters/')) || (child[0] === 'treatment-plans' && route.startsWith('treatment-plans/')); const active=entry.children.some(matches); const group=element('details',{className:`shell-nav__group${active?' is-active-context':''}`,open:active}); group.append(element('summary',{'aria-expanded':String(active)},[lucideIcon(navigationIcons[entry.iconKey]),element('span',{text:entry.label})]),element('div',{className:'shell-nav__children'},entry.children.map(child=>element('a',{className:`shell-nav__item shell-nav__item--child${matches(child)?' is-active':''}`,href:`#/${child[0]}`,onclick:close,'aria-current':matches(child)?'page':undefined},[lucideIcon(navigationIcons[child[0]]),element('span',{text:child[1]})])))); return group;
};
export const renderShell = ({ root, route, isKnown, role, onRoleChange, mainContent = null, appState = null }) => {
  cleanupHeaderInteractions();
  clear(root); const shell=element('div',{className:`app-shell${storage.get('shell-collapsed',false)?' app-shell--collapsed':''}`}); const close=()=>shell.classList.remove('app-shell--mobile-open');
  const session = auth.session(), currentUser = appState?.users.find(user => user.id === session?.userId), displayName = currentUser?.fullName || session?.name || 'Clinic user';
  const brandLogo=element('img',{className:'shell-brand__mark',src:clinicBranding.logoUrl,alt:`${clinicBranding.clinicName} logo`,onerror:event=>{event.currentTarget.style.display='none';}}); const sidebar=element('aside',{className:'shell-sidebar'},[element('div',{className:'shell-brand'},[brandLogo,element('div',{},[element('strong',{text:clinicBranding.shortName}),element('small',{text:'Dental Practice Management'})])]),element('nav',{className:'shell-nav','aria-label':'Primary'},(navigation[role] || []).map(entry=>item(entry,route,close))),element('div',{className:'shell-sidebar__footer',text:'Kampala Main Branch'})]);
  const toggle=createButton({label:'Toggle navigation',variant:'ghost',size:'small',icon:'☰',iconOnly:true,onClick:()=>{if(matchMedia('(max-width: 62rem)').matches)shell.classList.toggle('app-shell--mobile-open');else{shell.classList.toggle('app-shell--collapsed');storage.set('shell-collapsed',shell.classList.contains('app-shell--collapsed'));}}});
  const openChangePassword = () => { location.hash = '#/profile'; };
  const logout = async () => { if (dirtyState.hasUnsavedChanges() && !await confirm({ title: 'Unsaved changes', message: 'You have unsaved changes. Signing out now will discard them.', confirmLabel: 'Sign Out', variant: 'danger' })) return; dirtyState.clear(); auth.signOut(); location.assign('index.html?signed-out'); };
  const profile=createDropdown({label:'Account menu',trigger:[createAvatar({name:displayName}),element('span',{className:'dropdown__trigger-label'},[element('strong',{text:displayName}),element('small',{text:role})])],items:[{label:'Profile',icon:navigationIcons.profile,onClick:()=>location.hash='#/profile'},{label:'Change Password',icon:'key-round',onClick:openChangePassword},{label:'Logout',icon:'logout',divider:true,variant:'danger',onClick:logout}]});
  const patientResults = element('ul', { className: 'global-patient-search__results', role: 'listbox', hidden: true });
  const updatePatientSearch = query => {
    const term = String(query).trim();
    patientResults.replaceChildren();
    if (!term || !appState) { patientResults.hidden = true; return; }
    const matches = searchPatients(appState, term).slice(0, 5);
    patientResults.append(...(matches.length ? matches.map(patient => element('li', { role: 'none' }, [element('a', { href: (route === 'appointments' || /^patients\/P\d{3}(?:\/(?:appointments|clinical|clinical-history|dental-chart|treatment-plans|documents|billing|recalls))?$/.test(route)) ? `#/patients/${patient.id}` : '#/patients', role: 'option', 'aria-label': `View ${patient.fullName}`, onClick: () => { patientResults.hidden = true; } }, [element('strong', { text: patient.fullName }), element('span', { text: `${patient.patientNumber} · ${patient.phone || 'No phone number'}` })])])) : [element('li', { className: 'global-patient-search__empty', role: 'status', text: 'No matching patients found.' })]));
    patientResults.hidden = false;
  };
  const patientSearch = createSearch({ label: 'Search patients by name, number, or phone', placeholder: 'Search patient by name, number or phone…', onInput: updatePatientSearch });
  const notificationPanel = element('section', { id: 'header-notification-panel', className: 'header-notification-panel', role: 'region', 'aria-labelledby': 'header-notification-title', hidden: true }, [
    element('header', { className: 'header-notification-panel__header' }, [element('h2', { id: 'header-notification-title', text: 'Notifications' })]),
    element('div', { className: 'header-notification-empty' }, [lucideIcon('bell'), element('strong', { text: 'No new notifications' }), element('p', { text: 'You\'re all caught up.' })])
  ]);
  const notificationButton = element('button', { className: 'header-notification-button', type: 'button', title: 'Notifications', 'aria-label': 'Notifications', 'aria-haspopup': 'true', 'aria-controls': notificationPanel.id, 'aria-expanded': 'false' }, [lucideIcon('bell')]);
  const notifications = element('div', { className: 'header-notifications' }, [notificationButton, notificationPanel]);
  const setNotificationsOpen = (open, returnFocus = false) => {
    notificationPanel.hidden = !open;
    notificationButton.classList.toggle('is-open', open);
    notificationButton.setAttribute('aria-expanded', String(open));
    if (open) notificationButton.removeAttribute('title');
    else notificationButton.title = 'Notifications';
    if (returnFocus) notificationButton.focus();
  };
  const handleNotificationToggle = () => {
    const willOpen = notificationPanel.hidden;
    if (willOpen) profile.open = false;
    setNotificationsOpen(willOpen);
  };
  const handleProfileToggle = () => { if (profile.open) setNotificationsOpen(false); };
  const handleDocumentPointer = event => { if (!notificationPanel.hidden && !notifications.contains(event.target)) setNotificationsOpen(false); };
  const handleDocumentKey = event => { if (event.key === 'Escape' && !notificationPanel.hidden) { event.preventDefault(); setNotificationsOpen(false, true); } };
  notificationButton.addEventListener('click', handleNotificationToggle);
  profile.addEventListener('toggle', handleProfileToggle);
  document.addEventListener('pointerdown', handleDocumentPointer);
  document.addEventListener('keydown', handleDocumentKey);
  cleanupHeaderInteractions = () => {
    document.removeEventListener('pointerdown', handleDocumentPointer);
    document.removeEventListener('keydown', handleDocumentKey);
    profile.removeEventListener('toggle', handleProfileToggle);
  };
  const header=element('header',{className:'shell-header'},[toggle,element('div',{className:'shell-header__search global-patient-search'},[patientSearch,patientResults]),element('div',{className:'shell-header__user'},[notifications,profile])]);
  const main=element('main',{className:'shell-content',id:'main-content',tabindex:'-1'}); if(!isKnown(route)){ document.title='Page Not Found | Pearl Smile Dental Clinic'; main.append(createEmptyState({icon:'404',title:'Page Not Found',message:'The requested page does not exist.'})); } else if(!isRouteAllowed(role,route)){ document.title='Access Denied | Pearl Smile Dental Clinic'; main.append(createEmptyState({icon:'!',title:'Access Denied',message:'You do not have permission to view this page.',action:{label:'Return to Dashboard',onClick:()=>location.hash='#/dashboard'}})); } else if (!mainContent) { console.error(`No workspace content for route: ${route}`); main.append(createEmptyState({title:'Workspace unavailable',message:'This workspace could not be loaded. Please refresh the page.'})); } else main.append(mainContent);
  const workspace=element('div',{className:'shell-workspace'},[main,createBrandFooter('shell-footer')]); shell.append(sidebar,header,workspace,element('button',{className:'shell-backdrop',type:'button','aria-label':'Close navigation',onclick:close})); root.append(shell); shell.querySelectorAll('.shell-nav__item, .shell-nav__group').forEach(node => { const label = node.querySelector(':scope > span, :scope > summary span')?.textContent; if (label) node.dataset.tooltip = label; }); shell.querySelectorAll('.shell-nav__group summary').forEach(summary => summary.addEventListener('click', () => { if (shell.classList.contains('app-shell--collapsed')) { shell.classList.remove('app-shell--collapsed'); storage.set('shell-collapsed', false); summary.parentElement.open = true; } })); window.scrollTo({top:0,behavior:'instant'});
};
