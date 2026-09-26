import { element, lucideIcon } from '../components/dom.js';
import { createBadge, createCard, createEmptyState, createKpiCard, createPageHeader } from '../components/primitives.js';
import { permissions } from '../core/permissions.js';
import { getEncountersForDentist, getTreatmentPlanItems, getTreatmentPlansForDentist } from '../data/clinical.js';
import { getOutstandingInvoices, getOverdueRecalls, getPartiallyPaidInvoices, getPaymentById, getPaymentMethodBreakdown, getPaymentsForDate, getReceiptsForDate, getReceiptsForPayment, getRecallsForDentist, getUpcomingRecalls, getPatientFinancialSummary } from '../data/finance.js';
import { getActiveQueueEntries, getAppointmentById, getAppointmentContactLogs, getQueueForDentist, getTodayAppointments } from '../data/scheduling.js';
import { getActiveQueueCount, getAppointmentStatusCounts, getDentistSchedule, getTodayAppointmentCount, getTodayCollections, getWaitingPatientCount, getInTreatmentPatientCount, getOutstandingBalance } from '../data/kpis.js';
import { getPatientById } from '../data/patients.js';
import { formatDate, formatStatus, formatTime, formatUGX } from '../utils/formatters.js';

const statusVariant = status => ({ COMPLETED: 'success', WAITING: 'warning', IN_TREATMENT: 'active', CONFIRMED: 'info', SCHEDULED: 'neutral', CANCELLED: 'danger', UPCOMING: 'info', OVERDUE: 'warning' }[status] || 'neutral');
const actionLink = ({ label, route, icon = 'dashboard' }) => element('a', { className: 'button button--secondary button--small', href: `#/${route}` }, [lucideIcon(icon), label]);
const resolveUser = (state, userId) => state.users.find(user => user.id === userId) || null;
const resolveType = (state, typeId, collection) => collection.find(type => type.id === typeId) || null;
const patientName = (state, patientId) => getPatientById(state, patientId)?.fullName || 'Unknown patient';
const serviceName = (state, serviceId) => resolveType(state, serviceId, state.services)?.name || 'Treatment';
const activePlanStatuses = new Set(['DRAFT', 'PROPOSED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'IN_PROGRESS']);

export const getAdminDashboardData = (state, session) => {
  const todayAppointments = getTodayAppointments(state);
  const activeQueue = getActiveQueueEntries(state);
  const upcomingRecalls = getUpcomingRecalls(state);
  const overdueRecalls = getOverdueRecalls(state);
  const todayPayments = getPaymentsForDate(state, state.referenceDate).filter(payment => payment.status === 'POSTED');
  return {
    greetingName: session?.name?.replace(/^Dr\.\s*/, '').split(' ')[0] || 'Grace',
    clinic: state.organization, branch: state.branches.find(branch => branch.isMain), referenceDate: state.referenceDate,
    kpis: [
      { label: "Today's Appointments", value: getTodayAppointmentCount(state), icon: 'calendar', context: `${getWaitingPatientCount(state)} waiting \u00B7 ${getInTreatmentPatientCount(state)} in treatment` },
      { label: 'Active Queue', value: getActiveQueueCount(state), icon: 'clock', context: 'Patients currently in the clinic' },
      { label: "Today's Collections", value: formatUGX(getTodayCollections(state)), icon: 'wallet', context: `${todayPayments.length} posted payment${todayPayments.length === 1 ? '' : 's'} today` },
      { label: 'Outstanding Balance', value: formatUGX(getOutstandingBalance(state)), icon: 'reports', context: 'Across open patient invoices' }
    ],
    statusCounts: getAppointmentStatusCounts(state), todayAppointments, activeQueue, upcomingRecalls, overdueRecalls, todayPayments,
    activity: [...state.auditLogs].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  };
};

const section = ({ title, subtitle, action, content, className = '' }) => createCard({ title, subtitle, actions: action, content: element('div', { className: `dashboard-section__content ${className}` }, [content]) });
const appointmentList = (state, appointments) => !appointments.length ? createEmptyState({ title: 'No appointments today', message: 'New bookings will appear here.' }) : element('div', { className: 'dashboard-list dashboard-list--appointments' }, appointments.map(appointment => {
  const type = resolveType(state, appointment.appointmentTypeId, state.appointmentTypes);
  const dentist = resolveUser(state, appointment.dentistUserId);
  return element('article', { className: 'dashboard-list__row' }, [element('time', { className: 'dashboard-list__time', text: formatTime(appointment.startDateTime) }), element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, appointment.patientId) }), element('span', { text: `${dentist?.fullName || 'Unassigned'} \u00B7 ${type?.name || 'Appointment'}` })]), createBadge({ label: formatStatus(appointment.status), variant: statusVariant(appointment.status) })]);
}));
const queueList = (state, queue) => !queue.length ? createEmptyState({ title: 'No patients currently waiting', message: 'Checked-in patients will appear here.' }) : element('div', { className: 'dashboard-list' }, queue.map(entry => {
  const dentist = resolveUser(state, entry.dentistUserId);
  return element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, entry.patientId) }), element('span', { text: `${dentist?.fullName || 'Unassigned'} \u00B7 Arrived ${formatTime(entry.arrivalAt)}` })]), createBadge({ label: formatStatus(entry.status), variant: statusVariant(entry.status) })]);
}));
const recallList = (state, recalls) => !recalls.length ? createEmptyState({ title: 'No recalls to review', message: 'Upcoming follow-ups will appear here.' }) : element('div', { className: 'dashboard-list' }, recalls.slice(0, 4).map(recall => {
  const type = resolveType(state, recall.recallTypeId, state.recallTypes);
  return element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, recall.patientId) }), element('span', { text: `${type?.name || 'Follow-up'} \u00B7 Due ${formatDate(recall.dueDate)}` })]), createBadge({ label: formatStatus(recall.status), variant: statusVariant(recall.status) })]);
}));
const paymentList = (state, payments) => !payments.length ? createEmptyState({ title: 'No recent payments', message: 'Posted payments will appear here.' }) : element('div', { className: 'dashboard-list' }, payments.map(payment => element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, payment.patientId) }), element('span', { text: `${formatStatus(payment.paymentMethodCode)} \u00B7 ${formatTime(payment.receivedAt)}` })]), element('strong', { className: 'dashboard-list__amount', text: formatUGX(payment.amount) })])));

