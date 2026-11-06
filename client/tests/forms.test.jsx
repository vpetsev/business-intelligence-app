import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { useRouter } from 'next/router';
import LoginContent from '../components/Login/LoginContent';
import RegisterContent from '../components/Register/RegisterContent';
import { useSession } from '../context/SessionContext';
vi.mock('../context/SessionContext', () => ({ useSession: vi.fn() }));
const push = vi.fn();
beforeEach(() => { useRouter.mockReturnValue({ query: {}, push }); useSession.mockReturnValue({ user: null, login: vi.fn() }); });
it('submits login through a labeled form, prevents duplicate submission, and reports failure', async () => {
  let reject;
  const login = vi.fn(() => new Promise((resolve, fail) => { reject = fail; }));
  useSession.mockReturnValue({ user: null, login });
  render(<LoginContent />); const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), 'testuser');
  await user.type(screen.getByLabelText('Password'), 'secret{Enter}');
  expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
  reject(new Error('Invalid credentials.'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials.');
  expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
  expect(login).toHaveBeenCalledWith({ username: 'testuser', password: 'secret' });
  expect(push).not.toHaveBeenCalled();
});
it('only redirects after a successful login', async () => {
  const login = vi.fn().mockResolvedValue(); useSession.mockReturnValue({ user: null, login });
  render(<LoginContent />); const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), 'testuser'); await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() => expect(push).toHaveBeenCalledWith('/my-data'));
});
it('checks password confirmation before registering and shows server failures', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: 'Username is already registered.' }) }); vi.stubGlobal('fetch', fetch);
  render(<RegisterContent />); const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), 'testuser'); await user.type(screen.getByLabelText('Password', { exact: true }), 'longpassword123');
  await user.type(screen.getByLabelText('Confirm password'), 'different123'); await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match'); expect(fetch).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Confirm password')); await user.type(screen.getByLabelText('Confirm password'), 'longpassword123');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('already registered');
  expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
});
it('rejects passwords exceeding the backend UTF-8 byte limit', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); render(<RegisterContent />); const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), 'testuser');
  await user.type(screen.getByLabelText('Password', { exact: true }), 'é'.repeat(37)); await user.type(screen.getByLabelText('Confirm password'), 'é'.repeat(37));
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByRole('alert')).toHaveTextContent('72 bytes'); expect(fetch).not.toHaveBeenCalled();
});
