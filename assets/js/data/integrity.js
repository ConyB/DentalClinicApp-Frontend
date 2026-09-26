import { APPOINTMENT_STATUSES, QUEUE_STATUSES, canTransitionAppointment, getActiveQueueEntries, getAppointmentById, getAppointmentStatusHistory, hasAppointmentConflict } from './scheduling.js';
import { calculateTreatmentPlanAcceptedTotal, calculateTreatmentPlanCompletedValue, calculateTreatmentPlanProposedTotal, getDentalChartEntrySurfaces, getDentalChartForTooth, getEncounterById, getTreatmentPlanById, getTreatmentPlanItems } from './clinical.js';
import { calculateInvoiceBalance, calculateInvoicePaid, calculateInvoiceTotal, deriveInvoiceStatus, getPaymentById, getPaymentsForInvoice, getReceiptById, getReceiptsForPayment, isRecallOverdue } from './finance.js';
import { validateTreatmentPlanRuntime } from './treatment-plan-workflows.js';
import { validatePrescriptionRuntime } from './prescription-workflows.js';
import { validateClinicalDocumentRuntime } from './document-workflows.js';
import { validateInvoiceRuntime } from './invoice-workflows.js';
import { validatePaymentRuntime } from './payment-workflows.js';

const uniqueErrors = (records, key, label) => records.filter((record, index) => records.findIndex(candidate => candidate[key] === record[key]) !== index).map(record => `Duplicate ${label}: ${record[key]}`);
const ids = records => new Set(records.map(record => record.id));

export const validatePhase5AData = state => {
  const errors = [];
  if (state.schemaVersion < 1) errors.push('Missing demo schema version.');
  if (state.referenceDate !== '2026-09-21') errors.push('Unexpected canonical reference date.');
  if (state.users.length !== 6 || state.patients.length !== 30 || state.toothDefinitions.length !== 52) errors.push('Phase 5A core record count mismatch.');
  if (state.dentistProfiles.length !== 2 || state.services.length !== 12 || state.paymentMethods.length !== 5 || state.appointmentTypes.length !== 9 || state.recallTypes.length !== 7) errors.push('Phase 5A master-data count mismatch.');
  return errors;
};