// Dentist dashboard data is a pure, read-only composition of canonical records.
export const getDentistDashboardData = (state, userId) => {
  const schedule = getDentistSchedule(state, userId, state.referenceDate);
  const queue = getQueueForDentist(state, userId);
  const activePlans = getTreatmentPlansForDentist(state, userId).filter(plan => activePlanStatuses.has(plan.status));
  const currentQueueEntry = queue.find(entry => entry.status === 'IN_TREATMENT') || queue.find(entry => entry.status === 'WAITING') || null;
  const currentAppointment = currentQueueEntry ? state.appointments.find(appointment => appointment.id === currentQueueEntry.appointmentId) || null : schedule.find(appointment => ['CONFIRMED', 'SCHEDULED'].includes(appointment.status)) || null;
  const currentPlan = currentAppointment ? activePlans.find(plan => plan.patientId === currentAppointment.patientId) || null : null;
  const planItems = currentPlan ? getTreatmentPlanItems(state, currentPlan.id) : [];
  const encounters = getEncountersForDentist(state, userId);
  return {
    user: resolveUser(state, userId), clinic: state.organization, branch: state.branches.find(branch => branch.isMain), referenceDate: state.referenceDate,
    schedule, queue, activePlans,
    waitingCount: queue.filter(entry => entry.status === 'WAITING').length,
    inTreatmentCount: queue.filter(entry => entry.status === 'IN_TREATMENT').length,
    current: currentAppointment ? { appointment: currentAppointment, queueEntry: currentQueueEntry, plan: currentPlan, planItem: planItems.find(item => item.progressStatus === 'IN_PROGRESS') || planItems.find(item => item.progressStatus === 'PLANNED') || null } : null,
    draftEncounters: encounters.filter(encounter => ['DRAFT', 'IN_PROGRESS'].includes(encounter.status)),
    followUps: getRecallsForDentist(state, userId).filter(recall => !['COMPLETED', 'CANCELLED'].includes(recall.status)),
    recentActivity: encounters.filter(encounter => encounter.status === 'COMPLETED').sort((a, b) => (b.completedAt || b.startedAt).localeCompare(a.completedAt || a.startedAt)).slice(0, 3)
  };
};

const dentistScheduleList = (state, appointments) => !appointments.length ? createEmptyState({ title: 'No appointments today', message: 'New bookings will appear here.' }) : element('div', { className: 'dashboard-list dashboard-list--appointments' }, appointments.map(appointment => {
  const type = resolveType(state, appointment.appointmentTypeId, state.appointmentTypes);
  return element('article', { className: `dashboard-list__row${appointment.status === 'CANCELLED' ? ' dashboard-list__row--muted' : ''}` }, [element('time', { className: 'dashboard-list__time', text: formatTime(appointment.startDateTime) }), element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, appointment.patientId) }), element('span', { text: `${appointment.appointmentNumber} \u00B7 ${type?.name || 'Appointment'}` })]), createBadge({ label: formatStatus(appointment.status), variant: statusVariant(appointment.status) })]);
}));

