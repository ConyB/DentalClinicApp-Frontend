import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { getDentalChartViewModel } from '../assets/js/data/dental-chart.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { addTreatmentPlanItem, createTreatmentPlan, decideTreatmentPlanItem, presentTreatmentPlan } from '../assets/js/data/treatment-plan-workflows.js';
import { recordProcedure } from '../assets/js/data/procedure-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = value => JSON.stringify(value);
const daniel = { role: 'Dentist', userId: 'U002', branchId: 'BR-MAIN', name: 'Dr. Daniel Mugisha' };
const sarah = { role: 'Dentist', userId: 'U003', branchId: 'BR-MAIN', name: 'Dr. Sarah Nakanwagi' };
const rejectWithoutMutation = (state, callback, label) => {
  const before = snapshot(state);
  let rejected = false;
  try { callback(); } catch { rejected = true; }
  assert(rejected, `${label} was accepted.`);
  assert(snapshot(state) === before, `${label} changed state after rejection.`);
};

const canonical = createCanonicalDemoState();
const canonicalResult = validateCanonicalDemoState(canonical);
assert(canonicalResult.valid, canonicalResult.errors.join(' | '));

const expectedServices = {
  'CON-001': ['Dental Consultation', 50000, false, 'none'],
  'DIA-001': ['Dental X-Ray', 40000, false, 'none'],
  'PRE-001': ['Scaling & Polishing', 180000, false, 'none'],
  'RES-001': ['Composite Filling - Single Surface', 120000, true, 'single'],
  'RES-002': ['Composite Filling - Multi Surface', 180000, true, 'multiple'],
  'EXT-001': ['Simple Extraction', 150000, true, 'none'],
  'EXT-002': ['Surgical Extraction', 350000, true, 'none'],
  'END-001': ['Root Canal Treatment - Anterior', 450000, true, 'none'],
  'END-002': ['Root Canal Treatment - Posterior', 650000, true, 'none'],
  'PRO-001': ['Porcelain Crown', 850000, true, 'none'],
  'PRO-002': ['Acrylic Partial Denture', 600000, false, 'none'],
  'COS-001': ['Teeth Whitening', 500000, false, 'none']
};
Object.entries(expectedServices).forEach(([code, [name, price, requiresTooth, surfaceRequirement]]) => {
  const service = canonical.services.find(item => item.code === code);
  assert(service?.name === name && service.defaultPrice === price && service.requiresTooth === requiresTooth && service.surfaceRequirement === surfaceRequirement, `Central catalogue entry ${code} is incorrect.`);
});

const plan = id => canonical.treatmentPlans.find(item => item.id === id);
const item = id => canonical.treatmentPlanItems.find(candidate => candidate.id === id);
assert(plan('TP-000301')?.patientId === 'P001' && item('TPI-301-01')?.serviceCode === 'RES-001' && item('TPI-301-01')?.acceptanceStatus === 'ACCEPTED' && item('TPI-301-01')?.progressStatus === 'IN_PROGRESS' && plan('TP-000301')?.completedTotal === 0, 'Amina canonical accepted/not-completed plan is incorrect.');
assert(plan('TP-000302')?.patientId === 'P005' && item('TPI-302-01')?.serviceCode === 'PRO-001' && item('TPI-302-01')?.toothCode === '21' && item('TPI-302-01')?.acceptanceStatus === 'PROPOSED', 'Esther canonical crown proposal is incorrect.');
assert(plan('TP-000303')?.proposedTotal === 450000 && plan('TP-000303')?.acceptedTotal === 330000 && plan('TP-000303')?.completedTotal === 150000 && item('TPI-303-01')?.progressStatus === 'COMPLETED' && item('TPI-303-02')?.acceptanceStatus === 'DECLINED' && item('TPI-303-03')?.progressStatus === 'PLANNED', 'Samuel partial acceptance and fulfilment totals are incorrect.');
assert(plan('TP-000304')?.patientId === 'P013' && item('TPI-304-01')?.toothCode === '75' && canonical.treatmentPlanItemSurfaces.some(surface => surface.treatmentPlanItemId === 'TPI-304-01' && surface.surfaceCode === 'O'), 'Mercy primary FDI plan is incorrect.');
assert(canonical.proceduresPerformed.filter(procedure => procedure.patientId === 'P002' && procedure.toothCode === '36').map(procedure => procedure.serviceCode).sort().join(',') === 'END-002,PRO-001', 'Peter historical procedures were incorrectly deduplicated.');

