const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const TTL_SECONDS = 3600;
const cookieName = 'bi_session';
function secret() {
  if (!process.env.JWT_PASSWORD || process.env.JWT_PASSWORD.length < 32) throw new Error('JWT_PASSWORD must contain at least 32 characters');
  return process.env.JWT_PASSWORD;
}
exports.sign = (user, id, csrf, readOnly = false) => jwt.sign(
  { id: user.id, csrf, readOnly }, secret(),
  { algorithm: 'HS256', expiresIn: TTL_SECONDS, issuer: 'bi-api', audience: 'bi-client', jwtid: id }
);
exports.verify = token => jwt.verify(token, secret(), { algorithms: ['HS256'], issuer: 'bi-api', audience: 'bi-client' });
exports.newSession = () => ({ id: crypto.randomUUID(), csrf: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + TTL_SECONDS * 1000) });
exports.cookieName = cookieName;
exports.cookieOptions = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'), sameSite: 'lax', path: '/', maxAge: TTL_SECONDS * 1000 });
exports.assertConfigured = secret;