const currentPatient = (state, current) => {
  if (!current) return createEmptyState({ title: 'No patient currently in queue', message: 'Your next clinical priority will appear here.' });
  const { appointment, queueEntry, planItem } = current;
  const patient = getPatientById(state, appointment.patientId);
  const appointmentType = resolveType(state, appointment.appointmentTypeId, state.appointmentTypes);
  const dentist = resolveUser(state, queueEntry?.dentistUserId || appointment.dentistUserId);
  const isInTreatment = queueEntry?.status === 'IN_TREATMENT';
  const isWaiting = queueEntry?.status === 'WAITING';
  const context = planItem ? `Tooth ${planItem.toothCode || '—'} ${appointmentType?.name?.toLowerCase() || serviceName(state, planItem.serviceId).toLowerCase()} ${planItem.progressStatus === 'IN_PROGRESS' ? 'currently in progress' : 'planned'}.` : appointmentType?.name || 'Clinical appointment';
  const detail = (label, value, className = '') => element('div', { className: `dashboard-current-row__detail ${className}`.trim() }, [element('span', { text: label }), element('strong', { text: value })]);
  const identity = element('div', { className: 'dashboard-current-row__detail dashboard-current-row__identity' }, [element('span', { text: 'Patient' }), element('strong', { text: patient?.fullName || 'Patient' }), element('small', { text: patient?.patientNumber || 'Patient record' })]);
  const status = createBadge({ label: formatStatus(queueEntry?.status || appointment.status), variant: statusVariant(queueEntry?.status || appointment.status) });
  const action = actionLink({ label: isInTreatment ? 'Open Clinical Encounter' : isWaiting ? 'Open Clinical Workspace' : 'View Patient', route: isInTreatment || isWaiting ? `patients/${patient?.id}/clinical` : 'patients', icon: isInTreatment || isWaiting ? 'clinical' : 'user' });
  return element('div', { className: 'dashboard-current-row' }, [
    element('div', { className: 'dashboard-current-row__info' }, [identity, detail('Appointment', formatTime(appointment.startDateTime)), detail('Arrival', queueEntry?.arrivalAt ? formatTime(queueEntry.arrivalAt) : 'Not arrived'), detail('Dentist', dentist?.fullName || 'Unassigned'), detail('Treatment started', queueEntry?.treatmentStartedAt ? formatTime(queueEntry.treatmentStartedAt) : 'Not started'), element('p', { className: 'dashboard-current-row__context', text: context })]),
    element('div', { className: 'dashboard-current-row__actions' }, [status, action])
  ]);
};

const encounterList = (state, encounters) => !encounters.length ? createEmptyState({ title: 'No draft encounters', message: 'Draft or in-progress encounters will appear here.' }) : element('div', { className: 'dashboard-list' }, encounters.map(encounter => element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, encounter.patientId) }), element('span', { text: `${encounter.encounterNumber} \u00B7 Started ${formatTime(encounter.startedAt)}` })]), createBadge({ label: formatStatus(encounter.status), variant: encounter.status === 'DRAFT' ? 'warning' : 'active' })])));

const treatmentPlanList = (state, plans) => !plans.length ? createEmptyState({ title: 'No active treatment plans', message: 'Plans requiring attention will appear here.' }) : element('div', { className: 'dashboard-list' }, plans.slice(0, 4).map(plan => {
  const items = getTreatmentPlanItems(state, plan.id);
  const item = items.find(candidate => ['IN_PROGRESS', 'PLANNED'].includes(candidate.progressStatus)) || items[0];
  const detail = item ? `${serviceName(state, item.serviceId)}${item.toothCode ? ` \u00B7 Tooth ${item.toothCode}` : ''} \u00B7 ${formatStatus(item.progressStatus)}` : formatStatus(plan.status);
  return element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, plan.patientId) }), element('span', { text: detail })]), createBadge({ label: formatStatus(plan.status), variant: plan.status === 'PROPOSED' ? 'warning' : 'active' })]);
}));

const dentistRecallList = (state, recalls) => !recalls.length ? createEmptyState({ title: 'No follow-ups due', message: 'Your clinical follow-ups will appear here.' }) : element('div', { className: 'dashboard-list' }, recalls.slice(0, 4).map(recall => {
  const type = resolveType(state, recall.recallTypeId, state.recallTypes);
  return element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, recall.patientId) }), element('span', { text: `${type?.name || 'Follow-up'} \u00B7 Due ${formatDate(recall.dueDate)}` })]), createBadge({ label: formatStatus(recall.status), variant: statusVariant(recall.status) })]);
}));

const recentClinicalActivity = (state, encounters) => !encounters.length ? createEmptyState({ title: 'No recent completed encounters', message: 'Your completed clinical work will appear here.' }) : element('ol', { className: 'dashboard-activity' }, encounters.map(encounter => element('li', {}, [lucideIcon('clinical'), element('div', {}, [element('strong', { text: 'Encounter completed' }), element('span', { text: `${patientName(state, encounter.patientId)} \u00B7 ${encounter.encounterNumber} \u00B7 ${formatDate(encounter.completedAt || encounter.startedAt)}` })])])));

// Receptionist dashboard data is operational only: scheduling, queue, contact, and recall records.
export const getReceptionistDashboardData = (state, userId) => {
  const todayAppointments = getTodayAppointments(state);
  const activeQueue = getActiveQueueEntries(state);
  const contactLogs = todayAppointments.flatMap(appointment => getAppointmentContactLogs(state, appointment.id).map(log => ({ ...log, appointment }))).sort((a, b) => b.contactedAt.localeCompare(a.contactedAt));
  const pendingConfirmations = todayAppointments.filter(appointment => appointment.status === 'SCHEDULED' && getAppointmentContactLogs(state, appointment.id).length === 0);
  const overdueRecalls = getOverdueRecalls(state, state.referenceDate);
  const upcomingRecalls = getUpcomingRecalls(state, state.referenceDate);
  return {
    user: resolveUser(state, userId), clinic: state.organization, branch: state.branches.find(branch => branch.isMain), referenceDate: state.referenceDate,
    todayAppointments, activeQueue, statusCounts: getAppointmentStatusCounts(state, state.referenceDate),
    waitingCount: activeQueue.filter(entry => entry.status === 'WAITING').length,
    pendingConfirmations, contactLogs,
    recalls: [...overdueRecalls, ...upcomingRecalls.filter(recall => !overdueRecalls.some(overdue => overdue.id === recall.id))],
    overdueRecalls, upcomingRecalls,
    activity: [
      ...state.auditLogs.filter(event => event.actorUserId === userId).map(event => ({ kind: 'audit', occurredAt: event.occurredAt, label: formatStatus(event.actionCode), summary: event.summary })),
      ...contactLogs.map(log => ({ kind: 'contact', occurredAt: log.contactedAt, label: `Appointment ${formatStatus(log.outcome)}`, summary: `${patientName(state, log.appointment.patientId)} contacted by ${formatStatus(log.contactMethod)}` }))
    ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 4)
  };
};

