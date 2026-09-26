import { dentalFindingRules, normalizeDentalSurfaces } from './dental-reference.js';
import { getClinicalVisitContext } from './clinical-workflows.js';

const numericSuffix = value => Number(String(value || '').match(/(\d+)$/)?.[1] || 0);
const paddedId = (records, prefix, width) => `${prefix}-${String(Math.max(0, ...records.map(item => numericSuffix(item.id))) + 1).padStart(width, '0')}`;
const timestamp = state => `${state.referenceDate}T10:00:00+03:00`;
const active = entry => entry.status === 'active';
const absentCodes = new Set(['MISSING', 'EXTRACTED']);

export const getDentalFindingCatalogue = state => state.dentalConditions
  .filter(condition => condition.status === 'active' && dentalFindingRules[condition.code])
  .map(condition => ({ ...condition, ...dentalFindingRules[condition.code] }));

export const getDentalFindingRule = (state, code) => getDentalFindingCatalogue(state).find(condition => condition.code === code) || null;

export const getDentalChartingContext = (state, patientId, actor) => {
  const visit = getClinicalVisitContext(state, patientId);
  const activeEncounter = state.clinicalEncounters
    .filter(encounter => encounter.patientId === patientId && ['DRAFT', 'IN_PROGRESS'].includes(encounter.status))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] || null;
  const currentAppointment = visit.appointment || state.appointments
    .filter(appointment => appointment.patientId === patientId && ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_TREATMENT'].includes(appointment.status))
    .sort((a, b) => b.startDateTime.localeCompare(a.startDateTime))[0] || null;
  const assignedDentistId = activeEncounter?.dentistUserId || currentAppointment?.dentistUserId || null;
  const branchId = activeEncounter?.branchId || currentAppointment?.branchId || actor?.branchId || state.branches[0]?.id || null;
  return {
    encounter: activeEncounter && activeEncounter.dentistUserId === actor?.userId ? activeEncounter : null,
    assignedDentistId,
    branchId,
    sourceType: activeEncounter && activeEncounter.dentistUserId === actor?.userId ? 'encounter' : 'baseline'
  };
};

export const canMutateDentalChart = ({ state, patientId, actor }) => {
  if (actor?.role !== 'Dentist' || !state.patients.some(patient => patient.id === patientId)) return false;
  const context = getDentalChartingContext(state, patientId, actor);
  return !context.assignedDentistId || context.assignedDentistId === actor.userId;
};

export const canEditDentalFinding = ({ state, entry, actor }) => {
  if (!entry || !canMutateDentalChart({ state, patientId: entry.patientId, actor })) return false;
  if (entry.recordedByUserId !== actor.userId || !['baseline', 'encounter'].includes(entry.sourceType)) return false;
  if (!entry.encounterId) return true;
  const encounter = state.clinicalEncounters.find(item => item.id === entry.encounterId);
  return Boolean(encounter && ['DRAFT', 'IN_PROGRESS'].includes(encounter.status) && encounter.dentistUserId === actor.userId);
};

const normalizeSurfaces = (state, tooth, surfaces = []) => {
  return normalizeDentalSurfaces(tooth, surfaces, state.toothSurfaceDefinitions);
};
const surfacesForEntry = (state, entryId) => state.dentalChartEntrySurfaces.filter(surface => surface.dentalChartEntryId === entryId).map(surface => surface.surfaceCode);
const sameSurfaceSet = (left, right) => left.length === right.length && left.every((code, index) => code === right[index]);
const entryTypeFor = condition => condition.code === 'HEALTHY' ? 'OBSERVATION' : condition.entryType === 'existing_treatment' ? 'EXISTING_TREATMENT' : 'CONDITION';

