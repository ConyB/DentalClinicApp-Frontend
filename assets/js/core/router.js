const registeredRoutes = new Set(['dashboard', 'patients', 'appointments', 'waiting-room', 'clinical/encounters', 'clinical/dental-chart', 'treatment-plans', 'procedures', 'prescriptions', 'billing/invoices', 'billing/payments', 'billing/receipts', 'outstanding-balances', 'recalls', 'reports', 'users', 'clinic-settings', 'profile', 'component-showcase']);
const routeTitles = { dashboard: 'Dashboard', patients: 'Patients', appointments: 'Appointments', 'waiting-room': 'Waiting Room', 'clinical/encounters': 'Encounters', 'clinical/dental-chart': 'Dental Chart', 'treatment-plans': 'Treatment Plans', procedures: 'Procedures Performed', prescriptions: 'Prescriptions', 'billing/invoices': 'Invoices', 'billing/payments': 'Payments', 'billing/receipts': 'Receipts', 'outstanding-balances': 'Outstanding Balances', recalls: 'Recalls & Follow-Ups', reports: 'Reports', users: 'Users & Staff', 'clinic-settings': 'Settings', profile: 'My Profile' };
const routeFromHash = () => location.hash.replace(/^#\/?/, '') || 'dashboard';
const isPatientRoute = route => /^patients\/(?:new|P\d{3}(?:\/(?:edit|appointments|clinical|clinical-history|dental-chart|treatment-plans(?:\/workspace)?|prescriptions|documents|billing|recalls))?)$/.test(route);
const isAppointmentRoute = route => /^appointments\/(?:new(?:\/P\d{3})?|APT-\d{6}\/(?:edit|reschedule))$/.test(route);
const isEncounterRoute = route => /^clinical\/encounters\/ENC-\d{6}$/.test(route);
const isTreatmentPlanRoute = route => /^treatment-plans\/TP-\d{6}$/.test(route);
export const router = {
  register(route) { registeredRoutes.add(route); },
  current() { return routeFromHash(); },
  isKnown(route) { return registeredRoutes.has(route) || isPatientRoute(route) || isAppointmentRoute(route) || isEncounterRoute(route) || isTreatmentPlanRoute(route); },
  title(route) { return routeTitles[route] || (isEncounterRoute(route) ? 'Encounters' : isTreatmentPlanRoute(route) ? 'Treatment Plans' : isAppointmentRoute(route) ? route.startsWith('appointments/new') ? 'Book Appointment' : route.endsWith('/edit') ? 'Edit Appointment' : 'Reschedule Appointment' : isPatientRoute(route) ? route === 'patients/new' ? 'Register Patient' : route.endsWith('/edit') ? 'Edit Patient' : route.endsWith('/clinical') ? 'Clinical Encounter' : route.endsWith('/dental-chart') ? 'Dental Chart' : route.endsWith('/treatment-plans/workspace') ? 'Treatment Plans' : route.endsWith('/prescriptions') ? 'Prescriptions' : route.endsWith('/documents') ? 'Documents' : 'Patient Profile' : 'Page Not Found'); },
  start(render) { const update = () => render(this.current()); window.addEventListener('hashchange', update); update(); }
};
