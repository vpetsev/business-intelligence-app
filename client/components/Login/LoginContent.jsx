import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from '../../context/SessionContext';
export default function LoginContent() {
  const { login, user } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try { await login({ username: data.get('username'), password: data.get('password') }); await router.push('/my-data'); }
    catch (failure) { setError(failure.message || 'Unable to log in. Please try again.'); }
    finally { setBusy(false); }
  }
  if (user) return <p>You are signed in as {user.username}. <Link href="/my-data">View my data</Link></p>;
  return <div className="app-form-panel">
    {router.query.registered === '1' && <p role="status">Account created. You can now log in.</p>}
    <p>Log in to upload and manage your own financial data. <Link href="/explore">Explore sample charts</Link> without an account.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor="login-username">Username</label><input id="login-username" name="username" autoComplete="username" required maxLength={255} className="form-control" />
      <label htmlFor="login-password">Password</label><input id="login-password" name="password" type="password" autoComplete="current-password" required className="form-control" />
      {error && <p role="alert" className="app-error">{error}</p>}
      <button className="app-button" disabled={busy} type="submit">{busy ? 'Logging in…' : 'Log in'}</button>
    </form><p>New here? <Link href="/register">Create an account</Link>.</p>
  </div>;
}
