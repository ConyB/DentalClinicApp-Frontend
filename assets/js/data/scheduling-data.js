import { branches, organization } from './clinic.js';
import { appointmentTypes } from './reference-data.js';

const typeId = code => appointmentTypes.find(type => type.code === code).id;
const appointment = (id, appointmentNumber, patientId, dentistUserId, typeCode, startDateTime, endDateTime, status, reason, fields = {}) => ({
  id, appointmentNumber, organizationId: organization.id, branchId: branches[0].id, patientId, dentistUserId,
  appointmentTypeId: typeId(typeCode), startDateTime, endDateTime, status, reason, notes: null,
  bookingSource: 'APPOINTMENT', bookedByUserId: 'U004', createdAt: fields.createdAt || startDateTime,
  confirmedAt: null, checkedInAt: null, completedAt: null, cancelledAt: null, cancellationReason: null,
  rescheduledFromAppointmentId: null, ...fields
});

export const appointments = [
  appointment('APT-000091', 'APT-000091', 'P008', 'U003', 'EMERGENCY', '2026-09-15T13:00:00+03:00', '2026-09-15T13:30:00+03:00', 'NO_SHOW', 'Emergency dental concern', { createdAt: '2026-09-14T10:00:00+03:00' }),
  appointment('APT-000092', 'APT-000092', 'P004', 'U002', 'REVIEW', '2026-09-18T10:00:00+03:00', '2026-09-18T10:30:00+03:00', 'COMPLETED', 'Treatment review', { createdAt: '2026-09-10T09:00:00+03:00', confirmedAt: '2026-09-17T15:00:00+03:00', checkedInAt: '2026-09-18T09:52:00+03:00', completedAt: '2026-09-18T10:32:00+03:00' }),
  appointment('APT-000093', 'APT-000093', 'P005', 'U003', 'CONSULTATION', '2026-09-19T11:00:00+03:00', '2026-09-19T11:30:00+03:00', 'COMPLETED', 'Initial consultation', { createdAt: '2026-09-12T10:00:00+03:00', confirmedAt: '2026-09-18T14:00:00+03:00', checkedInAt: '2026-09-19T10:55:00+03:00', completedAt: '2026-09-19T11:32:00+03:00' }),
  appointment('APT-000094', 'APT-000094', 'P001', 'U002', 'CONSULTATION', '2026-09-20T11:00:00+03:00', '2026-09-20T11:30:00+03:00', 'COMPLETED', 'Consultation for sensitivity', { createdAt: '2026-09-12T09:00:00+03:00', confirmedAt: '2026-09-19T12:00:00+03:00', checkedInAt: '2026-09-20T10:54:00+03:00', completedAt: '2026-09-20T11:35:00+03:00' }),
  appointment('APT-000095', 'APT-000095', 'P007', 'U002', 'DENTURE_REVIEW', '2026-09-20T14:00:00+03:00', '2026-09-20T14:30:00+03:00', 'RESCHEDULED', 'Denture review', { createdAt: '2026-09-12T12:00:00+03:00' }),
  appointment('APT-000101', 'APT-000101', 'P003', 'U002', 'SCALING_POLISHING', '2026-09-21T08:00:00+03:00', '2026-09-21T08:45:00+03:00', 'COMPLETED', 'Routine scaling and polishing', { createdAt: '2026-09-10T09:00:00+03:00', confirmedAt: '2026-09-20T11:00:00+03:00', checkedInAt: '2026-09-21T07:54:00+03:00', completedAt: '2026-09-21T08:47:00+03:00' }),
  appointment('APT-000102', 'APT-000102', 'P009', 'U003', 'CONSULTATION', '2026-09-21T09:00:00+03:00', '2026-09-21T09:30:00+03:00', 'WAITING', 'First consultation', { createdAt: '2026-09-18T10:00:00+03:00', confirmedAt: '2026-09-20T14:00:00+03:00', checkedInAt: '2026-09-21T08:52:00+03:00' }),
  appointment('APT-000103', 'APT-000103', 'P001', 'U002', 'FILLING', '2026-09-21T09:30:00+03:00', '2026-09-21T10:10:00+03:00', 'IN_TREATMENT', 'Composite filling', { createdAt: '2026-09-20T12:00:00+03:00', confirmedAt: '2026-09-20T15:00:00+03:00', checkedInAt: '2026-09-21T09:18:00+03:00' }),
  appointment('APT-000104', 'APT-000104', 'P002', 'U003', 'REVIEW', '2026-09-21T10:30:00+03:00', '2026-09-21T11:00:00+03:00', 'CONFIRMED', 'Clinical review', { createdAt: '2026-09-15T10:00:00+03:00', confirmedAt: '2026-09-20T15:30:00+03:00' }),
  appointment('APT-000105', 'APT-000105', 'P007', 'U002', 'DENTURE_REVIEW', '2026-09-21T11:30:00+03:00', '2026-09-21T12:00:00+03:00', 'SCHEDULED', 'Denture review', { createdAt: '2026-09-20T16:00:00+03:00', rescheduledFromAppointmentId: 'APT-000095' }),
  appointment('APT-000106', 'APT-000106', 'P008', 'U003', 'EMERGENCY', '2026-09-21T13:00:00+03:00', '2026-09-21T13:30:00+03:00', 'CONFIRMED', 'Emergency dental concern', { createdAt: '2026-09-20T09:00:00+03:00', confirmedAt: '2026-09-21T08:00:00+03:00' }),
  appointment('APT-000107', 'APT-000107', 'P013', 'U002', 'FILLING', '2026-09-21T14:00:00+03:00', '2026-09-21T14:40:00+03:00', 'SCHEDULED', 'Primary tooth filling', { createdAt: '2026-09-18T13:00:00+03:00' }),
  appointment('APT-000108', 'APT-000108', 'P010', 'U003', 'CONSULTATION', '2026-09-21T15:00:00+03:00', '2026-09-21T15:30:00+03:00', 'SCHEDULED', 'Dental consultation', { createdAt: '2026-09-18T14:00:00+03:00' }),
  appointment('APT-000109', 'APT-000109', 'P011', 'U002', 'REVIEW', '2026-09-21T16:00:00+03:00', '2026-09-21T16:30:00+03:00', 'CANCELLED', 'Review appointment', { createdAt: '2026-09-18T15:00:00+03:00', cancelledAt: '2026-09-21T15:15:00+03:00', cancellationReason: 'Patient requested cancellation' })
];

