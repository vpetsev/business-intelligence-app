import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from '../context/SessionContext';
function Consumer() {
  const { user, loading, login, logout } = useSession();
  return <><p>{loading ? 'Loading' : user?.username || 'Anonymous'}</p><button onClick={() => login({ username: 'alice', password: 'password' })}>Login</button><button onClick={logout}>Logout</button></>;
}
const json = (value, status = 200) => ({ status, ok: status < 400, json: async () => value });
it('restores a cookie session on reload and sends CSRF to revoke it', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json({ user: { id: 1, username: 'alice' }, csrfToken: 'csrf' })).mockResolvedValueOnce({ status: 204 });
  vi.stubGlobal('fetch', fetch); render(<SessionProvider><Consumer /></SessionProvider>);
  expect(await screen.findByText('alice')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect(await screen.findByText('Anonymous')).toBeVisible();
  expect(fetch).toHaveBeenLastCalledWith('/api/backend/api/logout', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf' }) }));
});
it('does not let an old anonymous lookup overwrite a successful login or persist bearer tokens', async () => {
  let resolveSession;
  const fetch = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveSession = resolve; })).mockResolvedValueOnce(json({ success: true, user: { id: 1, username: 'alice' }, csrfToken: 'csrf', token: 'sensitive-legacy-token' }));
  vi.stubGlobal('fetch', fetch); render(<SessionProvider><Consumer /></SessionProvider>);
  await userEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(await screen.findByText('alice')).toBeVisible();
  await act(async () => resolveSession(json({ message: 'Not logged in.' }, 401)));
  await waitFor(() => expect(screen.getByText('alice')).toBeVisible());
  expect(localStorage.length).toBe(0);
});
