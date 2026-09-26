import { getDentalChartEntrySurfaces, getDentalChartForPatient, getPatientAllergies, getTreatmentPlanItems, getTreatmentPlansForPatient } from './clinical.js';
import { getPatientAge, getPatientById } from './patients.js';
import { getDentalFindingRule } from './dental-chart-workflows.js';
import { normalizeDentalSurfaces } from './dental-reference.js';

export const dentalChartVisuals = Object.freeze({
  CARIES: { key: 'condition', label: 'Caries', marker: 'C' },
  RESTORATION: { key: 'existing', label: 'Existing Restoration', marker: 'R' },
  MISSING: { key: 'missing', label: 'Missing', marker: 'M' },
  EXTRACTED: { key: 'extracted', label: 'Extracted', marker: 'X' },
  CROWN: { key: 'crown', label: 'Crown', marker: 'CR' },
  ROOT_CANAL_TREATED: { key: 'rct', label: 'Root Canal Treated', marker: 'RCT' },
  FRACTURED: { key: 'fracture', label: 'Fractured', marker: 'F' },
  HEALTHY: { key: 'healthy', label: 'Healthy Observation', marker: 'H' },
  PLANNED: { key: 'planned', label: 'Planned Treatment', marker: 'P' },
  OTHER: { key: 'other', label: 'Other Recorded Finding', marker: '•' }
});

export const dentalChartLegend = Object.freeze(['CARIES', 'RESTORATION', 'MISSING', 'EXTRACTED', 'CROWN', 'ROOT_CANAL_TREATED', 'FRACTURED', 'HEALTHY', 'PLANNED'].map(code => ({ code, ...dentalChartVisuals[code] })));

const entryVisual = entry => dentalChartVisuals[entry.conceptCode] || dentalChartVisuals.OTHER;
const planItemsForPatient = (state, patientId) => getTreatmentPlansForPatient(state, patientId).flatMap(plan => getTreatmentPlanItems(state, plan.id)
  .filter(item => item.toothCode && item.acceptanceStatus !== 'DECLINED' && !['COMPLETED', 'CANCELLED'].includes(item.progressStatus))
  .map(item => ({
    id: item.id,
    toothCode: item.toothCode,
    label: state.services.find(service => service.id === item.serviceId)?.name || item.serviceCode || 'Planned Treatment',
    surfaces: normalizeDentalSurfaces(state.toothDefinitions.find(tooth => tooth.code === item.toothCode), state.treatmentPlanItemSurfaces.filter(surface => surface.treatmentPlanItemId === item.id).map(surface => surface.surfaceCode), state.toothSurfaceDefinitions),
    treatmentPlanId: plan.id,
    treatmentPlanNumber: plan.treatmentPlanNumber,
    planStatus: plan.status,
    acceptanceStatus: item.acceptanceStatus,
    progressStatus: item.progressStatus,
    visual: dentalChartVisuals.PLANNED
  })));

const displaySide = side => side === 'right' ? 'Right' : 'Left';
const displayArch = arch => arch === 'upper' ? 'Upper' : 'Lower';
const orderedDefinitions = (state, dentition, arch) => state.toothDefinitions
  .filter(tooth => tooth.dentition === dentition && tooth.arch === arch)
  .slice()
  .sort((a, b) => a.patientSide === b.patientSide ? (a.patientSide === 'right' ? b.position - a.position : a.position - b.position) : (a.patientSide === 'right' ? -1 : 1));

const entryView = (state, entry) => ({
  ...entry,
  surfaces: normalizeDentalSurfaces(state.toothDefinitions.find(tooth => tooth.code === entry.toothCode), getDentalChartEntrySurfaces(state, entry.id).map(surface => surface.surfaceCode), state.toothSurfaceDefinitions),
  visual: entryVisual(entry),
  recordedBy: state.users.find(user => user.id === entry.recordedByUserId)?.fullName || 'Not recorded'
});

