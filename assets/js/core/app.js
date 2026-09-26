import { router } from './router.js';
import { state } from './state.js';
import { renderComponentShowcase } from '../components/showcase.js';
import { isRouteAllowed, renderShell } from '../components/shell.js';
import { auth } from './auth.js';
import { storage } from './storage.js';
import { showToast } from '../components/overlays.js';
import { renderAdminDashboard, renderCashierDashboard, renderDentistDashboard, renderReceptionistDashboard } from '../modules/dashboard.js';
import { renderPatientEdit, renderPatientPlaceholder, renderPatientRegistration, renderPatientRegistry } from '../modules/patients.js';
import { renderPatientProfile } from '../modules/patient-profile.js';
import { renderAppointments } from '../modules/appointments.js';
import { renderAppointmentForm } from '../modules/appointment-form.js';
import { renderWaitingRoom } from '../modules/waiting-room.js';
import { renderClinicalWorkspace } from '../modules/clinical-workspace.js';
import { renderEncountersRegister } from '../modules/encounters-register.js';
import { renderDentalChart, renderDentalChartLanding } from '../modules/dental-chart.js';
import { renderTreatmentPlanLanding, renderTreatmentPlanRegister, renderTreatmentPlanWorkspace } from '../modules/treatment-plans.js';
import { renderProcedureHistory } from '../modules/procedures.js';
import { renderPrescriptionLanding, renderPrescriptionWorkspace } from '../modules/prescriptions.js';
import { renderDocumentWorkspace } from '../modules/documents.js';
import { renderBillingWorkspace } from '../modules/billing.js';
import { renderPaymentsWorkspace, renderReceiptsWorkspace } from '../modules/payments.js';
import { renderOutstandingBalancesWorkspace } from '../modules/outstanding-balances.js';
import { renderRecallsWorkspace } from '../modules/recalls.js';
import { renderReportsWorkspace } from '../modules/reports.js';
import { renderUsersWorkspace } from '../modules/users.js';
import { renderProfileWorkspace, renderSettingsWorkspace } from '../modules/settings-profile.js';
import { dirtyState } from './dirty-state.js';

