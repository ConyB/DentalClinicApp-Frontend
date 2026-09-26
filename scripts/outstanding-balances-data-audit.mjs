import { createCanonicalDemoState } from '../assets/js/data/demo.js';
import { recordPayment } from '../assets/js/data/payment-workflows.js';
import { calculateInvoiceBalance, deriveInvoiceStatus, getOutstandingBalance, getOutstandingInvoices, getPatientFinancialSummary, getTodayCollections, getTotalPostedPayments } from '../assets/js/data/finance.js';
import { buildReport } from '../assets/js/data/reports.js';
import { validateCanonicalDemoState, validateRuntimeState } from '../assets/js/data/integrity.js';

const assert = (value, message) => { if (!value) throw new Error(message); };
const cashier = { role: 'Cashier', userId: 'U005', branchId: 'BR-MAIN' };
const patientName = (state, invoice) => state.patients.find(patient => patient.id === invoice.patientId)?.fullName;

try {
  const canonical = createCanonicalDemoState(), snapshot = JSON.stringify(canonical);
  const outstanding = getOutstandingInvoices(canonical);
  assert(getOutstandingBalance(canonical) === 420000, 'Canonical outstanding total is not UGX 420,000.');
  assert(JSON.stringify(outstanding.map(invoice => invoice.id)) === JSON.stringify(['INV-000605', 'INV-000602', 'INV-000604']), 'Default outstanding order is not Joseph, Amina, Samuel.');
  assert(JSON.stringify(outstanding.map(invoice => [patientName(canonical, invoice), calculateInvoiceBalance(canonical, invoice.id), deriveInvoiceStatus(canonical, invoice.id)])) === JSON.stringify([['Joseph Walusimbi', 300000, 'PARTIALLY_PAID'], ['Amina Nakato', 70000, 'PARTIALLY_PAID'], ['Samuel Kato', 50000, 'PARTIALLY_PAID']]), 'Canonical outstanding patient balances are incorrect.');
  assert(!outstanding.some(invoice => ['INV-000601', 'INV-000603', 'INV-000606'].includes(invoice.id)), 'A fully paid invoice was included.');
  assert(JSON.stringify(canonical) === snapshot, 'Outstanding selectors mutated canonical state.');

  const runtime = createCanonicalDemoState(), beforePayments = runtime.payments.length, beforeReceipts = runtime.receipts.length;
  const partial = recordPayment({ state: runtime, invoiceId: 'INV-000605', amount: 100000, paymentMethodCode: 'CASH', actor: cashier });
  assert(partial.totals.balance === 200000 && getOutstandingBalance(runtime) === 320000 && getOutstandingInvoices(runtime)[0].id === 'INV-000605', 'Partial settlement did not update derived balances.');
  assert(getPatientFinancialSummary(runtime, partial.payment.patientId).outstandingBalance === 200000, 'Patient finance summary did not reconcile after partial settlement.');
  const report = buildReport({ state: runtime, type: 'finance', filters: {}, role: cashier.role, userId: cashier.userId });
  assert(report.metrics.find(([label]) => label === 'Current Outstanding')?.[1] === 320000, 'Finance report did not reconcile after partial settlement.');

  const full = recordPayment({ state: runtime, invoiceId: 'INV-000602', amount: 70000, paymentMethodCode: 'CASH', actor: cashier });
  assert(full.totals.balance === 0 && deriveInvoiceStatus(runtime, 'INV-000602') === 'PAID' && !getOutstandingInvoices(runtime).some(invoice => invoice.id === 'INV-000602'), 'Fully settled invoice remained outstanding.');
  const mutationSnapshot = JSON.stringify({ payments: runtime.payments, receipts: runtime.receipts, invoices: runtime.invoices, auditLogs: runtime.auditLogs });
  for (const amount of [50001, 0]) {
    try { recordPayment({ state: runtime, invoiceId: 'INV-000604', amount, paymentMethodCode: 'CASH', actor: cashier }); throw new Error(`Invalid payment ${amount} was accepted.`); } catch (error) { assert(!String(error.message).includes('was accepted'), error.message); }
  }
  try { recordPayment({ state: runtime, invoiceId: 'INV-000602', amount: 1, paymentMethodCode: 'CASH', actor: cashier }); throw new Error('A settled invoice accepted a second payment.'); } catch (error) { assert(!String(error.message).includes('accepted a second payment'), error.message); }
  assert(JSON.stringify({ payments: runtime.payments, receipts: runtime.receipts, invoices: runtime.invoices, auditLogs: runtime.auditLogs }) === mutationSnapshot, 'Rejected payment mutated finance state.');
  assert(runtime.payments.length === beforePayments + 2 && runtime.receipts.length === beforeReceipts + 2 && partial.payment.amount === partial.receipt.amount && full.payment.amount === full.receipt.amount, 'Payment/receipt one-to-one integrity failed.');
  const runtimeValidation = validateRuntimeState(runtime); assert(runtimeValidation.valid, runtimeValidation.errors.join(' | '));

  const reset = createCanonicalDemoState(), resetValidation = validateCanonicalDemoState(reset);
  assert(resetValidation.valid && getOutstandingBalance(reset) === 420000 && getTotalPostedPayments(reset) === 2360000 && getTodayCollections(reset) === 360000 && reset.payments.filter(payment => payment.status === 'POSTED' && payment.receivedAt.slice(0, 10) === reset.referenceDate).length === 2, 'Canonical reset finance baseline is invalid.');
  console.log(JSON.stringify({ status: 'pass', canonical: { order: ['Joseph Walusimbi', 'Amina Nakato', 'Samuel Kato'], balances: [300000, 70000, 50000], total: 420000 }, paymentIntegration: { partial: partial.payment.id, full: full.payment.id, receipts: [partial.receipt.id, full.receipt.id], overpayment: 'rejected', doubleSettlement: 'rejected' }, reconciliation: { patientProfile: 'pass', reports: 'pass', invoice: 'pass' }, reset: { outstanding: 420000, totalPayments: 2360000, todayCollections: 360000, paymentsToday: 2 } }, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