const history = (id, appointmentId, fromStatus, toStatus, changedAt, changedByUserId, reason = null) => ({ id, appointmentId, fromStatus, toStatus, changedAt, changedByUserId, reason });
export const appointmentStatusHistory = [
  history('APSH-101-01', 'APT-000101', null, 'SCHEDULED', '2026-09-10T09:00:00+03:00', 'U004'), history('APSH-101-02', 'APT-000101', 'SCHEDULED', 'CONFIRMED', '2026-09-20T11:00:00+03:00', 'U004'), history('APSH-101-03', 'APT-000101', 'CONFIRMED', 'CHECKED_IN', '2026-09-21T07:54:00+03:00', 'U004'), history('APSH-101-04', 'APT-000101', 'CHECKED_IN', 'WAITING', '2026-09-21T07:56:00+03:00', 'U004'), history('APSH-101-05', 'APT-000101', 'WAITING', 'IN_TREATMENT', '2026-09-21T08:02:00+03:00', 'U002'), history('APSH-101-06', 'APT-000101', 'IN_TREATMENT', 'COMPLETED', '2026-09-21T08:47:00+03:00', 'U002'),
  history('APSH-102-01', 'APT-000102', null, 'SCHEDULED', '2026-09-18T10:00:00+03:00', 'U004'), history('APSH-102-02', 'APT-000102', 'SCHEDULED', 'CONFIRMED', '2026-09-20T14:00:00+03:00', 'U004'), history('APSH-102-03', 'APT-000102', 'CONFIRMED', 'CHECKED_IN', '2026-09-21T08:52:00+03:00', 'U004'), history('APSH-102-04', 'APT-000102', 'CHECKED_IN', 'WAITING', '2026-09-21T08:54:00+03:00', 'U004'),
  history('APSH-103-01', 'APT-000103', null, 'SCHEDULED', '2026-09-20T12:00:00+03:00', 'U004'), history('APSH-103-02', 'APT-000103', 'SCHEDULED', 'CONFIRMED', '2026-09-20T15:00:00+03:00', 'U004'), history('APSH-103-03', 'APT-000103', 'CONFIRMED', 'CHECKED_IN', '2026-09-21T09:18:00+03:00', 'U004'), history('APSH-103-04', 'APT-000103', 'CHECKED_IN', 'WAITING', '2026-09-21T09:21:00+03:00', 'U004'), history('APSH-103-05', 'APT-000103', 'WAITING', 'IN_TREATMENT', '2026-09-21T09:32:00+03:00', 'U002'),
  history('APSH-109-01', 'APT-000109', null, 'SCHEDULED', '2026-09-18T15:00:00+03:00', 'U004'), history('APSH-109-02', 'APT-000109', 'SCHEDULED', 'CANCELLED', '2026-09-21T15:15:00+03:00', 'U004', 'Patient requested cancellation'),
  history('APSH-095-01', 'APT-000095', null, 'SCHEDULED', '2026-09-12T12:00:00+03:00', 'U004'), history('APSH-095-02', 'APT-000095', 'SCHEDULED', 'RESCHEDULED', '2026-09-20T09:00:00+03:00', 'U004', 'Moved to APT-000105')
];