const lifecycle = createCanonicalDemoState();
const financialBaseline = snapshot({ invoices: lifecycle.invoices, payments: lifecycle.payments, receipts: lifecycle.receipts, prescriptions: lifecycle.prescriptions, appointments: lifecycle.appointments, queueEntries: lifecycle.queueEntries, encounters: lifecycle.clinicalEncounters, findings: lifecycle.encounterFindings });
const createdPlan = createTreatmentPlan({ state: lifecycle, patientId: 'P003', notes: '<b>Safe plan note</b>', actor: daniel });
assert(/^TP-\d{6}$/.test(createdPlan.plan.id) && createdPlan.plan.status === 'DRAFT' && new Set(lifecycle.treatmentPlans.map(record => record.id)).size === lifecycle.treatmentPlans.length, 'Runtime plan ID or initial state is invalid.');
const general = addTreatmentPlanItem({ state: lifecycle, planId: createdPlan.plan.id, serviceId: 'SERVICE-PRE-001', actor: daniel });
const multi = addTreatmentPlanItem({ state: lifecycle, planId: createdPlan.plan.id, serviceId: 'SERVICE-RES-002', toothCode: '27', surfaces: ['M', 'O'], actor: daniel });
assert(general.item.toothCode === null && lifecycle.treatmentPlanItemSurfaces.every(surface => surface.treatmentPlanItemId !== general.item.id), 'General service retained fabricated tooth context.');
assert(multi.item.serviceCode === 'RES-002' && lifecycle.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === multi.item.id).map(surface => surface.surfaceCode).join('') === 'MO', 'Multi-surface treatment did not retain the compatible catalogue service.');
presentTreatmentPlan({ state: lifecycle, planId: createdPlan.plan.id, actor: daniel });
const auditsBeforeAcceptance = lifecycle.auditLogs.length;
decideTreatmentPlanItem({ state: lifecycle, itemId: general.item.id, decision: 'ACCEPTED', actor: daniel });
decideTreatmentPlanItem({ state: lifecycle, itemId: multi.item.id, decision: 'DECLINED', actor: daniel });
assert(lifecycle.treatmentPlans.find(record => record.id === createdPlan.plan.id)?.status === 'PARTIALLY_ACCEPTED' && general.item.progressStatus === 'PLANNED' && multi.item.acceptanceStatus === 'DECLINED' && multi.item.progressStatus === 'CANCELLED', 'Plan acceptance and decline state separation is invalid.');
assert(lifecycle.auditLogs.length === auditsBeforeAcceptance + 2 && lifecycle.auditLogs.slice(-2).every(event => event.actorUserId === daniel.userId && event.occurredAt === '2026-09-21T10:00:00+03:00'), 'Plan decisions did not create exactly one centralized audit event each.');
assert(!lifecycle.proceduresPerformed.some(procedure => procedure.treatmentPlanItemId === general.item.id) && snapshot({ invoices: lifecycle.invoices, payments: lifecycle.payments, receipts: lifecycle.receipts, prescriptions: lifecycle.prescriptions, appointments: lifecycle.appointments, queueEntries: lifecycle.queueEntries, encounters: lifecycle.clinicalEncounters, findings: lifecycle.encounterFindings }) === financialBaseline, 'Plan operations affected procedures, finance, appointments, encounters, prescriptions, or findings.');
const planChart = getDentalChartViewModel(lifecycle, 'P001', 'permanent');
assert(planChart.history.planned.some(entry => entry.id === 'TPI-301-01' && entry.toothCode === '26'), 'Accepted planned treatment is not exposed to the planned odontogram selector.');

rejectWithoutMutation(lifecycle, () => addTreatmentPlanItem({ state: lifecycle, planId: createdPlan.plan.id, serviceId: 'SERVICE-RES-001', toothCode: '27', surfaces: ['M', 'O'], actor: daniel }), 'Single-surface service with multiple surfaces');
rejectWithoutMutation(lifecycle, () => addTreatmentPlanItem({ state: lifecycle, planId: createdPlan.plan.id, serviceId: 'SERVICE-RES-002', toothCode: '27', surfaces: ['O'], actor: daniel }), 'Multi-surface service with one surface');
rejectWithoutMutation(lifecycle, () => addTreatmentPlanItem({ state: lifecycle, planId: createdPlan.plan.id, serviceId: 'SERVICE-PRE-001', toothCode: '27', actor: daniel }), 'General service with an FDI tooth');
rejectWithoutMutation(lifecycle, () => decideTreatmentPlanItem({ state: lifecycle, itemId: multi.item.id, decision: 'ACCEPTED', actor: daniel }), 'Re-deciding a declined item');
rejectWithoutMutation(lifecycle, () => createTreatmentPlan({ state: lifecycle, patientId: 'P001', actor: sarah }), 'Cross-dentist plan creation');

const procedureState = createCanonicalDemoState();
const beforeProcedure = snapshot({ invoices: procedureState.invoices, payments: procedureState.payments, receipts: procedureState.receipts, prescriptions: procedureState.prescriptions, appointments: procedureState.appointments, queueEntries: procedureState.queueEntries, encounters: procedureState.clinicalEncounters, findings: procedureState.encounterFindings });
const recorded = recordProcedure({ state: procedureState, patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '26', surfaces: ['O'], actor: daniel });
assert(recorded.item?.progressStatus === 'COMPLETED' && recorded.plan?.completedTotal === 120000 && recorded.chartEntry?.conceptCode === 'RESTORATION' && procedureState.dentalChartEntries.some(entry => entry.id === 'CHART-002' && entry.conceptCode === 'CARIES'), 'Procedure fulfilment or chart-history rule is incorrect.');
assert(snapshot({ invoices: procedureState.invoices, payments: procedureState.payments, receipts: procedureState.receipts, prescriptions: procedureState.prescriptions, appointments: procedureState.appointments, queueEntries: procedureState.queueEntries, encounters: procedureState.clinicalEncounters, findings: procedureState.encounterFindings }) === beforeProcedure, 'Procedure incorrectly created or altered finance, prescriptions, appointment, queue, encounter, or findings.');
rejectWithoutMutation(procedureState, () => recordProcedure({ state: procedureState, patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '26', surfaces: ['O'], actor: daniel }), 'Duplicate plan fulfilment');

const runtime = validateRuntimeState(procedureState);
assert(runtime.valid, runtime.errors.join(' | '));
assert(validateCanonicalDemoState(createCanonicalDemoState()).valid, 'resetDemoData source cannot restore canonical Phase 13 state.');
console.log(JSON.stringify({ status: 'pass', catalogue: 'pass', canonicalPlans: 'pass', canonicalProcedures: 'pass', planLifecycleAndAtomicity: 'pass', multiSurfaceAndPrimaryFDI: 'pass', procedureFulfilmentAndIsolation: 'pass', auditEvents: 'pass', runtimeIntegrity: 'pass', reset: 'pass' }, null, 2));
