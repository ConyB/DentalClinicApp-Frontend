import { branches, organization } from './clinic.js';
const patient = (id, patientNumber, firstName, lastName, dateOfBirth, sex, phone, district, townArea, occupation, registeredAt, status = 'active', extra = {}) => ({
  id, organizationId: organization.id, registrationBranchId: branches[0].id, patientNumber, firstName, lastName, otherName: null, fullName: `${firstName} ${lastName}`,
  dateOfBirth, sex, phone, alternatePhone: null, email: null, occupation, district, townArea, addressLandmark: null,
  emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelationship: null, status, registeredBy: 'U004', registeredAt, ...extra
});
export const patients = [
  patient('P001', 'PAT-000001', 'Amina', 'Nakato', '1994-03-17', 'female', '+256 701 100 001', 'Kampala', 'Ntinda', 'Teacher', '2026-08-03', 'active', { alternatePhone: '+256 752 100 001', email: 'amina.nakato@example.test' }),
  patient('P002', 'PAT-000002', 'Peter', 'Okello', '1988-11-02', 'male', '+256 702 100 002', 'Wakiso', 'Kira', 'Accountant', '2026-07-18'),
  patient('P003', 'PAT-000003', 'Joan', 'Nambasa', '2001-05-24', 'female', '+256 703 100 003', 'Kampala', 'Makindye', 'University Student', '2026-09-02'),
  patient('P004', 'PAT-000004', 'Samuel', 'Kato', '1979-08-13', 'male', '+256 704 100 004', 'Kampala', 'Rubaga', 'Businessman', '2026-05-22'),
  patient('P005', 'PAT-000005', 'Esther', 'Atim', '1997-12-09', 'female', '+256 705 100 005', 'Kampala', 'Kisaasi', 'Designer', '2026-08-27'),
  patient('P006', 'PAT-000006', 'Isaac', 'Ssenyonga', '1990-04-28', 'male', '+256 706 100 006', 'Wakiso', 'Entebbe', 'Driver', '2026-06-11'),
  patient('P007', 'PAT-000007', 'Mariam', 'Nabwire', '1985-01-16', 'female', '+256 707 100 007', 'Kampala', 'Najjanankumbi', 'Retailer', '2026-09-10'),
  patient('P008', 'PAT-000008', 'Charles', 'Ouma', '1992-09-30', 'male', '+256 708 100 008', 'Kampala', 'Bugolobi', 'Engineer', '2026-09-15'),
  patient('P009', 'PAT-000009', 'Brenda', 'Namusoke', '1999-06-07', 'female', '+256 709 100 009', 'Mukono', 'Seeta', 'Sales Representative', '2026-09-19'),
  patient('P010', 'PAT-000010', 'Joseph', 'Walusimbi', '1968-02-21', 'male', '+256 710 100 010', 'Kampala', 'Mengo', 'Retired', '2026-04-07'),
  patient('P011', 'PAT-000011', 'Sharon', 'Apio', '1996-10-12', 'female', '+256 711 100 011', 'Kampala', 'Kawempe', 'Nurse', '2026-09-01'),
  patient('P012', 'PAT-000012', 'Daniel', 'Tumusiime', '1983-07-05', 'male', '+256 712 100 012', 'Kampala', 'Muyenga', 'Consultant', '2025-11-18', 'inactive'),
  patient('P013', 'PAT-000013', 'Mercy', 'Ayaa', '2018-04-22', 'female', null, 'Kampala', 'Nakawa', null, '2026-09-12'),
  patient('P014', 'PAT-000014', 'Ruth', 'Namaganda', '1993-02-11', 'female', '+256 714 100 014', 'Kampala', 'Nansana', 'Tailor', '2026-08-08'), patient('P015', 'PAT-000015', 'Michael', 'Ocen', '1987-06-23', 'male', '+256 715 100 015', 'Gulu', 'Layibi', 'Teacher', '2026-08-12'), patient('P016', 'PAT-000016', 'Patricia', 'Nakibuuka', '1995-01-30', 'female', '+256 716 100 016', 'Wakiso', 'Kira', 'Administrator', '2026-08-16'), patient('P017', 'PAT-000017', 'Robert', 'Byaruhanga', '1976-04-19', 'male', '+256 717 100 017', 'Kampala', 'Kololo', 'Architect', '2026-08-20'), patient('P018', 'PAT-000018', 'Irene', 'Acayo', '1998-09-08', 'female', '+256 718 100 018', 'Lira', 'Adyel', 'Pharmacist', '2026-08-24'), patient('P019', 'PAT-000019', 'Moses', 'Kiwanuka', '1982-12-05', 'male', '+256 719 100 019', 'Kampala', 'Bwaise', 'Mechanic', '2026-08-28'), patient('P020', 'PAT-000020', 'Faith', 'Ninsiima', '1991-07-14', 'female', '+256 720 100 020', 'Mbarara', 'Nyamitanga', 'Banker', '2026-09-03'), patient('P021', 'PAT-000021', 'Andrew', 'Wekesa', '1989-10-26', 'male', '+256 721 100 021', 'Jinja', 'Bugembe', 'Electrician', '2026-09-05'), patient('P022', 'PAT-000022', 'Caroline', 'Nantongo', '1994-05-03', 'female', '+256 722 100 022', 'Kampala', 'Kawempe', 'Caterer', '2026-09-06'), patient('P023', 'PAT-000023', 'Steven', 'Opio', '1980-03-22', 'male', '+256 723 100 023', 'Soroti', 'Arapai', 'Procurement Officer', '2026-09-07'), patient('P024', 'PAT-000024', 'Rebecca', 'Nanyonga', '1986-11-18', 'female', '+256 724 100 024', 'Kampala', 'Kisaasi', 'Journalist', '2026-09-08'), patient('P025', 'PAT-000025', 'Paul', 'Tumwesigye', '1975-08-09', 'male', '+256 725 100 025', 'Kabale', 'Central', 'Farmer', '2026-09-09'), patient('P026', 'PAT-000026', 'Juliet', 'Atuhaire', '1992-01-25', 'female', '+256 726 100 026', 'Fort Portal', 'West Division', 'Accountant', '2026-09-10'), patient('P027', 'PAT-000027', 'George', 'Lubega', '1984-06-17', 'male', '+256 727 100 027', 'Mukono', 'Mukono Central', 'Trader', '2026-09-11'), patient('P028', 'PAT-000028', 'Agnes', 'Auma', '1990-09-29', 'female', '+256 728 100 028', 'Kampala', 'Nakawa', 'Social Worker', '2026-09-13'), patient('P029', 'PAT-000029', 'David', 'Ssekabira', '1978-02-16', 'male', '+256 729 100 029', 'Wakiso', 'Kajjansi', 'Contractor', '2026-09-14'), patient('P030', 'PAT-000030', 'Florence', 'Nabukenya', '1996-04-27', 'female', '+256 730 100 030', 'Kampala', 'Ntinda', 'Graphic Designer', '2026-09-16')
];
export const patientGuardians = [{ id: 'GUARDIAN-001', patientId: 'P013', fullName: 'Rose Ayaa', relationship: 'Mother', phone: '+256 713 100 013', alternatePhone: null, email: null, isPrimary: true }];
export const patientAllergies = [{ id: 'ALLERGY-001', patientId: 'P001', allergen: 'Penicillin', reaction: null, severity: null, status: 'active', recordedBy: 'U004', recordedAt: '2026-08-03' }];
export const patientMedications = [{ id: 'MEDICATION-001', patientId: 'P002', medicationName: 'Amlodipine', doseNotes: null, status: 'current', recordedBy: 'U004', recordedAt: '2026-07-18' }, { id: 'MEDICATION-002', patientId: 'P004', medicationName: 'Metformin', doseNotes: null, status: 'current', recordedBy: 'U004', recordedAt: '2026-05-22' }, { id: 'MEDICATION-003', patientId: 'P010', medicationName: 'Losartan', doseNotes: null, status: 'current', recordedBy: 'U004', recordedAt: '2026-04-07' }];
export const patientConditions = [{ id: 'CONDITION-001', patientId: 'P002', conditionName: 'Hypertension', notes: null, status: 'active', recordedBy: 'U004', recordedAt: '2026-07-18' }, { id: 'CONDITION-002', patientId: 'P004', conditionName: 'Diabetes', notes: null, status: 'active', recordedBy: 'U004', recordedAt: '2026-05-22' }, { id: 'CONDITION-003', patientId: 'P010', conditionName: 'Hypertension', notes: null, status: 'active', recordedBy: 'U004', recordedAt: '2026-04-07' }];
export const patientMedicalProfiles = [{ id: 'MEDICAL-PROFILE-001', patientId: 'P001', relevantDentalHistory: 'Previous filling on upper right molar', pregnancyStatus: null, otherNotes: null, lastReviewedAt: null, lastReviewedBy: null }];
// No clinician review has been specified for Phase 5A.
export const medicalHistoryReviews = [];