const receptionistAppointmentList = (state, appointments) => !appointments.length ? createEmptyState({ title: 'No appointments today', message: 'New bookings will appear here.' }) : element('div', { className: 'dashboard-list dashboard-list--appointments' }, appointments.map(appointment => {
  const dentist = resolveUser(state, appointment.dentistUserId);
  const type = resolveType(state, appointment.appointmentTypeId, state.appointmentTypes);
  return element('article', { className: `dashboard-list__row${appointment.status === 'CANCELLED' ? ' dashboard-list__row--muted' : ''}` }, [element('time', { className: 'dashboard-list__time', text: formatTime(appointment.startDateTime) }), element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, appointment.patientId) }), element('span', { text: `${dentist?.fullName || 'Unassigned'} \u00B7 ${type?.name || 'Appointment'}` })]), createBadge({ label: formatStatus(appointment.status), variant: statusVariant(appointment.status) })]);
}));

const receptionistQueueList = (state, queue) => !queue.length ? createEmptyState({ title: 'No active queue', message: 'Arrivals and waiting patients will appear here.' }) : element('div', { className: 'dashboard-list' }, queue.map(entry => {
  const appointment = getAppointmentById(state, entry.appointmentId);
  const dentist = resolveUser(state, entry.dentistUserId);
  return element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, entry.patientId) }), element('span', { text: `${dentist?.fullName || 'Unassigned'} \u00B7 Arrived ${formatTime(entry.arrivalAt)} \u00B7 Appointment ${formatTime(appointment?.startDateTime)}` })]), createBadge({ label: formatStatus(entry.status), variant: statusVariant(entry.status) })]);
}));

const confirmationAttentionList = (state, data) => {
  const items = [
    ...data.pendingConfirmations.map(appointment => ({ kind: 'pending', appointment })),
    ...data.contactLogs.map(log => ({ kind: 'contact', appointment: log.appointment, log }))
  ];
  return !items.length ? createEmptyState({ title: 'No confirmation tasks', message: 'Appointments requiring contact will appear here.' }) : element('div', { className: 'dashboard-list' }, items.slice(0, 5).map(item => {
    const appointment = item.appointment;
    const message = item.kind === 'pending' ? 'Awaiting confirmation' : `${formatStatus(item.log.outcome)} by ${formatStatus(item.log.contactMethod)}`;
    return element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, appointment.patientId) }), element('span', { text: `${appointment.appointmentNumber} \u00B7 ${message}` })]), createBadge({ label: item.kind === 'pending' ? 'Attention' : formatStatus(item.log.outcome), variant: item.kind === 'pending' ? 'warning' : statusVariant(item.log.outcome) })]);
  }));
};

const receptionistRecallList = (state, recalls) => !recalls.length ? createEmptyState({ title: 'No active recalls', message: 'Follow-up tasks will appear here.' }) : element('div', { className: 'dashboard-list' }, recalls.slice(0, 5).map(recall => {
  const type = resolveType(state, recall.recallTypeId, state.recallTypes);
  const linkedAppointment = recall.scheduledAppointmentId ? getAppointmentById(state, recall.scheduledAppointmentId) : null;
  const context = `${type?.name || 'Follow-up'} \u00B7 ${linkedAppointment ? `Linked ${linkedAppointment.appointmentNumber}` : `Due ${formatDate(recall.dueDate)}`}`;
  return element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, recall.patientId) }), element('span', { text: context })]), createBadge({ label: formatStatus(recall.status), variant: statusVariant(recall.status) })]);
}));

const frontDeskActivity = activity => !activity.length ? createEmptyState({ title: 'No recent front-desk activity', message: 'Operational activity will appear here.' }) : element('ol', { className: 'dashboard-activity' }, activity.map(event => element('li', {}, [lucideIcon(event.kind === 'contact' ? 'bell' : 'clock'), element('div', {}, [element('strong', { text: event.label }), element('span', { text: `${event.summary} \u00B7 ${formatTime(event.occurredAt)}` })])])));

