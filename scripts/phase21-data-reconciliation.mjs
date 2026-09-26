import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { getAppointmentStatusCounts, getTodayAppointmentCount, getActiveQueueCount } from '../assets/js/data/kpis.js';
import { getAppointmentsForDate, getQueueEntryByAppointmentId } from '../assets/js/data/scheduling.js';
import { getDentalChartForPatient, getDocumentsForPatient, getTreatmentPlanItems, calculateTreatmentPlanProposedTotal, calculateTreatmentPlanAcceptedTotal, calculateTreatmentPlanCompletedValue } from '../assets/js/data/clinical.js';
import { calculateInvoiceBalance, calculateInvoicePaid, calculateInvoiceTotal, getOutstandingBalance, getPartiallyPaidInvoices, getTodayCollections, getTotalPostedPayments, getRecallDisplayStatus } from '../assets/js/data/finance.js';
import { buildReport } from '../assets/js/data/reports.js';
import { checkInAppointment, startQueueTreatment } from '../assets/js/data/queue-workflows.js';
import { saveClinicalEncounterDraft } from '../assets/js/data/clinical-workflows.js';
import { addDentalFinding } from '../assets/js/data/dental-chart-workflows.js';
import { addTreatmentPlanItem, createTreatmentPlan, decideTreatmentPlanItem, presentTreatmentPlan } from '../assets/js/data/treatment-plan-workflows.js';
import { recordProcedure } from '../assets/js/data/procedure-workflows.js';
import { createInvoice } from '../assets/js/data/invoice-workflows.js';
import { recordPayment } from '../assets/js/data/payment-workflows.js';
import { createRecall, linkRecallAppointment } from '../assets/js/data/recall-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const equal = (actual, expected, message) => assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
const snapshot = value => JSON.stringify(value);
const actors = Object.freeze({
  daniel: { userId: 'U002', role: 'Dentist', branchId: 'BR-MAIN' },
  sarah: { userId: 'U003', role: 'Dentist', branchId: 'BR-MAIN' },
  receptionist: { userId: 'U004', role: 'Receptionist', branchId: 'BR-MAIN' },
  cashier: { userId: 'U005', role: 'Cashier', branchId: 'BR-MAIN' }
});
const countBy = (records, selector) => Object.fromEntries([...new Set(records.map(selector))].sort().map(key => [key, records.filter(record => selector(record) === key).length]));
const one = (records, id, label = 'record') => { const record = records.find(item => item.id === id); assert(record, `Missing ${label} ${id}.`); return record; };
const expectRejectedAtomically = (label, operation) => {
  const state = createCanonicalDemoState(), before = snapshot(state), auditCount = state.auditLogs.length;
  let rejected = false;
  try { operation(state); } catch { rejected = true; }
  assert(rejected, `${label}: invalid action was accepted.`);
  assert(snapshot(state) === before, `${label}: rejected action changed state.`);
  assert(state.auditLogs.length === auditCount, `${label}: rejected action wrote an audit event.`);
};

const canonical = createCanonicalDemoState();
const canonicalSnapshot = snapshot(canonical);
const frozen = validateCanonicalDemoState(canonical), runtime = validateRuntimeState(canonical);
assert(frozen.valid, `Canonical validator failed: ${frozen.errors.join('; ')}`);
assert(runtime.valid, `Runtime validator failed: ${runtime.errors.join('; ')}`);
assert(canonical.referenceDate === '2026-09-21' && canonical.organization.timezone === 'Africa/Kampala', 'Reference date or timezone drifted.');
assert(canonical.organization.name === 'Pearl Smile Dental Clinic' && canonical.branches.find(item => item.isMain)?.name === 'Kampala Main Branch' && canonical.organization.currency === 'UGX', 'Central clinic identity drifted.');

