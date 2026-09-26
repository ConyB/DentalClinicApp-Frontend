import { normalizeDentalSurfaces } from './dental-reference.js';
import { getClinicalVisitContext } from './clinical-workflows.js';
import { calculateTreatmentPlanAcceptedTotal, calculateTreatmentPlanCompletedValue, calculateTreatmentPlanProposedTotal, getTreatmentPlanById, getTreatmentPlanItems } from './clinical.js';

const PLAN_STATUSES = new Set(['DRAFT', 'PROPOSED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const ACCEPTANCE_STATUSES = new Set(['PROPOSED', 'ACCEPTED', 'DECLINED']);
const PROGRESS_STATUSES = new Set(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const numericSuffix = value => Number(String(value || '').match(/(\d+)$/)?.[1] || 0);
const nextId = (records, prefix, width) => `${prefix}-${String(Math.max(0, ...records.map(record => numericSuffix(record.id || record.treatmentPlanNumber))) + 1).padStart(width, '0')}`;
const nextItemId = (state, planId) => {
  const planNumber = String(planId).match(/(\d+)$/)?.[1] || '0';
  const prefix = `TPI-${String(Number(planNumber)).padStart(3, '0')}-`;
  const sequence = Math.max(0, ...state.treatmentPlanItems.filter(item => item.id.startsWith(prefix)).map(item => numericSuffix(item.id))) + 1;
  return `${prefix}${String(sequence).padStart(2, '0')}`;
};
const timestamp = state => `${state.referenceDate}T10:00:00+03:00`;
const dentist = (state, userId) => state.users.find(user => user.id === userId && user.roleCode === 'dentist' && user.status === 'active') || null;
const activeService = (state, serviceId) => state.services.find(service => service.id === serviceId && service.status === 'active') || null;
const planOwner = ({ state, plan, actor }) => Boolean(plan && actor?.role === 'Dentist' && plan.dentistUserId === actor.userId && dentist(state, actor.userId));
const audit = (state, { actor, plan, actionCode, entityType, entityId, metadata = {} }) => {
  const event = { id: nextId(state.auditLogs, 'AUDIT', 3), organizationId: state.organization.id, branchId: plan.branchId, actorUserId: actor.userId, actionCode, entityType, entityId, occurredAt: timestamp(state), summary: `${actionCode.replaceAll('_', ' ').toLowerCase()} for ${plan.treatmentPlanNumber}.`, metadata };
  state.auditLogs.push(event);
  return event;
};

export const getTreatmentPlanPermissions = ({ state, patientId, actor }) => ({
  canView: ['Clinic Administrator', 'Dentist'].includes(actor?.role) && state.patients.some(patient => patient.id === patientId),
  canCreate: actor?.role === 'Dentist' && Boolean(dentist(state, actor.userId)),
  canEdit: plan => planOwner({ state, plan, actor }),
  canAccept: plan => planOwner({ state, plan, actor })
});

// Shared by procedure fulfilment so plan totals and lifecycle remain derived, not independently edited.
export const recalculateTreatmentPlan = (state, plan) => {
  plan.proposedTotal = calculateTreatmentPlanProposedTotal(state, plan.id);
  plan.acceptedTotal = calculateTreatmentPlanAcceptedTotal(state, plan.id);
  plan.completedTotal = calculateTreatmentPlanCompletedValue(state, plan.id);
  const items = getTreatmentPlanItems(state, plan.id);
  if (items.length && items.every(item => item.progressStatus === 'COMPLETED')) { plan.status = 'COMPLETED'; plan.completedAt ||= timestamp(state); }
  else if (items.some(item => ['IN_PROGRESS', 'COMPLETED'].includes(item.progressStatus))) plan.status = 'IN_PROGRESS';
  else if (items.some(item => item.acceptanceStatus === 'ACCEPTED') && items.some(item => item.acceptanceStatus !== 'ACCEPTED')) plan.status = 'PARTIALLY_ACCEPTED';
  else if (items.length && items.every(item => item.acceptanceStatus === 'ACCEPTED')) plan.status = 'ACCEPTED';
  else if (plan.status !== 'DRAFT') plan.status = 'PROPOSED';
  plan.updatedAt = timestamp(state);
};

const validationError = errors => { const error = new Error(Object.values(errors)[0] || 'Treatment plan input is invalid.'); error.fieldErrors = errors; throw error; };
const validSurfaces = (state, tooth, surfaces = []) => normalizeDentalSurfaces(tooth, surfaces, state.toothSurfaceDefinitions);

export const createTreatmentPlan = ({ state, patientId, notes = '', actor }) => {
  const errors = {}, patient = state.patients.find(item => item.id === patientId);
  if (!patient) errors.patientId = 'The selected patient record is invalid.';
  if (actor?.role !== 'Dentist' || !dentist(state, actor?.userId)) errors.permission = 'Only an active Dentist may create a clinical treatment plan.';
  if (Object.keys(errors).length) validationError(errors);
  const visit = getClinicalVisitContext(state, patientId);
  if (visit.appointment && visit.appointment.dentistUserId !== actor.userId) validationError({ permission: 'Only the assigned Dentist may create this patient’s treatment plan.' });
  const id = nextId(state.treatmentPlans, 'TP', 6), now = timestamp(state);
  const plan = { id, treatmentPlanNumber: id, organizationId: state.organization.id, branchId: visit.appointment?.branchId || actor.branchId || state.branches[0]?.id, patientId, encounterId: visit.encounter?.dentistUserId === actor.userId ? visit.encounter.id : null, dentistUserId: actor.userId, status: 'DRAFT', notes: String(notes || '').trim() || null, proposedAt: null, acceptedAt: null, completedAt: null, createdAt: now, createdByUserId: actor.userId, updatedAt: now, proposedTotal: 0, acceptedTotal: 0, completedTotal: 0 };
  state.treatmentPlans.push(plan);
  return { plan, audit: audit(state, { actor, plan, actionCode: 'TREATMENT_PLAN_CREATED', entityType: 'TREATMENT_PLAN', entityId: plan.id, metadata: { patientId, encounterId: plan.encounterId } }) };
};

export const validateTreatmentPlanItemInput = ({ state, planId, serviceId, toothCode = null, surfaces = [], quantity = 1, itemId = null, actor }) => {
  const errors = {}, plan = getTreatmentPlanById(state, planId), service = activeService(state, serviceId), parsedQuantity = Number(quantity);
  if (!plan) errors.planId = 'The selected treatment plan is invalid.';
  if (plan && !planOwner({ state, plan, actor })) errors.permission = 'Only the responsible Dentist may update this treatment plan.';
  if (!service) errors.serviceId = 'Select an active service from the catalogue.';
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) errors.quantity = 'Quantity must be a positive whole number.';
  const tooth = toothCode ? state.toothDefinitions.find(item => item.code === String(toothCode)) : null;
  if (service?.requiresTooth && !tooth) errors.toothCode = 'This service requires a valid FDI tooth.';
  if (!service?.requiresTooth && toothCode) errors.toothCode = 'This general service must not be assigned to a tooth.';
  const supplied = Array.isArray(surfaces) ? surfaces.map(code => String(code || '').trim().toUpperCase()).filter(Boolean) : [];
  const normalized = tooth ? validSurfaces(state, tooth, supplied) : [];
  if (tooth && normalized.length !== new Set(supplied).size) errors.surfaces = 'One or more selected surfaces are invalid for this tooth.';
  if (service?.surfaceRequirement === 'single' && normalized.length !== 1) errors.surfaces = 'This service requires exactly one applicable tooth surface.';
  if (service?.surfaceRequirement === 'multiple' && normalized.length < 2) errors.surfaces = 'This service requires at least two applicable tooth surfaces.';
  if (service?.surfaceRequirement === 'none' && normalized.length) errors.surfaces = 'This service does not use tooth surfaces.';
  if (!Object.keys(errors).length) {
    const duplicate = getTreatmentPlanItems(state, plan.id).some(item => item.id !== itemId && item.serviceId === service.id && item.toothCode === (tooth?.code || null) && JSON.stringify(validSurfaces(state, tooth, state.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === item.id).map(surface => surface.surfaceCode))) === JSON.stringify(normalized) && item.acceptanceStatus !== 'DECLINED');
    if (duplicate) errors.duplicate = 'An active matching treatment item already exists on this plan.';
  }
  return { valid: Object.keys(errors).length === 0, errors, plan, service, tooth, surfaces: normalized, quantity: parsedQuantity };
};

const replaceSurfaces = (state, itemId, surfaces) => {
  state.treatmentPlanItemSurfaces = state.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId !== itemId);
  surfaces.forEach(code => state.treatmentPlanItemSurfaces.push({ id: nextId(state.treatmentPlanItemSurfaces, 'PLAN-SURFACE', 2), treatmentPlanItemId: itemId, surfaceCode: code }));
};

