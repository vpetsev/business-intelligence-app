import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../utils/Api';
const SessionContext = createContext(null);
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError('');
    try {
      const result = await apiRequest('/api/session');
      if (request === generation.current) setSession(result);
    } catch (failure) {
      if (request === generation.current) {
        setSession(null);
        if (failure.status !== 401) setError('Unable to check your session. Please try again.');
      }
    } finally { if (request === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    // Remove browser tokens left by the retired authentication implementation.
    try { localStorage.removeItem('jsonwebtoken'); localStorage.removeItem('jwt_access_token'); } catch { /* Storage may be disabled. */ }
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { generation.current += 1; window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  const login = async (credentials, guest = false) => {
    const result = await apiRequest(guest ? '/api/guest-login' : '/api/login', { method: 'POST', body: credentials });
    if (!result.success || !result.user || !result.csrfToken) throw new Error(result.message || 'Unable to sign in.');
    generation.current += 1;
    // Discard the legacy bearer token; only the HttpOnly cookie authenticates the browser.
    setSession({ user: result.user, csrfToken: result.csrfToken }); setLoading(false); setError('');
  };
  const logout = async () => {
    try { await apiRequest('/api/logout', { method: 'POST', csrfToken: session?.csrfToken }); }
    catch (failure) { if (failure.status !== 401) throw failure; }
    generation.current += 1; setSession(null); setLoading(false);
  };
  const request = useCallback(async (path, options = {}) => {
    try { return await apiRequest(path, { ...options, csrfToken: session?.csrfToken }); }
    catch (failure) {
      if (failure.status === 401) { generation.current += 1; setSession(null); setLoading(false); }
      throw failure;
    }
  }, [session?.csrfToken]);
  return <SessionContext.Provider value={{ user: session?.user || null, loading, error, refresh, login, logout, request }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession requires SessionProvider');
  return value;
}