export const validateSchedulingData = state => {
  const errors = [];
  const patientIds = ids(state.patients), userIds = ids(state.users), dentistIds = new Set(state.users.filter(user => user.roleCode === 'dentist').map(user => user.id));
  const branchIds = ids(state.branches), typeIds = ids(state.appointmentTypes), appointmentIds = ids(state.appointments);
  errors.push(...uniqueErrors(state.appointments, 'id', 'appointment ID'), ...uniqueErrors(state.appointments, 'appointmentNumber', 'appointment number'), ...uniqueErrors(state.queueEntries, 'id', 'queue entry ID'), ...uniqueErrors(state.appointmentStatusHistory, 'id', 'status history ID'), ...uniqueErrors(state.appointmentContactLogs, 'id', 'contact log ID'));
  state.appointments.forEach(appointment => {
    if (!patientIds.has(appointment.patientId)) errors.push(`Appointment ${appointment.id} has an invalid patient.`);
    if (!dentistIds.has(appointment.dentistUserId)) errors.push(`Appointment ${appointment.id} has an invalid Dentist.`);
    if (!typeIds.has(appointment.appointmentTypeId)) errors.push(`Appointment ${appointment.id} has an invalid type.`);
    if (!branchIds.has(appointment.branchId)) errors.push(`Appointment ${appointment.id} has an invalid branch.`);
    if (!userIds.has(appointment.bookedByUserId)) errors.push(`Appointment ${appointment.id} has an invalid booking user.`);
    if (!APPOINTMENT_STATUSES.includes(appointment.status)) errors.push(`Appointment ${appointment.id} has an invalid status.`);
    if (Date.parse(appointment.endDateTime) <= Date.parse(appointment.startDateTime)) errors.push(`Appointment ${appointment.id} has an invalid duration.`);
    if (appointment.rescheduledFromAppointmentId) { const original = getAppointmentById(state, appointment.rescheduledFromAppointmentId); if (!original || original.status !== 'RESCHEDULED') errors.push(`Appointment ${appointment.id} has a broken reschedule link.`); }
    if (hasAppointmentConflict(state, { ...appointment, excludeAppointmentId: appointment.id })) errors.push(`Appointment ${appointment.id} conflicts with a Dentist schedule.`);
  });
  state.appointmentStatusHistory.forEach(history => {
    if (!appointmentIds.has(history.appointmentId) || !userIds.has(history.changedByUserId)) errors.push(`Status history ${history.id} has a broken reference.`);
    if (!APPOINTMENT_STATUSES.includes(history.toStatus) || (history.fromStatus && (!APPOINTMENT_STATUSES.includes(history.fromStatus) || !canTransitionAppointment(history.fromStatus, history.toStatus)))) errors.push(`Status history ${history.id} has an invalid transition.`);
  });
  state.appointments.forEach(appointment => { const history = getAppointmentStatusHistory(state, appointment.id); if (history.length && history[history.length - 1].toStatus !== appointment.status) errors.push(`Appointment ${appointment.id} does not match its status history.`); });
  state.appointmentContactLogs.forEach(log => { if (!appointmentIds.has(log.appointmentId) || !userIds.has(log.contactedByUserId)) errors.push(`Contact log ${log.id} has a broken reference.`); });
  errors.push(...uniqueErrors(state.queueEntries, 'appointmentId', 'queue appointment reference'));
  state.queueEntries.forEach(entry => {
    const appointment = getAppointmentById(state, entry.appointmentId);
    if (!appointment || !patientIds.has(entry.patientId) || !dentistIds.has(entry.dentistUserId) || !branchIds.has(entry.branchId)) errors.push(`Queue entry ${entry.id} has a broken reference.`);
    if (!QUEUE_STATUSES.includes(entry.status)) errors.push(`Queue entry ${entry.id} has an invalid status.`);
    if (appointment && (entry.patientId !== appointment.patientId || entry.dentistUserId !== appointment.dentistUserId || entry.branchId !== appointment.branchId || entry.status !== appointment.status)) errors.push(`Queue entry ${entry.id} does not match its appointment.`);
    if (entry.status === 'IN_TREATMENT' && (!entry.treatmentStartedAt || Number.isNaN(Date.parse(entry.treatmentStartedAt)) || Date.parse(entry.treatmentStartedAt) < Date.parse(entry.arrivalAt))) errors.push(`Queue entry ${entry.id} has an invalid treatment-start timestamp.`);
  });
  getActiveQueueEntries(state).forEach(entry => { const appointment = getAppointmentById(state, entry.appointmentId); if (['COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'].includes(appointment.status)) errors.push(`Inactive appointment ${appointment.id} appears in the active queue.`); });
  return errors;
};

