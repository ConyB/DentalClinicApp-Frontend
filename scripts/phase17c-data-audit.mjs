import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { getOutstandingBalance, getTodayCollections, getTotalPostedPayments } from '../assets/js/data/finance.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { buildReport } from '../assets/js/data/reports.js';
import { changeOwnPassword, updateOwnProfile, updateSettings } from '../assets/js/data/configuration-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const actor = { role: 'Clinic Administrator', userId: 'U001', branchId: 'BR-MAIN' };
const state = createCanonicalDemoState();
const businessSnapshot = value => JSON.stringify({
  patients: value.patients,
  appointments: value.appointments,
  queue: value.queueEntries,
  encounters: value.clinicalEncounters,
  medicalHistory: [value.patientAllergies, value.patientConditions, value.patientMedications],
  odontogram: [value.dentalChartEntries, value.dentalChartEntrySurfaces],
  treatmentPlans: [value.treatmentPlans, value.treatmentPlanItems],
  procedures: value.proceduresPerformed,
  prescriptions: value.prescriptions,
  documents: value.patientDocuments,
  invoices: [value.invoices, value.invoiceItems],
  payments: value.payments,
  receipts: value.receipts,
  recalls: value.recalls
});

assert(validateCanonicalDemoState(state).valid, 'Canonical state invalid.');
assert(state.clinicSettings.defaultAppointmentMinutes === 30, 'Canonical appointment duration must be 30 minutes.');
assert(state.users.length === 6 && state.users.filter(user => user.status === 'active').length === 5 && state.users.filter(user => user.status === 'inactive').length === 1 && state.users.filter(user => user.roleCode === 'dentist' && user.status === 'active').length === 2, 'Canonical user counts changed.');
const miriam = state.users.find(user => user.id === 'U006');
assert(miriam?.fullName === 'Miriam Achieng' && miriam.roleCode === 'receptionist' && miriam.status === 'inactive', 'Miriam canonical account changed.');
assert(state.appointments.filter(appointment => appointment.startDateTime.slice(0, 10) === state.referenceDate).length === 9, 'Reference-date appointment count changed.');
assert(getTotalPostedPayments(state) === 2_360_000 && getOutstandingBalance(state) === 420_000 && getTodayCollections(state) === 360_000 && state.payments.filter(payment => payment.status === 'POSTED' && payment.receivedAt.slice(0, 10) === state.referenceDate).length === 2, 'Canonical finance metrics changed.');
const recallReport = buildReport({ state, role: actor.role, userId: actor.userId, type: 'recalls', filters: {} });
for (const [label, expected] of [['Upcoming', 1], ['Overdue', 1], ['Scheduled', 3]]) assert(recallReport.metrics.find(([name]) => name === label)?.[1] === expected, `Recall ${label} count changed.`);

const beforeBusiness = businessSnapshot(state);
const beforeInvalid = JSON.stringify(state);
let failed = false;
try {
  updateSettings({ state, actor, values: { clinicName: ' ', branchName: 'Main', phone: '', email: 'bad', address: '', defaultAppointmentMinutes: 1 } });
} catch { failed = true; }
assert(failed && JSON.stringify(state) === beforeInvalid, 'Invalid settings save was not atomic.');
for (const restrictedActor of [{ role: 'Dentist', userId: 'U002' }, { role: 'Receptionist', userId: 'U004' }, { role: 'Cashier', userId: 'U005' }]) {
  failed = false;
  try { updateSettings({ state, actor: restrictedActor, values: { clinicName: 'Denied', branchName: 'Denied', phone: '+256 700 000 000', email: 'denied@example.test', address: 'Denied', defaultAppointmentMinutes: 45 } }); } catch { failed = true; }
  assert(failed, `${restrictedActor.role} settings mutation was accepted.`);
}