export const getPatientById = (state, id) => state.patients.find(patient => patient.id === id) || null;
export const getPatientByNumber = (state, patientNumber) => state.patients.find(patient => patient.patientNumber === patientNumber) || null;
const normalizedSearchValue = value => String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
export const searchPatients = (state, query = '') => {
  const term = normalizedSearchValue(query);
  const phoneTerm = String(query || '').replace(/\D/g, '');
  if (!term) return [...state.patients];
  return state.patients.filter(patient => [patient.patientNumber, patient.firstName, patient.lastName, patient.fullName, patient.phone].filter(Boolean).some(value => normalizedSearchValue(value).includes(term)) || (phoneTerm.length >= 7 && String(patient.phone || '').replace(/\D/g, '').includes(phoneTerm)));
};
export const getPatientAge = (patient, referenceDate) => {
  if (!patient?.dateOfBirth || !referenceDate) return null;
  const birthDate = new Date(`${patient.dateOfBirth}T00:00:00`), today = new Date(`${referenceDate}T00:00:00`);
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
};
// Deterministic, non-mutating pagination for later table modules.
export const paginate = (records, page = 1, pageSize = 10) => {
  const total = records.length, safePageSize = Math.max(1, Number(pageSize) || 10), totalPages = Math.max(1, Math.ceil(total / safePageSize), 1), currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages), start = (currentPage - 1) * safePageSize;
  return { items: records.slice(start, start + safePageSize), page: currentPage, pageSize: safePageSize, total, totalPages };
};