export const validateDentalFindingInput = ({ state, patientId, toothCode, conditionCode, surfaces = [], entryId = null, actor }) => {
  const errors = {};
  const patient = state.patients.find(item => item.id === patientId);
  const tooth = state.toothDefinitions.find(item => item.code === String(toothCode || ''));
  const condition = getDentalFindingRule(state, String(conditionCode || '').trim().toUpperCase());
  if (!patient) errors.patientId = 'The selected patient record is invalid.';
  if (!tooth) errors.toothCode = 'The selected FDI tooth is invalid.';
  if (!condition) errors.conditionCode = 'Select a supported dental finding.';
  if (!canMutateDentalChart({ state, patientId, actor })) errors.permission = 'Only the assigned Dentist may update this dental chart.';
  const suppliedSurfaces = [...new Set((surfaces || []).map(code => String(code || '').trim().toUpperCase()).filter(Boolean))];
  const normalizedSurfaces = tooth ? normalizeSurfaces(state, tooth, suppliedSurfaces) : [];
  if (tooth && normalizedSurfaces.length !== suppliedSurfaces.length) errors.surfaces = 'One or more selected surfaces are not valid for this tooth.';
  if (!errors.surfaces && condition?.surfaceMode === 'surface' && !normalizedSurfaces.length) errors.surfaces = 'Select at least one applicable tooth surface.';
  if (!errors.surfaces && condition?.surfaceMode === 'whole_tooth' && normalizedSurfaces.length) errors.surfaces = 'This finding applies to the whole tooth and cannot include surfaces.';
  if (!Object.keys(errors).length) {
    const current = state.dentalChartEntries.filter(entry => entry.patientId === patientId && entry.toothCode === tooth.code && entry.entryType !== 'PLANNED_TREATMENT' && active(entry) && entry.id !== entryId);
    const duplicate = current.some(entry => entry.conceptCode === condition.code && sameSurfaceSet(normalizeSurfaces(state, tooth, surfacesForEntry(state, entry.id)), normalizedSurfaces));
    if (duplicate) errors.duplicate = 'An active matching finding already exists for this tooth and surface selection.';
    if (condition.code === 'HEALTHY' && current.length) errors.conflict = 'Healthy cannot be recorded while another active finding exists on this tooth.';
    if (condition.code !== 'HEALTHY' && current.some(entry => entry.conceptCode === 'HEALTHY')) errors.conflict = 'Correct the active Healthy observation before recording another finding.';
    if (absentCodes.has(condition.code) && current.length) errors.conflict = 'Missing or Extracted cannot be added while another active finding exists on this tooth.';
    if (!absentCodes.has(condition.code) && current.some(entry => absentCodes.has(entry.conceptCode))) errors.conflict = 'This tooth is currently recorded as Missing or Extracted.';
  }
  return { valid: Object.keys(errors).length === 0, errors, patient, tooth, condition, surfaces: normalizedSurfaces };
};

const appendAudit = (state, { actor, entry, context, actionCode, oldValues = null, newValues }) => {
  const audit = {
    id: paddedId(state.auditLogs, 'AUDIT', 3), organizationId: state.organization.id, branchId: context.branchId,
    actorUserId: actor.userId, actionCode, entityType: 'DENTAL_CHART_ENTRY', entityId: entry.id,
    occurredAt: timestamp(state), summary: `${actionCode === 'DENTAL_CHART_ENTRY_CREATED' ? 'Dental finding recorded' : 'Dental finding updated'} for tooth ${entry.toothCode}.`,
    metadata: { patientId: entry.patientId, toothCode: entry.toothCode, encounterId: entry.encounterId, oldValues, newValues }
  };
  state.auditLogs.push(audit);
  return audit;
};

const throwValidation = validation => { const error = new Error(Object.values(validation.errors)[0] || 'The dental finding is invalid.'); error.fieldErrors = validation.errors; throw error; };
const replaceSurfaces = (state, entryId, surfaces) => {
  state.dentalChartEntrySurfaces = state.dentalChartEntrySurfaces.filter(surface => surface.dentalChartEntryId !== entryId);
  surfaces.forEach(surfaceCode => state.dentalChartEntrySurfaces.push({ id: paddedId(state.dentalChartEntrySurfaces, 'CHART-SURFACE', 2), dentalChartEntryId: entryId, surfaceCode }));
};

export const addDentalFinding = ({ state, patientId, toothCode, conditionCode, surfaces = [], notes = '', actor }) => {
  const validation = validateDentalFindingInput({ state, patientId, toothCode, conditionCode, surfaces, actor });
  if (!validation.valid) throwValidation(validation);
  const context = getDentalChartingContext(state, patientId, actor), now = timestamp(state);
  const entry = {
    id: paddedId(state.dentalChartEntries, 'CHART', 3), organizationId: state.organization.id, patientId,
    toothCode: validation.tooth.code, entryType: entryTypeFor(validation.condition), label: validation.condition.name,
    conceptCode: validation.condition.code, encounterId: context.encounter?.id || null, treatmentPlanId: null,
    treatmentPlanItemId: null, procedureId: null, serviceId: null, recordedAt: now,
    recordedByUserId: actor.userId, status: 'active', correctedEntryId: null, correctionReason: null,
    notes: String(notes || '').trim() || null, sourceType: context.sourceType, createdAt: now, updatedAt: now, updatedByUserId: actor.userId
  };
  state.dentalChartEntries.push(entry);
  replaceSurfaces(state, entry.id, validation.surfaces);
  const newValues = { conceptCode: entry.conceptCode, surfaces: validation.surfaces, notes: entry.notes };
  const audit = appendAudit(state, { actor, entry, context, actionCode: 'DENTAL_CHART_ENTRY_CREATED', newValues });
  return { entry, surfaces: validation.surfaces, audit };
};

