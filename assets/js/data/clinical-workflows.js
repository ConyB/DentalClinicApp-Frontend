import { getAppointmentById, getQueueEntryByAppointmentId } from './scheduling.js';
import { getEncounterForAppointment } from './clinical.js';

const numericSuffix = value => Number(String(value || '').match(/(\d+)$/)?.[1] || 0);
const nextEncounterNumber = state => `ENC-${String(Math.max(0, ...state.clinicalEncounters.map(item => numericSuffix(item.encounterNumber))) + 1).padStart(6, '0')}`;
const nextAuditId = state => `AUDIT-${String(Math.max(0, ...state.auditLogs.map(item => numericSuffix(item.id))) + 1).padStart(3, '0')}`;
const timestamp = state => `${state.referenceDate}T10:00:00+03:00`;

export const getClinicalVisitContext = (state, patientId) => {
  const appointment = state.appointments.filter(item => item.patientId === patientId && item.status === 'IN_TREATMENT').sort((a, b) => b.startDateTime.localeCompare(a.startDateTime))[0] || null;
  const queueEntry = appointment ? getQueueEntryByAppointmentId(state, appointment.id) : null;
  const linkedEncounter = appointment ? getEncounterForAppointment(state, appointment.id) : null;
  const encounter = linkedEncounter?.patientId === patientId && linkedEncounter.dentistUserId === appointment?.dentistUserId ? linkedEncounter : null;
  return { appointment, queueEntry, encounter, hasEncounterConflict: Boolean(linkedEncounter && !encounter), dentist: appointment ? state.users.find(user => user.id === appointment.dentistUserId) || null : null, appointmentType: appointment ? state.appointmentTypes.find(type => type.id === appointment.appointmentTypeId) || null : null };
};

export const canStartClinicalEncounter = ({ state, patientId, actor }) => {
  const visit = getClinicalVisitContext(state, patientId);
  return Boolean(actor?.role === 'Dentist' && visit.appointment && visit.queueEntry?.status === 'IN_TREATMENT' && visit.appointment.dentistUserId === actor.userId && !visit.encounter && !visit.hasEncounterConflict);
};

export const startClinicalEncounter = ({ state, patientId, actor }) => {
  if (!canStartClinicalEncounter({ state, patientId, actor })) throw new Error('A clinical encounter can only be started by the assigned Dentist while the patient is in treatment.');
  const visit = getClinicalVisitContext(state, patientId);
  if (getEncounterForAppointment(state, visit.appointment.id)) throw new Error('An encounter already exists for this appointment.');
  const createdAt = timestamp(state), encounterNumber = nextEncounterNumber(state);
  const encounter = { id: encounterNumber, encounterNumber, organizationId: state.organization.id, branchId: visit.appointment.branchId, patientId, appointmentId: visit.appointment.id, dentistUserId: actor.userId, status: 'DRAFT', chiefComplaint: null, examinationNotes: null, clinicalNotes: null, treatmentDiscussion: null, followUpNotes: null, startedAt: createdAt, completedAt: null, createdAt, updatedAt: createdAt };
  state.clinicalEncounters.push(encounter);
  state.auditLogs.push({ id: nextAuditId(state), organizationId: state.organization.id, branchId: visit.appointment.branchId, actorUserId: actor.userId, actionCode: 'ENCOUNTER_STARTED', entityType: 'ENCOUNTER', entityId: encounter.id, occurredAt: createdAt, summary: `Clinical encounter started for ${state.patients.find(patient => patient.id === patientId)?.fullName || 'patient'}.`, metadata: { appointmentId: visit.appointment.id } });
  return encounter;
};