// Entity uniqueness and canonical relationship coverage.
const entityCollections = Object.entries(canonical).filter(([, value]) => Array.isArray(value) && value.every(item => item && typeof item === 'object'));
for (const [name, records] of entityCollections) {
  if (!records.length || !records.every(record => 'id' in record)) continue;
  assert(new Set(records.map(record => record.id)).size === records.length, `${name}: duplicate IDs found.`);
}
equal({ patients: canonical.patients.length, users: canonical.users.length, active: canonical.users.filter(item => item.status === 'active').length, inactive: canonical.users.filter(item => item.status === 'inactive').length, dentists: canonical.users.filter(item => item.status === 'active' && item.roleCode === 'dentist').length }, { patients: 30, users: 6, active: 5, inactive: 1, dentists: 2 }, 'Core entity counts changed.');

const today = getAppointmentsForDate(canonical, canonical.referenceDate);
equal({ total: getTodayAppointmentCount(canonical), statuses: getAppointmentStatusCounts(canonical), Daniel: today.filter(item => item.dentistUserId === 'U002').length, Sarah: today.filter(item => item.dentistUserId === 'U003').length }, { total: 9, statuses: { COMPLETED: 1, WAITING: 1, IN_TREATMENT: 1, CONFIRMED: 2, SCHEDULED: 3, CANCELLED: 1, NO_SHOW: 0 }, Daniel: 5, Sarah: 4 }, 'Reference-day appointment distribution changed.');
assert(getActiveQueueCount(canonical) === 2, 'Active queue count changed.');
for (const queue of canonical.queueEntries) {
  const appointment = one(canonical.appointments, queue.appointmentId, 'appointment');
  assert(queue.patientId === appointment.patientId && queue.dentistUserId === appointment.dentistUserId && queue.branchId === appointment.branchId && queue.status === appointment.status, `${queue.id}: queue/appointment mismatch.`);
}
equal({ encounters: canonical.clinicalEncounters.length, statuses: countBy(canonical.clinicalEncounters, item => item.status), today: canonical.clinicalEncounters.filter(item => item.startedAt.startsWith(canonical.referenceDate)).length }, { encounters: 4, statuses: { COMPLETED: 3, DRAFT: 1 }, today: 2 }, 'Encounter counts changed.');
assert(canonical.toothDefinitions.filter(item => item.dentition === 'permanent').length === 32 && canonical.toothDefinitions.filter(item => item.dentition === 'primary').length === 20, 'FDI tooth catalogue changed.');

// Representative patient journeys.
const amina = one(canonical.patients, 'P001', 'patient');
assert(amina.fullName === 'Amina Nakato' && canonical.patientAllergies.some(item => item.patientId === amina.id && item.allergen === 'Penicillin'), 'Amina identity/allergy story changed.');
assert(one(canonical.clinicalEncounters, 'ENC-000201').appointmentId === 'APT-000094', 'Amina historical encounter link changed.');
const aminaCurrent = one(canonical.appointments, 'APT-000103');
assert(aminaCurrent.patientId === amina.id && aminaCurrent.status === 'IN_TREATMENT' && aminaCurrent.startDateTime === '2026-09-21T09:30:00+03:00', 'Amina current appointment changed.');
assert(!canonical.clinicalEncounters.some(item => item.appointmentId === aminaCurrent.id), 'Amina current appointment was incorrectly merged with historical encounter.');
assert(getQueueEntryByAppointmentId(canonical, aminaCurrent.id)?.status === 'IN_TREATMENT', 'Amina current queue state changed.');
const aminaChart = getDentalChartForPatient(canonical, amina.id);
for (const [tooth, concept] of [['16', 'RESTORATION'], ['26', 'CARIES'], ['36', 'ROOT_CANAL_TREATED'], ['36', 'CROWN'], ['46', 'MISSING']]) assert(aminaChart.some(item => item.toothCode === tooth && item.conceptCode === concept), `Amina tooth ${tooth}/${concept} missing.`);
const aminaPlan = one(canonical.treatmentPlans, 'TP-000301');
assert(aminaPlan.patientId === amina.id && aminaPlan.proposedTotal === 120000 && aminaPlan.acceptedTotal === 120000 && getTreatmentPlanItems(canonical, aminaPlan.id)[0].progressStatus === 'IN_PROGRESS', 'Amina plan changed.');
const aminaInvoice = one(canonical.invoices, 'INV-000602');
equal([calculateInvoiceTotal(canonical, aminaInvoice.id), calculateInvoicePaid(canonical, aminaInvoice.id), calculateInvoiceBalance(canonical, aminaInvoice.id)], [120000, 50000, 70000], 'Amina invoice changed.');
assert(canonical.recalls.some(item => item.patientId === amina.id && item.status === 'SCHEDULED' && item.scheduledAppointmentId === aminaCurrent.id), 'Amina recall/appointment link changed.');