const spokenSurfaces = (state, tooth, codes) => codes.map(code => state.toothSurfaceDefinitions[tooth.isPosterior ? 'posterior' : 'anterior'].find(surface => surface.code === code)?.name || code).join(', ');
const accessibleLabel = (state, tooth) => {
  const prefix = `${tooth.dentition === 'primary' ? 'Primary tooth' : 'Tooth'} ${tooth.code}`;
  const current = tooth.entries.map(entry => `${entry.visual.label}${entry.surfaces.length ? ` on ${spokenSurfaces(state, tooth, entry.surfaces)} surface${entry.surfaces.length > 1 ? 's' : ''}` : ''}`);
  const planned = tooth.planned.map(item => `${item.label}${item.surfaces.length ? ` on ${spokenSurfaces(state, tooth, item.surfaces)} surface${item.surfaces.length > 1 ? 's' : ''}` : ''}`);
  return [prefix, current.length ? current.join(', ') : 'no recorded findings', planned.length ? `${planned.length} planned treatment${planned.length > 1 ? 's' : ''}: ${planned.join(', ')}` : null].filter(Boolean).join(', ');
};

export const getDentalChartDefaultDentition = (state, patientId) => {
  const toothByCode = new Map(state.toothDefinitions.map(tooth => [tooth.code, tooth]));
  const recorded = [...getDentalChartForPatient(state, patientId).map(entry => entry.toothCode), ...planItemsForPatient(state, patientId).map(item => item.toothCode)].map(code => toothByCode.get(code)?.dentition).filter(Boolean);
  return recorded.includes('primary') && !recorded.includes('permanent') ? 'primary' : 'permanent';
};

export const getDentalChartViewModel = (state, patientId, requestedDentition) => {
  const patient = getPatientById(state, patientId);
  if (!patient) return null;
  const dentition = ['permanent', 'primary'].includes(requestedDentition) ? requestedDentition : getDentalChartDefaultDentition(state, patientId);
  const currentEntries = getDentalChartForPatient(state, patientId).filter(entry => entry.status === 'active' && entry.entryType !== 'PLANNED_TREATMENT').map(entry => entryView(state, entry));
  const plannedItems = planItemsForPatient(state, patientId);
  const buildTooth = definition => {
    const entries = currentEntries.filter(entry => entry.toothCode === definition.code);
    const planned = plannedItems.filter(item => item.toothCode === definition.code);
    const tooth = { ...definition, displayName: `${displayArch(definition.arch)} ${displaySide(definition.patientSide)} ${definition.name}`, entries, planned, permittedSurfaces: state.toothSurfaceDefinitions[definition.isPosterior ? 'posterior' : 'anterior'] };
    return { ...tooth, accessibleLabel: accessibleLabel(state, tooth) };
  };
  const upper = orderedDefinitions(state, dentition, 'upper').map(buildTooth);
  const lower = orderedDefinitions(state, dentition, 'lower').map(buildTooth);
  const visibleCodes = new Set([...upper, ...lower].map(tooth => tooth.code));
  const visibleEntries = currentEntries.filter(entry => visibleCodes.has(entry.toothCode));
  const visiblePlanned = plannedItems.filter(item => visibleCodes.has(item.toothCode));
  return {
    patient,
    age: getPatientAge(patient, state.referenceDate),
    allergies: getPatientAllergies(state, patientId),
    dentition,
    arches: { upper, lower },
    history: { entries: visibleEntries.slice().reverse(), planned: visiblePlanned },
    summary: { recordedFindings: visibleEntries.length, teethWithFindings: new Set(visibleEntries.map(entry => entry.toothCode)).size, plannedItems: visiblePlanned.length },
    availableDentitions: ['permanent', 'primary']
  };
};

