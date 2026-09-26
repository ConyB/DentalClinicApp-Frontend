import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState } from '../assets/js/data/integrity.js';
import { calculateTreatmentPlanAcceptedTotal, calculateTreatmentPlanCompletedValue, calculateTreatmentPlanProposedTotal, getTreatmentPlanItems, getTreatmentPlanRegister } from '../assets/js/data/clinical.js';
import { getTreatmentPlanPermissions, validateTreatmentPlanRuntime } from '../assets/js/data/treatment-plan-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const state = createCanonicalDemoState();
const snapshot = JSON.stringify(state);
const administrator = { role: 'Clinic Administrator', userId: 'U001' };
const daniel = { role: 'Dentist', userId: 'U002' };
const sarah = { role: 'Dentist', userId: 'U003' };
const plan = id => state.treatmentPlans.find(item => item.id === id);
const item = id => state.treatmentPlanItems.find(candidate => candidate.id === id);
const totals = id => ({ proposed: calculateTreatmentPlanProposedTotal(state, id), accepted: calculateTreatmentPlanAcceptedTotal(state, id), completed: calculateTreatmentPlanCompletedValue(state, id) });

const adminPlans = getTreatmentPlanRegister(state, administrator);
const dentistPlans = getTreatmentPlanRegister(state, daniel);
assert(adminPlans.map(record => record.id).join('|') === 'TP-000301|TP-000302|TP-000304|TP-000303', 'Global register is not safely sorted newest-first.');
assert(dentistPlans.length === 4, 'Dentist read scope no longer matches the frozen all-plan view permission.');
assert(getTreatmentPlanRegister(state, { role: 'Receptionist', userId: 'U004' }).length === 0 && getTreatmentPlanRegister(state, { role: 'Cashier', userId: 'U005' }).length === 0, 'Restricted roles received the clinical global register.');

assert(plan('TP-000301')?.patientId === 'P001' && plan('TP-000301').status === 'ACCEPTED' && item('TPI-301-01')?.acceptanceStatus === 'ACCEPTED' && item('TPI-301-01').progressStatus === 'IN_PROGRESS' && totals('TP-000301').completed === 0, 'Amina plan reconciliation failed.');
assert(plan('TP-000302')?.patientId === 'P005' && plan('TP-000302').status === 'PROPOSED' && item('TPI-302-01')?.toothCode === '21' && totals('TP-000302').accepted === 0, 'Esther plan reconciliation failed.');
assert(plan('TP-000303')?.patientId === 'P004' && plan('TP-000303').status === 'PARTIALLY_ACCEPTED' && JSON.stringify(totals('TP-000303')) === JSON.stringify({ proposed: 450000, accepted: 330000, completed: 150000 }), 'Samuel plan totals failed.');
assert(item('TPI-303-01')?.acceptanceStatus === 'ACCEPTED' && item('TPI-303-01').progressStatus === 'COMPLETED' && item('TPI-303-02')?.acceptanceStatus === 'DECLINED' && item('TPI-303-02').progressStatus === 'CANCELLED' && item('TPI-303-03')?.acceptanceStatus === 'ACCEPTED' && item('TPI-303-03').progressStatus === 'PLANNED', 'Samuel item lifecycle was flattened or changed.');
assert(state.proceduresPerformed.some(procedure => procedure.treatmentPlanItemId === 'TPI-303-01' && procedure.status === 'COMPLETED'), 'Samuel completed value is not backed by the frozen procedure relationship.');
assert(plan('TP-000304')?.patientId === 'P013' && item('TPI-304-01')?.toothCode === '75' && item('TPI-304-01').progressStatus === 'PLANNED' && state.treatmentPlanItemSurfaces.some(surface => surface.treatmentPlanItemId === 'TPI-304-01' && surface.surfaceCode === 'O'), 'Mercy primary-tooth plan reconciliation failed.');
assert(adminPlans.every(record => getTreatmentPlanItems(state, record.id).length > 0), 'Register contains an unexpected empty canonical plan.');

const adminPermissions = getTreatmentPlanPermissions({ state, patientId: 'P001', actor: administrator });
const danielPermissions = getTreatmentPlanPermissions({ state, patientId: 'P001', actor: daniel });
const sarahOnDaniel = getTreatmentPlanPermissions({ state, patientId: 'P001', actor: sarah });
const sarahOwn = getTreatmentPlanPermissions({ state, patientId: 'P005', actor: sarah });
assert(adminPermissions.canView && !adminPermissions.canCreate && !adminPermissions.canEdit(plan('TP-000301')), 'Administrator clinical mutation boundary changed.');
assert(danielPermissions.canView && danielPermissions.canEdit(plan('TP-000301')) && !sarahOnDaniel.canEdit(plan('TP-000301')) && sarahOwn.canEdit(plan('TP-000302')), 'Dentist ownership boundary changed.');
assert(validateTreatmentPlanRuntime(state).valid && validateCanonicalDemoState(state).valid, 'Canonical treatment-plan or Phase 5 integrity failed.');
assert(JSON.stringify(state) === snapshot, 'Read-only register selectors mutated centralized state.');

console.log(JSON.stringify({ status: 'pass', documentationIntent: 'global register plus patient detail', register: { plans: adminPlans.map(record => record.id), administrator: 4, dentist: 4, receptionist: 0, cashier: 0 }, canonical: { amina: totals('TP-000301'), esther: totals('TP-000302'), samuel: totals('TP-000303'), mercy: totals('TP-000304') }, ownership: 'preserved', selectorPurity: 'pass', dirtySource: 'none added', procedures: 'linked', phase5: 'pass' }, null, 2));
