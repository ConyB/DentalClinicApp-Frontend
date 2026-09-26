import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { createPrescription } from '../assets/js/data/prescription-workflows.js';
const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = value => JSON.stringify(value);
const daniel = { role: 'Dentist', userId: 'U002', branchId: 'BR-MAIN' };
const canonical = createCanonicalDemoState(), canonicalRx = canonical.prescriptions.find(item => item.id === 'RX-000501');
assert(validateCanonicalDemoState(canonical).valid, 'Canonical state integrity failed.');
assert(canonicalRx?.patientId === 'P004' && canonicalRx.dentistUserId === 'U002' && canonicalRx.status === 'ISSUED' && canonicalRx.encounterId === null, 'Canonical Samuel prescription is incorrect.');
assert(canonical.prescriptionItems.filter(item => item.prescriptionId === canonicalRx.id).length === 1, 'Canonical prescription items are incorrect.');
const state = createCanonicalDemoState(), protectedState = snapshot({ allergies: state.patientAllergies, conditions: state.patientConditions, medications: state.patientMedications, procedures: state.proceduresPerformed, plans: state.treatmentPlans, findings: state.dentalChartEntries, invoices: state.invoices, payments: state.payments, receipts: state.receipts, appointments: state.appointments, queue: state.queueEntries, encounters: state.clinicalEncounters });
const result = createPrescription({ state, patientId: 'P001', notes: '<b>Safe note</b>', items: [{ medicineName: 'Example Medication B', strength: 'Demo', dose: 'As directed', route: 'Oral', frequency: 'Demo', duration: 'Demo', quantity: '1 pack', instructions: '<img src=x> Follow instructions.' }, { medicineName: 'Example Medication C' }], actor: daniel });
assert(result.prescription.id === 'RX-000502' && result.items.length === 2 && result.audit.actionCode === 'PRESCRIPTION_CREATED' && result.audit.actorUserId === 'U002', 'Prescription creation did not create the expected records.');
assert(result.prescription.encounterId === null && snapshot({ allergies: state.patientAllergies, conditions: state.patientConditions, medications: state.patientMedications, procedures: state.proceduresPerformed, plans: state.treatmentPlans, findings: state.dentalChartEntries, invoices: state.invoices, payments: state.payments, receipts: state.receipts, appointments: state.appointments, queue: state.queueEntries, encounters: state.clinicalEncounters }) === protectedState, 'Prescription creation changed an isolated domain.');
assert(validateRuntimeState(state).valid, 'Runtime prescription integrity failed.');
const before = snapshot(state); let rejected = false; try { createPrescription({ state, patientId: 'P001', items: [{ medicineName: '   ' }], actor: daniel }); } catch { rejected = true; }
assert(rejected && snapshot(state) === before, 'Whitespace medication validation was not atomic.');
console.log(JSON.stringify({ status: 'pass', canonical: 'pass', creation: 'pass', safetyAndFinanceIsolation: 'pass', validationAtomicity: 'pass', runtimeIntegrity: 'pass' }, null, 2));