const brendaAppointment = one(canonical.appointments, 'APT-000102');
const brendaQueue = one(canonical.queueEntries, 'QUEUE-102');
const brendaEncounter = one(canonical.clinicalEncounters, 'ENC-000203');
assert(brendaAppointment.patientId === 'P009' && brendaAppointment.status === 'WAITING' && brendaQueue.status === 'WAITING' && brendaQueue.arrivalAt.endsWith('08:52:00+03:00') && brendaEncounter.status === 'DRAFT' && brendaEncounter.dentistUserId === 'U003', 'Brenda workflow story changed.');

const joanProcedure = one(canonical.proceduresPerformed, 'PROC-000401');
const joanInvoice = one(canonical.invoices, 'INV-000601');
const joanPayment = one(canonical.payments, 'PAY-000701');
assert(one(canonical.appointments, 'APT-000101').status === 'COMPLETED' && one(canonical.clinicalEncounters, 'ENC-000202').status === 'COMPLETED' && joanProcedure.patientId === 'P003' && joanProcedure.amountSnapshot === 180000 && joanInvoice.total === 180000 && joanPayment.paymentMethodCode === 'MOBILE_MONEY' && canonical.receipts.filter(item => item.paymentId === joanPayment.id).length === 1 && canonical.recalls.some(item => item.patientId === 'P003' && getRecallDisplayStatus(canonical, item) === 'UPCOMING'), 'Joan completed journey changed.');

assert(canonical.patientConditions.some(item => item.patientId === 'P002' && item.conditionName === 'Hypertension') && canonical.patientMedications.some(item => item.patientId === 'P002' && item.medicationName === 'Amlodipine'), 'Peter medical history changed.');
assert(one(canonical.proceduresPerformed, 'PROC-000403').amountSnapshot === 650000 && one(canonical.proceduresPerformed, 'PROC-000404').amountSnapshot === 850000, 'Peter procedures changed.');
const peterInvoice = canonical.invoices.find(item => item.patientId === 'P002');
assert(peterInvoice?.total === 1500000 && calculateInvoicePaid(canonical, peterInvoice.id) === 1500000 && canonical.payments.filter(item => item.invoiceId === peterInvoice.id).map(item => item.amount).sort((a, b) => a - b).join() === '500000,1000000', 'Peter finance story changed.');
assert(canonical.recalls.some(item => item.patientId === 'P002' && item.status === 'SCHEDULED' && item.scheduledAppointmentId === 'APT-000104' && one(canonical.appointments, 'APT-000104').dentistUserId === 'U003'), 'Peter recall story changed.');

assert(canonical.patientConditions.some(item => item.patientId === 'P004' && item.conditionName === 'Diabetes') && canonical.patientMedications.some(item => item.patientId === 'P004' && item.medicationName === 'Metformin'), 'Samuel medical history changed.');
for (const [tooth, concept] of [['46', 'EXTRACTED'], ['47', 'CARIES'], ['16', 'RESTORATION']]) assert(getDentalChartForPatient(canonical, 'P004').some(item => item.toothCode === tooth && item.conceptCode === concept), `Samuel tooth ${tooth}/${concept} missing.`);
equal([calculateTreatmentPlanProposedTotal(canonical, 'TP-000303'), calculateTreatmentPlanAcceptedTotal(canonical, 'TP-000303'), calculateTreatmentPlanCompletedValue(canonical, 'TP-000303')], [450000, 330000, 150000], 'Samuel plan totals changed.');
const samuelInvoice = canonical.invoices.find(item => item.patientId === 'P004');
equal([samuelInvoice.total, samuelInvoice.paid, samuelInvoice.balance], [200000, 150000, 50000], 'Samuel invoice changed.');
assert(canonical.recalls.some(item => item.patientId === 'P004' && getRecallDisplayStatus(canonical, item) === 'OVERDUE'), 'Samuel overdue recall missing.');

