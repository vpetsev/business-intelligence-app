// Sequelize's URL parser overwrites dialectOptions.ssl from URL query parameters.
// Normalize TLS in one place so a provider URL cannot disable certificate verification.
function databaseUrl(value, config) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Database URLs must use PostgreSQL');
  for (const key of ['ssl', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) {
    if (url.searchParams.has(key)) throw new Error('Configure database TLS with DB_SSL/DB_SSL_CA_FILE instead of URL TLS parameters');
  }
  const mode = url.searchParams.get('sslmode');
  if (mode && !['disable', 'require', 'verify-ca', 'verify-full'].includes(mode)) throw new Error('Database sslmode must be disable, require, verify-ca, or verify-full; unverified TLS is not supported');
  const dialectOptions = { ...config.dialectOptions };
  if (mode === 'disable' && dialectOptions.ssl) throw new Error('DATABASE_URL sslmode=disable conflicts with DB_SSL=true');
  if (mode && mode !== 'disable') dialectOptions.ssl = { ...dialectOptions.ssl, require: true, rejectUnauthorized: true };
  url.searchParams.delete('sslmode');
  return { url: url.toString(), config: { ...config, dialectOptions } };
}
module.exports = { databaseUrl };
