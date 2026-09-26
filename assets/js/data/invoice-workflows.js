import { calculateInvoiceBalance, calculateInvoicePaid, calculateInvoiceTotal, deriveInvoiceStatus } from './finance.js';

const INVOICE_STATUSES = new Set(['ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID']);
const numberSuffix = value => Number(String(value || '').match(/(\d+)(?!.*\d)/)?.[1] || 0);
const nextNumber = (records, prefix, width = 6) => `${prefix}-${String(Math.max(0, ...records.map(record => numberSuffix(record.id || record.invoiceNumber))) + 1).padStart(width, '0')}`;
const timestamp = state => `${state.referenceDate}T10:00:00+03:00`;
const fail = errors => { const error = new Error(Object.values(errors)[0] || 'Invoice input is invalid.'); error.fieldErrors = errors; throw error; };
const activeCashier = (state, userId) => state.users.find(user => user.id === userId && user.status === 'active' && ['cashier', 'clinic_administrator'].includes(user.roleCode)) || null;

export const getInvoicePermissions = ({ state, actor } = {}) => ({
  canView: ['Clinic Administrator', 'Cashier'].includes(actor?.role),
  canCreate: ['Clinic Administrator', 'Cashier'].includes(actor?.role) && Boolean(activeCashier(state, actor?.userId))
});

// Invoice items are snapshots: service price/name changes never alter stored financial history.
export const validateInvoiceInput = ({ state, patientId, items = [], notes = '', actor } = {}) => {
  const errors = {};
  const patient = state.patients.find(candidate => candidate.id === patientId) || null;
  if (!patient) errors.patientId = 'Select a valid patient.';
  if (!getInvoicePermissions({ state, actor }).canCreate) errors.permission = 'Only an active Cashier or Clinic Administrator may create an invoice.';
  if (!Array.isArray(items) || !items.length) errors.items = 'Add at least one billable item.';
  const normalizedItems = Array.isArray(items) ? items.map((item, index) => {
    const service = state.services.find(candidate => candidate.id === item.serviceId && candidate.status === 'active') || null;
    const procedure = item.procedureId ? state.proceduresPerformed.find(candidate => candidate.id === item.procedureId && candidate.status === 'COMPLETED') || null : null;
    const quantity = Number(item.quantity);
    const lineErrors = {};
    if (!service) lineErrors.serviceId = 'Select an active service from the catalogue.';
    if (!Number.isInteger(quantity) || quantity < 1) lineErrors.quantity = 'Quantity must be a positive whole number.';
    if (item.procedureId && !procedure) lineErrors.procedureId = 'The selected completed procedure is invalid.';
    if (procedure && patient && procedure.patientId !== patient.id) lineErrors.procedureId = 'A procedure can only be billed to its own patient.';
    if (procedure && service && procedure.serviceId !== service.id) lineErrors.procedureId = 'The selected procedure does not match the selected service.';
    if (procedure && state.invoiceItems.some(existing => existing.procedureId === procedure.id)) lineErrors.procedureId = 'This completed procedure is already linked to an invoice item.';
    const unitPrice = procedure ? procedure.amountSnapshot : service?.defaultPrice;
    if (!Number.isSafeInteger(unitPrice) || unitPrice <= 0) lineErrors.unitPrice = 'The selected billable service has an invalid price.';
    const lineTotal = Number.isSafeInteger(unitPrice) && Number.isInteger(quantity) ? unitPrice * quantity : NaN;
    if (!Number.isSafeInteger(lineTotal) || lineTotal <= 0) lineErrors.lineTotal = 'The line amount must be a positive whole-UGX amount.';
    if (Object.keys(lineErrors).length) errors[`item-${index}`] = Object.values(lineErrors)[0];
    return { service, procedure, quantity, unitPrice, lineTotal, description: String(item.description || service?.name || '').trim(), lineErrors };
  }) : [];
  const total = normalizedItems.reduce((sum, item) => sum + (Number.isSafeInteger(item.lineTotal) ? item.lineTotal : 0), 0);
  if (!Number.isSafeInteger(total) || total <= 0) errors.total = 'Invoice total must be greater than zero.';
  if (String(notes || '').length > 4000) errors.notes = 'Invoice notes must be 4,000 characters or fewer.';
  return { valid: Object.keys(errors).length === 0, errors, patient, items: normalizedItems, total, notes: String(notes || '').trim() || null };
};

