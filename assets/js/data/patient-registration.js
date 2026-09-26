import { getPatientAge } from './patients.js';

const compact = value => String(value || '').trim().replace(/\s+/g, ' ');
const comparable = value => compact(value).toLocaleLowerCase();
export const normalizeUgandanPhone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  const local = digits.startsWith('0') ? digits.slice(1) : digits.startsWith('256') ? digits.slice(3) : digits;
  return /^7\d{8}$/.test(local) ? `+256${local}` : null;
};
const phoneDigits = value => normalizeUgandanPhone(value)?.replace(/\D/g, '') || '';
const patientSuffix = patient => Number(String(patient.patientNumber || '').match(/(\d+)$/)?.[1] || 0);
const idSuffix = patient => Number(String(patient.id || '').match(/(\d+)$/)?.[1] || 0);
const guardianSuffix = guardian => Number(String(guardian.id || '').match(/(\d+)$/)?.[1] || 0);
const padded = (value, length) => String(value).padStart(length, '0');

export const generateNextPatientIdentity = state => {
  const number = Math.max(0, ...state.patients.map(patientSuffix)) + 1;
  const id = Math.max(0, ...state.patients.map(idSuffix)) + 1;
  return { id: `P${padded(id, 3)}`, patientNumber: `PAT-${padded(number, 6)}` };
};

