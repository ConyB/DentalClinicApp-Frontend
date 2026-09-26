import { normalizeDentalSurfaces } from './dental-reference.js';
import { getEncounterById, getTreatmentPlanById } from './clinical.js';
import { recalculateTreatmentPlan } from './treatment-plan-workflows.js';
import { addCompletedProcedureChartEntry, validateCompletedProcedureChartEntry } from './dental-chart-workflows.js';

const numericSuffix = value => Number(String(value || '').match(/(\d+)$/)?.[1] || 0);
const nextId = (records, prefix, width = 6) => `${prefix}-${String(Math.max(0, ...records.map(item => numericSuffix(item.id || item.procedureNumber))) + 1).padStart(width, '0')}`;
const timestamp = state => `${state.referenceDate}T10:00:00+03:00`;
const activeDentist = (state, userId) => state.users.find(user => user.id === userId && user.roleCode === 'dentist' && user.status === 'active') || null;
const chartCondition = service => ({ 'EXT-001': 'EXTRACTED', 'EXT-002': 'EXTRACTED', 'END-001': 'ROOT_CANAL_TREATED', 'END-002': 'ROOT_CANAL_TREATED', 'PRO-001': 'CROWN', 'RES-001': 'RESTORATION', 'RES-002': 'RESTORATION' }[service.code] || 'OTHER_TREATMENT');
const fail = message => { throw new Error(message); };

export const validateProcedureInput = ({ state, patientId, serviceId, treatmentPlanItemId = null, encounterId = null, toothCode = null, surfaces = [], actor }) => {
  const patient = state.patients.find(item => item.id === patientId) || null, service = state.services.find(item => item.id === serviceId && item.status === 'active') || null;
  const item = treatmentPlanItemId ? state.treatmentPlanItems.find(candidate => candidate.id === treatmentPlanItemId) || null : null, plan = item ? getTreatmentPlanById(state, item.treatmentPlanId) : null;
  const dentist = activeDentist(state, actor?.userId), encounter = encounterId ? getEncounterById(state, encounterId) : null;
  if (actor?.role !== 'Dentist' || !dentist) fail('Only an active Dentist may record a completed procedure.');
  if (!patient) fail('The procedure patient is invalid.'); if (!service) fail('The selected service is invalid or inactive.');
  if (treatmentPlanItemId && (!item || !plan)) fail('The selected treatment plan item is invalid.');
  if (item) { if (plan.patientId !== patient.id || plan.dentistUserId !== actor.userId) fail('Only the responsible Dentist may fulfil this treatment plan item.'); if (item.acceptanceStatus !== 'ACCEPTED') fail('Only accepted treatment plan items may be recorded as procedures.'); if (item.progressStatus === 'COMPLETED' || state.proceduresPerformed.some(procedure => procedure.treatmentPlanItemId === item.id && procedure.status === 'COMPLETED')) fail('This treatment plan item has already been fulfilled.'); if (item.serviceId !== service.id || item.toothCode !== (toothCode || null)) fail('Procedure service and tooth must match the treatment plan item.'); }
  if (encounterId && (!encounter || encounter.patientId !== patient.id || encounter.dentistUserId !== actor.userId)) fail('The selected clinical encounter does not match this procedure context.');
  const tooth = toothCode ? state.toothDefinitions.find(item => item.code === String(toothCode)) || null : null;
  if (service.requiresTooth && !tooth) fail('This service requires a valid FDI tooth.'); if (!service.requiresTooth && toothCode) fail('This general service must not have a tooth recorded.');
  const supplied = Array.isArray(surfaces) ? surfaces : [], normalized = tooth ? normalizeDentalSurfaces(tooth, supplied, state.toothSurfaceDefinitions) : [];
  if (normalized.length !== new Set(supplied.map(value => String(value).toUpperCase())).size) fail('One or more procedure surfaces are invalid.');
  if (service.surfaceRequirement === 'single' && normalized.length !== 1) fail('This service requires exactly one tooth surface.'); if (service.surfaceRequirement === 'multiple' && normalized.length < 2) fail('This service requires at least two tooth surfaces.'); if (service.surfaceRequirement === 'none' && normalized.length) fail('This service does not use tooth surfaces.');
  if (item) { const planned = normalizeDentalSurfaces(tooth, state.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === item.id).map(surface => surface.surfaceCode), state.toothSurfaceDefinitions); if (JSON.stringify(planned) !== JSON.stringify(normalized)) fail('Procedure surfaces must match the accepted treatment plan item.'); }
  return { patient, service, item, plan, encounter, tooth, surfaces: normalized };
};

export const recordProcedure = ({ state, patientId, serviceId, treatmentPlanItemId = null, encounterId = null, toothCode = null, surfaces = [], notes = '', actor }) => {
  const valid = validateProcedureInput({ state, patientId, serviceId, treatmentPlanItemId, encounterId, toothCode, surfaces, actor });
  const performedAt = timestamp(state), id = nextId(state.proceduresPerformed, 'PROC');
  const procedure = { id, procedureNumber: id, organizationId: state.organization.id, branchId: valid.plan?.branchId || valid.encounter?.branchId || state.branches[0].id, patientId: valid.patient.id, encounterId: valid.encounter?.id || null, dentistUserId: actor.userId, serviceId: valid.service.id, serviceCode: valid.service.code, treatmentPlanItemId: valid.item?.id || null, toothCode: valid.tooth?.code || null, performedAt, amountSnapshot: valid.item?.lineTotal || valid.service.defaultPrice, status: 'COMPLETED', notes: String(notes || '').trim() || null, createdAt: performedAt, createdByUserId: actor.userId };
  if (valid.tooth) validateCompletedProcedureChartEntry({ state, procedure, conditionCode: chartCondition(valid.service), surfaces: valid.surfaces, actor });
  state.proceduresPerformed.push(procedure); valid.surfaces.forEach(surfaceCode => state.procedureSurfaces.push({ id: nextId(state.procedureSurfaces, 'PROCEDURE-SURFACE', 3), procedureId: procedure.id, surfaceCode }));
  if (valid.item) { Object.assign(valid.item, { progressStatus: 'COMPLETED', completedAt: performedAt, completedByUserId: actor.userId, updatedAt: performedAt }); recalculateTreatmentPlan(state, valid.plan); }
  const chartEntry = valid.tooth ? addCompletedProcedureChartEntry({ state, procedure, treatmentPlan: valid.plan, treatmentPlanItem: valid.item, conditionCode: chartCondition(valid.service), surfaces: valid.surfaces, actor }).entry : null;
  const audit = { id: nextId(state.auditLogs, 'AUDIT', 3), organizationId: state.organization.id, branchId: procedure.branchId, actorUserId: actor.userId, actionCode: 'PROCEDURE_RECORDED', entityType: 'PROCEDURE', entityId: procedure.id, occurredAt: performedAt, summary: `Completed procedure ${procedure.procedureNumber} recorded for ${valid.patient.fullName}.`, metadata: { patientId: procedure.patientId, serviceId: procedure.serviceId, treatmentPlanItemId: procedure.treatmentPlanItemId, encounterId: procedure.encounterId, toothCode: procedure.toothCode, chartEntryId: chartEntry?.id || null } };
  state.auditLogs.push(audit); return { procedure, chartEntry, audit, plan: valid.plan, item: valid.item };
};
