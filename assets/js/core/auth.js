import { storage } from './storage.js';
import { DEMO_PASSWORD } from '../data/auth-users.js';
import { state } from './state.js';
import { resolveActiveActor, resolveActiveSession } from './authorization.js';
const SESSION_KEY = 'session';
const storedSession = () => storage.get(SESSION_KEY) || (() => { try { return JSON.parse(sessionStorage.getItem('pearl-smile-dental.session') || 'null'); } catch { return null; } })();
export const auth = {
  session() {
    const stored = storedSession();
    if (!stored) return null;
    state.initialize();
    const session = resolveActiveSession({ state: state.get(), session: stored });
    if (!session) this.signOut();
    return session;
  },
  signIn(email, password, remember) { state.initialize(); const snapshot = state.get(), user = snapshot.users.find(candidate => candidate.email.toLowerCase() === String(email || '').toLowerCase()), credential = snapshot.demoCredentials?.find(candidate => candidate.userId === user?.id); if (!user || password !== (credential?.demoPassword || DEMO_PASSWORD)) return { ok: false, reason: 'invalid' }; if (user.status !== 'active') return { ok: false, reason: 'inactive' }; let actor; try { actor = resolveActiveActor({ state: snapshot, actor: { userId: user.id, role: snapshot.roles.find(candidate => candidate.id === user.roleId)?.name } }); } catch { return { ok: false, reason: 'invalid' }; } const session = { userId: user.id, name: user.fullName, role: actor.role, email: user.email, branchId: user.branchId, authenticatedAt: new Date().toISOString() }; if (remember) storage.set(SESSION_KEY, session); else sessionStorage.setItem('pearl-smile-dental.session', JSON.stringify(session)); return { ok: true, session }; },
  signOut() { storage.remove(SESSION_KEY); sessionStorage.removeItem('pearl-smile-dental.session'); }
};
