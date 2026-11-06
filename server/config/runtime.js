const { z } = require('zod');
require('dotenv').config({ quiet: true });
const integer = (fallback, max) => z.coerce.number().int().min(1).max(max).default(fallback);
module.exports = function runtime() {
  const env = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: integer(3001, 65535), HOST: z.string().min(1).default('0.0.0.0'),
    JWT_PASSWORD: z.string().min(32, 'JWT_PASSWORD must contain at least 32 characters'),
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
    AUTH_RATE_LIMIT_MAX: integer(20, 10000), API_RATE_LIMIT_MAX: integer(300, 100000),
    ADMIN_USERNAMES: z.string().default(''),
  }).parse(process.env);
  if (env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) throw new Error('CORS_ORIGINS is required in production');
  env.origins = env.CORS_ORIGINS.split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of env.origins) {
    const url = new URL(origin);
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins without paths');
    if (env.NODE_ENV === 'production' && url.protocol !== 'https:' && !(env.COOKIE_SECURE === 'false' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Production CORS origins must use HTTPS');
  }
  if (env.NODE_ENV === 'production' && env.COOKIE_SECURE === 'false' && env.origins.some(origin => !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname))) throw new Error('Insecure production cookies are permitted only for loopback development origins');
  env.admins = env.ADMIN_USERNAMES.split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return env;
};
