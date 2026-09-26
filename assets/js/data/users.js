import { branches, organization, roles } from './clinic.js';
const roleId = code => roles.find(role => role.code === code).id;
const user = (id, roleCode, fullName, email, phone, jobTitle, status = 'active') => {
  const [firstName, ...lastName] = fullName.split(' ');
  return { id, organizationId: organization.id, roleId: roleId(roleCode), roleCode, firstName, lastName: lastName.join(' '), fullName, email, phone, jobTitle, branchId: branches[0].id, status };
};

export const users = [
  user('U001', 'clinic_administrator', 'Grace Namutebi', 'grace.admin@pearlsmiledental.test', '+256 700 555 101', 'Practice Administrator'),
  user('U002', 'dentist', 'Dr. Daniel Mugisha', 'daniel.mugisha@pearlsmiledental.test', '+256 700 555 102', 'Dental Surgeon'),
  user('U003', 'dentist', 'Dr. Sarah Nakanwagi', 'sarah.nakanwagi@pearlsmiledental.test', '+256 700 555 103', 'Dental Surgeon'),
  user('U004', 'receptionist', 'Lydia Akello', 'lydia.reception@pearlsmiledental.test', '+256 700 555 104', 'Front Desk Officer'),
  user('U005', 'cashier', 'Brian Ssemanda', 'brian.cashier@pearlsmiledental.test', '+256 700 555 105', 'Cashier'),
  user('U006', 'receptionist', 'Miriam Achieng', 'miriam.old@pearlsmiledental.test', '+256 700 555 106', 'Front Desk Officer', 'inactive')
];

export const dentistProfiles = [
  { id: 'DENTIST-PROFILE-001', userId: 'U002', professionalNumber: 'DEMO-DENT-001', specialty: 'General Dentistry', qualifications: null, signaturePath: null, bio: null },
  { id: 'DENTIST-PROFILE-002', userId: 'U003', professionalNumber: 'DEMO-DENT-002', specialty: 'General & Restorative Dentistry', qualifications: null, signaturePath: null, bio: null }
];

// Credentials deliberately contain no copied user profile fields.
export const authCredentials = users.map(({ id }) => ({ userId: id, demoPassword: 'Demo@123' }));
