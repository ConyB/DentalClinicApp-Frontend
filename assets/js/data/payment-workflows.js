import { calculateInvoiceBalance, calculateInvoicePaid, calculateInvoiceTotal, deriveInvoiceStatus, getInvoiceById } from './finance.js';

const PAYMENT_METHODS = new Set(['CASH', 'MOBILE_MONEY', 'BANK', 'CARD', 'OTHER']);
const numberSuffix = value => Number(String(value || '').match(/(\d+)(?!.*\d)/)?.[1] || 0);
const nextNumber = (records, prefix, width = 6) => `${prefix}-${String(Math.max(0, ...records.map(record => numberSuffix(record.id || record.paymentNumber || record.receiptNumber))) + 1).padStart(width, '0')}`;
const timestamp = state => `${state.referenceDate}T10:00:00+03:00`;
const activeFinanceUser = (state, userId) => state.users.find(user => user.id === userId && user.status === 'active' && ['cashier', 'clinic_administrator'].includes(user.roleCode)) || null;
const fail = errors => { const error = new Error(Object.values(errors)[0] || 'Payment input is invalid.'); error.fieldErrors = errors; throw error; };

export const paymentMethodLabel = code => ({ CASH: 'Cash', MOBILE_MONEY: 'Mobile Money', BANK: 'Bank', CARD: 'Card', OTHER: 'Other' }[code] || 'Not recorded');
export const getPaymentPermissions = ({ state, actor } = {}) => ({
  canView: ['Clinic Administrator', 'Cashier'].includes(actor?.role),
  canRecord: ['Clinic Administrator', 'Cashier'].includes(actor?.role) && Boolean(activeFinanceUser(state, actor?.userId)),
  canPrint: ['Clinic Administrator', 'Cashier'].includes(actor?.role)
});

export const validatePaymentInput = ({ state, invoiceId, amount, paymentMethodCode, transactionReference = '', notes = '', actor } = {}) => {
  const errors = {}, invoice = getInvoiceById(state, invoiceId), parsedAmount = Number(amount), method = String(paymentMethodCode || '').trim().toUpperCase();
  if (!getPaymentPermissions({ state, actor }).canRecord) errors.permission = 'Only an active Cashier or Clinic Administrator may record a payment.';
  if (!invoice) errors.invoiceId = 'Select a valid outstanding invoice.';
  const balance = invoice ? calculateInvoiceBalance(state, invoice.id) : 0;
  if (invoice && (invoice.status === 'VOID' || balance <= 0)) errors.invoiceId = 'This invoice is already fully settled or is not eligible for payment.';
  if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) errors.amount = 'Payment amount must be a positive whole-UGX amount.';
  if (invoice && Number.isSafeInteger(parsedAmount) && parsedAmount > balance) errors.amount = `Payment cannot exceed the remaining balance of ${balance}.`;
  if (!PAYMENT_METHODS.has(method) || !state.paymentMethods.some(candidate => candidate.code === method && candidate.status === 'active')) errors.paymentMethodCode = 'Select a supported payment method.';
  if (String(transactionReference || '').trim().length > 120) errors.transactionReference = 'Transaction reference must be 120 characters or fewer.';
  if (String(notes || '').trim().length > 255) errors.notes = 'Payment notes must be 255 characters or fewer.';
  return { valid: Object.keys(errors).length === 0, errors, invoice, amount: parsedAmount, paymentMethodCode: method, transactionReference: String(transactionReference || '').trim() || null, notes: String(notes || '').trim() || null, balance };
};

