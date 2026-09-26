export const DEMO_SCHEMA_VERSION = 4;
export const DEMO_REFERENCE_DATE = '2026-09-21';
export const DEMO_TIMEZONE = 'Africa/Kampala';

export const organization = {
  id: 'ORG-PSDC', code: 'PSDC', name: 'Pearl Smile Dental Clinic', legalName: null,
  phone: '+256 700 555 010', email: 'info@pearlsmiledental.test', website: 'www.pearlsmiledental.test',
  address: 'Kampala, Uganda', district: 'Kampala', townCity: 'Kampala',
  logoPath: 'assets/images/branding/pearl-smile-icon.png', currency: 'UGX', timezone: DEMO_TIMEZONE, status: 'active'
};

export const branches = [{
  id: 'BR-MAIN', organizationId: organization.id, code: 'MAIN', name: 'Kampala Main Branch',
  phone: organization.phone, email: organization.email, address: organization.address,
  district: 'Kampala', townCity: 'Central Kampala', isMain: true, status: 'active'
}];

export const roles = [
  { id: 'ROLE-CLINIC-ADMINISTRATOR', code: 'clinic_administrator', name: 'Clinic Administrator', description: 'Clinic-wide operational oversight.', isSystem: true },
  { id: 'ROLE-DENTIST', code: 'dentist', name: 'Dentist', description: 'Clinical care and treatment delivery.', isSystem: true },
  { id: 'ROLE-RECEPTIONIST', code: 'receptionist', name: 'Receptionist', description: 'Patient registration and front-desk operations.', isSystem: true },
  { id: 'ROLE-CASHIER', code: 'cashier', name: 'Cashier', description: 'Billing and payment operations.', isSystem: true }
];

export const clinicSettings = {
  id: 'SETTINGS-PSDC', organizationId: organization.id, mainBranchId: branches[0].id,
  currency: organization.currency, timezone: organization.timezone, logoPath: organization.logoPath,
  patientPrefix: 'PAT', appointmentPrefix: 'APT', encounterPrefix: 'ENC', treatmentPlanPrefix: 'TP',
  invoicePrefix: 'INV', paymentPrefix: 'PAY', receiptPrefix: 'RCT', defaultAppointmentMinutes: 30,
  allowAuthorizedDiscount: true
};
