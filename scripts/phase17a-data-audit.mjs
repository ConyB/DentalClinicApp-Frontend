import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';
import { buildReport, canViewReportType, reportTypesForRole } from '../assets/js/data/reports.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const canonical = createCanonicalDemoState();
const snapshot = JSON.stringify(canonical);
const report = (type, role = 'Clinic Administrator', userId = 'U001', filters = {}) => buildReport({ state: canonical, role, userId, type, filters });
const metric = (result, label) => result.metrics.find(([name]) => name === label)?.[1];

assert(validateCanonicalDemoState(canonical).valid, 'Canonical demo state is invalid before reporting.');
const appointments = report('appointments', 'Clinic Administrator', 'U001', { from: canonical.referenceDate, to: canonical.referenceDate });
assert(appointments.rows.length === 9, 'Reference-date appointment report must contain nine appointments.');
for (const [label, expected] of [['Completed', 1], ['Waiting', 1], ['In Treatment', 1], ['Confirmed', 2], ['Scheduled', 3], ['Cancelled', 1]]) assert(metric(appointments, label) === expected, `Appointment ${label} count is not ${expected}.`);
assert(appointments.breakdown.rows.find(row => row.dentist === 'Dr. Daniel Mugisha')?.appointments === 5 && appointments.breakdown.rows.find(row => row.dentist === 'Dr. Sarah Nakanwagi')?.appointments === 4, 'Dentist workload totals do not reconcile.');

const patients = report('patients');
assert(patients.rows.length === 30 && metric(patients, 'Patients') === 30, 'Patient registration report does not use all canonical patients.');
const clinical = report('clinical');
assert(clinical.rows.length === 4 && metric(clinical, 'Completed Procedures') === 4, 'Clinical procedure report does not reconcile completed procedures.');
const finance = report('finance');
assert(finance.rows.length === 7 && metric(finance, 'Total Payments') === 2360000 && metric(finance, 'Payments Today') === 2 && metric(finance, 'Current Outstanding') === 420000 && metric(finance, "Today's Collections") === 360000, 'Finance report totals do not reconcile.');
const financeToday = report('finance', 'Clinic Administrator', 'U001', { from: canonical.referenceDate, to: canonical.referenceDate });
assert(metric(financeToday, 'Payments Today') === 2 && metric(financeToday, 'Total Payments') === 360000, 'Reference-date payment count and collections do not reconcile.');
assert(finance.secondary.rows.map(row => `${row.patient}:${row.balance}`).join('|') === 'Joseph Walusimbi:300000|Amina Nakato:70000|Samuel Kato:50000', 'Outstanding balance report is not sorted or reconciled.');
assert(finance.tertiary.rows.reduce((total, row) => total + row.amount, 0) === 2780000 && finance.tertiary.rows.some(row => row.dentist === 'Dr. Sarah Nakanwagi' && row.procedure === 'Porcelain Crown'), 'Invoiced revenue by Dentist and procedure does not reconcile.');
const recalls = report('recalls');
for (const [label, expected] of [['Upcoming', 1], ['Overdue', 1], ['Scheduled', 3], ['Completed', 0]]) assert(metric(recalls, label) === expected, `Recall ${label} count is not ${expected}.`);
assert(recalls.rows.map(row => row.patient).join('|') === 'Samuel Kato|Peter Okello|Mariam Nabwire|Amina Nakato|Joan Nambasa', 'Recall report rows are inconsistent with canonical records.');

const dentistAppointments = report('appointments', 'Dentist', 'U002', { from: canonical.referenceDate, to: canonical.referenceDate });
assert(dentistAppointments.rows.length === 5 && dentistAppointments.rows.every(row => row.dentist === 'Dr. Daniel Mugisha'), 'Dentist appointment report is not ownership-scoped.');
assert(report('finance', 'Dentist', 'U002') === null && report('clinical', 'Cashier', 'U005') === null, 'Unauthorized report category was exposed.');
assert(reportTypesForRole('Receptionist').map(item => item.id).join('|') === 'patients|appointments|recalls', 'Receptionist report categories are incorrect.');
assert(reportTypesForRole('Cashier').map(item => item.id).join('|') === 'finance' && !canViewReportType('Cashier', 'recalls'), 'Cashier report categories are incorrect.');
assert(report('appointments', 'Clinic Administrator', 'U001', { from: '2026-10-01', to: '2026-09-01' }).error, 'Invalid date range was accepted.');
for (const result of [appointments, patients, clinical, finance, financeToday, recalls]) {
  assert(result.metrics.every(([, value]) => Number.isFinite(value)), `${result.title} contains a non-finite metric.`);
  for (const section of [result, result.breakdown, result.secondary, result.tertiary].filter(Boolean)) {
    assert(section.rows.every(row => Object.values(row).every(value => value !== null && value !== undefined && !(typeof value === 'number' && !Number.isFinite(value)) && typeof value !== 'object')), `${section.title || result.title} contains a value unsafe for direct presentation.`);
  }
}
assert(JSON.stringify(canonical) === snapshot && validateCanonicalDemoState(canonical).valid, 'Read-only reporting mutated canonical state.');

console.log(JSON.stringify({ status: 'pass', appointments: 9, patients: 30, procedures: 4, finance: { payments: 2360000, outstanding: 420000, today: 360000, paymentsToday: 2 }, recalls: { upcoming: 1, overdue: 1, scheduled: 3 }, presentationValues: 'finite primitives', roles: 'scoped', integrity: 'pass' }, null, 2));