export const addTreatmentPlanItem = ({ state, planId, serviceId, toothCode, surfaces = [], quantity = 1, notes = '', actor }) => {
  const validation = validateTreatmentPlanItemInput({ state, planId, serviceId, toothCode, surfaces, quantity, actor });
  if (!validation.valid) validationError(validation.errors);
  if (!['DRAFT', 'PROPOSED'].includes(validation.plan.status)) validationError({ status: 'Items can only be added to a Draft or Proposed plan.' });
  const now = timestamp(state), item = { id: nextItemId(state, validation.plan.id), treatmentPlanId: validation.plan.id, serviceId: validation.service.id, serviceCode: validation.service.code, toothCode: validation.tooth?.code || null, acceptanceStatus: 'PROPOSED', progressStatus: 'PLANNED', unitPrice: validation.service.defaultPrice, quantity: validation.quantity, lineTotal: validation.service.defaultPrice * validation.quantity, notes: String(notes || '').trim() || null, createdAt: now, updatedAt: now };
  state.treatmentPlanItems.push(item); replaceSurfaces(state, item.id, validation.surfaces); recalculateTreatmentPlan(state, validation.plan);
  return { item, surfaces: validation.surfaces, audit: audit(state, { actor, plan: validation.plan, actionCode: 'TREATMENT_PLAN_ITEM_ADDED', entityType: 'TREATMENT_PLAN_ITEM', entityId: item.id, metadata: { serviceId: item.serviceId, toothCode: item.toothCode } }) };
};