// Cashier dashboard data is a read-only composition of canonical finance relationships.
export const getCashierDashboardData = (state, userId) => {
  const todayPayments = getPaymentsForDate(state, state.referenceDate).filter(payment => payment.status === 'POSTED').sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const outstandingInvoices = getOutstandingInvoices(state);
  const todayReceipts = getReceiptsForDate(state, state.referenceDate).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const paymentBreakdown = getPaymentMethodBreakdown(state, state.referenceDate);
  return {
    user: resolveUser(state, userId), clinic: state.organization, branch: state.branches.find(branch => branch.isMain), referenceDate: state.referenceDate,
    todayCollections: getTodayCollections(state), outstandingBalance: getOutstandingBalance(state), todayPayments,
    paymentEntries: todayPayments.map(payment => ({ payment, receipt: getReceiptsForPayment(state, payment.id)[0] || null })),
    outstandingInvoices: outstandingInvoices.map(invoice => ({ invoice, patientFinancialSummary: getPatientFinancialSummary(state, invoice.patientId) })),
    partiallyPaidInvoices: getPartiallyPaidInvoices(state),
    receiptEntries: todayReceipts.map(receipt => ({ receipt, payment: getPaymentById(state, receipt.paymentId) })),
    paymentMethods: state.paymentMethods.map(method => ({ ...method, amount: paymentBreakdown[method.code] || 0 })),
    activity: state.auditLogs.filter(event => event.actorUserId === userId && ['PAYMENT_RECORDED', 'RECEIPT_ISSUED'].includes(event.actionCode)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  };
};

const cashierPaymentList = (state, entries) => !entries.length ? createEmptyState({ title: 'No payments recorded today', message: 'Posted payments will appear here.' }) : element('div', { className: 'dashboard-list' }, entries.map(({ payment, receipt }) => element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, payment.patientId) }), element('span', { text: `${formatStatus(payment.paymentMethodCode)} \u00B7 ${payment.paymentNumber} \u00B7 ${receipt?.receiptNumber || 'Receipt pending'} \u00B7 ${formatTime(payment.receivedAt)}` })]), element('strong', { className: 'dashboard-list__amount', text: formatUGX(payment.amount) })])));

const outstandingInvoiceList = (state, entries) => !entries.length ? createEmptyState({ title: 'No outstanding invoices', message: 'Invoices with a balance will appear here.' }) : element('div', { className: 'dashboard-list' }, entries.map(({ invoice, patientFinancialSummary }) => element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: patientName(state, invoice.patientId) }), element('span', { text: `${invoice.invoiceNumber} \u00B7 Paid ${formatUGX(patientFinancialSummary.totalPaid)} of ${formatUGX(patientFinancialSummary.totalInvoiced)}` })]), element('div', { className: 'dashboard-list__financial' }, [element('strong', { className: 'dashboard-list__amount', text: formatUGX(patientFinancialSummary.outstandingBalance) }), createBadge({ label: 'Partially Paid', variant: 'warning' })])])));

const cashierReceiptList = (state, entries) => !entries.length ? createEmptyState({ title: 'No receipts issued today', message: 'Issued receipts will appear here.' }) : element('div', { className: 'dashboard-list' }, entries.map(({ receipt, payment }) => element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: receipt.receiptNumber }), element('span', { text: `${patientName(state, receipt.patientId)} \u00B7 ${formatStatus(payment?.paymentMethodCode)} \u00B7 ${formatTime(receipt.issuedAt)}` })]), element('strong', { className: 'dashboard-list__amount', text: formatUGX(receipt.amount) })])));

const paymentMethodSummary = methods => element('div', { className: 'dashboard-list' }, methods.map(method => element('article', { className: 'dashboard-list__row' }, [element('div', { className: 'dashboard-list__identity' }, [element('strong', { text: method.name })]), element('strong', { className: 'dashboard-list__amount', text: formatUGX(method.amount) })])));

const financeActivity = activity => !activity.length ? createEmptyState({ title: 'No recent finance activity', message: 'Payment and receipt events will appear here.' }) : element('ol', { className: 'dashboard-activity' }, activity.map(event => element('li', {}, [lucideIcon('wallet'), element('div', {}, [element('strong', { text: formatStatus(event.actionCode) }), element('span', { text: `${event.summary} \u00B7 ${formatTime(event.occurredAt)}` })])])));

