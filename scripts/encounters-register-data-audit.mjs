import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { getEncounterRegister } from '../assets/js/data/clinical.js';
import { getClinicalVisitContext } from '../assets/js/data/clinical-workflows.js';
import { getOutstandingBalance, getTodayCollections, getTotalPostedPayments, getRecallsByStatus } from '../assets/js/data/finance.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const admin = { role: 'Clinic Administrator', userId: 'U001' }, daniel = { role: 'Dentist', userId: 'U002' }, sarah = { role: 'Dentist', userId: 'U003' };

try {
  const state = createCanonicalDemoState(), snapshot = JSON.stringify(state);
  const expected = {
    'ENC-000201': ['P001', 'APT-000094', 'U002', 'COMPLETED'],
    'ENC-000202': ['P003', 'APT-000101', 'U002', 'COMPLETED'],
    'ENC-000203': ['P009', 'APT-000102', 'U003', 'DRAFT'],
    'ENC-000204': ['P002', null, 'U003', 'COMPLETED']
  };
  assert(state.clinicalEncounters.length === 4, 'Unexpected canonical encounter count.');
  Object.entries(expected).forEach(([id, [patientId, appointmentId, dentistUserId, status]]) => { const encounter = state.clinicalEncounters.find(item => item.id === id); assert(encounter && encounter.patientId === patientId && encounter.appointmentId === appointmentId && encounter.dentistUserId === dentistUserId && encounter.status === status, `Canonical ${id} is incorrect.`); });
  assert(JSON.stringify(getEncounterRegister(state, admin).map(item => item.id)) === JSON.stringify(['ENC-000203', 'ENC-000202', 'ENC-000201', 'ENC-000204']), 'Administrator register ordering is incorrect.');
  assert(JSON.stringify(getEncounterRegister(state, daniel).map(item => item.id)) === JSON.stringify(['ENC-000202', 'ENC-000201']), 'Dr. Daniel register scope is incorrect.');
  assert(JSON.stringify(getEncounterRegister(state, sarah).map(item => item.id)) === JSON.stringify(['ENC-000203', 'ENC-000204']), 'Dr. Sarah register scope is incorrect.');
  assert(getEncounterRegister(state, { role: 'Receptionist', userId: 'U004' }).length === 0 && getEncounterRegister(state, { role: 'Cashier', userId: 'U005' }).length === 0, 'Restricted role received encounter register data.');
  assert(JSON.stringify(state) === snapshot, 'Encounter register selector mutated canonical state.');

  const aminaVisit = getClinicalVisitContext(state, 'P001');
  assert(aminaVisit.appointment?.id === 'APT-000103' && aminaVisit.encounter === null, 'Historical Amina encounter replaced the current clinical context.');
  state.clinicalEncounters.filter(encounter => encounter.appointmentId).forEach(encounter => { const appointment = state.appointments.find(item => item.id === encounter.appointmentId); assert(appointment && appointment.patientId === encounter.patientId && appointment.dentistUserId === encounter.dentistUserId, `${encounter.id} has an invalid appointment relationship.`); });
  state.clinicalEncounters.forEach(encounter => { assert(state.patients.some(patient => patient.id === encounter.patientId), `${encounter.id} has an invalid patient.`); assert(state.users.some(user => user.id === encounter.dentistUserId && user.roleCode === 'dentist'), `${encounter.id} has an invalid Dentist.`); assert(['DRAFT', 'IN_PROGRESS', 'COMPLETED'].includes(encounter.status), `${encounter.id} has an invalid status.`); });
  assert(new Set(state.clinicalEncounters.map(encounter => encounter.id)).size === state.clinicalEncounters.length, 'Encounter IDs are not unique.');
  const canonical = validateCanonicalDemoState(state), runtime = validateRuntimeState(state); assert(canonical.valid && runtime.valid, [...canonical.errors, ...runtime.errors].join(' | '));
  assert(getTotalPostedPayments(state) === 2360000 && getOutstandingBalance(state) === 420000 && getTodayCollections(state) === 360000 && state.payments.filter(payment => payment.status === 'POSTED' && payment.receivedAt.slice(0, 10) === state.referenceDate).length === 2, 'Finance regression failed.');
  assert(getRecallsByStatus(state, 'UPCOMING').length === 1 && getRecallsByStatus(state, 'OVERDUE').length === 1 && getRecallsByStatus(state, 'SCHEDULED').length === 3, 'Recall regression failed.');
  console.log(JSON.stringify({ status: 'pass', encounters: { total: 4, draft: 1, completed: 3, today: 2, adminOrder: ['ENC-000203', 'ENC-000202', 'ENC-000201', 'ENC-000204'], Daniel: ['ENC-000202', 'ENC-000201'], Sarah: ['ENC-000203', 'ENC-000204'] }, relationships: { patients: 'valid', dentists: 'valid', appointments: 'valid', appointmentPatientDentistMatch: 'valid', orphans: 0 }, historicalCurrentResolution: 'pass', selectorPurity: 'pass', finance: { totalPayments: 2360000, outstanding: 420000, todayCollections: 360000, paymentsToday: 2 }, recalls: { upcoming: 1, overdue: 1, scheduled: 3 }, phase5: 'pass' }, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