export const validateDentalChartRuntime = state => {
  const errors = [];
  const definitions = state.toothDefinitions || [];
  const permanent = definitions.filter(tooth => tooth.dentition === 'permanent');
  const primary = definitions.filter(tooth => tooth.dentition === 'primary');
  const codes = new Set(definitions.map(tooth => tooth.code));
  if (permanent.length !== 32) errors.push(`Expected 32 permanent teeth; found ${permanent.length}.`);
  if (primary.length !== 20) errors.push(`Expected 20 primary teeth; found ${primary.length}.`);
  if (codes.size !== definitions.length) errors.push('Duplicate FDI tooth definitions found.');
  const allowedSurface = (toothCode, code) => { const tooth = definitions.find(item => item.code === toothCode); return tooth && state.toothSurfaceDefinitions[tooth.isPosterior ? 'posterior' : 'anterior'].some(surface => surface.code === code); };
  const entryIds = new Set();
  state.dentalChartEntries.forEach(entry => {
    if (entryIds.has(entry.id)) errors.push(`Duplicate chart entry ID ${entry.id}.`); else entryIds.add(entry.id);
    if (!codes.has(entry.toothCode)) errors.push(`Invalid chart tooth reference ${entry.toothCode}.`);
    if (!state.patients.some(patient => patient.id === entry.patientId)) errors.push(`Invalid chart patient reference ${entry.id}.`);
    if (entry.organizationId !== state.organization.id) errors.push(`Invalid chart organisation reference ${entry.id}.`);
    const recorder = state.users.find(user => user.id === entry.recordedByUserId);
    if (!recorder || recorder.roleCode !== 'dentist') errors.push(`Invalid chart recorder reference ${entry.id}.`);
    if (entry.encounterId) { const encounter = state.clinicalEncounters.find(item => item.id === entry.encounterId); if (!encounter || encounter.patientId !== entry.patientId) errors.push(`Invalid chart encounter reference ${entry.id}.`); }
    if (entry.entryType !== 'PLANNED_TREATMENT') {
      const rule = getDentalFindingRule(state, entry.conceptCode);
      if (!rule) errors.push(`Invalid chart condition ${entry.id}.`);
      const surfaces = state.dentalChartEntrySurfaces.filter(surface => surface.dentalChartEntryId === entry.id).map(surface => surface.surfaceCode);
      if (rule?.surfaceMode === 'surface' && !surfaces.length) errors.push(`Chart entry ${entry.id} requires a surface.`);
      if (rule?.surfaceMode === 'whole_tooth' && surfaces.length) errors.push(`Chart entry ${entry.id} cannot contain surfaces.`);
      const expectedType = entry.conceptCode === 'HEALTHY' ? 'OBSERVATION' : rule?.entryType === 'existing_treatment' ? 'EXISTING_TREATMENT' : 'CONDITION';
      if (rule && entry.entryType !== expectedType && !['COMPLETED_TREATMENT'].includes(entry.entryType)) errors.push(`Chart entry ${entry.id} has an invalid condition/type pairing.`);
    }
  });
  const surfaceIds = new Set();
  state.dentalChartEntrySurfaces.forEach(surface => { if (surfaceIds.has(surface.id)) errors.push(`Duplicate chart surface ID ${surface.id}.`); else surfaceIds.add(surface.id); const entry = state.dentalChartEntries.find(item => item.id === surface.dentalChartEntryId); if (!entry || !allowedSurface(entry.toothCode, surface.surfaceCode)) errors.push(`Invalid chart surface ${surface.id}.`); });
  const surfacePairs = state.dentalChartEntrySurfaces.map(surface => `${surface.dentalChartEntryId}:${surface.surfaceCode}`);
  if (new Set(surfacePairs).size !== surfacePairs.length) errors.push('Duplicate dental chart entry surface found.');
  const currentGroups = new Map();
  state.dentalChartEntries.filter(entry => entry.status === 'active' && entry.entryType !== 'PLANNED_TREATMENT').forEach(entry => { const key = `${entry.patientId}:${entry.toothCode}`; currentGroups.set(key, [...(currentGroups.get(key) || []), entry]); });
  currentGroups.forEach((entries, key) => {
    const concepts = entries.map(entry => entry.conceptCode);
    if (concepts.includes('HEALTHY') && entries.length > 1) errors.push(`Conflicting Healthy chart state at ${key}.`);
    if (concepts.some(code => ['MISSING', 'EXTRACTED'].includes(code)) && entries.length > 1) errors.push(`Conflicting absent-tooth chart state at ${key}.`);
    const signatures = entries.map(entry => `${entry.conceptCode}:${state.dentalChartEntrySurfaces.filter(surface => surface.dentalChartEntryId === entry.id).map(surface => surface.surfaceCode).sort().join('')}`);
    if (new Set(signatures).size !== signatures.length) errors.push(`Duplicate active chart finding at ${key}.`);
  });
  state.treatmentPlanItems.filter(item => item.toothCode).forEach(item => { if (!codes.has(item.toothCode)) errors.push(`Invalid planned tooth reference ${item.toothCode}.`); });
  state.treatmentPlanItemSurfaces.forEach(surface => { const item = state.treatmentPlanItems.find(candidate => candidate.id === surface.treatmentPlanItemId); if (!item || !allowedSurface(item.toothCode, surface.surfaceCode)) errors.push(`Invalid planned surface ${surface.id}.`); });
  return { valid: errors.length === 0, errors, summary: { permanent: permanent.length, primary: primary.length, total: definitions.length, duplicateCodes: definitions.length - codes.size } };
};
