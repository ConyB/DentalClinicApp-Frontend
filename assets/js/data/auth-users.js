import { roles } from './clinic.js';
import { authCredentials, users } from './users.js';

// Compatibility view for Phase 4 login. Identity always resolves from users[].
export const demoUsers = authCredentials.map(credential => {
  const user = users.find(candidate => candidate.id === credential.userId);
  const role = roles.find(candidate => candidate.id === user.roleId);
  return { userId: user.id, name: user.fullName, role: role.name, email: user.email, branchId: user.branchId, active: user.status === 'active', demoPassword: credential.demoPassword };
});
export const DEMO_PASSWORD = 'Demo@123';
