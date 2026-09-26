import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { recordProcedure } from '../assets/js/data/procedure-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = value => JSON.stringify(value);
const daniel = { role: 'Dentist', userId: 'U002', branchId: 'BR-MAIN', name: 'Dr. Daniel Mugisha' };
const sarah = { role: 'Dentist', userId: 'U003', branchId: 'BR-MAIN', name: 'Dr. Sarah Nakanwagi' };
const rejectWithoutMutation = (state, values, label) => { const before = snapshot(state); let rejected = false; try { recordProcedure({ state, ...values }); } catch { rejected = true; } assert(rejected, `${label} was accepted.`); assert(snapshot(state) === before, `${label} changed state after rejection.`); };

const canonical = createCanonicalDemoState();
const canonicalResult = validateCanonicalDemoState(canonical);
assert(canonicalResult.valid, canonicalResult.errors.join(' | '));
const canonicalProcedure = id => canonical.proceduresPerformed.find(procedure => procedure.id === id);
assert(canonicalProcedure('PROC-000401')?.toothCode === null && canonicalProcedure('PROC-000401')?.serviceCode === 'PRE-001', 'Joan’s canonical general procedure is incorrect.');
assert(canonicalProcedure('PROC-000402')?.toothCode === '46' && canonicalProcedure('PROC-000402')?.amountSnapshot === 150000, 'Samuel’s canonical extraction is incorrect.');
assert(canonicalProcedure('PROC-000403')?.toothCode === '36' && canonicalProcedure('PROC-000404')?.toothCode === '36' && canonicalProcedure('PROC-000403')?.dentistUserId === 'U003' && canonicalProcedure('PROC-000404')?.dentistUserId === 'U003', 'Peter’s distinct historical procedures are incorrect.');
const samuel = canonical.treatmentPlans.find(plan => plan.id === 'TP-000303');
assert(samuel?.proposedTotal === 450000 && samuel.acceptedTotal === 330000 && samuel.completedTotal === 150000, 'Samuel’s plan totals do not reconcile.');
assert(canonical.treatmentPlanItems.find(item => item.id === 'TPI-303-01')?.progressStatus === 'COMPLETED' && canonical.treatmentPlanItems.find(item => item.id === 'TPI-303-02')?.acceptanceStatus === 'DECLINED' && canonical.treatmentPlanItems.find(item => item.id === 'TPI-303-03')?.progressStatus === 'PLANNED', 'Samuel’s item lifecycle is incorrect.');

const amina = createCanonicalDemoState();
const protectedState = snapshot({ invoices: amina.invoices, invoiceItems: amina.invoiceItems, payments: amina.payments, receipts: amina.receipts, prescriptions: amina.prescriptions, appointments: amina.appointments, queueEntries: amina.queueEntries, encounters: amina.clinicalEncounters });
const beforeProcedureCount = amina.proceduresPerformed.length, beforeChartCount = amina.dentalChartEntries.length, beforeAuditCount = amina.auditLogs.length;
const aminaResult = recordProcedure({ state: amina, patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '26', surfaces: ['O'], notes: '<strong>Completed safely</strong>', actor: daniel });
assert(aminaResult.procedure.patientId === 'P001' && aminaResult.procedure.serviceCode === 'RES-001' && aminaResult.procedure.toothCode === '26' && aminaResult.procedure.dentistUserId === 'U002', 'Amina procedure relationships are incorrect.');
assert(/^PROC-\d{6}$/.test(aminaResult.procedure.id) && new Set(amina.proceduresPerformed.map(procedure => procedure.id)).size === amina.proceduresPerformed.length && amina.proceduresPerformed.length === beforeProcedureCount + 1, 'Procedure ID generation or count is invalid.');
assert(amina.procedureSurfaces.filter(surface => surface.procedureId === aminaResult.procedure.id).map(surface => surface.surfaceCode).join('') === 'O', 'Amina procedure surface is incorrect.');
assert(amina.treatmentPlanItems.find(item => item.id === 'TPI-301-01')?.progressStatus === 'COMPLETED' && amina.treatmentPlans.find(plan => plan.id === 'TP-000301')?.completedTotal === 120000 && amina.treatmentPlans.find(plan => plan.id === 'TP-000301')?.status === 'COMPLETED', 'Amina treatment-plan fulfilment is incorrect.');
assert(amina.dentalChartEntries.length === beforeChartCount + 1 && amina.dentalChartEntries.some(entry => entry.id === 'CHART-002' && entry.conceptCode === 'CARIES') && aminaResult.chartEntry?.procedureId === aminaResult.procedure.id && aminaResult.chartEntry?.conceptCode === 'RESTORATION', 'Procedure completion did not preserve findings and add linked chart history.');
assert(amina.dentalChartEntrySurfaces.filter(surface => surface.dentalChartEntryId === aminaResult.chartEntry?.id).map(surface => surface.surfaceCode).join('') === 'O', 'Completed chart entry surface is incorrect.');
assert(amina.auditLogs.length === beforeAuditCount + 1 && aminaResult.audit.actionCode === 'PROCEDURE_RECORDED' && aminaResult.audit.actorUserId === 'U002' && aminaResult.audit.occurredAt === '2026-09-21T10:00:00+03:00', 'Procedure audit event is incomplete.');
assert(snapshot({ invoices: amina.invoices, invoiceItems: amina.invoiceItems, payments: amina.payments, receipts: amina.receipts, prescriptions: amina.prescriptions, appointments: amina.appointments, queueEntries: amina.queueEntries, encounters: amina.clinicalEncounters }) === protectedState, 'Procedure completion changed finance, prescription, appointment, queue, or encounter state.');
assert(validateRuntimeState(amina).valid, validateRuntimeState(amina).errors.join(' | '));

