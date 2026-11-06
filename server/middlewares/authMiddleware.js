const models = require('../models');
const tokens = require('../config/token');
const { HttpError } = require('../lib/errors');
const crypto = require('node:crypto');
module.exports = async (req, res, next) => {
  const authorization = req.get('Authorization');
  const match = /^Bearer (\S+)$/i.exec(authorization || '');
  const token = authorization ? match?.[1] : req.cookies?.[tokens.cookieName];
  if (!token) throw new HttpError(401, 'Authentication required.', 'UNAUTHENTICATED');
  let decoded;
  try { decoded = tokens.verify(token); } catch (_) { throw new HttpError(401, 'Invalid or expired session.', 'UNAUTHENTICATED'); }
  if (!Number.isSafeInteger(decoded.id) || decoded.id < 1 || typeof decoded.jti !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(decoded.jti)) throw new HttpError(401, 'Invalid session identity.', 'UNAUTHENTICATED');
  const session = await models.AuthSession.findOne({ where: { id: decoded.jti, userId: decoded.id, expiresAt: { [models.Sequelize.Op.gt]: new Date() } } });
  if (!session) throw new HttpError(401, 'Session ended. Please sign in again.', 'UNAUTHENTICATED');
  const user = await models.User.findByPk(decoded.id);
  if (!user) throw new HttpError(401, 'Account no longer exists.', 'UNAUTHENTICATED');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !match) {
    const supplied = req.get('X-CSRF-Token') || '';
    if (!/^[a-f0-9]{64}$/.test(supplied) || typeof decoded.csrf !== 'string' || supplied.length !== decoded.csrf.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(decoded.csrf))) throw new HttpError(403, 'Refresh your session before trying again.', 'INVALID_CSRF');
  }
  req.user = user;
  req.auth = decoded;
  res.set('Cache-Control', 'no-store');
  next();
};
module.exports.writable = (req, res, next) => {
  if (req.auth.readOnly) throw new HttpError(403, 'The guest demo is read-only.', 'READ_ONLY');
  next();
};