const normalized = values => Object.fromEntries(['chiefComplaint', 'examinationNotes', 'clinicalNotes', 'treatmentDiscussion', 'followUpNotes'].map(key => [key, String(values?.[key] || '').trim()]));
export const ENCOUNTER_COMPLETION_FIELDS = Object.freeze({ chiefComplaint: 'Chief Complaint', examinationNotes: 'Examination Notes', clinicalNotes: 'Clinical Notes' });
export const validateEncounterForCompletion = values => { const clean = normalized(values), errors = Object.fromEntries(Object.entries(ENCOUNTER_COMPLETION_FIELDS).filter(([key]) => !clean[key]).map(([key, label]) => [key, `${label} is required before completing this encounter.`])); return { valid: Object.keys(errors).length === 0, errors, values: clean }; };
const editableEncounter = ({ state, encounterId, actor }) => { const encounter = state.clinicalEncounters.find(item => item.id === encounterId); if (!encounter) throw new Error('The clinical encounter was not found.'); if (encounter.status !== 'DRAFT') throw new Error('Completed encounters are read-only.'); if (actor?.role !== 'Dentist' || encounter.dentistUserId !== actor.userId) throw new Error('Only the assigned Dentist can edit this encounter.'); return encounter; };
const audit = (state, encounter, actor, actionCode, summary) => state.auditLogs.push({ id: nextAuditId(state), organizationId: state.organization.id, branchId: encounter.branchId, actorUserId: actor.userId, actionCode, entityType: 'ENCOUNTER', entityId: encounter.id, occurredAt: timestamp(state), summary, metadata: { appointmentId: encounter.appointmentId } });
export const saveClinicalEncounterDraft = ({ state, encounterId, values, actor }) => { const encounter = editableEncounter({ state, encounterId, actor }), changes = normalized(values), changed = Object.keys(changes).some(key => changes[key] !== (encounter[key] || '')); if (!changed) return { encounter, changed: false }; Object.assign(encounter, changes, { updatedAt: timestamp(state), updatedByUserId: actor.userId }); audit(state, encounter, actor, 'ENCOUNTER_UPDATED', `Clinical encounter draft updated for ${state.patients.find(patient => patient.id === encounter.patientId)?.fullName || 'patient'}.`); return { encounter, changed: true }; };
export const completeClinicalEncounter = ({ state, encounterId, values, actor }) => { const encounter = editableEncounter({ state, encounterId, actor }), validation = validateEncounterForCompletion(values); if (!validation.valid) { const error = new Error('Please correct the highlighted fields before completing this encounter.'); error.fieldErrors = validation.errors; throw error; } const patient = state.patients.find(item => item.id === encounter.patientId); if (!patient) throw new Error('The encounter patient relationship is invalid.'); const appointment = getAppointmentById(state, encounter.appointmentId); if (!appointment || appointment.patientId !== encounter.patientId || appointment.dentistUserId !== encounter.dentistUserId) throw new Error('The encounter appointment relationship is invalid.'); const completedAt = timestamp(state); Object.assign(encounter, validation.values, { status: 'COMPLETED', completedAt, completedByUserId: actor.userId, updatedAt: completedAt, updatedByUserId: actor.userId }); audit(state, encounter, actor, 'ENCOUNTER_COMPLETED', `Clinical encounter completed for ${patient.fullName}.`); return encounter; };

const medicalConfig = { allergy: { collection: 'patientAllergies', id: 'ALLERGY', value: 'allergen', statuses: ['active', 'inactive'] }, condition: { collection: 'patientConditions', id: 'CONDITION', value: 'conditionName', statuses: ['active', 'inactive'] }, medication: { collection: 'patientMedications', id: 'MEDICATION', value: 'medicationName', statuses: ['current', 'inactive'] } };
const medicalId = (state, config) => `${config.id}-${String(Math.max(0, ...state[config.collection].map(item => numericSuffix(item.id))) + 1).padStart(3, '0')}`;
const medicalActor = (state, patientId, actor) => { if (actor?.role !== 'Dentist' || !state.patients.some(patient => patient.id === patientId)) throw new Error('You do not have permission to update this medical history.'); };
export const savePatientMedicalRecord = ({ state, type, patientId, recordId = null, value, actor }) => { const config = medicalConfig[type]; if (!config) throw new Error('Medical history type is invalid.'); medicalActor(state, patientId, actor); const text = String(value || '').trim(); if (!text) throw new Error(`${type[0].toUpperCase() + type.slice(1)} is required.`); const records = state[config.collection]; const duplicate = records.some(item => item.patientId === patientId && item[config.value].trim().toLowerCase() === text.toLowerCase() && item.id !== recordId && config.statuses.includes(item.status)); if (duplicate) throw new Error('An active matching medical record already exists.'); const now = timestamp(state); if (recordId) { const record = records.find(item => item.id === recordId && item.patientId === patientId); if (!record) throw new Error('Medical history record was not found.'); record[config.value] = text; record.updatedAt = now; record.updatedBy = actor.userId; return record; } const record = { id: medicalId(state, config), patientId, [config.value]: text, status: config.statuses[0], recordedBy: actor.userId, recordedAt: now }; records.push(record); return record; };
