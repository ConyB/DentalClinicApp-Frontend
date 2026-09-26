const roleByCode = Object.freeze({
  clinic_administrator: 'Clinic Administrator',
  dentist: 'Dentist',
  receptionist: 'Receptionist',
  cashier: 'Cashier'
});

// Resolve identity and role from canonical state; caller-supplied role text is never authority.
export const resolveActiveActor = ({ state, actor, requireDeclaredRole = true } = {}) => {
  const user = state?.users?.find(candidate => candidate.id === actor?.userId && candidate.status === 'active') || null;
  const role = user && state?.roles?.find(candidate => candidate.id === user.roleId && candidate.code === user.roleCode);
  const roleName = roleByCode[user?.roleCode] || null;
  if (!user || !role || !roleName || role.name !== roleName) throw new Error('Your active user session could not be verified.');
  if (requireDeclaredRole && (!actor?.role || actor.role !== roleName)) throw new Error('Your active user role could not be verified.');
  return Object.freeze({ userId: user.id, role: roleName, branchId: user.branchId });
};

export const resolveActiveSession = ({ state, session } = {}) => {
  try {
    const actor = resolveActiveActor({ state, actor: session });
    const user = state.users.find(candidate => candidate.id === actor.userId);
    return Object.freeze({
      userId: user.id,
      name: user.fullName,
      role: actor.role,
      email: user.email,
      branchId: user.branchId,
      authenticatedAt: session.authenticatedAt
    });
  } catch {
    return null;
  }
};