export const updateTreatmentPlanItem = ({ state, itemId, serviceId, toothCode, surfaces = [], quantity = 1, notes = '', actor }) => {
  const existing = state.treatmentPlanItems.find(candidate => candidate.id === itemId);
  if (!existing) throw new Error('The treatment item was not found.');
  const validation = validateTreatmentPlanItemInput({ state, planId: existing.treatmentPlanId, serviceId, toothCode, surfaces, quantity, itemId, actor });
  if (!validation.valid) validationError(validation.errors);
  if (!['DRAFT', 'PROPOSED'].includes(validation.plan.status) || existing.acceptanceStatus !== 'PROPOSED' || existing.progressStatus !== 'PLANNED') validationError({ status: 'Only proposed, unfulfilled items in a Draft or Proposed plan may be edited.' });
  Object.assign(existing, { serviceId: validation.service.id, serviceCode: validation.service.code, toothCode: validation.tooth?.code || null, unitPrice: validation.service.defaultPrice, quantity: validation.quantity, lineTotal: validation.service.defaultPrice * validation.quantity, notes: String(notes || '').trim() || null, updatedAt: timestamp(state) });
  replaceSurfaces(state, existing.id, validation.surfaces); recalculateTreatmentPlan(state, validation.plan);
  return { item: existing, surfaces: validation.surfaces, audit: audit(state, { actor, plan: validation.plan, actionCode: 'TREATMENT_PLAN_ITEM_UPDATED', entityType: 'TREATMENT_PLAN_ITEM', entityId: existing.id, metadata: { serviceId: existing.serviceId, toothCode: existing.toothCode } }) };
};

export const presentTreatmentPlan = ({ state, planId, actor }) => {
  const plan = getTreatmentPlanById(state, planId);
  if (!planOwner({ state, plan, actor })) throw new Error('Only the responsible Dentist may present this treatment plan.');
  if (plan.status !== 'DRAFT' || !getTreatmentPlanItems(state, plan.id).length) throw new Error('Add at least one item before presenting this treatment plan.');
  plan.status = 'PROPOSED'; plan.proposedAt = timestamp(state); plan.updatedAt = timestamp(state);
  return { plan, audit: audit(state, { actor, plan, actionCode: 'TREATMENT_PLAN_UPDATED', entityType: 'TREATMENT_PLAN', entityId: plan.id, metadata: { status: plan.status } }) };
};

