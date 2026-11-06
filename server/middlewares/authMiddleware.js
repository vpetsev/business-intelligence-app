const models = require('../models');
const tokens = require('../config/token');
const asyncHandler = require('./asyncHandler');
module.exports = asyncHandler(async (req, res, next) => {
  const match = /^Bearer (\S+)$/i.exec(req.get('Authorization') || '');
  if (!match) return res.status(401).json({ success: false, message: 'Authentication required.' });
  let decoded;
  try { decoded = tokens.verify(match[1]); }
  catch (_) { return res.status(401).json({ success: false, message: 'Invalid or expired token.' }); }
  if (!Number.isSafeInteger(decoded.id) || decoded.id < 1) {
    return res.status(401).json({ success: false, message: 'Invalid token identity.' });
  }
  const user = await models.User.findByPk(decoded.id);
  if (!user) return res.status(401).json({ success: false, message: 'Account no longer exists.' });
  req.user = user;
  next();
});
