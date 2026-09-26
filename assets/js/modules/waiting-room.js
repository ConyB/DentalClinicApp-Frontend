import { element } from '../components/dom.js';
import { createBadge, createButton, createEmptyState, createKpiCard, createPageHeader, createSearch } from '../components/primitives.js';
import { confirm, openModal, showToast } from '../components/overlays.js';
import { state as appState } from '../core/state.js';
import { getWaitingRoomData } from '../data/waiting-room.js';
import { formatStatus, formatTime } from '../utils/formatters.js';

const statusVariant = status => ({ WAITING: 'warning', IN_TREATMENT: 'info', SCHEDULED: 'info', CONFIRMED: 'success' }[status] || 'neutral');
const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const appointmentTime = appointment => formatTime(appointment?.startDateTime);
const personLabel = candidate => `${candidate.patient?.fullName || 'Patient'} · ${candidate.patient?.patientNumber || 'No patient number'}`;

const queueRow = ({ entry, showPosition = false, onStartTreatment = null, onOpenClinical = null }) => {
  const canStartTreatment = entry.status === 'WAITING' && entry.canStartTreatment && onStartTreatment;
  const hasAction = canStartTreatment || (entry.status === 'IN_TREATMENT' && onOpenClinical);
  const action = canStartTreatment ? element('div', { className: 'waiting-room__queue-action' }, [createButton({ label: 'Start Treatment', size: 'small', onClick: () => onStartTreatment(entry) })]) : entry.status === 'IN_TREATMENT' && onOpenClinical ? element('div', { className: 'waiting-room__queue-action' }, [createButton({ label: 'Open Clinical Encounter', size: 'small', onClick: () => onOpenClinical(entry) })]) : null;
  return element('article', { className: `waiting-room__queue-row${hasAction ? ' waiting-room__queue-row--actionable' : ''}` }, [
  showPosition ? element('span', { className: 'waiting-room__position', text: String(entry.position), 'aria-label': `Queue position ${entry.position}` }) : element('span', { className: 'waiting-room__position waiting-room__position--treatment', text: '•', 'aria-hidden': 'true' }),
  element('div', { className: 'waiting-room__queue-info' }, [
    element('div', { className: 'waiting-room__patient' }, [
      element('a', { href: `#/patients/${entry.patientId}`, text: entry.patient?.fullName || 'Patient' }),
      element('span', { text: entry.patient?.patientNumber || 'Patient number unavailable' })
    ]),
    element('div', { className: 'waiting-room__detail' }, [element('span', { text: 'Appointment' }), element('strong', { text: appointmentTime(entry.appointment) })]),
    element('div', { className: 'waiting-room__detail' }, [element('span', { text: 'Arrival' }), element('strong', { text: formatTime(entry.arrivalAt) })]),
    element('div', { className: 'waiting-room__detail' }, [element('span', { text: 'Dentist' }), element('strong', { text: entry.dentist?.fullName || 'Unassigned' })]),
    element('div', { className: 'waiting-room__detail' }, [element('span', { text: entry.status === 'WAITING' ? 'Waiting' : 'Treatment started' }), element('strong', { text: entry.status === 'WAITING' ? `${entry.waitingMinutes} min` : formatTime(entry.treatmentStartedAt) })])
  ]),
  element('div', { className: 'waiting-room__queue-actions' }, [createBadge({ label: formatStatus(entry.status), variant: statusVariant(entry.status) }), action])
  ]);
};

const queueSection = ({ title, description, entries, waiting = false, onStartTreatment = null, onOpenClinical = null, className = '' }) => element('section', { className: `waiting-room__section card ${className}`.trim() }, [
  element('header', { className: 'waiting-room__section-header' }, [element('div', {}, [element('h2', { text: title }), element('p', { text: description })]), element('span', { className: 'waiting-room__count', text: String(entries.length) })]),
  entries.length ? element('div', { className: 'waiting-room__queue-list', 'aria-label': title }, entries.map(entry => queueRow({ entry, showPosition: waiting, onStartTreatment, onOpenClinical }))) : createEmptyState({ title: waiting ? 'No patients currently waiting.' : 'No patients currently in treatment.', message: waiting ? 'Checked-in patients will appear here.' : 'Patients will appear here once treatment has started.' })
]);