const auditCountBeforeSettings = state.auditLogs.length;
const settings = updateSettings({ state, actor, values: { clinicName: 'Pearl Smile Dental Clinic Updated', branchName: 'Kampala Main Branch', phone: '+256 700 555 011', email: 'settings@pearlsmiledental.test', address: 'Kampala, Uganda', defaultAppointmentMinutes: 45 } });
assert(settings.changed && state.organization.name.endsWith('Updated') && state.clinicSettings.defaultAppointmentMinutes === 45 && state.auditLogs.length === auditCountBeforeSettings + 1 && state.auditLogs.at(-1).actionCode === 'SETTINGS_UPDATED', 'Settings update or one-event audit failed.');

const originalRole = state.users.find(user => user.id === actor.userId).roleCode;
const originalStatus = state.users.find(user => user.id === actor.userId).status;
const profile = updateOwnProfile({ state, actor, values: { fullName: 'Grace Namutebi', email: 'grace.profile@pearlsmiledental.test', phone: '+256 700 555 101', jobTitle: 'Practice Administrator', roleCode: 'cashier', status: 'inactive', userId: 'U005' } });
const updatedUser = state.users.find(user => user.id === actor.userId);
assert(profile.changed && updatedUser.email === 'grace.profile@pearlsmiledental.test' && updatedUser.roleCode === originalRole && updatedUser.status === originalStatus && state.users.find(user => user.id === 'U005').fullName === 'Brian Ssemanda' && state.auditLogs.at(-1).actionCode === 'PROFILE_UPDATED', 'Own-profile update or protected-field filtering failed.');

failed = false;
try { changeOwnPassword({ state, actor, currentPassword: 'wrong', newPassword: 'NewPass@123', confirmation: 'NewPass@123' }); } catch { failed = true; }
assert(failed, 'Wrong current password was accepted.');
failed = false;
try { changeOwnPassword({ state, actor, currentPassword: 'Demo@123', newPassword: 'NewPass@123', confirmation: 'Mismatch@123' }); } catch { failed = true; }
assert(failed, 'Password mismatch was accepted.');
const auditCountBeforePassword = state.auditLogs.length;
changeOwnPassword({ state, actor, currentPassword: 'Demo@123', newPassword: 'NewPass@123', confirmation: 'NewPass@123' });
const passwordAudit = state.auditLogs.at(-1);
assert(state.demoCredentials.find(item => item.userId === actor.userId).demoPassword === 'NewPass@123' && state.auditLogs.length === auditCountBeforePassword + 1 && passwordAudit.actionCode === 'PASSWORD_CHANGED', 'Password update failed.');
assert(!JSON.stringify(passwordAudit).includes('Demo@123') && !JSON.stringify(passwordAudit).includes('NewPass@123'), 'Password value leaked into the audit trail.');

assert(businessSnapshot(state) === beforeBusiness, 'Configuration actions mutated business data.');
const runtimeValidation = validateRuntimeState(state);
assert(runtimeValidation.valid, runtimeValidation.errors.join(' | '));
const reset = createCanonicalDemoState();
assert(reset.clinicSettings.defaultAppointmentMinutes === 30 && reset.demoCredentials.every(credential => credential.demoPassword === 'Demo@123') && validateCanonicalDemoState(reset).valid, 'Canonical reset did not restore settings and demo credentials.');

console.log(JSON.stringify({
  status: 'pass',
  settings: { canonicalDuration: 30, validation: 'atomic', authorization: 'administrator-only mutation', audit: 'one event' },
  profile: { ownership: 'current user', protectedFields: ['role', 'status', 'userId'] },
  password: { wrongCurrent: 'rejected', mismatch: 'rejected', auditSecrets: 0, reset: 'restored' },
  canonical: { users: 6, active: 5, inactive: 1, dentists: 2, appointments: 9, totalPayments: 2_360_000, outstanding: 420_000, todayCollections: 360_000, paymentsToday: 2, recalls: { upcoming: 1, overdue: 1, scheduled: 3 } },
  businessIsolation: 'pass',
  integrity: 'pass'
}, null, 2));