export const createInvoice = ({ state, patientId, items, notes, actor } = {}) => {
  const validation = validateInvoiceInput({ state, patientId, items, notes, actor });
  if (!validation.valid) fail(validation.errors);
  const id = nextNumber(state.invoices, 'INV'), now = timestamp(state);
  const invoice = { id, invoiceNumber: id, organizationId: state.organization.id, branchId: actor.branchId || state.branches[0].id, patientId: validation.patient.id, issuedAt: now, dueDate: state.referenceDate, status: 'ISSUED', total: validation.total, paid: 0, balance: validation.total, notes: validation.notes, createdByUserId: actor.userId, createdAt: now, updatedAt: now };
  const itemPrefix = `INVITEM-${String(numberSuffix(id)).padStart(3, '0')}`;
  const invoiceItems = validation.items.map((item, index) => ({ id: `${itemPrefix}-${String(index + 1).padStart(2, '0')}`, invoiceId: id, serviceId: item.service.id, description: item.description || item.service.name, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal, procedureId: item.procedure?.id || null, treatmentPlanItemId: item.procedure?.treatmentPlanItemId || null }));
  if (state.invoices.some(candidate => candidate.id === invoice.id || candidate.invoiceNumber === invoice.invoiceNumber) || invoiceItems.some(item => state.invoiceItems.some(candidate => candidate.id === item.id))) fail({ duplicate: 'A conflicting invoice identifier was generated. Please try again.' });
  // Validation completes before mutation so no partial invoice/item set can be persisted.
  state.invoices.push(invoice);
  state.invoiceItems.push(...invoiceItems);
  const audit = { id: nextNumber(state.auditLogs, 'AUDIT', 3), organizationId: state.organization.id, branchId: invoice.branchId, actorUserId: actor.userId, actionCode: 'INVOICE_CREATED', entityType: 'INVOICE', entityId: invoice.id, occurredAt: now, summary: `Invoice ${invoice.invoiceNumber} created for ${validation.patient.patientNumber}.`, metadata: { patientId: invoice.patientId, invoiceItemCount: invoiceItems.length, total: invoice.total } };
  state.auditLogs.push(audit);
  return { invoice, invoiceItems, audit };
};

export const validateInvoiceRuntime = state => {
  const errors = [], invoiceIds = new Set(), itemIds = new Set();
  state.invoices.forEach(invoice => {
    if (invoiceIds.has(invoice.id)) errors.push(`Duplicate invoice ID ${invoice.id}.`); else invoiceIds.add(invoice.id);
    const total = calculateInvoiceTotal(state, invoice.id), paid = calculateInvoicePaid(state, invoice.id), balance = calculateInvoiceBalance(state, invoice.id), status = deriveInvoiceStatus(state, invoice.id);
    if (!INVOICE_STATUSES.has(invoice.status) || !state.patients.some(patient => patient.id === invoice.patientId) || total <= 0 || paid < 0 || balance < 0 || total !== invoice.total || paid !== invoice.paid || balance !== invoice.balance || status !== invoice.status) errors.push(`Invoice totals or status are invalid for ${invoice.id}.`);
  });
  state.invoiceItems.forEach(item => {
    if (itemIds.has(item.id)) errors.push(`Duplicate invoice item ID ${item.id}.`); else itemIds.add(item.id);
    const invoice = state.invoices.find(candidate => candidate.id === item.invoiceId), service = state.services.find(candidate => candidate.id === item.serviceId), procedure = item.procedureId ? state.proceduresPerformed.find(candidate => candidate.id === item.procedureId) : null;
    if (!invoice || !service || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isSafeInteger(item.unitPrice) || item.unitPrice <= 0 || item.lineTotal !== item.unitPrice * item.quantity || (item.procedureId && (!procedure || procedure.patientId !== invoice.patientId))) errors.push(`Invalid invoice item ${item.id}.`);
  });
  return { valid: errors.length === 0, errors };
};