const candidateRow = ({ candidate, selected, onSelect, showAction }) => {
  const { appointment, patient, dentist, appointmentType } = candidate;
  const row = element('article', { className: `waiting-room__arrival${selected ? ' is-selected' : ''}` }, [
    element('div', { className: 'waiting-room__arrival-main' }, [
      element('strong', { text: personLabel(candidate) }),
      element('span', { text: `${appointment.appointmentNumber} · ${appointmentTime(appointment)} · ${appointmentType?.name || 'Appointment'}` }),
      element('span', { text: dentist?.fullName || 'Dentist not assigned' })
    ]),
    createBadge({ label: formatStatus(appointment.status), variant: statusVariant(appointment.status) }),
    showAction ? createButton({ label: 'Check In', variant: 'secondary', size: 'small', onClick: () => onSelect(appointment.id) }) : null
  ]);
  return row;
};

const openCheckIn = ({ state, session, appointmentId = null }) => {
  const data = getWaitingRoomData({ state, role: session.role, userId: session.userId });
  let selectedId = appointmentId;
  let modal;
  let submitting = false;
  const search = createSearch({ label: 'Search expected arrivals', placeholder: 'Search patient or appointment…' });
  const choices = element('div', { className: 'waiting-room__arrival-list waiting-room__arrival-list--modal' });
  const preview = element('section', { className: 'waiting-room__checkin-preview', 'aria-live': 'polite' });
  const submit = createButton({ label: 'Check In Patient', disabled: !selectedId, onClick: () => {
    if (!selectedId || submitting) return;
    submitting = true; submit.disabled = true;
    try {
      const result = appState.checkInAppointment({ appointmentId: selectedId, actor: { role: session.role, userId: session.userId } });
      modal?.close();
      showToast({ title: 'Patient checked in successfully.', message: `${result.appointment.appointmentNumber} is now waiting.`, variant: 'success' });
      refresh();
    } catch (error) {
      submitting = false; submit.disabled = false;
      showToast({ title: 'Unable to check in patient.', message: error.message, variant: 'error' });
    }
  } });
  const visibleCandidates = () => {
    const query = search.querySelector('input').value.trim().toLowerCase();
    return data.eligibleArrivals.filter(candidate => !query || [candidate.patient?.fullName, candidate.patient?.patientNumber, candidate.patient?.phone, candidate.appointment.appointmentNumber].some(value => String(value || '').toLowerCase().includes(query)));
  };
  const render = () => {
    const selected = data.eligibleArrivals.find(candidate => candidate.appointment.id === selectedId);
    submit.disabled = !selected || submitting;
    preview.replaceChildren(...(selected ? [
      element('h3', { text: 'Check-in review' }),
      element('p', { text: `${personLabel(selected)} · ${selected.patient?.phone || 'No phone recorded'}` }),
      element('dl', { className: 'waiting-room__review-details' }, [
        element('dt', { text: 'Appointment' }), element('dd', { text: `${selected.appointment.appointmentNumber} at ${appointmentTime(selected.appointment)}` }),
        element('dt', { text: 'Dentist' }), element('dd', { text: selected.dentist?.fullName || 'Unassigned' }),
        element('dt', { text: 'Type' }), element('dd', { text: selected.appointmentType?.name || 'Appointment' })
      ])
    ] : [element('p', { text: 'Select an expected arrival to review before check-in.' })]));
    const candidates = visibleCandidates();
    choices.replaceChildren(...(candidates.length ? candidates.map(candidate => candidateRow({ candidate, selected: candidate.appointment.id === selectedId, showAction: true, onSelect: id => { selectedId = id; render(); } })) : [createEmptyState({ title: 'No expected arrivals match.', message: 'Try a different patient, appointment number, or phone search.' })]));
  };
  search.querySelector('input').addEventListener('input', render);
  modal = openModal({ title: 'Check In Patient', size: 'medium', content: element('div', { className: 'waiting-room__checkin-modal' }, [element('p', { text: 'Choose an eligible arrival, review the appointment context, then confirm check-in.' }), search, choices, preview]), footer: element('div', { className: 'button-group waiting-room__modal-actions' }, [createButton({ label: 'Cancel', variant: 'secondary', onClick: () => modal?.close() }), submit]) });
  render();
};

