import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { permissions } from '../assets/js/core/permissions.js';
import { resolveActiveActor, resolveActiveSession } from '../assets/js/core/authorization.js';
import { getPatientProfileOverviewData, getPatientProfileSectionAccess } from '../assets/js/data/patient-profile.js';
import { buildReport, canViewReportType, reportTypesForRole } from '../assets/js/data/reports.js';
import { calculateInvoiceBalance, calculateInvoicePaid, calculateInvoiceTotal, getOutstandingBalance, getTodayCollections, getTotalPostedPayments } from '../assets/js/data/finance.js';
import { createAppointment } from '../assets/js/data/appointment-workflows.js';
import { checkInAppointment } from '../assets/js/data/queue-workflows.js';
import { startClinicalEncounter, savePatientMedicalRecord } from '../assets/js/data/clinical-workflows.js';
import { addDentalFinding } from '../assets/js/data/dental-chart-workflows.js';
import { createTreatmentPlan } from '../assets/js/data/treatment-plan-workflows.js';
import { recordProcedure } from '../assets/js/data/procedure-workflows.js';
import { createPrescription } from '../assets/js/data/prescription-workflows.js';
import { createClinicalDocument } from '../assets/js/data/document-workflows.js';
import { createInvoice } from '../assets/js/data/invoice-workflows.js';
import { recordPayment } from '../assets/js/data/payment-workflows.js';
import { createRecall } from '../assets/js/data/recall-workflows.js';
import { createUser } from '../assets/js/data/user-management.js';
import { changeOwnPassword, updateOwnProfile, updateSettings } from '../assets/js/data/configuration-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = state => JSON.stringify(state);
const actors = Object.freeze({
  admin: { userId: 'U001', role: 'Clinic Administrator' },
  daniel: { userId: 'U002', role: 'Dentist' },
  sarah: { userId: 'U003', role: 'Dentist' },
  receptionist: { userId: 'U004', role: 'Receptionist' },
  cashier: { userId: 'U005', role: 'Cashier' },
  inactive: { userId: 'U006', role: 'Receptionist' }
});
const denied = (label, operation) => {
  const state = createCanonicalDemoState(), before = snapshot(state), audits = state.auditLogs.length;
  let rejected = false;
  try { operation(state); } catch { rejected = true; }
  assert(rejected, `${label}: unauthorized operation was accepted.`);
  assert(snapshot(state) === before, `${label}: rejected operation changed state.`);
  assert(state.auditLogs.length === audits, `${label}: rejected operation wrote an audit event.`);
  return label;
};

const canonical = createCanonicalDemoState();
assert(validateCanonicalDemoState(canonical).valid && validateRuntimeState(canonical).valid, 'Canonical state is invalid before Phase 20.');
assert(canonical.roles.length === 4 && canonical.users.length === 6, 'Canonical role or user count is wrong.');
assert(canonical.users.filter(user => user.status === 'active').length === 5 && canonical.users.filter(user => user.status === 'inactive').length === 1, 'Active/inactive account counts are wrong.');
assert(canonical.users.filter(user => user.roleCode === 'dentist' && user.status === 'active').length === 2, 'Active Dentist count is wrong.');
assert(canonical.users.find(user => user.id === 'U006')?.roleCode === 'receptionist' && canonical.users.find(user => user.id === 'U006')?.status === 'inactive', 'Miriam must remain an inactive Receptionist.');
assert(!canonical.users.some(user => Object.keys(user).some(key => /^can[A-Z]/.test(key))), 'Per-user permission flags were found.');

for (const actor of Object.values(actors).slice(0, 5)) assert(resolveActiveActor({ state: canonical, actor }).role === actor.role, `${actor.userId}: canonical actor resolution failed.`);
for (const actor of [actors.inactive, { userId: 'U005', role: 'Clinic Administrator' }, { userId: 'U005' }, { userId: 'UNKNOWN', role: 'Clinic Administrator' }, { userId: 'U005', role: 'cashier' }]) {
  let rejected = false; try { resolveActiveActor({ state: canonical, actor }); } catch { rejected = true; }
  assert(rejected, `Invalid actor was not denied: ${JSON.stringify(actor)}`);
}
assert(resolveActiveSession({ state: canonical, session: { ...actors.cashier, authenticatedAt: '2026-09-24T00:00:00Z' } })?.role === 'Cashier', 'Valid session did not resolve.');
assert(resolveActiveSession({ state: canonical, session: { ...actors.cashier, role: 'Clinic Administrator' } }) === null, 'Tampered session role was accepted.');
const mutatedRoles = structuredClone(canonical); mutatedRoles.roles.find(role => role.code === 'cashier').name = 'Clinic Administrator';
assert(resolveActiveSession({ state: mutatedRoles, session: actors.cashier }) === null, 'Mutated centralized role definition was trusted.');

const expectedReports = {
  'Clinic Administrator': ['patients', 'appointments', 'clinical', 'finance', 'recalls'],
  Dentist: ['patients', 'appointments', 'clinical', 'recalls'],
  Receptionist: ['patients', 'appointments', 'recalls'],
  Cashier: ['finance']
};
for (const [role, types] of Object.entries(expectedReports)) {
  assert(JSON.stringify(reportTypesForRole(role).map(item => item.id)) === JSON.stringify(types), `${role}: report catalogue is not role-scoped.`);
  for (const type of Object.keys(expectedReports['Clinic Administrator'])) {
    const allowed = types.includes(type);
    assert(canViewReportType(role, type) === allowed, `${role}/${type}: report permission mismatch.`);
    assert(Boolean(buildReport({ state: canonical, role, userId: role === 'Dentist' ? 'U002' : null, type })) === allowed, `${role}/${type}: report builder bypass.`);
  }
}
assert(buildReport({ state: canonical, role: 'Cashier', userId: 'U005', type: 'clinical' }) === null, 'Cashier report type injection exposed clinical data.');
assert(buildReport({ state: canonical, role: 'Receptionist', userId: 'U004', type: 'finance' }) === null, 'Receptionist report type injection exposed finance data.');