const allowedChartEntryTypes = new Set(['CONDITION', 'EXISTING_TREATMENT', 'PLANNED_TREATMENT', 'COMPLETED_TREATMENT', 'OBSERVATION']);
const allowedEncounterStatuses = new Set(['DRAFT', 'IN_PROGRESS', 'COMPLETED']);
const allowedPlanStatuses = new Set(['DRAFT', 'PROPOSED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const allowedAcceptanceStatuses = new Set(['PROPOSED', 'ACCEPTED', 'DECLINED']);
const allowedProgressStatuses = new Set(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

export const validateClinicalData = state => {
  const errors = [];
  const patientIds = ids(state.patients), userIds = ids(state.users), dentistIds = new Set(state.users.filter(user => user.roleCode === 'dentist').map(user => user.id));
  const appointmentIds = ids(state.appointments), toothByCode = new Map(state.toothDefinitions.map(tooth => [tooth.code, tooth]));
  const serviceIds = ids(state.services), encounterIds = ids(state.clinicalEncounters), planIds = ids(state.treatmentPlans), planItemIds = ids(state.treatmentPlanItems), procedureIds = ids(state.proceduresPerformed), prescriptionIds = ids(state.prescriptions), chartEntryIds = ids(state.dentalChartEntries), dentalConditionCodes = new Set(state.dentalConditions.map(condition => condition.code));
  const surfaceAllowed = (toothCode, surfaceCode) => { const tooth = toothByCode.get(toothCode); if (!tooth) return false; return state.toothSurfaceDefinitions[tooth.isPosterior ? 'posterior' : 'anterior'].some(surface => surface.code === surfaceCode); };
  const checkSurfaces = (records, parentRecords, parentIdKey, toothCodeFor, label) => records.forEach(record => { const parent = parentRecords.find(candidate => candidate.id === record[parentIdKey]); if (!parent) errors.push(`${label} ${record.id} has an invalid parent.`); else if (!surfaceAllowed(toothCodeFor(parent), record.surfaceCode)) errors.push(`${label} ${record.id} has an invalid surface.`); });
  errors.push(...uniqueErrors(state.clinicalEncounters, 'id', 'encounter ID'), ...uniqueErrors(state.dentalChartEntries, 'id', 'chart entry ID'), ...uniqueErrors(state.dentalChartEntrySurfaces, 'id', 'chart surface ID'), ...uniqueErrors(state.treatmentPlans, 'id', 'treatment plan ID'), ...uniqueErrors(state.treatmentPlanItems, 'id', 'treatment item ID'), ...uniqueErrors(state.proceduresPerformed, 'id', 'procedure ID'), ...uniqueErrors(state.prescriptions, 'id', 'prescription ID'), ...uniqueErrors(state.patientDocuments, 'id', 'document ID'));
  errors.push(...uniqueErrors(state.clinicalEncounters.filter(encounter => encounter.appointmentId), 'appointmentId', 'encounter appointment reference'));
  state.clinicalEncounters.forEach(encounter => {
    if (!patientIds.has(encounter.patientId) || !dentistIds.has(encounter.dentistUserId)) errors.push(`Encounter ${encounter.id} has a broken patient or Dentist reference.`);
    if (encounter.appointmentId) { const appointment = getAppointmentById(state, encounter.appointmentId); if (!appointment || appointment.patientId !== encounter.patientId || appointment.dentistUserId !== encounter.dentistUserId) errors.push(`Encounter ${encounter.id} has a broken appointment link.`); }
    if (!allowedEncounterStatuses.has(encounter.status)) errors.push(`Encounter ${encounter.id} has an invalid status.`);
    if (encounter.status === 'COMPLETED' && (!encounter.completedAt || Number.isNaN(Date.parse(encounter.completedAt)) || Date.parse(encounter.completedAt) < Date.parse(encounter.createdAt))) errors.push(`Encounter ${encounter.id} has an invalid completion timestamp.`);
    if (encounter.completedByUserId && !userIds.has(encounter.completedByUserId)) errors.push(`Encounter ${encounter.id} has an invalid completion actor.`);
  });
  state.encounterFindings.forEach(finding => { if (!encounterIds.has(finding.encounterId) || !userIds.has(finding.recordedByUserId) || (finding.toothCode && !toothByCode.has(finding.toothCode))) errors.push(`Finding ${finding.id} has a broken reference.`); });
  state.encounterDiagnoses.forEach(diagnosis => { if (!encounterIds.has(diagnosis.encounterId) || !userIds.has(diagnosis.recordedByUserId)) errors.push(`Diagnosis ${diagnosis.id} has a broken reference.`); });
  state.dentalChartEntries.forEach(entry => {
    if (!patientIds.has(entry.patientId) || !toothByCode.has(entry.toothCode) || !userIds.has(entry.recordedByUserId) || !allowedChartEntryTypes.has(entry.entryType) || (entry.entryType !== 'PLANNED_TREATMENT' && !dentalConditionCodes.has(entry.conceptCode))) errors.push(`Chart entry ${entry.id} has a broken reference or type.`);
    if (entry.encounterId && (!encounterIds.has(entry.encounterId) || getEncounterById(state, entry.encounterId).patientId !== entry.patientId)) errors.push(`Chart entry ${entry.id} has a broken encounter link.`);
    if (entry.treatmentPlanId && (!planIds.has(entry.treatmentPlanId) || getTreatmentPlanById(state, entry.treatmentPlanId).patientId !== entry.patientId)) errors.push(`Chart entry ${entry.id} has a broken treatment plan link.`);
    if (entry.treatmentPlanItemId && !planItemIds.has(entry.treatmentPlanItemId)) errors.push(`Chart entry ${entry.id} has a broken treatment item link.`);
    if (entry.procedureId && !procedureIds.has(entry.procedureId)) errors.push(`Chart entry ${entry.id} has a broken procedure link.`);
  });
  checkSurfaces(state.dentalChartEntrySurfaces, state.dentalChartEntries, 'dentalChartEntryId', entry => entry.toothCode, 'Chart surface');
  state.treatmentPlans.forEach(plan => { if (!patientIds.has(plan.patientId) || !dentistIds.has(plan.dentistUserId) || !allowedPlanStatuses.has(plan.status)) errors.push(`Treatment plan ${plan.id} has a broken reference or status.`); });
  state.treatmentPlanItems.forEach(item => { if (!planIds.has(item.treatmentPlanId) || !serviceIds.has(item.serviceId) || (item.toothCode && !toothByCode.has(item.toothCode)) || !allowedAcceptanceStatuses.has(item.acceptanceStatus) || !allowedProgressStatuses.has(item.progressStatus) || item.lineTotal !== item.unitPrice * item.quantity) errors.push(`Treatment item ${item.id} is invalid.`); });
  checkSurfaces(state.treatmentPlanItemSurfaces, state.treatmentPlanItems, 'treatmentPlanItemId', item => item.toothCode, 'Treatment surface');
  state.treatmentPlans.forEach(plan => { if (calculateTreatmentPlanProposedTotal(state, plan.id) !== plan.proposedTotal || calculateTreatmentPlanAcceptedTotal(state, plan.id) !== plan.acceptedTotal || calculateTreatmentPlanCompletedValue(state, plan.id) !== plan.completedTotal) errors.push(`Treatment plan ${plan.id} totals do not reconcile.`); });
  state.proceduresPerformed.forEach(procedure => { const item = procedure.treatmentPlanItemId && state.treatmentPlanItems.find(candidate => candidate.id === procedure.treatmentPlanItemId), plan = item && getTreatmentPlanById(state, item.treatmentPlanId); if (!patientIds.has(procedure.patientId) || !dentistIds.has(procedure.dentistUserId) || !serviceIds.has(procedure.serviceId) || procedure.status !== 'COMPLETED' || !Number.isFinite(procedure.amountSnapshot) || Number.isNaN(Date.parse(procedure.performedAt)) || (procedure.toothCode && !toothByCode.has(procedure.toothCode)) || (procedure.encounterId && (!encounterIds.has(procedure.encounterId) || getEncounterById(state, procedure.encounterId).patientId !== procedure.patientId)) || (procedure.treatmentPlanItemId && (!planItemIds.has(procedure.treatmentPlanItemId) || !plan || plan.patientId !== procedure.patientId || item.serviceId !== procedure.serviceId || item.toothCode !== procedure.toothCode || item.progressStatus !== 'COMPLETED'))) errors.push(`Procedure ${procedure.id} has a broken reference.`); });
  checkSurfaces(state.procedureSurfaces, state.proceduresPerformed, 'procedureId', procedure => procedure.toothCode, 'Procedure surface');
  state.prescriptions.forEach(prescription => { if (!patientIds.has(prescription.patientId) || !dentistIds.has(prescription.dentistUserId) || (prescription.encounterId && !encounterIds.has(prescription.encounterId))) errors.push(`Prescription ${prescription.id} has a broken reference.`); });
  state.prescriptionItems.forEach(item => { if (!prescriptionIds.has(item.prescriptionId)) errors.push(`Prescription item ${item.id} has a broken prescription reference.`); });
  state.patientDocuments.forEach(document => { if (!patientIds.has(document.patientId) || !userIds.has(document.uploadedByUserId) || (document.encounterId && (!encounterIds.has(document.encounterId) || getEncounterById(state, document.encounterId).patientId !== document.patientId))) errors.push(`Document ${document.id} has a broken reference.`); });
  const chartHas = (patientId, toothCode, label) => getDentalChartForTooth(state, patientId, toothCode).some(entry => entry.label === label);
  const surfaceHas = (entryId, surfaceCode) => getDentalChartEntrySurfaces(state, entryId).some(surface => surface.surfaceCode === surfaceCode);
  if (!getEncounterById(state, 'ENC-000201') || !chartHas('P001', '26', 'Caries') || !surfaceHas('CHART-002', 'O') || !getTreatmentPlanById(state, 'TP-000301')) errors.push('Amina clinical story is incomplete.');
  if (!chartHas('P005', '21', 'Fractured') || !getTreatmentPlanById(state, 'TP-000302')) errors.push('Esther clinical story is inconsistent.');
  if (!chartHas('P004', '46', 'Extracted') || !state.proceduresPerformed.some(procedure => procedure.id === 'PROC-000402' && procedure.treatmentPlanItemId === 'TPI-303-01')) errors.push('Samuel clinical story is incomplete.');
  if (!chartHas('P002', '36', 'Root Canal Treated') || !chartHas('P002', '36', 'Crown')) errors.push('Peter clinical story is incomplete.');
  if (!chartHas('P013', '75', 'Caries') || !surfaceHas('CHART-028', 'O') || !getTreatmentPlanById(state, 'TP-000304')) errors.push('Mercy clinical story is inconsistent.');
  const expectedProcedureCharts = { 'PROC-000402': 'Extracted', 'PROC-000403': 'Root Canal Treated', 'PROC-000404': 'Crown' };
  Object.entries(expectedProcedureCharts).forEach(([procedureId, label]) => { const procedure = state.proceduresPerformed.find(candidate => candidate.id === procedureId); if (!procedure || !chartHas(procedure.patientId, procedure.toothCode, label)) errors.push(`Procedure ${procedureId} lacks matching chart history.`); });
  return errors;
};

export const validateFinanceRecallAuditData = state => {
  const errors = [];
  const patientIds = ids(state.patients), userIds = ids(state.users), branchIds = ids(state.branches), invoiceIds = ids(state.invoices), serviceIds = ids(state.services), procedureIds = ids(state.proceduresPerformed), prescriptionIds = ids(state.prescriptions), planIds = ids(state.treatmentPlans), planItemIds = ids(state.treatmentPlanItems), paymentIds = ids(state.payments), recallTypeIds = ids(state.recallTypes), encounterIds = ids(state.clinicalEncounters), appointmentIds = ids(state.appointments), paymentMethodCodes = new Set(state.paymentMethods.map(method => method.code));
  errors.push(...uniqueErrors(state.invoices, 'id', 'invoice ID'), ...uniqueErrors(state.invoices, 'invoiceNumber', 'invoice number'), ...uniqueErrors(state.invoiceItems, 'id', 'invoice item ID'), ...uniqueErrors(state.payments, 'id', 'payment ID'), ...uniqueErrors(state.payments, 'paymentNumber', 'payment number'), ...uniqueErrors(state.receipts, 'id', 'receipt ID'), ...uniqueErrors(state.receipts, 'receiptNumber', 'receipt number'), ...uniqueErrors(state.recalls, 'id', 'recall ID'), ...uniqueErrors(state.recalls, 'recallNumber', 'recall number'), ...uniqueErrors(state.auditLogs, 'id', 'audit ID'));
  state.invoices.forEach(invoice => { if (!patientIds.has(invoice.patientId) || !branchIds.has(invoice.branchId) || !userIds.has(invoice.createdByUserId) || !['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'].includes(invoice.status)) errors.push(`Invoice ${invoice.id} has a broken reference or status.`); if (calculateInvoiceTotal(state, invoice.id) !== invoice.total || calculateInvoicePaid(state, invoice.id) !== invoice.paid || calculateInvoiceBalance(state, invoice.id) !== invoice.balance || invoice.balance < 0 || deriveInvoiceStatus(state, invoice.id) !== invoice.status) errors.push(`Invoice ${invoice.id} does not reconcile.`); });
  state.invoiceItems.forEach(item => { const invoice = state.invoices.find(candidate => candidate.id === item.invoiceId); if (!invoice || !serviceIds.has(item.serviceId) || item.lineTotal !== item.quantity * item.unitPrice) errors.push(`Invoice item ${item.id} is invalid.`); if (item.procedureId) { const procedure = state.proceduresPerformed.find(candidate => candidate.id === item.procedureId); if (!procedure || procedure.patientId !== invoice?.patientId || procedure.serviceId !== item.serviceId) errors.push(`Invoice item ${item.id} has a broken procedure link.`); } if (item.treatmentPlanItemId && !planItemIds.has(item.treatmentPlanItemId)) errors.push(`Invoice item ${item.id} has a broken treatment-item link.`); });
  state.payments.forEach(payment => { const invoice = state.invoices.find(candidate => candidate.id === payment.invoiceId); if (!invoice || !patientIds.has(payment.patientId) || payment.patientId !== invoice.patientId || !branchIds.has(payment.branchId) || !userIds.has(payment.receivedByUserId) || !paymentMethodCodes.has(payment.paymentMethodCode) || !['POSTED', 'VOIDED'].includes(payment.status) || (payment.status === 'POSTED' && payment.amount <= 0)) errors.push(`Payment ${payment.id} is invalid.`); });
  state.payments.filter(payment => payment.status === 'POSTED').forEach(payment => { if (getReceiptsForPayment(state, payment.id).length !== 1) errors.push(`Posted payment ${payment.id} must have exactly one receipt.`); });
  state.receipts.forEach(receipt => { const payment = getPaymentById(state, receipt.paymentId); if (!payment || !invoiceIds.has(receipt.invoiceId) || !patientIds.has(receipt.patientId) || !userIds.has(receipt.issuedByUserId) || receipt.invoiceId !== payment?.invoiceId || receipt.patientId !== payment?.patientId || receipt.amount !== payment?.amount) errors.push(`Receipt ${receipt.id} is invalid.`); });
  state.recalls.forEach(recall => { if (!patientIds.has(recall.patientId) || !recallTypeIds.has(recall.recallTypeId) || !userIds.has(recall.dentistUserId) || !userIds.has(recall.createdByUserId) || !['UPCOMING', 'DUE', 'CONTACTED', 'OVERDUE', 'SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(recall.status) || Number.isNaN(Date.parse(`${recall.dueDate}T00:00:00+03:00`))) errors.push(`Recall ${recall.id} is invalid.`); if (recall.sourceEncounterId && (!encounterIds.has(recall.sourceEncounterId) || getEncounterById(state, recall.sourceEncounterId).patientId !== recall.patientId)) errors.push(`Recall ${recall.id} has a broken encounter link.`); if (recall.status === 'SCHEDULED') { const appointment = state.appointments.find(candidate => candidate.id === recall.scheduledAppointmentId); if (!appointment || appointment.patientId !== recall.patientId) errors.push(`Recall ${recall.id} has a broken scheduled appointment link.`); } else if (recall.scheduledAppointmentId) errors.push(`Recall ${recall.id} has an appointment link outside Scheduled status.`); if (recall.status === 'OVERDUE' && !isRecallOverdue(recall)) errors.push(`Recall ${recall.id} is not overdue at the canonical date.`); });
  const entityCollections = { USER: userIds, SETTINGS: new Set([state.clinicSettings.id]), APPOINTMENT: appointmentIds, ENCOUNTER: encounterIds, INVOICE: invoiceIds, PAYMENT: paymentIds, RECEIPT: ids(state.receipts), RECALL: ids(state.recalls), DENTAL_CHART_ENTRY: ids(state.dentalChartEntries), TREATMENT_PLAN: planIds, TREATMENT_PLAN_ITEM: planItemIds, PROCEDURE: procedureIds, PRESCRIPTION: prescriptionIds, PATIENT_DOCUMENT: ids(state.patientDocuments) }; const actionCodes = new Set(['USER_CREATED', 'USER_UPDATED', 'PROFILE_UPDATED', 'PASSWORD_CHANGED', 'SETTINGS_UPDATED', 'APPOINTMENT_CREATED', 'APPOINTMENT_UPDATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'PATIENT_CHECKED_IN', 'TREATMENT_STARTED', 'ENCOUNTER_STARTED', 'ENCOUNTER_UPDATED', 'ENCOUNTER_COMPLETED', 'INVOICE_CREATED', 'PAYMENT_RECORDED', 'RECEIPT_ISSUED', 'RECALL_CREATED', 'RECALL_UPDATED', 'RECALL_CONTACTED', 'RECALL_SCHEDULED', 'RECALL_COMPLETED', 'RECALL_CANCELLED', 'DENTAL_CHART_ENTRY_CREATED', 'DENTAL_CHART_ENTRY_UPDATED_DRAFT', 'TREATMENT_PLAN_CREATED', 'TREATMENT_PLAN_UPDATED', 'TREATMENT_PLAN_ITEM_ADDED', 'TREATMENT_PLAN_ITEM_UPDATED', 'TREATMENT_PLAN_ITEM_ACCEPTED', 'TREATMENT_PLAN_ITEM_DECLINED', 'PROCEDURE_RECORDED', 'PRESCRIPTION_CREATED', 'CLINICAL_DOCUMENT_CREATED']);
  state.auditLogs.forEach(event => { if (!userIds.has(event.actorUserId) || !branchIds.has(event.branchId) || !actionCodes.has(event.actionCode) || !entityCollections[event.entityType]?.has(event.entityId) || Number.isNaN(Date.parse(event.occurredAt))) errors.push(`Audit event ${event.id} is invalid.`); });
  const linkedProcedureItems = new Set(state.proceduresPerformed.filter(procedure => procedure.treatmentPlanItemId).map(procedure => procedure.treatmentPlanItemId));
  if ([...linkedProcedureItems].some(itemId => state.proceduresPerformed.filter(procedure => procedure.treatmentPlanItemId === itemId).length > 1)) errors.push('A treatment plan item has more than one completed procedure.');
  return errors;
};

export const validateGlobalData = state => {
  const errors = [];
  const patientIds = ids(state.patients), userIds = ids(state.users), roleIds = ids(state.roles), branchIds = ids(state.branches);
  const duplicateCollections = [
    ['users', state.users], ['dentist profiles', state.dentistProfiles], ['patients', state.patients], ['guardians', state.patientGuardians], ['allergies', state.patientAllergies], ['medications', state.patientMedications], ['conditions', state.patientConditions], ['medical profiles', state.patientMedicalProfiles], ['findings', state.encounterFindings], ['diagnoses', state.encounterDiagnoses], ['prescription items', state.prescriptionItems], ['documents', state.patientDocuments]
  ];
  duplicateCollections.forEach(([label, records]) => errors.push(...uniqueErrors(records, 'id', label)));
  [['patient number', state.patients, 'patientNumber'], ['encounter number', state.clinicalEncounters, 'encounterNumber'], ['treatment plan number', state.treatmentPlans, 'treatmentPlanNumber'], ['procedure number', state.proceduresPerformed, 'procedureNumber'], ['prescription number', state.prescriptions, 'prescriptionNumber']].forEach(([label, records, key]) => errors.push(...uniqueErrors(records, key, label)));
  if (state.organization.id !== 'ORG-PSDC' || state.organization.code !== 'PSDC' || state.organization.currency !== 'UGX' || state.organization.timezone !== 'Africa/Kampala' || state.branches.filter(branch => branch.isMain).length !== 1) errors.push('Organisation or main branch context is invalid.');
  state.users.forEach(user => { if (!roleIds.has(user.roleId) || !state.roles.some(role => role.id === user.roleId && role.code === user.roleCode) || !branchIds.has(user.branchId) || user.organizationId !== state.organization.id || !user.fullName?.trim() || !user.email?.includes('@') || !['active', 'inactive'].includes(user.status)) errors.push(`User ${user.id} has a broken core reference.`); });
  errors.push(...uniqueErrors(state.users.map(user => ({ ...user, email: user.email.toLowerCase() })), 'email', 'user email'));
  state.dentistProfiles.forEach(profile => { const user = state.users.find(candidate => candidate.id === profile.userId); if (!user || user.roleCode !== 'dentist') errors.push(`Dentist profile ${profile.id} is invalid.`); });
  state.patients.forEach(patient => { if (!branchIds.has(patient.registrationBranchId) || !userIds.has(patient.registeredBy) || patient.organizationId !== state.organization.id) errors.push(`Patient ${patient.id} has a broken core reference.`); });
  [state.patientGuardians, state.patientAllergies, state.patientMedications, state.patientConditions, state.patientMedicalProfiles, state.medicalHistoryReviews].forEach(records => records.forEach(record => { if (!patientIds.has(record.patientId)) errors.push(`Patient relationship ${record.id} has an invalid patient.`); }));
  const scopedCollections = [state.appointments, state.queueEntries, state.clinicalEncounters, state.treatmentPlans, state.proceduresPerformed, state.invoices, state.payments, state.receipts, state.recalls, state.auditLogs];
  scopedCollections.flat().forEach(record => { if (record.organizationId && record.organizationId !== state.organization.id) errors.push(`Record ${record.id} has an invalid organisation.`); if (record.branchId && !branchIds.has(record.branchId)) errors.push(`Record ${record.id} has an invalid branch.`); });
  return errors;
};

export const validateCanonicalDemoState = state => {
  const errors = [...validatePhase5AData(state), ...validateSchedulingData(state), ...validateClinicalData(state), ...validateFinanceRecallAuditData(state), ...validateGlobalData(state), ...validateTreatmentPlanRuntime(state).errors, ...validatePrescriptionRuntime(state).errors, ...validateClinicalDocumentRuntime(state).errors, ...validateInvoiceRuntime(state).errors, ...validatePaymentRuntime(state).errors];
  return { valid: errors.length === 0, errors };
};

// Runtime records may validly extend the frozen canonical record counts.
export const validateRuntimeState = state => {
  const errors = [...validateSchedulingData(state), ...validateClinicalData(state), ...validateFinanceRecallAuditData(state), ...validateGlobalData(state), ...validateTreatmentPlanRuntime(state).errors, ...validatePrescriptionRuntime(state).errors, ...validateClinicalDocumentRuntime(state).errors, ...validateInvoiceRuntime(state).errors, ...validatePaymentRuntime(state).errors];
  return { valid: errors.length === 0, errors };
};

export const validateDemoData = state => {
  const { valid, errors } = validateCanonicalDemoState(state);
  return {
    valid,
    errors,
    warnings: [],
    summary: {
      patients: state.patients.length,
      users: state.users.length,
      fdiTeeth: state.toothDefinitions.length,
      todayAppointments: state.appointments.filter(appointment => appointment.startDateTime.slice(0, 10) === state.referenceDate).length,
      activeQueue: state.queueEntries.filter(entry => ['WAITING', 'IN_TREATMENT'].includes(entry.status)).length,
      clinicalEncounters: state.clinicalEncounters.length,
      treatmentPlans: state.treatmentPlans.length,
      procedures: state.proceduresPerformed.length,
      invoices: state.invoices.length,
      payments: state.payments.length,
      receipts: state.receipts.length,
      recalls: state.recalls.length
    }
  };
};
