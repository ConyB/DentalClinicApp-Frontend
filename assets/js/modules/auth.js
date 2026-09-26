import { auth } from '../core/auth.js';
import { demoUsers, DEMO_PASSWORD } from '../data/auth-users.js';
import { showToast } from '../components/overlays.js';
import { storage } from '../core/storage.js';
import { createBrandFooter } from '../components/dom.js';
const emailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const initializeLogin = () => {
  if (auth.session()) { location.replace('app.html#/dashboard'); return; }
  document.querySelector('.login-footer')?.replaceWith(createBrandFooter('login-footer'));
  const form = document.querySelector('#login-form'); const email = form.elements.email; const password = form.elements.password; const error = document.querySelector('#login-error');
  const setError = message => { error.textContent = message; error.hidden = !message; };
  document.querySelectorAll('[data-demo-email]').forEach(button => button.addEventListener('click', () => { email.value = button.dataset.demoEmail; password.value = DEMO_PASSWORD; setError(''); email.focus(); }));
  document.querySelector('#password-toggle').addEventListener('click', () => { const show = password.type === 'password'; password.type = show ? 'text' : 'password'; document.querySelector('#password-toggle').textContent = show ? 'Hide' : 'Show'; });
  [email, password].forEach(control => control.addEventListener('input', () => setError('')));
  form.addEventListener('submit', event => { event.preventDefault(); if (!email.value || !emailValid(email.value)) return setError('Enter a valid email address.'); if (!password.value) return setError('Enter your password.'); const result = auth.signIn(email.value.trim(), password.value, form.elements.remember.checked); if (!result.ok) return setError(result.reason === 'inactive' ? 'This account is inactive. Please contact the Clinic Administrator.' : 'Invalid email or password.'); storage.set('login-success', { name: result.session.name, role: result.session.role }); location.assign('app.html#/dashboard'); });
  if (location.search.includes('signed-out')) showToast({ message: 'You have been signed out.', variant: 'info' });
  if (location.search.includes('expired')) showToast({ message: 'Your session has expired. Please sign in again.', variant: 'warning' });
};
