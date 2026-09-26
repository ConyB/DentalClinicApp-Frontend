import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { getDentalChartViewModel } from '../assets/js/data/dental-chart.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { addTreatmentPlanItem, createTreatmentPlan, decideTreatmentPlanItem, presentTreatmentPlan, updateTreatmentPlanItem, validateTreatmentPlanRuntime } from '../assets/js/data/treatment-plan-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = value => JSON.stringify(value);
const actor = { role: 'Dentist', userId: 'U002', branchId: 'BR-MAIN', name: 'Dr. Daniel Mugisha' };
const otherDentist = { role: 'Dentist', userId: 'U003', branchId: 'BR-MAIN', name: 'Dr. Sarah Nakanwagi' };
const canonical = createCanonicalDemoState();
const canonicalResult = validateCanonicalDemoState(canonical);
assert(canonicalResult.valid, canonicalResult.errors.join(' | '));
assert(canonical.treatmentPlans.find(plan => plan.id === 'TP-000301')?.proposedTotal === 120000, 'Amina proposed total is incorrect.');
assert(canonical.treatmentPlans.find(plan => plan.id === 'TP-000302')?.proposedTotal === 850000, 'Esther proposed total is incorrect.');
assert(canonical.treatmentPlans.find(plan => plan.id === 'TP-000303')?.acceptedTotal === 330000, 'Samuel accepted total is incorrect.');
assert(canonical.treatmentPlans.find(plan => plan.id === 'TP-000304')?.proposedTotal === 120000, 'Mercy proposed total is incorrect.');

const state = createCanonicalDemoState();
const protectedCounts = snapshot({ procedures: state.proceduresPerformed, invoices: state.invoices, payments: state.payments, charts: state.dentalChartEntries });
const beforeDenied = snapshot(state);
for (const restrictedActor of [{ role: 'Clinic Administrator', userId: 'U001', branchId: 'BR-MAIN' }, { role: 'Cashier', userId: 'U005', branchId: 'BR-MAIN' }]) {
  let rejected = false;
  try { createTreatmentPlan({ state, patientId: 'P001', actor: restrictedActor }); } catch { rejected = true; }
  assert(rejected, `${restrictedActor.role} could create a treatment plan.`);
}
assert(snapshot(state) === beforeDenied, 'A rejected role mutation changed state.');

const plan = createTreatmentPlan({ state, patientId: 'P001', notes: 'Conservative restoration plan.', actor }).plan;
const item = addTreatmentPlanItem({ state, planId: plan.id, serviceId: 'SERVICE-RES-001', toothCode: '27', surfaces: ['O'], notes: 'Review at next visit.', actor }).item;
assert(item.unitPrice === 120000 && item.lineTotal === 120000 && plan.status === 'DRAFT', 'Catalogue pricing or initial Draft state is incorrect.');
const beforeOwnershipAttempt = snapshot(state); let ownershipRejected = false;
try { updateTreatmentPlanItem({ state, itemId: item.id, serviceId: 'SERVICE-RES-001', toothCode: '27', surfaces: ['M'], actor: otherDentist }); } catch { ownershipRejected = true; }
assert(ownershipRejected && snapshot(state) === beforeOwnershipAttempt, 'A different Dentist could update the plan owner’s item.');
const chart = getDentalChartViewModel(state, 'P001', 'permanent');
assert(chart.history.planned.some(entry => entry.id === item.id && entry.toothCode === '27'), 'Planned treatment was not available to the odontogram overlay.');
updateTreatmentPlanItem({ state, itemId: item.id, serviceId: 'SERVICE-RES-001', toothCode: '27', surfaces: ['M'], notes: 'Updated note.', actor });
assert(state.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === item.id).map(surface => surface.surfaceCode).join('') === 'M', 'Eligible item edit did not replace surfaces.');
presentTreatmentPlan({ state, planId: plan.id, actor });
decideTreatmentPlanItem({ state, itemId: item.id, decision: 'ACCEPTED', actor });
assert(plan.status === 'ACCEPTED' && item.acceptanceStatus === 'ACCEPTED' && item.progressStatus === 'PLANNED', 'Item acceptance lifecycle is incorrect.');
assert(snapshot({ procedures: state.proceduresPerformed, invoices: state.invoices, payments: state.payments, charts: state.dentalChartEntries }) === protectedCounts, 'Treatment planning created a procedure, invoice, payment, or chart finding.');
const primaryPlan = createTreatmentPlan({ state, patientId: 'P013', notes: 'Primary dentition planning test.', actor }).plan;
const primaryItem = addTreatmentPlanItem({ state, planId: primaryPlan.id, serviceId: 'SERVICE-RES-001', toothCode: '75', surfaces: ['O'], actor }).item;
assert(primaryItem.toothCode === '75' && state.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === primaryItem.id).map(surface => surface.surfaceCode).join('') === 'O', 'Primary dentition treatment planning is incorrect.');
presentTreatmentPlan({ state, planId: primaryPlan.id, actor }); decideTreatmentPlanItem({ state, itemId: primaryItem.id, decision: 'DECLINED', actor });
const expectedAuditCodes = ['TREATMENT_PLAN_CREATED', 'TREATMENT_PLAN_ITEM_ADDED', 'TREATMENT_PLAN_ITEM_UPDATED', 'TREATMENT_PLAN_ITEM_ACCEPTED', 'TREATMENT_PLAN_ITEM_DECLINED'];
assert(expectedAuditCodes.every(code => state.auditLogs.some(event => event.actionCode === code && event.actorUserId === actor.userId && event.occurredAt.includes(state.referenceDate))), 'Treatment-plan audit events are incomplete.');
assert(new Set(state.auditLogs.map(event => event.id)).size === state.auditLogs.length, 'Treatment-plan audit events are duplicated.');

const runtimeResult = validateTreatmentPlanRuntime(state), globalResult = validateRuntimeState(state);
assert(runtimeResult.valid, runtimeResult.errors.join(' | '));
assert(globalResult.valid, globalResult.errors.join(' | '));
console.log(JSON.stringify({ status: 'pass', canonical: 'pass', roleGuards: 'pass', dentistOwnership: 'pass', lifecycle: 'pass', auditEvents: 'pass', primaryDentition: 'pass', odontogramOverlay: 'pass', downstreamIsolation: 'pass', runtimeIntegrity: 'pass' }, null, 2));
