const chronological = (records, key) => [...records].sort((a, b) => a[key].localeCompare(b[key]));
export const getEncounterById = (state, id) => state.clinicalEncounters.find(encounter => encounter.id === id) || null;
export const getEncounterForAppointment = (state, appointmentId) => state.clinicalEncounters.find(encounter => encounter.appointmentId === appointmentId) || null;
export const getEncountersForPatient = (state, patientId) => chronological(state.clinicalEncounters.filter(encounter => encounter.patientId === patientId), 'startedAt');
export const getEncountersForDentist = (state, userId) => chronological(state.clinicalEncounters.filter(encounter => encounter.dentistUserId === userId), 'startedAt');
export const getEncounterRegister = (state, { role, userId } = {}) => {
  const permitted = role === 'Clinic Administrator' ? state.clinicalEncounters : role === 'Dentist' ? state.clinicalEncounters.filter(encounter => encounter.dentistUserId === userId) : [];
  return [...permitted].sort((left, right) => right.startedAt.localeCompare(left.startedAt) || right.encounterNumber.localeCompare(left.encounterNumber));
};
export const getFindingsForEncounter = (state, encounterId) => chronological(state.encounterFindings.filter(finding => finding.encounterId === encounterId), 'recordedAt');
export const getDiagnosesForEncounter = (state, encounterId) => chronological(state.encounterDiagnoses.filter(diagnosis => diagnosis.encounterId === encounterId), 'recordedAt');
export const getDentalChartForPatient = (state, patientId) => chronological(state.dentalChartEntries.filter(entry => entry.patientId === patientId), 'recordedAt');
export const getDentalChartForTooth = (state, patientId, toothCode) => getDentalChartForPatient(state, patientId).filter(entry => entry.toothCode === toothCode);
export const getDentalChartEntrySurfaces = (state, entryId) => state.dentalChartEntrySurfaces.filter(surface => surface.dentalChartEntryId === entryId);
export const getTreatmentPlanById = (state, id) => state.treatmentPlans.find(plan => plan.id === id) || null;
export const getTreatmentPlansForPatient = (state, patientId) => chronological(state.treatmentPlans.filter(plan => plan.patientId === patientId), 'createdAt');
export const getTreatmentPlansForDentist = (state, userId) => chronological(state.treatmentPlans.filter(plan => plan.dentistUserId === userId), 'createdAt');
export const getTreatmentPlanRegister = (state, { role } = {}) => ['Clinic Administrator', 'Dentist'].includes(role) ? [...state.treatmentPlans].sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.treatmentPlanNumber.localeCompare(left.treatmentPlanNumber)) : [];
export const getTreatmentPlanItems = (state, planId) => state.treatmentPlanItems.filter(item => item.treatmentPlanId === planId);
export const getProceduresForPatient = (state, patientId) => chronological(state.proceduresPerformed.filter(procedure => procedure.patientId === patientId), 'performedAt');
export const getProceduresForEncounter = (state, encounterId) => chronological(state.proceduresPerformed.filter(procedure => procedure.encounterId === encounterId), 'performedAt');
export const getPrescriptionsForPatient = (state, patientId) => chronological(state.prescriptions.filter(prescription => prescription.patientId === patientId), 'issuedAt');
export const getPrescriptionItems = (state, prescriptionId) => state.prescriptionItems.filter(item => item.prescriptionId === prescriptionId);
export const getDocumentsForPatient = (state, patientId) => chronological(state.patientDocuments.filter(document => document.patientId === patientId), 'capturedAt');
export const getPatientAllergies = (state, patientId) => state.patientAllergies.filter(record => record.patientId === patientId && record.status === 'active');
export const getPatientMedicalConditions = (state, patientId) => state.patientConditions.filter(record => record.patientId === patientId && record.status === 'active');
export const getPatientMedications = (state, patientId) => state.patientMedications.filter(record => record.patientId === patientId && record.status === 'current');

// Returns every active state for each tooth; it intentionally never collapses a tooth to one value.
export const getCurrentDentalChartState = (state, patientId) => Object.values(getDentalChartForPatient(state, patientId).filter(entry => entry.status === 'active').reduce((grouped, entry) => {
  (grouped[entry.toothCode] ||= { toothCode: entry.toothCode, entries: [] }).entries.push(entry);
  return grouped;
}, {}));

const planItems = (state, planId) => getTreatmentPlanItems(state, planId);
export const calculateTreatmentPlanProposedTotal = (state, planId) => planItems(state, planId).reduce((total, item) => total + item.lineTotal, 0);
export const calculateTreatmentPlanAcceptedTotal = (state, planId) => planItems(state, planId).filter(item => item.acceptanceStatus === 'ACCEPTED').reduce((total, item) => total + item.lineTotal, 0);
export const calculateTreatmentPlanCompletedValue = (state, planId) => planItems(state, planId).filter(item => item.progressStatus === 'COMPLETED').reduce((total, item) => total + item.lineTotal, 0);