export const renderAdminDashboard = ({ state, session }) => {
  const data = getAdminDashboardData(state, session);
  const actionDefinitions = [
    { label: 'Register Patient', route: 'patients', permission: 'patients.create', icon: 'user' }, { label: 'Book Appointment', route: 'appointments/new', permission: 'appointments.create', icon: 'calendar' }, { label: 'View Waiting Room', route: 'waiting-room', permission: 'waiting-room.view', icon: 'clock' }, { label: 'Record Payment', route: 'billing/payments', permission: 'payments.create', icon: 'wallet' }, { label: 'View Reports', route: 'reports', permission: 'reports.view', icon: 'reports' }
  ].filter(action => permissions.can('Clinic Administrator', action.permission));
  const statuses = ['COMPLETED', 'WAITING', 'IN_TREATMENT', 'CONFIRMED', 'SCHEDULED', 'CANCELLED'];
  const page = element('div', { className: 'dashboard dashboard--admin' });
  page.append(createPageHeader({ title: 'Dashboard', description: `Operational overview for ${data.clinic.name}`, breadcrumb: element('p', { className: 'dashboard__context', text: `${data.branch?.name || 'Main Branch'} \u00B7 ${formatDate(data.referenceDate)}` }) }));
  page.append(element('p', { className: 'dashboard__greeting', text: `Welcome back, ${data.greetingName}.` }));
  page.append(element('section', { className: 'dashboard-kpis', 'aria-label': 'Operational key performance indicators' }, data.kpis.map(createKpiCard)));
  page.append(element('section', { className: 'dashboard-statuses', 'aria-label': "Today's appointment status summary" }, [element('h2', { text: "Today's schedule" }), element('div', { className: 'dashboard-statuses__items' }, statuses.map(status => element('div', { className: 'dashboard-statuses__item' }, [createBadge({ label: formatStatus(status), variant: statusVariant(status) }), element('strong', { text: String(data.statusCounts[status] || 0) })])))]));
  page.append(element('div', { className: 'dashboard-grid dashboard-grid--primary' }, [section({ title: "Today's appointments", subtitle: `${data.todayAppointments.length} scheduled today`, action: actionLink({ label: 'View All', route: 'appointments', icon: 'calendar' }), content: appointmentList(state, data.todayAppointments) }), section({ title: 'Active queue', subtitle: `${data.activeQueue.length} patient${data.activeQueue.length === 1 ? '' : 's'} in clinic`, action: actionLink({ label: 'View Waiting Room', route: 'waiting-room', icon: 'clock' }), content: queueList(state, data.activeQueue) })]));
  const recalls = [...data.overdueRecalls, ...data.upcomingRecalls.filter(recall => !data.overdueRecalls.some(overdue => overdue.id === recall.id))];
  page.append(element('div', { className: 'dashboard-grid' }, [section({ title: 'Recalls & follow-ups', subtitle: `${data.overdueRecalls.length} overdue \u00B7 ${data.upcomingRecalls.length} upcoming or scheduled`, action: actionLink({ label: 'View Recalls', route: 'recalls', icon: 'bell' }), content: recallList(state, recalls) }), section({ title: 'Financial snapshot', subtitle: `${formatUGX(getTodayCollections(state))} collected today`, action: actionLink({ label: 'View Payments', route: 'billing/payments', icon: 'wallet' }), content: paymentList(state, data.todayPayments) })]));
  page.append(element('div', { className: 'dashboard-grid' }, [section({ title: 'Quick actions', subtitle: 'Common administrator tasks', content: element('div', { className: 'dashboard-actions' }, actionDefinitions.map(action => actionLink(action))) }), section({ title: 'Recent activity', subtitle: 'Latest operational events', content: !data.activity.length ? createEmptyState({ title: 'No recent activity', message: 'Operational events will appear here.' }) : element('ol', { className: 'dashboard-activity' }, data.activity.map(event => { const actor = resolveUser(state, event.actorUserId); return element('li', {}, [lucideIcon(event.actionCode === 'PAYMENT_RECORDED' || event.actionCode === 'RECEIPT_ISSUED' ? 'wallet' : event.actionCode === 'ENCOUNTER_STARTED' ? 'clinical' : 'clock'), element('div', {}, [element('strong', { text: formatStatus(event.actionCode) }), element('span', { text: `${event.summary} \u00B7 ${actor?.fullName || 'System'} \u00B7 ${formatTime(event.occurredAt)}` })])]); })) })]));
  return page;
};

export const renderDentistDashboard = ({ state, session }) => {
  const data = getDentistDashboardData(state, session?.userId);
  const actionDefinitions = [
    { label: 'View My Schedule', route: 'appointments', permission: 'appointments.view', icon: 'calendar' },
    { label: 'Open Waiting Room', route: 'waiting-room', permission: 'waiting-room.view', icon: 'clock' },
    { label: 'Clinical Encounters', route: 'clinical/encounters', permission: 'encounters.view', icon: 'clinical' },
    { label: 'Treatment Plans', route: 'treatment-plans', permission: 'treatment-plans.view', icon: 'clinical' },
    { label: 'Follow-Ups', route: 'recalls', permission: 'recalls.view', icon: 'bell' },
    { label: 'Prescriptions', route: 'prescriptions', permission: 'prescriptions.view', icon: 'clinical' }
  ].filter(action => permissions.can('Dentist', action.permission));
  const greeting = data.user?.fullName || session?.name || 'Dentist';
  const page = element('div', { className: 'dashboard dashboard--dentist' });
  page.append(createPageHeader({ title: 'Dashboard', description: "Today's clinical schedule and patient care overview.", breadcrumb: element('p', { className: 'dashboard__context', text: `${data.branch?.name || 'Main Branch'} \u00B7 ${formatDate(data.referenceDate)}` }) }));
  page.append(element('p', { className: 'dashboard__greeting', text: `Good afternoon, ${greeting}.` }));
  page.append(element('section', { className: 'dashboard-kpis', 'aria-label': 'My clinical key performance indicators' }, [
    createKpiCard({ label: 'My Appointments Today', value: String(data.schedule.length), icon: 'calendar', context: 'Includes completed and cancelled appointments' }),
    createKpiCard({ label: 'Waiting for Me', value: String(data.waitingCount), icon: 'clock', context: 'Patients ready for clinical care' }),
    createKpiCard({ label: 'In Treatment', value: String(data.inTreatmentCount), icon: 'clinical', context: 'Patients currently under my care' }),
    createKpiCard({ label: 'Active Treatment Plans', value: String(data.activePlans.length), icon: 'clinical', context: 'Plans requiring clinical attention' })
  ]));
  page.append(element('div', { className: 'dashboard-grid dashboard-grid--primary' }, [
    section({ title: 'My Schedule Today', subtitle: `${data.schedule.length} appointment${data.schedule.length === 1 ? '' : 's'} in chronological order`, action: actionLink({ label: 'View Schedule', route: 'appointments', icon: 'calendar' }), content: dentistScheduleList(state, data.schedule) }),
    section({ title: data.current?.queueEntry?.status === 'WAITING' ? 'Patient Waiting' : data.current?.queueEntry?.status === 'IN_TREATMENT' ? 'Current Patient' : 'Next Patient', subtitle: data.current?.queueEntry?.status === 'WAITING' ? 'Ready to begin clinical care' : data.current?.queueEntry?.status === 'IN_TREATMENT' ? 'Clinical care in progress' : 'Next scheduled clinical priority', content: currentPatient(state, data.current), className: 'dashboard-section__content--priority' })
  ]));
  page.append(element('div', { className: 'dashboard-grid' }, [
    section({ title: 'Clinical Work', subtitle: 'Draft and in-progress encounters requiring attention', action: actionLink({ label: 'View Encounters', route: 'clinical/encounters', icon: 'clinical' }), content: encounterList(state, data.draftEncounters) }),
    section({ title: 'Treatment Plans', subtitle: `${data.activePlans.length} active plan${data.activePlans.length === 1 ? '' : 's'} under my care`, action: actionLink({ label: 'View Plans', route: 'treatment-plans', icon: 'clinical' }), content: treatmentPlanList(state, data.activePlans) })
  ]));
  page.append(element('div', { className: 'dashboard-grid' }, [
    section({ title: 'Follow-Ups', subtitle: 'My scheduled, upcoming, and overdue care', action: actionLink({ label: 'View Follow-Ups', route: 'recalls', icon: 'bell' }), content: dentistRecallList(state, data.followUps) }),
    section({ title: 'Quick Actions', subtitle: 'Clinical actions available to your role', content: element('div', { className: 'dashboard-actions' }, actionDefinitions.map(action => actionLink(action))) })
  ]));
  page.append(section({ title: 'Recent Clinical Activity', subtitle: 'Recently completed encounters under my care', content: recentClinicalActivity(state, data.recentActivity) }));
  return page;
};

