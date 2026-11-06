// Cookies stay on the frontend origin; BACKEND_URL is server-only.
export const API_BASE_URL = '/api/backend';
export const apiUrl = path => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export class ApiError extends Error {
  constructor(message, status) { super(message); this.name = 'ApiError'; this.status = status; }
}
export async function apiRequest(path, { body, csrfToken, headers, ...options } = {}) {
  const response = await fetch(apiUrl(path), {
    ...options, credentials: 'include',
    headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : `Request failed (${response.status}). Please try again.`;
    const details = Array.isArray(data?.details) ? data.details.slice(0, 3).filter(issue => typeof issue?.message === 'string').map(issue => `${issue.field || 'Input'}: ${issue.message}`) : [];
    throw new ApiError([message, ...details].join(' '), response.status);
  }
  if (data === null) throw new ApiError('The server returned an invalid response. Please try again.', response.status);
  return data;
}
