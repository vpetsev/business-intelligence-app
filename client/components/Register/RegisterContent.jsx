import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiRequest } from '../../utils/Api';
export default function RegisterContent() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    const data = new FormData(event.currentTarget);
    const password = data.get('password');
    if (password !== data.get('confirmPassword')) { setError('Passwords do not match.'); return; }
    const byteLength = new TextEncoder().encode(password).length;
    if (password.length < 12 || byteLength > 72) { setError('Use at least 12 characters and at most 72 bytes in UTF-8.'); return; }
    setBusy(true);
    try { await apiRequest('/register', { method: 'POST', body: { username: data.get('username'), password } }); await router.push('/login?registered=1'); }
    catch (failure) { setError(failure.message || 'Unable to create your account. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="app-form-panel"><p>Create an account to save your own data.</p><form onSubmit={submit} aria-busy={busy}>
    <label htmlFor="register-username">Username</label><input id="register-username" name="username" autoComplete="username" minLength={3} maxLength={100} pattern="[A-Za-z0-9@._+\-]{3,100}" required aria-describedby="username-help" className="form-control" />
    <p id="username-help" className="field-help">3–100 characters: letters, numbers, @, period, underscore, + or hyphen.</p>
    <label htmlFor="register-password">Password</label><input id="register-password" name="password" type="password" autoComplete="new-password" minLength={12} required aria-describedby="password-help" className="form-control" />
    <p id="password-help" className="field-help">At least 12 characters and at most 72 UTF-8 bytes. Most English characters use one byte; other characters may use more.</p>
    <label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required className="form-control" />
    {error && <p role="alert" className="app-error">{error}</p>}
    <button type="submit" disabled={busy} className="app-button">{busy ? 'Creating account…' : 'Create account'}</button>
  </form><p>Already registered? <Link href="/login">Log in</Link>.</p></div>;
}