assert(getDentalChartForPatient(canonical, 'P005').some(item => item.toothCode === '21' && item.label === 'Fractured') && one(canonical.treatmentPlans, 'TP-000302').proposedTotal === 850000, 'Esther fracture/crown story changed.');
const estherDocument = one(canonical.patientDocuments, 'DOC-004');
assert(estherDocument.patientId === 'P005' && estherDocument.type === 'CLINICAL_PHOTO' && estherDocument.capturedAt.startsWith('2026-09-19') && !('toothCode' in estherDocument) && !('procedureId' in estherDocument), 'Esther document semantics changed.');
assert(canonical.patientGuardians.some(item => item.patientId === 'P013' && item.fullName === 'Rose Ayaa' && item.relationship === 'Mother' && item.isPrimary), 'Mercy guardian story changed.');
for (const [tooth, concept] of [['75', 'CARIES'], ['84', 'RESTORATION'], ['64', 'HEALTHY']]) assert(getDentalChartForPatient(canonical, 'P013').some(item => item.toothCode === tooth && item.conceptCode === concept), `Mercy tooth ${tooth}/${concept} missing.`);
assert(one(canonical.treatmentPlans, 'TP-000304').proposedTotal === 120000 && one(canonical.appointments, 'APT-000107').patientId === 'P013', 'Mercy plan/appointment story changed.');

// Finance, recalls, dashboards, reports, and selector purity.
for (const invoice of canonical.invoices) assert(calculateInvoiceTotal(canonical, invoice.id) === calculateInvoicePaid(canonical, invoice.id) + calculateInvoiceBalance(canonical, invoice.id), `${invoice.id}: total != paid + balance.`);
equal({ invoices: canonical.invoices.length, payments: canonical.payments.length, receipts: canonical.receipts.length, posted: getTotalPostedPayments(canonical), outstanding: getOutstandingBalance(canonical), todayCollections: getTodayCollections(canonical), partial: getPartiallyPaidInvoices(canonical).length }, { invoices: 6, payments: 7, receipts: 7, posted: 2360000, outstanding: 420000, todayCollections: 360000, partial: 3 }, 'Finance reconciliation changed.');
equal(canonical.invoices.filter(item => calculateInvoiceBalance(canonical, item.id) > 0).map(item => [item.patientId, calculateInvoiceBalance(canonical, item.id)]).sort(), [['P001', 70000], ['P004', 50000], ['P010', 300000]].sort(), 'Outstanding patient composition changed.');
assert(canonical.payments.every(payment => canonical.receipts.filter(receipt => receipt.paymentId === payment.id && receipt.amount === payment.amount && receipt.patientId === payment.patientId && receipt.invoiceId === payment.invoiceId).length === 1), 'Payment/receipt one-to-one invariant failed.');
equal(countBy(canonical.recalls, item => getRecallDisplayStatus(canonical, item)), { OVERDUE: 1, SCHEDULED: 3, UPCOMING: 1 }, 'Recall distribution changed.');
for (const recall of canonical.recalls.filter(item => item.status === 'SCHEDULED')) assert(one(canonical.appointments, recall.scheduledAppointmentId).patientId === recall.patientId, `${recall.id}: linked appointment patient mismatch.`);

const beforeSelectors = snapshot(canonical);
const appointmentReport = buildReport({ state: canonical, role: 'Clinic Administrator', userId: 'U001', type: 'appointments', filters: { from: canonical.referenceDate, to: canonical.referenceDate } });
const financeReport = buildReport({ state: canonical, role: 'Clinic Administrator', userId: 'U001', type: 'finance' });
const recallReport = buildReport({ state: canonical, role: 'Clinic Administrator', userId: 'U001', type: 'recalls' });
assert(appointmentReport.rows.length === 9 && appointmentReport.metrics.find(item => item[0] === 'Appointments')[1] === 9, 'Appointment report disagrees with scheduling selectors.');
assert(financeReport.metrics.find(item => item[0] === 'Current Outstanding')[1] === 420000 && financeReport.metrics.find(item => item[0] === "Today's Collections")[1] === 360000, 'Finance report disagrees with finance selectors.');
assert(recallReport.metrics.find(item => item[0] === 'Scheduled')[1] === 3 && recallReport.metrics.find(item => item[0] === 'Overdue')[1] === 1, 'Recall report disagrees with recall selectors.');
assert(snapshot(canonical) === beforeSelectors, 'Selectors or report builders mutated canonical state.');

