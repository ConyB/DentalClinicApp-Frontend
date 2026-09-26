import { DEMO_REFERENCE_DATE, DEMO_SCHEMA_VERSION, branches, clinicSettings, organization, roles } from './clinic.js';
import { dentalConditions, toothDefinitions, toothSurfaceDefinitions } from './dental-reference.js';
import { appointmentTypes, paymentMethods, recallTypes, serviceCategories, services } from './reference-data.js';
import { medicalHistoryReviews, patientAllergies, patientConditions, patientGuardians, patientMedicalProfiles, patientMedications, patients } from './patients.js';
import { appointmentContactLogs, appointments, appointmentStatusHistory, queueEntries } from './scheduling-data.js';
import { clinicalEncounters, dentalChartEntries, dentalChartEntrySurfaces, encounterDiagnoses, encounterFindings, patientDocuments, prescriptionItems, prescriptions, procedureSurfaces, proceduresPerformed, treatmentPlanItems, treatmentPlanItemSurfaces, treatmentPlans } from './clinical-data.js';
import { auditLogs, invoiceItems, invoices, payments, receipts, recalls } from './finance-data.js';
import { authCredentials, dentistProfiles, users } from './users.js';

// Phase 5 canonical demo dataset. Cross-domain integrity audited before Phase 6.
// Do not duplicate or casually alter canonical fixtures.
const canonicalSeed = {
  schemaVersion: DEMO_SCHEMA_VERSION,
  referenceDate: DEMO_REFERENCE_DATE,
  organization,
  branches,
  roles,
  users,
  demoCredentials: authCredentials,
  dentistProfiles,
  clinicSettings,
  appointmentTypes,
  paymentMethods,
  recallTypes,
  serviceCategories,
  services,
  toothDefinitions,
  toothSurfaceDefinitions,
  dentalConditions,
  patients,
  patientGuardians,
  patientAllergies,
  patientMedications,
  patientConditions,
  patientMedicalProfiles,
  medicalHistoryReviews,
  appointments,
  appointmentStatusHistory,
  appointmentContactLogs,
  queueEntries,
  clinicalEncounters,
  encounterFindings,
  encounterDiagnoses,
  dentalChartEntries,
  dentalChartEntrySurfaces,
  treatmentPlans,
  treatmentPlanItems,
  treatmentPlanItemSurfaces,
  proceduresPerformed,
  procedureSurfaces,
  prescriptions,
  prescriptionItems,
  patientDocuments,
  invoices,
  invoiceItems,
  payments,
  receipts,
  recalls,
  auditLogs
};

// Every application lifecycle receives an independent, mutable seed copy.
export const createCanonicalDemoState = () => structuredClone(canonicalSeed);
export const createDemoState = createCanonicalDemoState;
