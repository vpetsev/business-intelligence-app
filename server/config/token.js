const jwt = require('jsonwebtoken');
function secret() {
  if (!process.env.JWT_PASSWORD) throw new Error('JWT_PASSWORD must be configured');
  return process.env.JWT_PASSWORD;
}
exports.sign = user => jwt.sign(
  { id: user.id, username: user.username }, secret(), { algorithm: 'HS256', expiresIn: '1h' }
);
exports.verify = token => jwt.verify(token, secret(), { algorithms: ['HS256'] });
exports.assertConfigured = secret;