export const renderWaitingRoom = ({ state, session }) => {
  const data = getWaitingRoomData({ state, role: session.role, userId: session.userId });
  const page = element('section', { className: 'waiting-room' });
  let transitionLocked = false;
  const startTreatment = async entry => {
    if (transitionLocked) return;
    transitionLocked = true;
    const approved = await confirm({ title: `Start treatment for ${entry.patient?.fullName || 'this patient'}?`, message: `Assigned Dentist: ${entry.dentist?.fullName || 'Unassigned'}. This updates the operational queue only.`, confirmLabel: 'Start Treatment' });
    if (!approved) { transitionLocked = false; return; }
    try {
      const result = appState.startQueueTreatment({ queueEntryId: entry.id, actor: { role: session.role, userId: session.userId } });
      showToast({ title: 'Treatment started.', message: `${result.appointment.appointmentNumber} is now in treatment.`, variant: 'success' });
      refresh();
    } catch (error) {
      transitionLocked = false;
      showToast({ title: 'Unable to start treatment.', message: error.message, variant: 'error' });
    }
  };
  const actions = data.access.canCheckIn ? [{ label: 'Check In Patient', onClick: () => openCheckIn({ state, session }) }] : [];
  const arrivals = element('section', { className: 'waiting-room__arrivals waiting-room__panel waiting-room__panel--arrivals card' }, [
    element('header', { className: 'waiting-room__section-header' }, [element('div', {}, [element('h2', { text: 'Expected Arrivals' }), element('p', { text: 'Today’s scheduled or confirmed appointments ready for front-desk arrival.' })]), element('span', { className: 'waiting-room__count', text: String(data.eligibleArrivals.length) })]),
    data.eligibleArrivals.length ? element('div', { className: 'waiting-room__arrival-list' }, data.eligibleArrivals.map(candidate => candidateRow({ candidate, showAction: data.access.canCheckIn, onSelect: id => openCheckIn({ state, session, appointmentId: id }) }))) : createEmptyState({ title: 'No further arrivals expected.', message: 'Eligible appointments will appear here for check-in.' })
  ]);
  page.append(
    createPageHeader({ title: 'Waiting Room', description: 'Track today’s patient arrivals and active clinical queue.', actions }),
    element('section', { className: 'waiting-room__kpis', 'aria-label': 'Queue summary' }, [
      createKpiCard({ label: 'Active Queue', value: data.activeQueue.length, icon: 'clock', context: 'Today' }),
      createKpiCard({ label: 'Waiting', value: data.waiting.length, icon: 'clock', context: 'Awaiting treatment' }),
      createKpiCard({ label: 'In Treatment', value: data.inTreatment.length, icon: 'clinical', context: 'With Dentist' })
    ]),
    element('div', { className: 'waiting-room__workspace' }, [
      queueSection({ title: 'Waiting', description: 'Ordered by arrival time.', entries: data.waiting, waiting: true, onStartTreatment: startTreatment, className: 'waiting-room__panel waiting-room__panel--waiting' }),
      arrivals,
      queueSection({ title: 'In Treatment', description: 'Read-only clinical status.', entries: data.inTreatment, onOpenClinical: session.role === 'Dentist' ? entry => { location.hash = `#/patients/${entry.patientId}/clinical`; } : null, className: 'waiting-room__panel waiting-room__panel--treatment' })
    ])
  );
  return page;
};
