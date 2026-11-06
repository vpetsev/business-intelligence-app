import { expect, it, vi } from 'vitest';
import { apiRequest } from '../utils/Api';
it('uses same-origin proxy, cookie credentials, and CSRF without a bearer header', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ count: 1 }) });
  vi.stubGlobal('fetch', fetch);
  await expect(apiRequest('/api/data', { method: 'POST', body: [{ company: 'A' }], csrfToken: 'csrf' })).resolves.toEqual({ count: 1 });
  expect(fetch).toHaveBeenCalledWith('/api/backend/api/data', expect.objectContaining({ credentials: 'include', body: '[{"company":"A"}]', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf' } }));
});
it('throws API errors instead of treating a JSON error as a successful response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Invalid credentials.' }) }));
  await expect(apiRequest('/api/login')).rejects.toMatchObject({ message: 'Invalid credentials.', status: 401 });
});
it('handles empty logout responses and invalid JSON explicitly', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ status: 204 }).mockResolvedValueOnce({ status: 200, ok: true, json: async () => { throw new Error(); } });
  vi.stubGlobal('fetch', fetch);
  await expect(apiRequest('/api/logout')).resolves.toBe(null);
  await expect(apiRequest('/charts')).rejects.toThrow('invalid response');
});

it('exposes server field validation messages to the form', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: 'Invalid request data.', details: [{ field: 'password', message: 'Password is too short.' }] }) }));
  await expect(apiRequest('/register')).rejects.toThrow('password: Password is too short.');
});
