const router = require('express').Router();
const bcrypt = require('bcryptjs');
const models = require('../models');
const auth = require('../middlewares/authMiddleware');
const tokens = require('../config/token');
const { parse, registration, login: credentials, normalizeUsername } = require('../lib/validation');
const { HttpError } = require('../lib/errors');
const dummyHash = bcrypt.hashSync('dummy-password-not-an-account', 12);
const publicUser = (user, readOnly = false) => ({ id: user.id, username: user.username, readOnly });
router.post('/register', async (req, res) => {
  const { username, password } = parse(registration, req.body);
  if (req.app.locals.runtime.admins.includes(username)) throw new HttpError(409, 'This username is reserved.', 'USERNAME_TAKEN');
  try { await models.User.create({ username, password: await bcrypt.hash(password, 12) }); }
  catch (error) {
    if (error instanceof models.Sequelize.UniqueConstraintError) throw new HttpError(409, 'Username has already been used.', 'USERNAME_TAKEN');
    throw error;
  }
  res.status(201).json({ success: true, message: 'Account created. Please sign in.' });
});
async function login(req, res, input, readOnly = false) {
  const { username, password } = parse(credentials, input);
  const user = await models.User.findOne({ where: { username } });
  const valid = await bcrypt.compare(password, user?.password || dummyHash);
  if (!user || !valid) throw new HttpError(401, 'Incorrect username or password.', 'INVALID_CREDENTIALS');
  const session = tokens.newSession();
  await models.sequelize.transaction(async transaction => {
    await models.AuthSession.destroy({ where: { expiresAt: { [models.Sequelize.Op.lte]: new Date() } }, transaction });
    // Replacing an existing browser login invalidates that browser's previous session.
    try {
      const previous = tokens.verify(req.cookies?.[tokens.cookieName]);
      await models.AuthSession.destroy({ where: { id: previous.jti }, transaction });
    } catch (error) { if (!(error instanceof require('jsonwebtoken').JsonWebTokenError)) throw error; }
    await models.AuthSession.create({ id: session.id, userId: user.id, expiresAt: session.expiresAt }, { transaction });
  });
  const token = tokens.sign(user, session.id, session.csrf, readOnly);
  res.cookie(tokens.cookieName, token, tokens.cookieOptions());
  res.set('Cache-Control', 'no-store').json({ success: true, user: publicUser(user, readOnly), userId: user.id, csrfToken: session.csrf, token });
}
router.post('/api/login', (req, res) => login(req, res, req.body));
router.post('/api/guest-login', (req, res) => {
  const username = process.env.GUEST_USERNAME;
  const password = process.env.GUEST_PASSWORD;
  if (!username || !password) throw new HttpError(503, 'Guest login is not configured.', 'GUEST_UNAVAILABLE');
  return login(req, res, { username: normalizeUsername(username), password }, true);
});
router.get('/api/session', auth, (req, res) => res.json({ user: publicUser(req.user, req.auth.readOnly), csrfToken: req.auth.csrf }));
router.post('/api/logout', auth, async (req, res) => {
  await models.AuthSession.destroy({ where: { id: req.auth.jti, userId: req.user.id } });
  const { maxAge, ...options } = tokens.cookieOptions();
  res.clearCookie(tokens.cookieName, options).status(204).end();
});
module.exports = router;
