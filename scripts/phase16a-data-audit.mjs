import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { getOutstandingBalance, getTodayCollections, getTotalPostedPayments } from '../assets/js/data/finance.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';
import { createRecall, createRecallAppointment, linkRecallAppointment } from '../assets/js/data/recall-workflows.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const state = createCanonicalDemoState();
const canonical = validateCanonicalDemoState(state); assert(canonical.valid, canonical.errors.join(' | '));
const actor = { role: 'Receptionist', userId: 'U004' };
const before = JSON.stringify([state.appointments, state.queueEntries, state.clinicalEncounters, state.invoices, state.payments, state.receipts]);
const invalid = createRecall({ state, values: { patientId: 'P999', recallTypeId: 'RECALL-TYPE-CUSTOM_FOLLOW_UP', dentistUserId: 'U002', dueDate: '2026-10-01', notes: 'x' }, actor });
assert(Object.keys(invalid.errors).length && state.recalls.length === 5, 'Invalid recall did not fail atomically.');
const created = createRecall({ state, values: { patientId: 'P013', recallTypeId: 'RECALL-TYPE-CUSTOM_FOLLOW_UP', dentistUserId: 'U002', dueDate: '2026-10-01', notes: '<b>Review</b>' }, actor });
assert(created.recall.id === 'REC-000906' && created.recall.status === 'UPCOMING' && state.auditLogs.filter(item => item.entityId === created.recall.id && item.actionCode === 'RECALL_CREATED').length === 1, 'Runtime recall creation or audit is invalid.');
let mismatchBlocked = false; try { linkRecallAppointment({ state, recallId: created.recall.id, appointmentId: 'APT-000104', actor }); } catch { mismatchBlocked = true; }
assert(mismatchBlocked && !created.recall.scheduledAppointmentId, 'Cross-patient appointment link was not rejected atomically.');
const linked = linkRecallAppointment({ state, recallId: created.recall.id, appointmentId: 'APT-000107', actor });
assert(linked.recall.status === 'SCHEDULED' && linked.recall.scheduledAppointmentId === 'APT-000107', 'Valid same-patient appointment link failed.');
const handoffState = createCanonicalDemoState();
const handoffRecall = createRecall({ state: handoffState, values: { patientId: 'P013', recallTypeId: 'RECALL-TYPE-CUSTOM_FOLLOW_UP', dentistUserId: 'U002', dueDate: '2026-10-02' }, actor }).recall;
const handoff = createRecallAppointment({ state: handoffState, recallId: handoffRecall.id, values: { patientId: 'P013', dentistUserId: 'U002', appointmentTypeId: 'APPOINTMENT-TYPE-REVIEW', date: '2026-09-21', time: '15:00', reason: 'Custom Follow-Up', notes: null }, actor });
assert(handoff.appointment && handoff.recall.scheduledAppointmentId === handoff.appointment.id && handoff.recall.status === 'SCHEDULED', 'Recall-to-appointment handoff did not remain coherent.');
assert(JSON.stringify([state.appointments, state.queueEntries, state.clinicalEncounters, state.invoices, state.payments, state.receipts]) === before, 'Recall action changed another domain.');
const runtime = validateRuntimeState(state); assert(runtime.valid, runtime.errors.join(' | '));
assert(getTotalPostedPayments(state) === 2360000 && getOutstandingBalance(state) === 420000 && getTodayCollections(state) === 360000, 'Recall actions changed finance metrics.');
console.log(JSON.stringify({ status: 'pass', runtimeRecall: created.recall.id, linkedAppointment: linked.appointment.id, integrity: 'pass' }, null, 2));