// Procedure completion writes a distinct, immutable treatment-history entry while preserving prior findings.
// It intentionally bypasses draft-chart editing context because the procedure workflow has already validated
// the Dentist, patient, treatment-plan item, tooth, and surface relationships atomically.
export const validateCompletedProcedureChartEntry = ({ state, procedure, conditionCode, surfaces = [], actor }) => {
  const patient = state.patients.find(item => item.id === procedure?.patientId), tooth = state.toothDefinitions.find(item => item.code === procedure?.toothCode), condition = getDentalFindingRule(state, conditionCode);
  if (actor?.role !== 'Dentist' || !patient || !tooth || !condition || procedure?.status !== 'COMPLETED' || procedure.dentistUserId !== actor.userId) throw new Error('The completed procedure cannot create a dental-chart entry.');
  const normalized = normalizeSurfaces(state, tooth, surfaces);
  if (normalized.length !== new Set(surfaces.map(code => String(code || '').trim().toUpperCase())).size || (condition.surfaceMode === 'surface' && !normalized.length) || (condition.surfaceMode === 'whole_tooth' && normalized.length)) throw new Error('The completed procedure has invalid dental-chart surfaces.');
  return { patient, tooth, condition, surfaces: normalized };
};

export const addCompletedProcedureChartEntry = ({ state, procedure, treatmentPlan, treatmentPlanItem, conditionCode, surfaces = [], actor }) => {
  const validation = validateCompletedProcedureChartEntry({ state, procedure, conditionCode, surfaces, actor });
  const now = timestamp(state), entry = {
    id: paddedId(state.dentalChartEntries, 'CHART', 3), organizationId: state.organization.id, patientId: validation.patient.id,
    toothCode: validation.tooth.code, entryType: 'COMPLETED_TREATMENT', label: validation.condition.name, conceptCode: validation.condition.code,
    encounterId: procedure.encounterId || null, treatmentPlanId: treatmentPlan?.id || null, treatmentPlanItemId: treatmentPlanItem?.id || null,
    procedureId: procedure.id, serviceId: procedure.serviceId, recordedAt: now, recordedByUserId: actor.userId,
    status: 'active', correctedEntryId: null, correctionReason: null, notes: null, sourceType: 'procedure', createdAt: now, updatedAt: now, updatedByUserId: actor.userId
  };
  state.dentalChartEntries.push(entry); replaceSurfaces(state, entry.id, validation.surfaces);
  return { entry, surfaces: validation.surfaces };
};

export const updateDentalFinding = ({ state, entryId, conditionCode, surfaces = [], notes = '', actor }) => {
  const entry = state.dentalChartEntries.find(item => item.id === entryId);
  if (!entry) throw new Error('The dental finding was not found.');
  if (!canEditDentalFinding({ state, entry, actor })) throw new Error('This historical dental finding cannot be edited directly.');
  const validation = validateDentalFindingInput({ state, patientId: entry.patientId, toothCode: entry.toothCode, conditionCode, surfaces, entryId, actor });
  if (!validation.valid) throwValidation(validation);
  const oldValues = { conceptCode: entry.conceptCode, surfaces: normalizeSurfaces(state, validation.tooth, surfacesForEntry(state, entry.id)), notes: entry.notes || null };
  const newValues = { conceptCode: validation.condition.code, surfaces: validation.surfaces, notes: String(notes || '').trim() || null };
  if (oldValues.conceptCode === newValues.conceptCode && sameSurfaceSet(oldValues.surfaces, newValues.surfaces) && oldValues.notes === newValues.notes) return { entry, surfaces: validation.surfaces, audit: null, changed: false };
  Object.assign(entry, { conceptCode: validation.condition.code, label: validation.condition.name, entryType: entryTypeFor(validation.condition), notes: newValues.notes, updatedAt: timestamp(state), updatedByUserId: actor.userId });
  replaceSurfaces(state, entry.id, validation.surfaces);
  const context = getDentalChartingContext(state, entry.patientId, actor);
  const audit = appendAudit(state, { actor, entry, context, actionCode: 'DENTAL_CHART_ENTRY_UPDATED_DRAFT', oldValues, newValues });
  return { entry, surfaces: validation.surfaces, audit, changed: true };
};