const cashierProfile = getPatientProfileOverviewData({ state: canonical, patientId: 'P001', role: 'Cashier' });
const receptionistProfile = getPatientProfileOverviewData({ state: canonical, patientId: 'P001', role: 'Receptionist' });
assert(cashierProfile.medical === null && cashierProfile.activity.encounters === null && cashierProfile.permissions.canClinical === false, 'Cashier patient profile exposes clinical PHI.');
assert(receptionistProfile.medical?.allergies.length >= 0 && receptionistProfile.medical.conditions.length === 0 && receptionistProfile.medical.medications.length === 0 && receptionistProfile.activity.encounters === null, 'Receptionist patient profile exceeds safety-summary scope.');
assert(!getPatientProfileSectionAccess('Cashier').clinical && !getPatientProfileSectionAccess('Cashier')['dental-chart'] && !getPatientProfileSectionAccess('Receptionist').prescriptions, 'Restricted patient tabs are enabled.');
assert(permissions.can('Unknown', 'users.view') === false && permissions.can('', 'dashboard.view') === false, 'Unknown roles did not fail closed.');

const attacks = [
  denied('appointment/cashier', state => createAppointment({ state, values: {}, actor: actors.cashier })),
  denied('queue/cashier', state => checkInAppointment({ state, appointmentId: 'APT-000104', actor: actors.cashier })),
  denied('encounter/receptionist', state => startClinicalEncounter({ state, patientId: 'P001', actor: actors.receptionist })),
  denied('medical-history/receptionist', state => savePatientMedicalRecord({ state, type: 'allergy', patientId: 'P001', value: 'Injected allergy', actor: actors.receptionist })),
  denied('odontogram/receptionist', state => addDentalFinding({ state, patientId: 'P001', toothCode: '11', conditionCode: 'CARIES', surfaces: ['F'], actor: actors.receptionist })),
  denied('treatment-plan/receptionist', state => createTreatmentPlan({ state, patientId: 'P001', actor: actors.receptionist })),
  denied('procedure/receptionist', state => recordProcedure({ state, patientId: 'P001', serviceId: 'SVC-001', actor: actors.receptionist })),
  denied('prescription/receptionist', state => createPrescription({ state, patientId: 'P001', items: [], actor: actors.receptionist })),
  denied('document/receptionist', state => createClinicalDocument({ state, patientId: 'P001', type: 'XRAY', title: 'Injected', capturedAt: state.referenceDate, fileMetadata: {}, actor: actors.receptionist })),
  denied('invoice/dentist', state => createInvoice({ state, patientId: 'P001', items: [], actor: actors.daniel })),
  denied('payment/dentist', state => recordPayment({ state, invoiceId: 'INV-000602', amount: 1, paymentMethodCode: 'CASH', actor: actors.daniel })),
  denied('recall/cashier', state => createRecall({ state, values: {}, actor: actors.cashier })),
  denied('user/dentist', state => createUser({ state, values: {}, actor: actors.daniel })),
  denied('settings/dentist', state => updateSettings({ state, values: {}, actor: actors.daniel })),
  denied('password/inactive-account', state => changeOwnPassword({ state, currentPassword: 'Demo@123', newPassword: 'Changed@123', confirmation: 'Changed@123', actor: actors.inactive }))
];

const profileState = createCanonicalDemoState(), profileBefore = snapshot(profileState);
const brian = profileState.users.find(user => user.id === 'U005');
const injected = updateOwnProfile({ state: profileState, values: { fullName: brian.fullName, email: brian.email, phone: brian.phone || '', jobTitle: brian.jobTitle || '', userId: 'U001', role: 'Clinic Administrator', status: 'inactive' }, actor: actors.cashier });
assert(!injected.changed && snapshot(profileState) === profileBefore, 'Profile target/role/status injection changed protected state.');

for (const invoice of canonical.invoices) assert(calculateInvoiceTotal(canonical, invoice.id) === calculateInvoicePaid(canonical, invoice.id) + calculateInvoiceBalance(canonical, invoice.id), `${invoice.id}: finance equation failed.`);
assert(getTotalPostedPayments(canonical) === 2360000 && getOutstandingBalance(canonical) === 420000 && getTodayCollections(canonical) === 360000, 'Canonical finance totals changed.');
assert(canonical.appointments.filter(item => item.startDateTime.startsWith(canonical.referenceDate)).length === 9, 'Canonical today appointment count changed.');

console.log(JSON.stringify({
  status: 'pass',
  architecture: { roles: 4, defaultPolicy: 'deny', perUserOverrides: 0, actorAuthority: 'canonical active user + exact role' },
  accounts: { total: 6, active: 5, inactive: 1, activeDentists: 2, miriam: 'inactive receptionist retained' },
  privacy: { cashierClinical: 'denied', receptionistClinical: 'safety summary only', reportInjection: 'denied' },
  storeAttackCases: attacks.length + 1,
  canonical: { postedPayments: 2360000, outstanding: 420000, todayCollections: 360000, todayAppointments: 9 },
  integrity: 'pass'
}, null, 2));