// Runtime workflow isolation and propagation.
{
  const state = createCanonicalDemoState(), encounters = state.clinicalEncounters.length;
  const checked = checkInAppointment({ state, appointmentId: 'APT-000104', actor: actors.receptionist });
  assert(checked.appointment.status === 'WAITING' && checked.queueEntry.status === 'WAITING' && state.queueEntries.filter(item => item.appointmentId === 'APT-000104').length === 1, 'Check-in did not atomically synchronize appointment and queue.');
  let duplicateRejected = false; try { checkInAppointment({ state, appointmentId: 'APT-000104', actor: actors.receptionist }); } catch { duplicateRejected = true; }
  assert(duplicateRejected && state.queueEntries.filter(item => item.appointmentId === 'APT-000104').length === 1, 'Double check-in created a duplicate queue record.');
  const started = startQueueTreatment({ state, queueEntryId: checked.queueEntry.id, actor: actors.sarah });
  assert(started.appointment.status === 'IN_TREATMENT' && started.queueEntry.status === 'IN_TREATMENT' && state.clinicalEncounters.length === encounters, 'Start-treatment boundary is wrong.');
  assert(validateRuntimeState(state).valid, 'Check-in/start-treatment scenario left invalid runtime state.');
}
{
  const state = createCanonicalDemoState(), before = snapshot({ chart: state.dentalChartEntries, plans: state.treatmentPlans, procedures: state.proceduresPerformed, invoices: state.invoices });
  const result = saveClinicalEncounterDraft({ state, encounterId: 'ENC-000203', values: { chiefComplaint: 'Runtime audit complaint', examinationNotes: '', clinicalNotes: '', treatmentDiscussion: '', followUpNotes: '' }, actor: actors.sarah });
  assert(result.changed && result.encounter.chiefComplaint === 'Runtime audit complaint' && snapshot({ chart: state.dentalChartEntries, plans: state.treatmentPlans, procedures: state.proceduresPerformed, invoices: state.invoices }) === before, 'Clinical draft leaked into another module.');
  assert(validateRuntimeState(state).valid, 'Clinical draft scenario left invalid runtime state.');
}
{
  const state = createCanonicalDemoState(), before = { chart: state.dentalChartEntries.length, plans: state.treatmentPlans.length, procedures: state.proceduresPerformed.length, invoices: state.invoices.length };
  addDentalFinding({ state, patientId: 'P001', toothCode: '11', conditionCode: 'CARIES', surfaces: ['F'], notes: 'Phase 21 isolated finding', actor: actors.daniel });
  equal({ chart: state.dentalChartEntries.length, plans: state.treatmentPlans.length, procedures: state.proceduresPerformed.length, invoices: state.invoices.length }, { ...before, chart: before.chart + 1 }, 'Dental finding created downstream business records.');
  assert(validateRuntimeState(state).valid, 'Dental finding scenario left invalid runtime state.');
}
{
  const state = createCanonicalDemoState(), downstream = snapshot({ procedures: state.proceduresPerformed, invoices: state.invoices, payments: state.payments, receipts: state.receipts });
  const { plan } = createTreatmentPlan({ state, patientId: 'P001', notes: 'Phase 21 isolated plan', actor: actors.daniel });
  const { item } = addTreatmentPlanItem({ state, planId: plan.id, serviceId: 'SERVICE-RES-001', toothCode: '11', surfaces: ['F'], quantity: 1, actor: actors.daniel });
  presentTreatmentPlan({ state, planId: plan.id, actor: actors.daniel });
  decideTreatmentPlanItem({ state, itemId: item.id, decision: 'ACCEPTED', actor: actors.daniel });
  assert(plan.status === 'ACCEPTED' && plan.proposedTotal === 120000 && plan.acceptedTotal === 120000 && snapshot({ procedures: state.proceduresPerformed, invoices: state.invoices, payments: state.payments, receipts: state.receipts }) === downstream, 'Plan acceptance created downstream records.');
  assert(validateRuntimeState(state).valid, 'Treatment plan scenario left invalid runtime state.');
}
{
  const state = createCanonicalDemoState(), finance = snapshot({ invoices: state.invoices, payments: state.payments, receipts: state.receipts }), procedures = state.proceduresPerformed.length;
  const result = recordProcedure({ state, patientId: 'P004', serviceId: 'SERVICE-PRE-001', treatmentPlanItemId: 'TPI-303-03', actor: actors.daniel });
  assert(state.proceduresPerformed.length === procedures + 1 && result.item.progressStatus === 'COMPLETED' && result.plan.completedTotal === 330000 && snapshot({ invoices: state.invoices, payments: state.payments, receipts: state.receipts }) === finance, 'Procedure completion failed isolation/plan propagation.');
  assert(validateRuntimeState(state).valid, 'Procedure scenario left invalid runtime state.');
}
{
  const state = createCanonicalDemoState(), clinical = snapshot({ encounters: state.clinicalEncounters, chart: state.dentalChartEntries, plans: state.treatmentPlans, procedures: state.proceduresPerformed });
  const beforeOutstanding = getOutstandingBalance(state);
  const { invoice } = createInvoice({ state, patientId: 'P005', items: [{ serviceId: 'SERVICE-CON-001', quantity: 1 }], notes: 'Phase 21 isolated invoice', actor: actors.cashier });
  assert(invoice.total === 50000 && getOutstandingBalance(state) === beforeOutstanding + 50000 && snapshot({ encounters: state.clinicalEncounters, chart: state.dentalChartEntries, plans: state.treatmentPlans, procedures: state.proceduresPerformed }) === clinical, 'Invoice creation altered clinical state or failed outstanding propagation.');
  assert(validateRuntimeState(state).valid, 'Invoice scenario left invalid runtime state.');
}
{
  const state = createCanonicalDemoState(), initialPayments = state.payments.length, initialReceipts = state.receipts.length, initialOutstanding = getOutstandingBalance(state);
  const partial = recordPayment({ state, invoiceId: 'INV-000602', amount: 20000, paymentMethodCode: 'CASH', actor: actors.cashier });
  assert(partial.invoice.status === 'PARTIALLY_PAID' && partial.invoice.balance === 50000 && state.payments.length === initialPayments + 1 && state.receipts.length === initialReceipts + 1 && getOutstandingBalance(state) === initialOutstanding - 20000, 'Partial payment propagation failed.');
  const settled = recordPayment({ state, invoiceId: 'INV-000602', amount: 50000, paymentMethodCode: 'CARD', actor: actors.cashier });
  assert(settled.invoice.status === 'PAID' && settled.invoice.balance === 0 && getOutstandingBalance(state) === initialOutstanding - 70000, 'Full settlement propagation failed.');
  const beforeDuplicate = snapshot(state); let duplicateRejected = false;
  try { recordPayment({ state, invoiceId: 'INV-000602', amount: 1, paymentMethodCode: 'CASH', actor: actors.cashier }); } catch { duplicateRejected = true; }
  assert(duplicateRejected && snapshot(state) === beforeDuplicate, 'Settled invoice accepted a duplicate payment.');
  assert(validateRuntimeState(state).valid, 'Payment scenario left invalid runtime state.');
}
{
  const state = createCanonicalDemoState();
  const result = createRecall({ state, values: { patientId: 'P009', recallTypeId: state.recallTypes[0].id, dentistUserId: 'U003', dueDate: '2026-10-21', notes: 'Phase 21 isolated recall' }, actor: actors.receptionist });
  assert(!Object.keys(result.errors).length, 'Valid recall creation failed.');
  linkRecallAppointment({ state, recallId: result.recall.id, appointmentId: 'APT-000102', actor: actors.receptionist });
  assert(result.recall.status === 'SCHEDULED' && result.recall.scheduledAppointmentId === 'APT-000102', 'Recall link did not propagate.');
  const beforeDuplicate = snapshot(state); let duplicateRejected = false;
  try { linkRecallAppointment({ state, recallId: result.recall.id, appointmentId: 'APT-000102', actor: actors.receptionist }); } catch { duplicateRejected = true; }
  assert(duplicateRejected && snapshot(state) === beforeDuplicate && validateRuntimeState(state).valid, 'Duplicate recall link was not rejected atomically.');
}