export const renderReceptionistDashboard = ({ state, session }) => {
  const data = getReceptionistDashboardData(state, session?.userId);
  const actionDefinitions = [
    { label: 'Register Patient', route: 'patients', permission: 'patients.create', icon: 'user' },
    { label: 'Book Appointment', route: 'appointments/new', permission: 'appointments.create', icon: 'calendar' },
    { label: 'View Waiting Room', route: 'waiting-room', permission: 'waiting-room.view', icon: 'clock' },
    { label: 'Search Patient', route: 'patients', permission: 'patients.view', icon: 'user' },
    { label: 'View Recalls', route: 'recalls', permission: 'recalls.view', icon: 'bell' }
  ].filter(action => permissions.can('Receptionist', action.permission));
  const greeting = data.user?.firstName || session?.name?.replace(/^Dr\.\s*/, '').split(' ')[0] || 'Receptionist';
  const page = element('div', { className: 'dashboard dashboard--receptionist' });
  page.append(createPageHeader({ title: 'Dashboard', description: "Today's appointments and front-desk activity.", breadcrumb: element('p', { className: 'dashboard__context', text: `${data.branch?.name || 'Main Branch'} \u00B7 ${formatDate(data.referenceDate)}` }) }));
  page.append(element('p', { className: 'dashboard__greeting', text: `Good afternoon, ${greeting}.` }));
  page.append(element('section', { className: 'dashboard-kpis', 'aria-label': 'Front-desk key performance indicators' }, [
    createKpiCard({ label: "Today's Appointments", value: String(data.todayAppointments.length), icon: 'calendar', context: `${data.statusCounts.SCHEDULED || 0} scheduled today` }),
    createKpiCard({ label: 'Waiting Now', value: String(data.waitingCount), icon: 'clock', context: `${data.activeQueue.length} patient${data.activeQueue.length === 1 ? '' : 's'} in the active queue` }),
    createKpiCard({ label: 'Confirmed Appointments', value: String(data.statusCounts.CONFIRMED || 0), icon: 'calendar', context: 'Ready for their scheduled visit' }),
    createKpiCard({ label: 'Follow-Ups / Recalls', value: String(data.recalls.length), icon: 'bell', context: `${data.overdueRecalls.length} overdue \u00B7 ${data.upcomingRecalls.filter(recall => recall.status === 'SCHEDULED').length} scheduled` })
  ]));
  page.append(element('div', { className: 'dashboard-grid dashboard-grid--primary' }, [
    section({ title: "Today's Appointments", subtitle: `${data.todayAppointments.length} appointments in chronological order`, action: actionLink({ label: 'View Appointments', route: 'appointments', icon: 'calendar' }), content: receptionistAppointmentList(state, data.todayAppointments) }),
    section({ title: 'Active Queue', subtitle: `${data.waitingCount} waiting \u00B7 ${data.activeQueue.filter(entry => entry.status === 'IN_TREATMENT').length} in treatment`, action: actionLink({ label: 'View Waiting Room', route: 'waiting-room', icon: 'clock' }), content: receptionistQueueList(state, data.activeQueue) })
  ]));
  page.append(element('div', { className: 'dashboard-grid' }, [
    section({ title: 'Confirmations & Contact Attention', subtitle: `${data.pendingConfirmations.length} appointment${data.pendingConfirmations.length === 1 ? '' : 's'} awaiting confirmation`, action: actionLink({ label: 'View Appointments', route: 'appointments', icon: 'calendar' }), content: confirmationAttentionList(state, data) }),
    section({ title: 'Recalls & Follow-Ups', subtitle: `${data.overdueRecalls.length} overdue \u00B7 ${data.upcomingRecalls.length} upcoming or scheduled`, action: actionLink({ label: 'View Recalls', route: 'recalls', icon: 'bell' }), content: receptionistRecallList(state, data.recalls) })
  ]));
  page.append(element('div', { className: 'dashboard-grid' }, [
    section({ title: 'Quick Actions', subtitle: 'Common front-desk tasks', content: element('div', { className: 'dashboard-actions' }, actionDefinitions.map(action => actionLink(action))) }),
    section({ title: 'Recent Front-Desk Activity', subtitle: 'Recent check-in and contact activity', content: frontDeskActivity(data.activity) })
  ]));
  return page;
};

