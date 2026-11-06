const app = require('./app');
const models = require('./models');
const { HOST, PORT } = app.locals.runtime;
let server;
async function shutdown(signal) {
  if (app.locals.shuttingDown) return;
  app.locals.shuttingDown = true;
  console.log(JSON.stringify({ event: 'shutdown', signal }));
  const timeout = setTimeout(() => { server?.closeAllConnections(); process.exit(1); }, 10000).unref();
  try {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await models.sequelize.close();
    clearTimeout(timeout);
  } catch (_) { process.exitCode = 1; }
}
async function start() {
  await models.sequelize.authenticate();
  server = app.listen(PORT, HOST, () => console.log(JSON.stringify({ event: 'listening', port: PORT, host: HOST })));
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.on('error', async error => { console.error(JSON.stringify({ event: 'listen_failed', code: error.code })); process.exitCode = 1; await shutdown('listen-error'); });
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => shutdown(signal));
}
start().catch(async error => { console.error(JSON.stringify({ event: 'startup_failed', errorType: error.name })); process.exitCode = 1; await models.sequelize.close(); });
