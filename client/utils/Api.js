// Next.js embeds NEXT_PUBLIC_* values at build time; rebuild after changing it.
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
export const apiUrl = path => API_BASE_URL + path;