export const renderCashierDashboard = ({ state, session }) => {
  const data = getCashierDashboardData(state, session?.userId);
  const actionDefinitions = [
    { label: 'Record Payment', route: 'billing/payments', permission: 'payments.create', icon: 'wallet' },
    { label: 'Find Invoice', route: 'billing/invoices', permission: 'invoices.view', icon: 'reports' },
    { label: 'Search Patient', route: 'patients', permission: 'patients.view', icon: 'user' },
    { label: 'View Receipts', route: 'billing/receipts', permission: 'receipts.view', icon: 'wallet' },
    { label: 'View Payments', route: 'billing/payments', permission: 'payments.view', icon: 'wallet' },
    { label: 'Outstanding Balances', route: 'outstanding-balances', permission: 'outstanding-balances.view', icon: 'reports' }
  ].filter(action => permissions.can('Cashier', action.permission));
  const greeting = data.user?.firstName || session?.name?.split(' ')[0] || 'Cashier';
  const page = element('div', { className: 'dashboard dashboard--cashier' });
  page.append(createPageHeader({ title: 'Dashboard', description: "Today's payments and billing overview.", breadcrumb: element('p', { className: 'dashboard__context', text: `${data.clinic.name} \u00B7 ${data.branch?.name || 'Main Branch'} \u00B7 ${formatDate(data.referenceDate)}` }) }));
  page.append(element('p', { className: 'dashboard__greeting', text: `Good afternoon, ${greeting}.` }));
  page.append(element('section', { className: 'dashboard-kpis', 'aria-label': 'Cashier key performance indicators' }, [
    createKpiCard({ label: "Today's Collections", value: formatUGX(data.todayCollections), icon: 'wallet', context: 'Posted payments on the reference date' }),
    createKpiCard({ label: 'Payments Today', value: String(data.todayPayments.length), icon: 'wallet', context: 'Posted payment records' }),
    createKpiCard({ label: 'Outstanding Balance', value: formatUGX(data.outstandingBalance), icon: 'reports', context: 'Across open patient invoices' }),
    createKpiCard({ label: 'Partially Paid Invoices', value: String(data.partiallyPaidInvoices.length), icon: 'reports', context: 'Invoices with a remaining balance' })
  ]));
  page.append(element('div', { className: 'dashboard-grid dashboard-grid--primary' }, [
    section({ title: "Today's Payments", subtitle: `${data.todayPayments.length} posted payment${data.todayPayments.length === 1 ? '' : 's'} \u00B7 ${formatUGX(data.todayCollections)} collected`, action: actionLink({ label: 'View Payments', route: 'billing/payments', icon: 'wallet' }), content: cashierPaymentList(state, data.paymentEntries) }),
    section({ title: 'Outstanding Invoices', subtitle: `${data.outstandingInvoices.length} balance${data.outstandingInvoices.length === 1 ? '' : 's'} requiring payment`, action: actionLink({ label: 'View Balances', route: 'outstanding-balances', icon: 'reports' }), content: outstandingInvoiceList(state, data.outstandingInvoices) })
  ]));
  page.append(element('div', { className: 'dashboard-grid' }, [
    section({ title: 'Recent Receipts', subtitle: `${data.receiptEntries.length} receipt${data.receiptEntries.length === 1 ? '' : 's'} issued today`, action: actionLink({ label: 'View Receipts', route: 'billing/receipts', icon: 'wallet' }), content: cashierReceiptList(state, data.receiptEntries) }),
    section({ title: 'Payment Method Summary', subtitle: 'Posted collections by payment method today', content: paymentMethodSummary(data.paymentMethods) })
  ]));
  page.append(element('div', { className: 'dashboard-grid' }, [
    section({ title: 'Quick Actions', subtitle: 'Common payment and billing tasks', content: element('div', { className: 'dashboard-actions' }, actionDefinitions.map(action => actionLink(action))) }),
    section({ title: 'Recent Finance Activity', subtitle: 'Latest payment and receipt events', content: financeActivity(data.activity) })
  ]));
  return page;
};
