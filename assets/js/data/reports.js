import { getRecallDisplayStatus } from './finance.js';
import { getOutstandingInvoices, getPaymentMethodBreakdown, getOutstandingBalance, getTodayCollections } from './finance.js';

const dateOf = value => String(value || '').slice(0, 10);
const inRange = (value, from, to) => (!from || value >= from) && (!to || value <= to);
const ordered = (records, compare) => [...records].sort(compare);
const patientFor = (state, id) => state.patients.find(patient => patient.id === id) || null;
const dentistFor = (state, id) => state.users.find(user => user.id === id) || null;
const typeFor = (state, id) => state.appointmentTypes.find(type => type.id === id) || null;
const serviceFor = (state, id) => state.services.find(service => service.id === id) || null;
const procedureFor = (state, id) => state.proceduresPerformed.find(procedure => procedure.id === id) || null;
const recallTypeFor = (state, id) => state.recallTypes.find(type => type.id === id) || null;
const activeDentists = state => state.users.filter(user => user.status === 'active' && user.roleId === 'ROLE-DENTIST');
const posted = payment => payment.status === 'POSTED';

export const REPORT_TYPES = {
  patients: { label: 'Patient Registrations & Visits', roles: ['Clinic Administrator', 'Dentist', 'Receptionist'] },
  appointments: { label: 'Appointment Activity', roles: ['Clinic Administrator', 'Dentist', 'Receptionist'] },
  clinical: { label: 'Clinical Procedures & Plans', roles: ['Clinic Administrator', 'Dentist'] },
  finance: { label: 'Collections & Outstanding Balances', roles: ['Clinic Administrator', 'Cashier'] },
  recalls: { label: 'Recall Follow-Up', roles: ['Clinic Administrator', 'Dentist', 'Receptionist'] }
};
export const reportTypesForRole = role => Object.entries(REPORT_TYPES).filter(([, definition]) => definition.roles.includes(role)).map(([id, definition]) => ({ id, ...definition }));
export const canViewReportType = (role, type) => Boolean(REPORT_TYPES[type]?.roles.includes(role));
export const reportDentists = state => activeDentists(state).map(user => ({ id: user.id, name: user.fullName }));

