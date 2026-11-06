const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const { randomUUID } = require('node:crypto');
const models = require('./models');
const { HttpError } = require('./lib/errors');
function createApp() {
  const app = express();
  const runtime = require('./config/runtime')();
  app.locals.runtime = runtime;
  app.locals.shuttingDown = false;
  app.disable('x-powered-by');
  app.set('trust proxy', runtime.TRUST_PROXY_HOPS);
  app.use((req, res, next) => { req.requestId = randomUUID(); res.set('X-Request-ID', req.requestId); next(); });
  app.use(helmet());
  app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (app.locals.shuttingDown) throw new Error('draining');
      await models.sequelize.authenticate();
      const rows = await models.sequelize.query('SELECT name FROM "SequelizeMeta" WHERE name = :name', { replacements: { name: require('./lib/migrate').latestMigration }, type: models.Sequelize.QueryTypes.SELECT });
      if (!rows.length) throw new Error('migrations pending');
      await models.sequelize.query('SELECT "id" FROM "AuthSessions" LIMIT 0');
      await models.sequelize.query('SELECT "source" FROM "Companies" LIMIT 0');
      await models.sequelize.query('SELECT "userId" FROM "SavedData" LIMIT 0');
      res.json({ status: 'ready' });
    } catch (_) { res.status(503).json({ status: 'not_ready' }); }
  });
  app.use((req, res, next) => {
    const origin = req.get('Origin');
    if (origin && !runtime.origins.includes(origin)) throw new HttpError(403, 'Origin is not allowed.', 'ORIGIN_FORBIDDEN');
    // Blocks browser cross-site mutations, including missing/opaque Origin requests.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Sec-Fetch-Site') === 'cross-site') throw new HttpError(403, 'Cross-site requests are not allowed.', 'ORIGIN_FORBIDDEN');
    next();
  });
  app.use(cors({ origin: runtime.origins, credentials: true, methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'], maxAge: 600 }));
  const limiter = (windowMs, limit) => rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } });
  app.use(limiter(60000, runtime.API_RATE_LIMIT_MAX));
  app.use(['/register', '/api/login', '/api/guest-login'], limiter(15 * 60000, runtime.AUTH_RATE_LIMIT_MAX));
  app.use((req, res, next) => {
    if (req.method === 'POST' && !['/api/logout', '/api/guest-login', '/api/test'].includes(req.path) && !req.is('application/json')) throw new HttpError(415, 'Use application/json.', 'UNSUPPORTED_MEDIA_TYPE');
    next();
  });
  app.use(express.json({ limit: '1mb', strict: true }));
  app.use(cookieParser());
  app.use(require('./routes/auth'));
  app.use(require('./routes/data'));
  for (const [url, file] of [
    ['/api/line', 'line'], ['/api/pie', 'pie'], ['/api/h-bar', 'h-bar'],
    ['/api/bar', 'bar'], ['/api/finance', 'finance'], ['/facebook', 'facebook'],
    ['/apple', 'apple'], ['/tesla', 'tesla'], ['/userData', 'userData'], ['/charts', 'charts'],
  ]) app.use(url, require('./routes/' + file));
  app.post('/api/test', (req, res) => res.json({ success: true }));
  app.use((req, res, next) => next(new HttpError(404, 'Endpoint not found.', 'NOT_FOUND')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    let status = error instanceof HttpError ? error.status : 500;
    if (error.type === 'entity.parse.failed') status = 400;
    if (error.type === 'entity.too.large') status = 413;
    const message = status === 500 ? 'Unable to complete the request.' : status === 413 ? 'Request body exceeds 1 MiB.' : error.type === 'entity.parse.failed' ? 'Invalid JSON.' : error.message;
    if (status >= 500) console.error(JSON.stringify({ level: 'error', requestId: req.requestId, method: req.method, path: req.path, errorType: error.name }));
    res.set('Cache-Control', 'no-store').status(status).json({ success: false, code: error.code || (status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'), message, requestId: req.requestId, ...(error.details ? { details: error.details } : {}) });
  });
  return app;
}
module.exports = createApp();
module.exports.createApp = createApp;