const guards = createCanonicalDemoState();
rejectWithoutMutation(guards, { patientId: 'P005', serviceId: 'SERVICE-PRO-001', treatmentPlanItemId: 'TPI-302-01', toothCode: '21', surfaces: [], actor: sarah }, 'Proposed plan item procedure');
rejectWithoutMutation(guards, { patientId: 'P004', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-303-02', toothCode: '47', surfaces: ['O'], actor: daniel }, 'Declined plan item procedure');
rejectWithoutMutation(guards, { patientId: 'P004', serviceId: 'SERVICE-EXT-001', treatmentPlanItemId: 'TPI-303-01', toothCode: '46', surfaces: [], actor: daniel }, 'Duplicate completed plan item procedure');
rejectWithoutMutation(guards, { patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '27', surfaces: ['O'], actor: daniel }, 'Mismatched plan-item tooth');
rejectWithoutMutation(guards, { patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '26', surfaces: ['M'], actor: daniel }, 'Mismatched plan-item surface');
rejectWithoutMutation(guards, { patientId: 'P999', serviceId: 'SERVICE-PRE-001', actor: daniel }, 'Invalid patient');
rejectWithoutMutation(guards, { patientId: 'P002', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '26', surfaces: ['O'], actor: daniel }, 'Plan/patient mismatch');
rejectWithoutMutation(guards, { patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', encounterId: 'ENC-000202', toothCode: '26', surfaces: ['O'], actor: daniel }, 'Encounter/patient mismatch');
rejectWithoutMutation(guards, { patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '99', surfaces: ['O'], actor: daniel }, 'Invalid FDI tooth');
rejectWithoutMutation(guards, { patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '26', surfaces: ['Z'], actor: daniel }, 'Invalid tooth surface');
rejectWithoutMutation(guards, { patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '26', surfaces: ['O'], actor: sarah }, 'Cross-Dentist procedure');
rejectWithoutMutation(guards, { patientId: 'P001', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-301-01', toothCode: '26', surfaces: ['O'], actor: { role: 'Clinic Administrator', userId: 'U001' } }, 'Administrator procedure');
rejectWithoutMutation(guards, { patientId: 'P001', serviceId: 'SERVICE-PRE-001', toothCode: '26', surfaces: [], actor: daniel }, 'General service with tooth');
rejectWithoutMutation(guards, { patientId: 'P001', serviceId: 'missing-service', toothCode: '26', surfaces: ['O'], actor: daniel }, 'Invalid service');

const primary = createCanonicalDemoState();
const primaryResult = recordProcedure({ state: primary, patientId: 'P013', serviceId: 'SERVICE-RES-001', treatmentPlanItemId: 'TPI-304-01', toothCode: '75', surfaces: ['O'], actor: daniel });
assert(primaryResult.procedure.toothCode === '75' && primaryResult.chartEntry?.toothCode === '75' && validateRuntimeState(primary).valid, 'Primary FDI procedure support is invalid.');
const standalone = createCanonicalDemoState();
const generalResult = recordProcedure({ state: standalone, patientId: 'P003', serviceId: 'SERVICE-PRE-001', notes: 'General prophylaxis completed.', actor: daniel });
assert(generalResult.procedure.treatmentPlanItemId === null && generalResult.procedure.toothCode === null && !standalone.procedureSurfaces.some(surface => surface.procedureId === generalResult.procedure.id) && generalResult.chartEntry === null && validateRuntimeState(standalone).valid, 'Standalone general procedure support is invalid.');
assert(validateCanonicalDemoState(createCanonicalDemoState()).valid, 'Demo reset does not restore the canonical procedure state.');

console.log(JSON.stringify({ status: 'pass', canonicalProcedures: 'pass', samuelReconciliation: 'pass', aminaFulfilment: 'pass', chartHistory: 'pass', financeAndWorkflowIsolation: 'pass', validationAndAtomicity: 'pass', primaryAndGeneralProcedures: 'pass', audit: 'pass', reset: 'pass', runtimeIntegrity: 'pass' }, null, 2));
