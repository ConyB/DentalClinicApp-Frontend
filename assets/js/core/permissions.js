const rolePermissions = {
  'Clinic Administrator': ['*', 'users.*'],
  Dentist: ['dashboard.view', 'patients.view', 'patients.edit', 'appointments.view', 'appointments.create', 'appointments.edit', 'appointments.confirm', 'appointments.cancel', 'appointments.reschedule', 'waiting-room.view', 'waiting-room.start-treatment', 'encounters.*', 'dental-chart.*', 'treatment-plans.*', 'procedures.*', 'prescriptions.*', 'documents.*', 'recalls.*', 'reports.view', 'clinic-settings.view', 'profile.*'],
  Receptionist: ['dashboard.view', 'patients.*', 'appointments.*', 'waiting-room.view', 'waiting-room.check-in', 'recalls.*', 'reports.view', 'clinic-settings.view', 'profile.*'],
  Cashier: ['dashboard.view', 'patients.view', 'invoices.*', 'payments.*', 'receipts.*', 'outstanding-balances.view', 'reports.view', 'clinic-settings.view', 'profile.*']
};
export const permissions = {
  can(role, action) {
    if (action === 'patients.status') return role === 'Clinic Administrator';
    if (action === 'patients.medical-summary') return ['Clinic Administrator', 'Dentist', 'Receptionist'].includes(role);
    if (action === 'patients.clinical-summary') return ['Clinic Administrator', 'Dentist'].includes(role);
    if (action === 'patients.treatment-summary') return ['Clinic Administrator', 'Dentist', 'Receptionist', 'Cashier'].includes(role);
    if (action === 'patients.billing-summary') return ['Clinic Administrator', 'Dentist', 'Receptionist', 'Cashier'].includes(role);
    if (action === 'patients.finance-summary') return ['Clinic Administrator', 'Cashier'].includes(role);
    if (action === 'patients.appointment-summary') return ['Clinic Administrator', 'Dentist', 'Receptionist', 'Cashier'].includes(role);
    if (action === 'patients.recall-summary') return ['Clinic Administrator', 'Dentist', 'Receptionist', 'Cashier'].includes(role);
    const grants = rolePermissions[role] || []; const [module] = action.split('.'); return grants.includes('*') || grants.includes(action) || grants.includes(`${module}.*`);
  },
  canView(role, module) { return this.can(role, `${module}.view`); },
  canCreate(role, module) { return this.can(role, `${module}.create`); },
  canEdit(role, module) { return this.can(role, `${module}.edit`); },
  canPerform(role, action) { return this.can(role, action); }
};
