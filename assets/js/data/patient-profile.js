import { getPatientById, getPatientAge } from './patients.js';
import { getAppointmentsForPatient } from './scheduling.js';
import { getEncountersForPatient, getTreatmentPlansForPatient } from './clinical.js';
import { getPatientFinancialSummary, getRecallsForPatient } from './finance.js';
import { permissions } from '../core/permissions.js';

const userName = (state, id) => state.users.find(user => user.id === id)?.fullName || 'Not recorded';
const branchName = (state, id) => state.branches.find(branch => branch.id === id)?.name || 'Not recorded';
const guardianFor = (state, patientId) => state.patientGuardians.find(guardian => guardian.patientId === patientId && guardian.isPrimary) || null;
export const getPatientProfileSectionAccess = role => ({
  appointments: permissions.can(role, 'patients.appointment-summary'),
  clinical: permissions.can(role, 'patients.clinical-summary'),
  'dental-chart': permissions.can(role, 'patients.clinical-summary'),
  'treatment-plans': permissions.can(role, 'patients.treatment-summary'),
  prescriptions: permissions.can(role, 'patients.clinical-summary'),
  documents: permissions.can(role, 'documents.view'),
  billing: permissions.can(role, 'patients.billing-summary'),
  recalls: permissions.can(role, 'patients.recall-summary')
});
export const getPatientProfileOverviewData = ({ state, patientId, role }) => {
  const patient = getPatientById(state, patientId); if (!patient) return null;
  const canMedical = permissions.can(role, 'patients.medical-summary');
  const canClinical = permissions.can(role, 'patients.clinical-summary');
  const canFinance = permissions.can(role, 'patients.finance-summary');
  const canBilling = permissions.can(role, 'patients.billing-summary');
  const canTreatment = permissions.can(role, 'patients.treatment-summary');
  const canAppointments = permissions.can(role, 'patients.appointment-summary');
  const canRecalls = permissions.can(role, 'patients.recall-summary');
  const receptionistMedicalSummary = role === 'Receptionist';
  return { patient, age: getPatientAge(patient, state.referenceDate), guardian: guardianFor(state, patient.id), registration: { date: patient.registeredAt, user: userName(state, patient.registeredBy), branch: branchName(state, patient.registrationBranchId) }, medical: canMedical ? { allergies: state.patientAllergies.filter(record => record.patientId === patient.id && record.status === 'active'), conditions: receptionistMedicalSummary ? [] : state.patientConditions.filter(record => record.patientId === patient.id && record.status === 'active'), medications: receptionistMedicalSummary ? [] : state.patientMedications.filter(record => record.patientId === patient.id && record.status === 'current') } : null, activity: { appointments: canAppointments ? getAppointmentsForPatient(state, patient.id).length : null, encounters: canClinical ? getEncountersForPatient(state, patient.id).length : null, treatmentPlans: canTreatment ? getTreatmentPlansForPatient(state, patient.id).length : null, recalls: canRecalls ? getRecallsForPatient(state, patient.id) : null, finance: canBilling ? getPatientFinancialSummary(state, patient.id) : null }, permissions: { canEdit: permissions.can(role, 'patients.edit'), canBook: permissions.can(role, 'appointments.create'), canClinical, canTreatment, canBilling, canFinance } };
};
