import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from '../../context/SessionContext';
export default function Navbar() {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { user, loading, logout } = useSession();
  const router = useRouter();
  const links = [['/', 'Home'], ['/explore', 'Explore'], ['/my-data', 'My data'], ['/about-us', 'About us']];
  async function signOut() {
    setBusy(true); setError('');
    try { await logout(); await router.push('/'); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <header className="app-header" id="navbar"><nav className="container app-nav" aria-label="Main navigation">
    <Link href="/" className="app-brand"><img src="/images/logo-white.png" alt="" width="40" height="40" /> BI App</Link>
    <button type="button" className="nav-toggle" aria-expanded={expanded} aria-controls="main-navigation" onClick={() => setExpanded(!expanded)}>Menu</button>
    <ul id="main-navigation" className={`app-nav-links ${expanded ? 'is-open' : ''}`}>
      {links.map(([href, title]) => <li key={href}><Link href={href} aria-current={router.pathname === href ? 'page' : undefined}>{title}</Link></li>)}
      {!loading && !user && <><li><Link href="/login">Login</Link></li><li><Link href="/register">Register</Link></li></>}
      {user && <li><button type="button" disabled={busy} onClick={signOut}>{busy ? 'Signing out…' : 'Sign out'}</button></li>}
    </ul>
  </nav>{error && <p className="container app-error" role="alert">{error}</p>}</header>;
}
