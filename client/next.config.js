const backend = new URL(process.env.BACKEND_URL || 'http://127.0.0.1:3001');
if (!['http:', 'https:'].includes(backend.protocol) || backend.username || backend.password || backend.pathname !== '/' || backend.search || backend.hash) {
  throw new Error('BACKEND_URL must be an HTTP(S) origin without credentials or a path.');
}
module.exports = {
  reactStrictMode: true,
  turbopack: { root: __dirname },
  poweredByHeader: false,
  async rewrites() { return [{ source: '/api/backend/:path*', destination: `${backend.origin}/:path*` }]; },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};