export const appointmentContactLogs = [
  { id: 'APCL-104-01', appointmentId: 'APT-000104', contactMethod: 'PHONE', outcome: 'CONFIRMED', notes: null, contactedByUserId: 'U004', contactedAt: '2026-09-20T15:30:00+03:00' },
  { id: 'APCL-106-01', appointmentId: 'APT-000106', contactMethod: 'PHONE', outcome: 'CONFIRMED', notes: null, contactedByUserId: 'U004', contactedAt: '2026-09-21T08:00:00+03:00' },
  { id: 'APCL-109-01', appointmentId: 'APT-000109', contactMethod: 'PHONE', outcome: 'CANCELLED', notes: 'Patient requested cancellation.', contactedByUserId: 'U004', contactedAt: '2026-09-21T15:15:00+03:00' }
];

export const queueEntries = [
  { id: 'QUEUE-102', organizationId: organization.id, branchId: branches[0].id, appointmentId: 'APT-000102', patientId: 'P009', dentistUserId: 'U003', status: 'WAITING', arrivalAt: '2026-09-21T08:52:00+03:00', waitingAt: '2026-09-21T08:54:00+03:00', treatmentStartedAt: null, readyForCheckoutAt: null, completedAt: null, reason: 'First Consultation', updatedByUserId: 'U004', createdAt: '2026-09-21T08:52:00+03:00', updatedAt: '2026-09-21T08:54:00+03:00' },
  { id: 'QUEUE-103', organizationId: organization.id, branchId: branches[0].id, appointmentId: 'APT-000103', patientId: 'P001', dentistUserId: 'U002', status: 'IN_TREATMENT', arrivalAt: '2026-09-21T09:18:00+03:00', waitingAt: '2026-09-21T09:21:00+03:00', treatmentStartedAt: '2026-09-21T09:32:00+03:00', readyForCheckoutAt: null, completedAt: null, reason: 'Filling', updatedByUserId: 'U002', createdAt: '2026-09-21T09:18:00+03:00', updatedAt: '2026-09-21T09:32:00+03:00' }
];
