import { element } from '../components/dom.js';
import { createBadge, createButton, createCard, createPageHeader } from '../components/primitives.js';
import { createTable } from '../components/data-display.js';
import { openModal } from '../components/overlays.js';
import { formatDate, formatStatus, formatTime, formatUGX } from '../utils/formatters.js';

const serviceName = (state, procedure) => state.services.find(service => service.id === procedure.serviceId)?.name || procedure.serviceCode;
const patientName = (state, patientId) => state.patients.find(patient => patient.id === patientId)?.fullName || 'Unknown patient';
const dentistName = (state, userId) => state.users.find(user => user.id === userId)?.fullName || 'Not recorded';
const procedureSurfaces = (state, procedure) => state.procedureSurfaces.filter(surface => surface.procedureId === procedure.id).map(surface => surface.surfaceCode).join(', ') || '—';

// Read-only shared history; clinical completion is initiated only from an eligible treatment-plan item.
export const renderProcedureHistory = ({ state, session }) => {
  let activeModal = null;
  const procedures = [...state.proceduresPerformed].sort((left, right) => right.performedAt.localeCompare(left.performedAt) || right.procedureNumber.localeCompare(left.procedureNumber));
  const showDetails = procedure => {
    const planItem = procedure.treatmentPlanItemId ? state.treatmentPlanItems.find(item => item.id === procedure.treatmentPlanItemId) : null;
    const plan = planItem ? state.treatmentPlans.find(item => item.id === planItem.treatmentPlanId) : null;
    const encounter = procedure.encounterId ? state.clinicalEncounters.find(item => item.id === procedure.encounterId) : null;
    const details = [
      ['Patient', patientName(state, procedure.patientId)], ['Service', serviceName(state, procedure)], ['Performed', `${formatDate(procedure.performedAt)} at ${formatTime(procedure.performedAt)}`], ['Dentist', dentistName(state, procedure.dentistUserId)], ['Tooth', procedure.toothCode || 'General procedure'], ['Surfaces', procedureSurfaces(state, procedure)], ['Treatment plan', plan?.treatmentPlanNumber || 'Not linked'], ['Encounter', encounter?.encounterNumber || 'Not linked'], ['Status', formatStatus(procedure.status)], ['Note', procedure.notes || 'No procedure note recorded.']
    ];
    activeModal = openModal({ title: `Procedure ${procedure.procedureNumber}`, content: element('dl', { className: 'procedure-history__details' }, details.map(([label, value]) => element('div', {}, [element('dt', { text: label }), element('dd', { text: value })]))), footer: createButton({ label: 'Close', variant: 'secondary', onClick: () => activeModal?.close() }), onClose: () => { activeModal = null; } });
  };
  const rows = procedures.map(procedure => ({ procedure: procedure.procedureNumber, patient: patientName(state, procedure.patientId), performed: `${formatDate(procedure.performedAt)} · ${formatTime(procedure.performedAt)}`, service: serviceName(state, procedure), tooth: procedure.toothCode ? `${procedure.toothCode} · ${procedureSurfaces(state, procedure)}` : 'General', dentist: dentistName(state, procedure.dentistUserId), plan: procedure.treatmentPlanItemId || 'Standalone', status: { label: formatStatus(procedure.status), variant: 'success' }, amount: formatUGX(procedure.amountSnapshot), actions: [{ label: 'View procedure details', icon: 'file-text', onClick: () => showDetails(procedure) }] }));
  const table = createTable({ stickyHeader: true, columns: [{ label: 'Procedure', key: 'procedure' }, { label: 'Patient', key: 'patient' }, { label: 'Performed', key: 'performed' }, { label: 'Service', key: 'service' }, { label: 'Tooth / surfaces', key: 'tooth' }, { label: 'Dentist', key: 'dentist' }, { label: 'Plan item', key: 'plan' }, { label: 'Status', key: 'status', type: 'badge' }, { label: 'Service value', key: 'amount', numeric: true }, { label: 'Actions', key: 'actions', type: 'actions' }], rows, empty: { title: 'No completed procedures', message: 'Completed clinical procedures will appear here.' } });
  return element('section', { className: 'procedure-history' }, [createPageHeader({ title: 'Procedures Performed', description: session.role === 'Dentist' ? 'Read-only history of completed clinical procedures. Record new treatment from an accepted treatment-plan item.' : 'Read-only oversight of completed clinical procedures.' }), createCard({ title: 'Completed Procedures', subtitle: `${procedures.length} recorded procedure${procedures.length === 1 ? '' : 's'}.`, content: table })]);
};