// A posted payment and its receipt are one financial event in this frontend model.
export const recordPayment = ({ state, invoiceId, amount, paymentMethodCode, transactionReference, notes, actor } = {}) => {
  const validation = validatePaymentInput({ state, invoiceId, amount, paymentMethodCode, transactionReference, notes, actor });
  if (!validation.valid) fail(validation.errors);
  // Validate again at mutation time so an already-settled invoice can never accept a stale second payment.
  const currentBalance = calculateInvoiceBalance(state, validation.invoice.id);
  if (currentBalance <= 0 || validation.amount > currentBalance) fail({ amount: 'This invoice balance changed. Reopen the payment form and try again.' });
  const now = timestamp(state), paymentId = nextNumber(state.payments, 'PAY'), receiptId = nextNumber(state.receipts, 'RCT');
  if (state.payments.some(payment => payment.id === paymentId || payment.paymentNumber === paymentId) || state.receipts.some(receipt => receipt.id === receiptId || receipt.receiptNumber === receiptId)) fail({ duplicate: 'A conflicting financial identifier was generated. Please try again.' });
  const payment = { id: paymentId, paymentNumber: paymentId, organizationId: state.organization.id, branchId: actor.branchId || validation.invoice.branchId, invoiceId: validation.invoice.id, patientId: validation.invoice.patientId, amount: validation.amount, paymentMethodCode: validation.paymentMethodCode, transactionReference: validation.transactionReference, status: 'POSTED', receivedAt: now, receivedByUserId: actor.userId, notes: validation.notes };
  const receipt = { id: receiptId, receiptNumber: receiptId, organizationId: state.organization.id, branchId: payment.branchId, paymentId: payment.id, invoiceId: payment.invoiceId, patientId: payment.patientId, amount: payment.amount, status: 'ISSUED', issuedAt: now, issuedByUserId: actor.userId };
  // Mutate only after all validations and collision checks pass.
  state.payments.push(payment); state.receipts.push(receipt);
  const total = calculateInvoiceTotal(state, validation.invoice.id), paid = calculateInvoicePaid(state, validation.invoice.id), balance = calculateInvoiceBalance(state, validation.invoice.id);
  Object.assign(validation.invoice, { paid, balance, status: deriveInvoiceStatus(state, validation.invoice.id), updatedAt: now });
  const paymentAudit = { id: nextNumber(state.auditLogs, 'AUDIT', 3), organizationId: state.organization.id, branchId: payment.branchId, actorUserId: actor.userId, actionCode: 'PAYMENT_RECORDED', entityType: 'PAYMENT', entityId: payment.id, occurredAt: now, summary: `Payment ${payment.paymentNumber} recorded for ${validation.invoice.invoiceNumber}.`, metadata: { invoiceId: payment.invoiceId, patientId: payment.patientId, amount: payment.amount, paymentMethodCode: payment.paymentMethodCode } };
  const receiptAudit = { id: nextNumber([...state.auditLogs, paymentAudit], 'AUDIT', 3), organizationId: state.organization.id, branchId: receipt.branchId, actorUserId: actor.userId, actionCode: 'RECEIPT_ISSUED', entityType: 'RECEIPT', entityId: receipt.id, occurredAt: now, summary: `Receipt ${receipt.receiptNumber} issued for ${payment.paymentNumber}.`, metadata: { paymentId: payment.id, invoiceId: payment.invoiceId, patientId: payment.patientId, amount: receipt.amount } };
  state.auditLogs.push(paymentAudit, receiptAudit);
  return { payment, receipt, invoice: validation.invoice, totals: { total, paid, balance }, audits: [paymentAudit, receiptAudit] };
};

export const validatePaymentRuntime = state => {
  const errors = [], paymentIds = new Set(), receiptIds = new Set();
  state.payments.forEach(payment => {
    if (paymentIds.has(payment.id)) errors.push(`Duplicate payment ID ${payment.id}.`); else paymentIds.add(payment.id);
    const invoice = getInvoiceById(state, payment.invoiceId);
    if (!invoice || payment.status !== 'POSTED' || payment.patientId !== invoice.patientId || !PAYMENT_METHODS.has(payment.paymentMethodCode) || !Number.isSafeInteger(payment.amount) || payment.amount <= 0 || !state.users.some(user => user.id === payment.receivedByUserId)) errors.push(`Invalid payment ${payment.id}.`);
  });
  state.receipts.forEach(receipt => {
    if (receiptIds.has(receipt.id)) errors.push(`Duplicate receipt ID ${receipt.id}.`); else receiptIds.add(receipt.id);
    const payment = state.payments.find(candidate => candidate.id === receipt.paymentId);
    if (!payment || receipt.status !== 'ISSUED' || receipt.invoiceId !== payment.invoiceId || receipt.patientId !== payment.patientId || receipt.amount !== payment.amount || !state.users.some(user => user.id === receipt.issuedByUserId)) errors.push(`Invalid receipt ${receipt.id}.`);
  });
  state.payments.filter(payment => payment.status === 'POSTED').forEach(payment => { if (state.receipts.filter(receipt => receipt.paymentId === payment.id).length !== 1) errors.push(`Posted payment ${payment.id} must have exactly one receipt.`); });
  return { valid: errors.length === 0, errors };
};
