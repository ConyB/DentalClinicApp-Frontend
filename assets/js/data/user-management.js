const compact = value => String(value || '').trim().replace(/\s+/g, ' ');
const emailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const phoneValid = value => /^\+?\d[\d\s-]{6,28}$/.test(value);
const suffix = value => Number(String(value || '').match(/(\d+)(?!.*\d)/)?.[1] || 0);
const now = state => `${state.referenceDate}T12:00:00+03:00`;
const fail = errors => { const error = new Error(Object.values(errors)[0] || 'User account data is invalid.'); error.fieldErrors = errors; throw error; };
const activeAdministrator = (state, userId) => state.users.find(user => user.id === userId && user.status === 'active' && user.roleCode === 'clinic_administrator') || null;
const roleForCode = (state, roleCode) => state.roles.find(role => role.code === roleCode) || null;

export const getActiveUsers = state => state.users.filter(user => user.status === 'active');
export const getActiveDentists = state => state.users.filter(user => user.status === 'active' && user.roleCode === 'dentist');
export const generateNextUserId = state => `U${String(Math.max(0, ...state.users.map(user => suffix(user.id))) + 1).padStart(3, '0')}`;
export const getUserManagementPermissions = ({ state, actor } = {}) => ({ canView: Boolean(activeAdministrator(state, actor?.userId) && actor?.role === 'Clinic Administrator'), canManage: Boolean(activeAdministrator(state, actor?.userId) && actor?.role === 'Clinic Administrator') });

export const validateUserInput = ({ state, values = {}, excludeUserId = null, actor } = {}) => {
  const errors = {}, fullName = compact(values.fullName), email = compact(values.email).toLowerCase(), phone = compact(values.phone), jobTitle = compact(values.jobTitle) || null, roleCode = values.roleCode || '', status = values.status || '';
  if (!getUserManagementPermissions({ state, actor }).canManage) errors.permission = 'Only an active Clinic Administrator may manage user accounts.';
  if (!fullName) errors.fullName = 'Enter the staff member\'s full name.';
  else if (fullName.length > 150) errors.fullName = 'Full name must be 150 characters or fewer.';
  if (!email) errors.email = 'Enter an email address.';
  else if (!emailValid(email)) errors.email = 'Enter a valid email address.';
  else if (state.users.some(user => user.id !== excludeUserId && user.email.toLowerCase() === email)) errors.email = 'An account already uses this email address.';
  if (phone && !phoneValid(phone)) errors.phone = 'Enter a valid phone number.';
  if (!roleForCode(state, roleCode)) errors.roleCode = 'Select a valid clinic role.';
  if (!['active', 'inactive'].includes(status)) errors.status = 'Select Active or Inactive.';
  const names = fullName.split(' '), lastName = names.length > 1 ? names.pop() : '';
  return { valid: !Object.keys(errors).length, errors, values: { fullName, firstName: names.join(' '), lastName, email, phone: phone || null, jobTitle, roleCode, status } };
};

const auditRecord = ({ state, actor, actionCode, user, changes = [] }) => ({ id: `AUDIT-${String(Math.max(0, ...state.auditLogs.map(event => suffix(event.id))) + 1).padStart(3, '0')}`, organizationId: state.organization.id, branchId: actor.branchId || state.branches.find(branch => branch.isMain)?.id, actorUserId: actor.userId, actionCode, entityType: 'USER', entityId: user.id, occurredAt: now(state), summary: `${user.fullName} account ${actionCode === 'USER_CREATED' ? 'created' : 'updated'}.`, metadata: { changes } });

export const createUser = ({ state, values, actor } = {}) => {
  const validation = validateUserInput({ state, values, actor }); if (!validation.valid) fail(validation.errors);
  const id = generateNextUserId(state), role = roleForCode(state, validation.values.roleCode), timestamp = now(state);
  if (state.users.some(user => user.id === id)) fail({ id: 'A conflicting user identifier was generated. Please try again.' });
  const user = { id, organizationId: state.organization.id, roleId: role.id, roleCode: role.code, firstName: validation.values.firstName, lastName: validation.values.lastName, fullName: validation.values.fullName, email: validation.values.email, phone: validation.values.phone, jobTitle: validation.values.jobTitle, branchId: actor.branchId || state.branches.find(branch => branch.isMain)?.id, status: validation.values.status, createdAt: timestamp, updatedAt: timestamp };
  const audit = auditRecord({ state, actor, actionCode: 'USER_CREATED', user, changes: ['created'] }); state.users.push(user); state.auditLogs.push(audit); return { user, audit };
};

export const updateUser = ({ state, userId, values, actor } = {}) => {
  const existing = state.users.find(user => user.id === userId); if (!existing) fail({ userId: 'User account was not found.' });
  if (userId === actor?.userId && values.roleCode !== existing.roleCode) fail({ roleCode: 'You cannot change your own role.' });
  if (userId === actor?.userId && values.status !== existing.status) fail({ status: 'You cannot change your own account status from Users & Staff.' });
  const validation = validateUserInput({ state, values, excludeUserId: userId, actor }); if (!validation.valid) fail(validation.errors);
  const role = roleForCode(state, validation.values.roleCode), changes = ['fullName', 'email', 'phone', 'jobTitle', 'roleCode', 'status'].filter(key => (key === 'roleCode' ? existing.roleCode : existing[key]) !== validation.values[key]);
  const user = changes.length ? { ...existing, ...validation.values, roleId: role.id, updatedAt: now(state) } : existing;
  if (!changes.length) return { user, audit: null, changed: false };
  const audit = auditRecord({ state, actor, actionCode: 'USER_UPDATED', user, changes }); state.users[state.users.findIndex(candidate => candidate.id === userId)] = user; state.auditLogs.push(audit); return { user, audit, changed: true };
};