const scoped = ({ records, role, userId, key = 'dentistUserId' }) => role === 'Dentist' ? records.filter(record => record[key] === userId) : records;
const appointmentReport = ({ state, role, userId, filters }) => {
  const appointments = scoped({ records: state.appointments, role, userId }).filter(item => inRange(dateOf(item.startDateTime), filters.from, filters.to) && (!filters.status || item.status === filters.status) && (!filters.dentistId || item.dentistUserId === filters.dentistId));
  const rows = ordered(appointments, (a, b) => a.startDateTime.localeCompare(b.startDateTime)).map(item => ({ date: dateOf(item.startDateTime), time: item.startDateTime, patient: patientFor(state, item.patientId)?.fullName || 'Patient', dentist: dentistFor(state, item.dentistUserId)?.fullName || 'Dentist', purpose: typeFor(state, item.appointmentTypeId)?.name || 'Appointment', status: item.status }));
  const count = status => appointments.filter(item => item.status === status).length;
  const workload = activeDentists(state).filter(dentist => role !== 'Dentist' || dentist.id === userId).map(dentist => ({ dentist: dentist.fullName, appointments: appointments.filter(item => item.dentistUserId === dentist.id).length }));
  return { title: 'Appointment Activity', description: 'Appointments by date, Dentist, and workflow status.', columns: [['Date', 'date', 'date'], ['Time', 'time', 'time'], ['Patient', 'patient'], ['Dentist', 'dentist'], ['Purpose', 'purpose'], ['Status', 'status', 'status']], rows, metrics: [['Appointments', appointments.length], ['Completed', count('COMPLETED')], ['Waiting', count('WAITING')], ['In Treatment', count('IN_TREATMENT')], ['Confirmed', count('CONFIRMED')], ['Scheduled', count('SCHEDULED')], ['Cancelled', count('CANCELLED')]], breakdown: { title: 'Dentist Workload', columns: [['Dentist', 'dentist'], ['Appointments', 'appointments', 'numeric']], rows: workload } };
};
const patientReport = ({ state, role, userId, filters }) => {
  const permittedPatients = role === 'Dentist' ? new Set(state.appointments.filter(item => item.dentistUserId === userId).map(item => item.patientId)) : null;
  const rows = ordered(state.patients.filter(patient => (!permittedPatients || permittedPatients.has(patient.id)) && inRange(patient.registeredAt, filters.from, filters.to) && (!filters.status || patient.status === filters.status)), (a, b) => b.registeredAt.localeCompare(a.registeredAt)).map(patient => ({ patient: patient.fullName, number: patient.patientNumber, registered: patient.registeredAt, status: patient.status, visits: state.appointments.filter(appointment => appointment.patientId === patient.id && appointment.status === 'COMPLETED').length }));
  return { title: 'Patient Registrations & Visits', description: 'Registration activity and completed visit counts.', columns: [['Patient', 'patient'], ['Patient Number', 'number'], ['Registered', 'registered', 'date'], ['Status', 'status', 'status'], ['Completed Visits', 'visits', 'numeric']], rows, metrics: [['Patients', rows.length], ['Active', rows.filter(row => row.status === 'active').length], ['Inactive', rows.filter(row => row.status === 'inactive').length], ['Completed Visits', rows.reduce((total, row) => total + row.visits, 0)]] };
};
const clinicalReport = ({ state, role, userId, filters }) => {
  const procedures = scoped({ records: state.proceduresPerformed.filter(item => item.status === 'COMPLETED'), role, userId }).filter(item => inRange(dateOf(item.performedAt), filters.from, filters.to) && (!filters.dentistId || item.dentistUserId === filters.dentistId));
  const rows = ordered(procedures, (a, b) => b.performedAt.localeCompare(a.performedAt)).map(item => ({ date: dateOf(item.performedAt), patient: patientFor(state, item.patientId)?.fullName || 'Patient', dentist: dentistFor(state, item.dentistUserId)?.fullName || 'Dentist', procedure: serviceFor(state, item.serviceId)?.name || item.serviceCode || 'Procedure', tooth: item.toothCode || '—', value: item.amountSnapshot || 0 }));
  const plans = scoped({ records: state.treatmentPlans, role, userId }).filter(item => inRange(dateOf(item.createdAt), filters.from, filters.to));
  return { title: 'Clinical Procedures & Plans', description: 'Completed procedure activity and treatment-plan status. Service value is not cash collected.', columns: [['Date', 'date', 'date'], ['Patient', 'patient'], ['Dentist', 'dentist'], ['Procedure', 'procedure'], ['Tooth', 'tooth'], ['Service Value', 'value', 'currency']], rows, metrics: [['Completed Procedures', rows.length], ['Service Value', rows.reduce((total, row) => total + row.value, 0)], ['Treatment Plans', plans.length], ['Completed Plans', plans.filter(plan => plan.status === 'COMPLETED').length]], breakdown: { title: 'Treatment Plan Status', columns: [['Status', 'status', 'status'], ['Plans', 'count', 'numeric']], rows: [...new Set(plans.map(plan => plan.status))].sort().map(status => ({ status, count: plans.filter(plan => plan.status === status).length })) } };
};
const financeReport = ({ state, filters }) => {
  const payments = state.payments.filter(payment => posted(payment) && inRange(dateOf(payment.receivedAt), filters.from, filters.to) && (!filters.paymentMethod || payment.paymentMethodCode === filters.paymentMethod));
  const paymentsToday = payments.filter(payment => dateOf(payment.receivedAt) === state.referenceDate).length;
  const rows = ordered(payments, (a, b) => b.receivedAt.localeCompare(a.receivedAt)).map(item => ({ date: dateOf(item.receivedAt), payment: item.paymentNumber, patient: patientFor(state, item.patientId)?.fullName || 'Patient', method: item.paymentMethodCode, amount: item.amount }));
  const outstanding = ordered(getOutstandingInvoices(state).map(invoice => ({ patient: patientFor(state, invoice.patientId)?.fullName || 'Patient', invoice: invoice.invoiceNumber, balance: invoice.balance })), (a, b) => b.balance - a.balance);
  const methodTotals = getPaymentMethodBreakdown({ ...state, payments }, null);
  const methods = state.paymentMethods.map(method => ({ method: method.code, payments: payments.filter(payment => payment.paymentMethodCode === method.code).length, amount: methodTotals[method.code] || 0 }));
  const revenueByDentistProcedure = Object.values(state.invoiceItems.filter(item => { const invoice = state.invoices.find(record => record.id === item.invoiceId); return invoice && inRange(dateOf(invoice.issuedAt), filters.from, filters.to); }).reduce((groups, item) => { const procedure = procedureFor(state, item.procedureId), dentist = dentistFor(state, procedure?.dentistUserId); const row = { dentist: dentist?.fullName || 'Not linked to a procedure', procedure: serviceFor(state, item.serviceId)?.name || item.description, amount: item.lineTotal }; const key = `${row.dentist}|${row.procedure}`; groups[key] = groups[key] ? { ...groups[key], amount: groups[key].amount + row.amount } : row; return groups; }, {}));
  return { title: 'Collections & Outstanding Balances', description: 'Posted payments are collections. Invoiced revenue is shown separately by Dentist and procedure; outstanding balances remain current obligations.', columns: [['Payment Date', 'date', 'date'], ['Payment', 'payment'], ['Patient', 'patient'], ['Method', 'method', 'status'], ['Amount', 'amount', 'currency']], rows, metrics: [['Total Payments', rows.reduce((total, row) => total + row.amount, 0)], ['Current Outstanding', getOutstandingBalance(state)], ["Today's Collections", getTodayCollections(state)], ['Payments Today', paymentsToday]], breakdown: { title: 'Payment Method Summary', columns: [['Method', 'method', 'status'], ['Payments', 'payments', 'numeric'], ['Amount', 'amount', 'currency']], rows: methods }, secondary: { title: 'Outstanding Balances', columns: [['Patient', 'patient'], ['Invoice', 'invoice'], ['Balance', 'balance', 'currency']], rows: outstanding }, tertiary: { title: 'Invoiced Revenue by Dentist & Procedure', columns: [['Dentist', 'dentist'], ['Procedure', 'procedure'], ['Invoiced Value', 'amount', 'currency']], rows: ordered(revenueByDentistProcedure, (a, b) => b.amount - a.amount) } };
};
const recallReport = ({ state, role, userId, filters }) => {
  const recalls = scoped({ records: state.recalls, role, userId }).filter(item => inRange(item.dueDate, filters.from, filters.to) && (!filters.status || getRecallDisplayStatus(state, item) === filters.status));
  const rows = ordered(recalls, (a, b) => a.dueDate.localeCompare(b.dueDate)).map(item => ({ due: item.dueDate, patient: patientFor(state, item.patientId)?.fullName || 'Patient', type: recallTypeFor(state, item.recallTypeId)?.name || 'Follow-Up', dentist: dentistFor(state, item.dentistUserId)?.fullName || 'Dentist', status: getRecallDisplayStatus(state, item), appointment: state.appointments.find(appointment => appointment.id === item.scheduledAppointmentId)?.appointmentNumber || '—' }));
  const count = status => rows.filter(row => row.status === status).length;
  return { title: 'Recall Follow-Up', description: 'Follow-up obligations are reported separately from appointments and clinical care.', columns: [['Due Date', 'due', 'date'], ['Patient', 'patient'], ['Recall Type', 'type'], ['Dentist', 'dentist'], ['Status', 'status', 'status'], ['Appointment', 'appointment']], rows, metrics: [['Upcoming', count('UPCOMING')], ['Overdue', count('OVERDUE')], ['Scheduled', count('SCHEDULED')], ['Completed', count('COMPLETED')]] };
};

export const buildReport = ({ state, role, userId, type, filters = {} }) => {
  if (!canViewReportType(role, type)) return null;
  const normalized = { from: filters.from || '', to: filters.to || '', status: filters.status || '', dentistId: filters.dentistId || '', paymentMethod: filters.paymentMethod || '' };
  if (normalized.from && normalized.to && normalized.from > normalized.to) return { error: 'From date must be on or before To date.' };
  return ({ patients: patientReport, appointments: appointmentReport, clinical: clinicalReport, finance: financeReport, recalls: recallReport }[type])({ state, role, userId, filters: normalized });
};