export const findPotentialDuplicatePatients = (state, candidate = {}, { excludePatientId = null } = {}) => {
  const fullName = comparable(candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`);
  const dateOfBirth = candidate.dateOfBirth || '';
  const phone = phoneDigits(candidate.phone);
  const candidates = state.patients.filter(patient => patient.id !== excludePatientId);
  const exactMatches = candidates.filter(patient => comparable(patient.fullName) === fullName && patient.dateOfBirth === dateOfBirth && phoneDigits(patient.phone) === phone);
  const possibleMatches = candidates.filter(patient => !exactMatches.some(match => match.id === patient.id) && ((phone && phoneDigits(patient.phone) === phone) || (fullName && comparable(patient.fullName) === fullName && patient.dateOfBirth === dateOfBirth)));
  return { exactMatches, possibleMatches };
};

export const validatePatientRegistration = ({ state, values = {} } = {}) => {
  const errors = {};
  if (!compact(values.firstName)) errors.firstName = 'Enter the patient’s first name.';
  if (!compact(values.lastName)) errors.lastName = 'Enter the patient’s last name.';
  if (!values.dateOfBirth) errors.dateOfBirth = 'Enter the patient’s date of birth.';
  else if (values.dateOfBirth > state.referenceDate) errors.dateOfBirth = 'Date of birth cannot be in the future.';
  if (!values.sex) errors.sex = 'Select the patient’s sex.';
  const phone = normalizeUgandanPhone(values.phone);
  if (!values.phone?.trim()) errors.phone = 'Enter a primary phone number.';
  else if (!phone) errors.phone = 'Enter a valid Ugandan mobile number.';
  const alternatePhone = values.alternatePhone?.trim() ? normalizeUgandanPhone(values.alternatePhone) : null;
  if (values.alternatePhone?.trim() && !alternatePhone) errors.alternatePhone = 'Enter a valid alternate phone number.';
  if (phone && alternatePhone && phone === alternatePhone) errors.alternatePhone = 'Alternate phone must differ from the primary phone.';
  if (values.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  const age = values.dateOfBirth && values.dateOfBirth <= state.referenceDate ? getPatientAge({ dateOfBirth: values.dateOfBirth }, state.referenceDate) : null;
  const isMinor = age !== null && age < 18;
  if (isMinor) {
    if (!compact(values.guardianFullName)) errors.guardianFullName = 'Enter the guardian’s full name.';
    if (!values.guardianRelationship) errors.guardianRelationship = 'Select the guardian’s relationship.';
    if (!values.guardianPhone?.trim()) errors.guardianPhone = 'Enter the guardian’s phone number.';
    else if (!normalizeUgandanPhone(values.guardianPhone)) errors.guardianPhone = 'Enter a valid Ugandan mobile number.';
  }
  return { errors, age, isMinor, normalizedPhone: phone, normalizedAlternatePhone: alternatePhone };
};

export const createPatientRegistrationRecords = ({ state, values, registeredByUserId, branchId }) => {
  const identity = generateNextPatientIdentity(state);
  const validation = validatePatientRegistration({ state, values });
  if (Object.keys(validation.errors).length) throw new Error('Patient registration data is invalid.');
  const timestamp = `${state.referenceDate}T00:00:00+03:00`;
  const firstName = compact(values.firstName), lastName = compact(values.lastName), otherName = compact(values.otherName) || null;
  const patient = {
    id: identity.id, organizationId: state.organization.id, registrationBranchId: branchId || state.branches.find(branch => branch.isMain)?.id || state.branches[0]?.id,
    patientNumber: identity.patientNumber, firstName, lastName, otherName, fullName: [firstName, otherName, lastName].filter(Boolean).join(' '), dateOfBirth: values.dateOfBirth,
    sex: values.sex, phone: validation.normalizedPhone, alternatePhone: validation.normalizedAlternatePhone, email: compact(values.email) || null,
    occupation: compact(values.occupation) || null, district: compact(values.district) || null, townArea: null, addressLandmark: compact(values.address) || null,
    emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelationship: null, status: 'active', registeredBy: registeredByUserId, registeredAt: state.referenceDate,
    createdAt: timestamp, updatedAt: timestamp
  };
  const guardian = validation.isMinor ? {
    id: `GUARDIAN-${padded(Math.max(0, ...state.patientGuardians.map(guardianSuffix)) + 1, 3)}`, patientId: patient.id, fullName: compact(values.guardianFullName), relationship: values.guardianRelationship,
    phone: normalizeUgandanPhone(values.guardianPhone), alternatePhone: null, email: null, isPrimary: true
  } : null;
  return { patient, guardian, age: validation.age };
};

export const createPatientUpdateRecords = ({ state, patientId, values, updatedByUserId }) => {
  const currentPatient = state.patients.find(patient => patient.id === patientId);
  if (!currentPatient) throw new Error('Patient record was not found.');
  const validation = validatePatientRegistration({ state, values });
  if (Object.keys(validation.errors).length) throw new Error('Patient update data is invalid.');
  const firstName = compact(values.firstName), lastName = compact(values.lastName), otherName = compact(values.otherName) || null;
  const patientChanges = {
    firstName, lastName, otherName, fullName: [firstName, otherName, lastName].filter(Boolean).join(' '), dateOfBirth: values.dateOfBirth, sex: values.sex,
    phone: validation.normalizedPhone, alternatePhone: validation.normalizedAlternatePhone, email: compact(values.email) || null,
    occupation: compact(values.occupation) || null, district: compact(values.district) || null, addressLandmark: compact(values.address) || null
  };
  const existingGuardian = state.patientGuardians.find(guardian => guardian.patientId === patientId && guardian.isPrimary) || null;
  let guardian = existingGuardian;
  if (validation.isMinor) {
    const guardianValues = { fullName: compact(values.guardianFullName), relationship: values.guardianRelationship, phone: normalizeUgandanPhone(values.guardianPhone) };
    guardian = existingGuardian ? { ...existingGuardian, ...guardianValues } : { id: `GUARDIAN-${padded(Math.max(0, ...state.patientGuardians.map(guardianSuffix)) + 1, 3)}`, patientId, ...guardianValues, alternatePhone: null, email: null, isPrimary: true };
  }
  const patientChanged = Object.entries(patientChanges).some(([key, value]) => currentPatient[key] !== value);
  const guardianChanged = validation.isMinor && (!existingGuardian || ['fullName', 'relationship', 'phone'].some(key => existingGuardian[key] !== guardian[key]));
  const patient = patientChanged ? { ...currentPatient, ...patientChanges, updatedAt: `${state.referenceDate}T00:00:00+03:00`, updatedByUserId } : currentPatient;
  return { patient, guardian, patientChanged, guardianChanged, age: validation.age, isMinor: validation.isMinor };
};
