import { DEMO_SCHEMA_VERSION } from '../data/clinic.js';
import { createCanonicalDemoState } from '../data/demo.js';
import { storage } from './storage.js';
import { createPatientRegistrationRecords, createPatientUpdateRecords } from '../data/patient-registration.js';
import { cancelAppointment, confirmAppointment, createAppointment, editAppointment, rescheduleAppointment } from '../data/appointment-workflows.js';
import { checkInAppointment, startQueueTreatment } from '../data/queue-workflows.js';
import { completeClinicalEncounter, saveClinicalEncounterDraft, savePatientMedicalRecord, startClinicalEncounter } from '../data/clinical-workflows.js';
import { addDentalFinding, updateDentalFinding } from '../data/dental-chart-workflows.js';
import { addTreatmentPlanItem, createTreatmentPlan, decideTreatmentPlanItem, presentTreatmentPlan, updateTreatmentPlanItem } from '../data/treatment-plan-workflows.js';
import { recordProcedure } from '../data/procedure-workflows.js';
import { createPrescription } from '../data/prescription-workflows.js';
import { clearRuntimeDocumentPreviews, createClinicalDocument } from '../data/document-workflows.js';
import { createInvoice } from '../data/invoice-workflows.js';
import { recordPayment } from '../data/payment-workflows.js';
import { cancelRecall, completeRecall, contactRecall, createRecall, createRecallAppointment, linkRecallAppointment, updateRecall } from '../data/recall-workflows.js';
import { createUser, updateUser } from '../data/user-management.js';
import { changeOwnPassword, updateOwnProfile, updateSettings } from '../data/configuration-workflows.js';
import { permissions } from './permissions.js';
import { resolveActiveActor } from './authorization.js';
const STATE_KEY = 'demo-state';
let currentState = createCanonicalDemoState();
let initialized = false;
const clone = value => structuredClone(value);
const isCompatibleState = value => value && value.schemaVersion === DEMO_SCHEMA_VERSION && Array.isArray(value.users) && Array.isArray(value.patients);
const commit = mutator => { const draft = clone(currentState); mutator(draft); currentState = draft; storage.set(STATE_KEY, currentState); return clone(currentState); };
const actorFor = (draft, actor) => resolveActiveActor({ state: draft, actor });
const requirePermission = (actor, action) => { if (!permissions.can(actor.role, action)) throw new Error('You do not have permission to perform this action.'); };
// Phase 9 scheduling is frozen: store actions preserve history and enforce dentist-aware conflicts; queue transitions begin in Phase 10.
export const state = {
  initialize() { if (initialized) return this.get(); const saved = storage.get(STATE_KEY, null); currentState = isCompatibleState(saved) ? saved : createCanonicalDemoState(); if (!isCompatibleState(saved)) storage.set(STATE_KEY, currentState); initialized = true; return this.get(); },
  get() { return clone(currentState); },
  addPatient({ values, actor } = {}) { let registration; commit(draft => { const verified = actorFor(draft, actor); requirePermission(verified, 'patients.create'); registration = createPatientRegistrationRecords({ state: draft, values, registeredByUserId: verified.userId, branchId: verified.branchId }); draft.patients.push(registration.patient); if (registration.guardian) draft.patientGuardians.push(registration.guardian); }); return clone(registration); },
  updatePatient({ patientId, values, actor } = {}) { let update; commit(draft => { const verified = actorFor(draft, actor); requirePermission(verified, 'patients.edit'); update = createPatientUpdateRecords({ state: draft, patientId, values, updatedByUserId: verified.userId }); if (update.patientChanged) draft.patients[draft.patients.findIndex(patient => patient.id === patientId)] = update.patient; if (update.guardianChanged) { const index = draft.patientGuardians.findIndex(guardian => guardian.id === update.guardian.id); if (index >= 0) draft.patientGuardians[index] = update.guardian; else draft.patientGuardians.push(update.guardian); } }); return clone(update); },
  setPatientStatus({ patientId, status, actor } = {}) { if (!['active', 'inactive'].includes(status)) throw new Error('Patient status is invalid.'); let patient; commit(draft => { const verified = actorFor(draft, actor); requirePermission(verified, 'patients.status'); const index = draft.patients.findIndex(candidate => candidate.id === patientId); if (index < 0) throw new Error('Patient record was not found.'); const current = draft.patients[index]; patient = current.status === status ? current : { ...current, status, updatedAt: `${draft.referenceDate}T00:00:00+03:00`, updatedByUserId: verified.userId }; draft.patients[index] = patient; }); return clone(patient); },
  addAppointment({ values, actor } = {}) { let result; commit(draft => { result = createAppointment({ state: draft, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  updateAppointment({ appointmentId, values, actor } = {}) { let result; commit(draft => { result = editAppointment({ state: draft, appointmentId, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  confirmAppointment({ appointmentId, actor } = {}) { let appointment; commit(draft => { appointment = confirmAppointment({ state: draft, appointmentId, actor: actorFor(draft, actor) }); }); return clone(appointment); },
  cancelAppointment({ appointmentId, reason, actor } = {}) { let appointment; commit(draft => { appointment = cancelAppointment({ state: draft, appointmentId, reason, actor: actorFor(draft, actor) }); }); return clone(appointment); },
  rescheduleAppointment({ appointmentId, values, actor } = {}) { let result; commit(draft => { result = rescheduleAppointment({ state: draft, appointmentId, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  checkInAppointment({ appointmentId, actor } = {}) { let result; commit(draft => { result = checkInAppointment({ state: draft, appointmentId, actor: actorFor(draft, actor) }); }); return clone(result); },
  startQueueTreatment({ queueEntryId, actor } = {}) { let result; commit(draft => { result = startQueueTreatment({ state: draft, queueEntryId, actor: actorFor(draft, actor) }); }); return clone(result); },
  startClinicalEncounter({ patientId, actor } = {}) { let encounter; commit(draft => { encounter = startClinicalEncounter({ state: draft, patientId, actor: actorFor(draft, actor) }); }); return clone(encounter); },
  saveClinicalEncounterDraft({ encounterId, values, actor } = {}) { let result; commit(draft => { result = saveClinicalEncounterDraft({ state: draft, encounterId, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  completeClinicalEncounter({ encounterId, values, actor } = {}) { let encounter; commit(draft => { encounter = completeClinicalEncounter({ state: draft, encounterId, values, actor: actorFor(draft, actor) }); }); return clone(encounter); },
  savePatientMedicalRecord({ type, patientId, recordId, value, actor } = {}) { let record; commit(draft => { record = savePatientMedicalRecord({ state: draft, type, patientId, recordId, value, actor: actorFor(draft, actor) }); }); return clone(record); },
  addDentalFinding({ patientId, toothCode, conditionCode, surfaces, notes, actor } = {}) { let result; commit(draft => { result = addDentalFinding({ state: draft, patientId, toothCode, conditionCode, surfaces, notes, actor: actorFor(draft, actor) }); }); return clone(result); },
  updateDentalFinding({ entryId, conditionCode, surfaces, notes, actor } = {}) { let result; commit(draft => { result = updateDentalFinding({ state: draft, entryId, conditionCode, surfaces, notes, actor: actorFor(draft, actor) }); }); return clone(result); },
  createTreatmentPlan({ patientId, notes, actor } = {}) { let result; commit(draft => { result = createTreatmentPlan({ state: draft, patientId, notes, actor: actorFor(draft, actor) }); }); return clone(result); },
  addTreatmentPlanItem({ planId, serviceId, toothCode, surfaces, quantity, notes, actor } = {}) { let result; commit(draft => { result = addTreatmentPlanItem({ state: draft, planId, serviceId, toothCode, surfaces, quantity, notes, actor: actorFor(draft, actor) }); }); return clone(result); },
  updateTreatmentPlanItem({ itemId, serviceId, toothCode, surfaces, quantity, notes, actor } = {}) { let result; commit(draft => { result = updateTreatmentPlanItem({ state: draft, itemId, serviceId, toothCode, surfaces, quantity, notes, actor: actorFor(draft, actor) }); }); return clone(result); },
  presentTreatmentPlan({ planId, actor } = {}) { let result; commit(draft => { result = presentTreatmentPlan({ state: draft, planId, actor: actorFor(draft, actor) }); }); return clone(result); },
  decideTreatmentPlanItem({ itemId, decision, actor } = {}) { let result; commit(draft => { result = decideTreatmentPlanItem({ state: draft, itemId, decision, actor: actorFor(draft, actor) }); }); return clone(result); },
  recordProcedure({ patientId, serviceId, treatmentPlanItemId, encounterId, toothCode, surfaces, notes, actor } = {}) { let result; commit(draft => { result = recordProcedure({ state: draft, patientId, serviceId, treatmentPlanItemId, encounterId, toothCode, surfaces, notes, actor: actorFor(draft, actor) }); }); return clone(result); },
  createPrescription({ patientId, items, notes, actor } = {}) { let result; commit(draft => { result = createPrescription({ state: draft, patientId, items, notes, actor: actorFor(draft, actor) }); }); return clone(result); },
  createClinicalDocument({ patientId, type, title, capturedAt, encounterId, notes, fileMetadata, actor } = {}) { let result; commit(draft => { result = createClinicalDocument({ state: draft, patientId, type, title, capturedAt, encounterId, notes, fileMetadata, actor: actorFor(draft, actor) }); }); return clone(result); },
  createInvoice({ patientId, items, notes, actor } = {}) { let result; commit(draft => { result = createInvoice({ state: draft, patientId, items, notes, actor: actorFor(draft, actor) }); }); return clone(result); },
  recordPayment({ invoiceId, amount, paymentMethodCode, transactionReference, notes, actor } = {}) { let result; commit(draft => { result = recordPayment({ state: draft, invoiceId, amount, paymentMethodCode, transactionReference, notes, actor: actorFor(draft, actor) }); }); return clone(result); },
  createRecall({ values, actor } = {}) { let result; commit(draft => { result = createRecall({ state: draft, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  updateRecall({ recallId, values, actor } = {}) { let result; commit(draft => { result = updateRecall({ state: draft, recallId, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  contactRecall({ recallId, contactOutcome, actor } = {}) { let result; commit(draft => { result = contactRecall({ state: draft, recallId, contactOutcome, actor: actorFor(draft, actor) }); }); return clone(result); },
  linkRecallAppointment({ recallId, appointmentId, actor } = {}) { let result; commit(draft => { result = linkRecallAppointment({ state: draft, recallId, appointmentId, actor: actorFor(draft, actor) }); }); return clone(result); },
  createRecallAppointment({ recallId, values, actor } = {}) { let result; commit(draft => { result = createRecallAppointment({ state: draft, recallId, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  completeRecall({ recallId, actor } = {}) { let result; commit(draft => { result = completeRecall({ state: draft, recallId, actor: actorFor(draft, actor) }); }); return clone(result); },
  cancelRecall({ recallId, actor } = {}) { let result; commit(draft => { result = cancelRecall({ state: draft, recallId, actor: actorFor(draft, actor) }); }); return clone(result); },
  createUser({ values, actor } = {}) { let result; commit(draft => { result = createUser({ state: draft, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  updateUser({ userId, values, actor } = {}) { let result; commit(draft => { result = updateUser({ state: draft, userId, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  updateSettings({ values, actor } = {}) { let result; commit(draft => { result = updateSettings({ state: draft, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  updateOwnProfile({ values, actor } = {}) { let result; commit(draft => { result = updateOwnProfile({ state: draft, values, actor: actorFor(draft, actor) }); }); return clone(result); },
  changeOwnPassword({ currentPassword, newPassword, confirmation, actor } = {}) { let result; commit(draft => { result = changeOwnPassword({ state: draft, currentPassword, newPassword, confirmation, actor: actorFor(draft, actor) }); }); return clone(result); },
  reset() { clearRuntimeDocumentPreviews(); currentState = createCanonicalDemoState(); initialized = true; storage.set(STATE_KEY, currentState); return this.get(); },
  resetDemoData() { return this.reset(); }
};