// Application bootstrap and route composition.
const root = document.querySelector('#app');
let developmentRole = null;
const renderFoundation = route => {
  const session = auth.session();
  if (!session) { location.replace('index.html?expired'); return; }
  developmentRole = session.role;
  document.title = `${router.isKnown(route) ? router.title(route) : 'Page Not Found'} | Pearl Smile Dental Clinic`;
  const dashboardState = state.get();
  // Route authorization precedes every module renderer, so denied pages never compose detached sensitive DOM.
  if (!router.isKnown(route) || !isRouteAllowed(developmentRole, route)) return renderShell({ root, route, role: developmentRole, mainContent: null, appState: dashboardState, isKnown: candidate => router.isKnown(candidate) });
  if (route === 'component-showcase') return renderComponentShowcase(root);
  const canComposeClinicalContent = ['Clinic Administrator', 'Dentist'].includes(developmentRole);
  const usersContent = route === 'users' ? renderUsersWorkspace({ state: dashboardState, session }) : null;
  const settingsContent = route === 'clinic-settings' ? renderSettingsWorkspace({ state: dashboardState, session }) : null;
  const profileContent = route === 'profile' ? renderProfileWorkspace({ state: dashboardState, session }) : null;
  if (route === 'treatment-plans' || /^treatment-plans\/TP-\d{6}$/.test(route)) {
    const treatmentPlanContent = canComposeClinicalContent ? route === 'treatment-plans' ? renderTreatmentPlanRegister({ state: dashboardState, session }) : renderTreatmentPlanWorkspace({ state: dashboardState, session, planId: route.split('/')[1] }) : null;
    return renderShell({ root, route, role: developmentRole, mainContent: treatmentPlanContent, appState: dashboardState, isKnown: candidate => router.isKnown(candidate), onRoleChange: role => { developmentRole = role; renderFoundation(route); } });
  }
  // Phase 6 dashboards audited and frozen. Role-specific dashboards consume centralized Phase 5 data; do not duplicate KPI data or bypass permissions.
  const mainContent = usersContent || settingsContent || profileContent || (route === 'dashboard' && developmentRole === 'Clinic Administrator' ? renderAdminDashboard({ state: dashboardState, session: auth.session() }) : route === 'dashboard' && developmentRole === 'Dentist' ? renderDentistDashboard({ state: dashboardState, session: auth.session() }) : route === 'dashboard' && developmentRole === 'Receptionist' ? renderReceptionistDashboard({ state: dashboardState, session: auth.session() }) : route === 'dashboard' && developmentRole === 'Cashier' ? renderCashierDashboard({ state: dashboardState, session: auth.session() }) : route === 'billing/invoices' ? renderBillingWorkspace({ state: dashboardState, session: auth.session() }) : route === 'billing/payments' ? renderPaymentsWorkspace({ state: dashboardState, session: auth.session() }) : route === 'billing/receipts' ? renderReceiptsWorkspace({ state: dashboardState, session: auth.session() }) : route === 'outstanding-balances' ? renderOutstandingBalancesWorkspace({ state: dashboardState, session: auth.session() }) : route === 'clinical/encounters' ? renderEncountersRegister({ state: dashboardState, session: auth.session() }) : /^clinical\/encounters\/ENC-\d{6}$/.test(route) ? canComposeClinicalContent ? renderClinicalWorkspace({ state: dashboardState, session: auth.session(), encounterId: route.split('/')[2] }) : null : route === 'recalls' ? renderRecallsWorkspace({ state: dashboardState, session: auth.session() }) : route === 'reports' ? renderReportsWorkspace({ state: dashboardState, session: auth.session() }) : route === 'appointments' ? renderAppointments({ state: dashboardState, session: auth.session() }) : route === 'waiting-room' ? renderWaitingRoom({ state: dashboardState, session: auth.session() }) : /^appointments\/new(?:\/P\d{3})?$/.test(route) ? renderAppointmentForm({ state: dashboardState, session: auth.session(), preselectedPatientId: route.split('/')[2] || null }) : /^appointments\/APT-\d{6}\/edit$/.test(route) ? renderAppointmentForm({ state: dashboardState, session: auth.session(), mode: 'edit', appointmentId: route.split('/')[1] }) : /^appointments\/APT-\d{6}\/reschedule$/.test(route) ? renderAppointmentForm({ state: dashboardState, session: auth.session(), mode: 'reschedule', appointmentId: route.split('/')[1] }) : route === 'patients' ? renderPatientRegistry({ state: dashboardState, role: developmentRole }) : route === 'patients/new' ? renderPatientRegistration({ state: dashboardState, session: auth.session() }) : /^patients\/P\d{3}\/edit$/.test(route) ? renderPatientEdit({ state: dashboardState, session: auth.session(), patientId: route.split('/')[1] }) : /^patients\/P\d{3}\/clinical$/.test(route) ? canComposeClinicalContent ? renderClinicalWorkspace({ state: dashboardState, session: auth.session(), patientId: route.split('/')[1] }) : null : /^patients\/P\d{3}\/dental-chart$/.test(route) ? canComposeClinicalContent ? renderDentalChart({ state: dashboardState, session: auth.session(), patientId: route.split('/')[1] }) : null : /^patients\/P\d{3}\/treatment-plans\/workspace$/.test(route) ? canComposeClinicalContent ? renderTreatmentPlanWorkspace({ state: dashboardState, session: auth.session(), patientId: route.split('/')[1] }) : null : /^patients\/P\d{3}\/prescriptions$/.test(route) ? canComposeClinicalContent ? renderPrescriptionWorkspace({ state: dashboardState, session: auth.session(), patientId: route.split('/')[1] }) : null : /^patients\/P\d{3}\/documents$/.test(route) ? canComposeClinicalContent ? renderDocumentWorkspace({ state: dashboardState, session: auth.session(), patientId: route.split('/')[1] }) : null : route === 'clinical/dental-chart' ? canComposeClinicalContent ? renderDentalChartLanding() : null : route === 'treatment-plans' ? canComposeClinicalContent ? renderTreatmentPlanLanding() : null : route === 'procedures' ? canComposeClinicalContent ? renderProcedureHistory({ state: dashboardState, session: auth.session() }) : null : route === 'prescriptions' ? canComposeClinicalContent ? renderPrescriptionLanding() : null : /^patients\/P\d{3}(?:\/(?:appointments|clinical-history|treatment-plans|prescriptions|documents|billing|recalls))?$/.test(route) ? route.endsWith('/clinical-history') && !canComposeClinicalContent ? null : renderPatientProfile({ state: dashboardState, session: auth.session(), patientId: route.split('/')[1], section: route.split('/')[2] === 'clinical-history' ? 'clinical' : route.split('/')[2] || 'overview' }) : route.startsWith('patients/') ? renderPatientPlaceholder(route) : null);
  return renderShell({ root, route, role: developmentRole, mainContent, appState: dashboardState, isKnown: candidate => router.isKnown(candidate), onRoleChange: role => { developmentRole = role; renderFoundation(route); } });
};

try {
  state.initialize();
  router.start(renderFoundation);
  const loginSuccess = storage.get('login-success');
  if (loginSuccess) { storage.remove('login-success'); showToast({ title: `Welcome back, ${loginSuccess.name}.`, message: `Signed in as ${loginSuccess.role}.`, variant: 'success' }); }
  window.DentalAppDev = Object.freeze({ resetDemoData: () => { dirtyState.clear(); return state.resetDemoData(); }, resetDemoState: () => { dirtyState.clear(); return state.resetDemoData(); }, getState: () => state.get(), getDirtySources: () => dirtyState.getSources() });
} catch (error) {
  console.error('Application foundation could not initialize.', error);
  root.innerHTML = '<main class="foundation-panel"><h1>Application unavailable</h1><p>Please refresh the page or reset the demo state.</p></main>';
}