export const decideTreatmentPlanItem = ({ state, itemId, decision, actor }) => {
  const item = state.treatmentPlanItems.find(candidate => candidate.id === itemId), plan = item && getTreatmentPlanById(state, item.treatmentPlanId);
  if (!item || !plan) throw new Error('The treatment item was not found.');
  if (!planOwner({ state, plan, actor })) throw new Error('Only the responsible Dentist may record this decision.');
  if (!['ACCEPTED', 'DECLINED'].includes(decision) || item.acceptanceStatus !== 'PROPOSED' || item.progressStatus === 'COMPLETED') throw new Error('This treatment item is not eligible for an acceptance decision.');
  item.acceptanceStatus = decision; item.progressStatus = decision === 'DECLINED' ? 'CANCELLED' : 'PLANNED'; item.updatedAt = timestamp(state);
  if (decision === 'ACCEPTED') { item.acceptedAt = timestamp(state); item.acceptedByUserId = actor.userId; } else { item.declinedAt = timestamp(state); item.declinedByUserId = actor.userId; }
  recalculateTreatmentPlan(state, plan);
  return { item, plan, audit: audit(state, { actor, plan, actionCode: decision === 'ACCEPTED' ? 'TREATMENT_PLAN_ITEM_ACCEPTED' : 'TREATMENT_PLAN_ITEM_DECLINED', entityType: 'TREATMENT_PLAN_ITEM', entityId: item.id, metadata: { decision } }) };
};

export const validateTreatmentPlanRuntime = state => {
  const errors = [], planIds = new Set(), itemIds = new Set(), surfacePairs = new Set();
  state.treatmentPlans.forEach(plan => {
    if (planIds.has(plan.id)) errors.push(`Duplicate treatment plan ID ${plan.id}.`); else planIds.add(plan.id);
    if (!PLAN_STATUSES.has(plan.status) || plan.organizationId !== state.organization.id || !state.branches.some(branch => branch.id === plan.branchId) || !state.patients.some(patient => patient.id === plan.patientId) || !dentist(state, plan.dentistUserId)) errors.push(`Invalid treatment plan ${plan.id}.`);
    if (plan.encounterId && !state.clinicalEncounters.some(encounter => encounter.id === plan.encounterId && encounter.patientId === plan.patientId)) errors.push(`Invalid treatment plan encounter ${plan.id}.`);
    if (plan.proposedTotal !== calculateTreatmentPlanProposedTotal(state, plan.id) || plan.acceptedTotal !== calculateTreatmentPlanAcceptedTotal(state, plan.id) || plan.completedTotal !== calculateTreatmentPlanCompletedValue(state, plan.id) || plan.completedTotal > plan.acceptedTotal || plan.acceptedTotal > plan.proposedTotal) errors.push(`Treatment plan totals are invalid for ${plan.id}.`);
  });
  state.treatmentPlanItems.forEach(item => {
    if (itemIds.has(item.id)) errors.push(`Duplicate treatment plan item ID ${item.id}.`); else itemIds.add(item.id);
    const plan = getTreatmentPlanById(state, item.treatmentPlanId), service = state.services.find(candidate => candidate.id === item.serviceId), tooth = item.toothCode && state.toothDefinitions.find(candidate => candidate.code === item.toothCode);
    if (!plan || !service || !ACCEPTANCE_STATUSES.has(item.acceptanceStatus) || !PROGRESS_STATUSES.has(item.progressStatus) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.lineTotal !== item.unitPrice * item.quantity || (service?.requiresTooth && !tooth) || (!service?.requiresTooth && item.toothCode)) errors.push(`Invalid treatment plan item ${item.id}.`);
    const surfaces = state.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === item.id).map(surface => surface.surfaceCode), normalized = tooth ? validSurfaces(state, tooth, surfaces) : [];
    if (surfaces.length !== normalized.length || (service?.surfaceRequirement === 'single' && normalized.length !== 1) || (service?.surfaceRequirement === 'multiple' && normalized.length < 2) || (service?.surfaceRequirement === 'none' && normalized.length)) errors.push(`Invalid treatment plan item surfaces ${item.id}.`);
  });
  state.treatmentPlanItemSurfaces.forEach(surface => { const key = `${surface.treatmentPlanItemId}:${surface.surfaceCode}`; if (surfacePairs.has(key)) errors.push(`Duplicate plan surface ${key}.`); else surfacePairs.add(key); if (!state.treatmentPlanItems.some(item => item.id === surface.treatmentPlanItemId)) errors.push(`Orphan plan surface ${surface.id}.`); });
  return { valid: errors.length === 0, errors };
};