expectRejectedAtomically('invalid check-in', state => checkInAppointment({ state, appointmentId: 'APT-000101', actor: actors.receptionist }));
expectRejectedAtomically('invalid finding surface', state => addDentalFinding({ state, patientId: 'P001', toothCode: '11', conditionCode: 'CARIES', surfaces: ['O'], actor: actors.daniel }));
expectRejectedAtomically('invalid procedure', state => recordProcedure({ state, patientId: 'P004', serviceId: 'SERVICE-PRE-001', treatmentPlanItemId: 'TPI-303-02', actor: actors.daniel }));
expectRejectedAtomically('overpayment', state => recordPayment({ state, invoiceId: 'INV-000602', amount: 70001, paymentMethodCode: 'CASH', actor: actors.cashier }));
expectRejectedAtomically('wrong-patient recall link', state => linkRecallAppointment({ state, recallId: 'REC-000805', appointmentId: 'APT-000102', actor: actors.receptionist }));

// Source-level split-brain and selector-mutation checks.
const root = resolve('.'), jsRoot = join(root, 'assets', 'js');
const walk = async directory => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
const sources = (await walk(jsRoot)).filter(file => extname(file) === '.js');
const sourceText = await Promise.all(sources.map(async file => ({ file: relative(root, file).replaceAll('\\', '/'), text: await readFile(file, 'utf8') })));
const directStorage = sourceText.filter(({ text }) => /\b(?:localStorage|sessionStorage)\b/.test(text)).map(item => item.file).sort();
equal(directStorage, ['assets/js/core/auth.js', 'assets/js/core/storage.js'], 'Direct browser storage access escaped the centralized storage/auth layer.');
const centralMutation = sourceText.flatMap(({ file, text }) => [...text.matchAll(/state\.([A-Za-z0-9_]+)\.(sort|reverse|splice)\s*\(/g)].map(match => `${file}:${match[0]}`));
assert(!centralMutation.length, `Central selector mutation found: ${centralMutation.join(', ')}`);
const forbiddenMetricLiterals = sourceText.filter(({ file, text }) => file !== 'assets/js/data/finance-data.js' && /\b(?:2360000|420000|360000)\b/.test(text)).map(item => item.file);
assert(!forbiddenMetricLiterals.length, `Hard-coded canonical finance metric outside seed data: ${forbiddenMetricLiterals.join(', ')}`);
assert(snapshot(canonical) === canonicalSnapshot && validateCanonicalDemoState(canonical).valid, 'Final canonical reset comparison failed.');

console.log(JSON.stringify({
  status: 'pass',
  reference: { date: canonical.referenceDate, timezone: canonical.organization.timezone, clinic: canonical.organization.name, branch: canonical.branches.find(item => item.isMain).name },
  entities: { patients: 30, users: 6, appointments: canonical.appointments.length, encounters: 4, procedures: 4, invoices: 6, payments: 7, receipts: 7, recalls: 5 },
  operations: { todayAppointments: 9, appointmentStatuses: getAppointmentStatusCounts(canonical), activeQueue: 2 },
  finance: { postedPayments: 2360000, outstanding: 420000, todayCollections: 360000, partiallyPaidInvoices: 3 },
  stories: ['Amina', 'Brenda', 'Joan', 'Peter', 'Samuel', 'Esther', 'Mercy'],
  runtimeScenarios: ['check-in', 'start-treatment', 'clinical-draft', 'finding', 'plan-acceptance', 'procedure', 'invoice', 'partial-payment', 'full-settlement', 'recall-link'],
  rejectedAtomically: 5,
  selectorPurity: 'pass',
  storageAuthority: directStorage,
  finalReset: 'exact'
}, null, 2));
