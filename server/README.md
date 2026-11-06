# Business intelligence API

Requires Node 26 and PostgreSQL. The API serves public company charts and authenticated, owner-scoped saved datasets. Synthetic seed rows are labeled `source: "demo"`; they are examples, not reported financial results.

## Local setup

From `server/`, run `npm ci`, copy `.env.example` to `.env`, configure local PostgreSQL, and generate a random `JWT_PASSWORD` of at least 32 characters. Then run:

```sh
npm run migrate
npm run seed
npm start
```

The default listener is `0.0.0.0:3001`; set `HOST=127.0.0.1` to restrict a direct local listener. `npm run dev` uses Node's file watcher. No account/password is enabled by default. The idempotent seed adds 36 synthetic company rows for 2017–2019, preserving existing symbol/date records. Optional `DEMO_USERNAME` and `DEMO_PASSWORD` create a development/test account only if absent; existing passwords are never overwritten, and production demo account creation is refused.

Use the supplied frontend's same-origin `/api/backend/*` proxy for browser requests. Direct development access requires exact browser origins in `CORS_ORIGINS`; wildcards are rejected. Match `localhost` versus `127.0.0.1` consistently.

## API contract

POST bodies require `Content-Type: application/json`. Bodies above 1 MiB receive 413. Validation returns 400 with up to ten `{field,message}` details. Errors return `{success:false,code,message,requestId}`; internal SQL and credentials are not exposed. `X-Request-ID` correlates sanitized server errors without logging request bodies, tokens, or passwords.

| Method and path | Behavior |
| --- | --- |
| `POST /register` | `{username,password}` creates an account (201). Usernames normalize to trimmed lowercase, using 3–100 ASCII letters, digits, or `@._+-`. Passwords require at least 12 characters and at most 72 UTF-8 bytes. Duplicate normalized usernames return 409, including concurrent requests. |
| `POST /api/login` | Returns `{success,user:{id,username,readOnly},userId,csrfToken,token}` and a session cookie. Existing shorter credentials remain usable to avoid locking out old accounts. |
| `GET /api/session` | Returns `{user,csrfToken}` for the active session, otherwise 401. Responses are not cacheable. |
| `POST /api/logout` | Revokes the current session, clears its cookie, returns 204. Other sessions remain active. |
| `POST /api/guest-login` | Enabled only by explicit `GUEST_USERNAME`/`GUEST_PASSWORD`, otherwise 503. Account must already exist. Guest sessions are read-only and share that account's saved rows; use public sample data only. |
| `GET /api/data?limit=50&offset=0` | Returns `{rows,total,limit,offset}`, ordered by ID. `limit` is 1–200. Only the caller's rows are included. |
| `POST /api/data` | Atomically imports 1–1,000 validated rows; returns `{success,count,message}` with 201. Per-user total is limited to 10,000, including concurrent imports. |
| `DELETE /api/data/:id` | Deletes one owned row (204); another user's or missing row returns 404. Guest writes return 403. |
| `GET /api/data/export` | Owned CSV with upload column names. Formula-like text gains an apostrophe for spreadsheet safety. Legacy datasets above 10,000 rows return 409 and need an operator export, never silent truncation. |
| `GET /userData/user-data/:id` | Compatible own-user array endpoint, up to 1,000 rows. Larger datasets return 409 directing clients to pagination. |
| `GET /charts` | Company metadata `{company,symbol,name,years}` using available calendar years. |
| `GET /apple`, `/facebook`, `/tesla` | Company rows ordered by date and ID, capped at 5,000. Optional `/:year` filters a calendar year from 1900–2100. Empty years return `[]`; invalid years return 400. |
| `POST /chart-data` | Disabled unless the account is in `ADMIN_USERNAMES`. Integer fields `symbol,date,revenue,costAndExpenses,grossProfit` required; `costOfRevenue` optional. Dates must be valid ISO calendar dates. Duplicate symbol/date pairs return 409; imports are atomic. |
| `GET /health/live` | Process liveness (200), independent of the database. |
| `GET /health/ready` | 200 only with a reachable database, latest recorded migration, and required tables/columns; otherwise 503. Returns 503 while draining. |

`POST /api/logout` and `/api/guest-login` also accept an empty body. Administrator names are reserved from public registration: create and verify the operator-owned account before adding its username to `ADMIN_USERNAMES`.

Historical static demo routes `/api/line`, `/api/pie`, `/api/h-bar`, `/api/bar`, `/api/finance`, and `POST /api/test` are retained.

Saved-data upload example (unknown fields, including `userId`, are rejected):

```json
[{"company":"Example","Revenue":"123.50","Expenses":"12.00","costAndExpenses":"12.00","grossProfit":"111.50"}]
```

`company` is trimmed, required, at most 120 characters, with no control characters. `Revenue` and `Expenses` are required finite decimals with at most four decimal places and absolute values at most 999,999,999,999. Optional `costAndExpenses` defaults to `Expenses`; `grossProfit` defaults to their difference rounded to four places. Decimal strings or JSON numbers work; currency symbols, thousands separators, exponents in strings, empty fields, and non-finite values are rejected. Responses retain `revenue`, `expenses`, `cost_expenses`, `gross_profit`, `company`, `id`, and `userId`.

## Sessions and request security

`bi_session` is an HttpOnly, SameSite=Lax cookie scoped to `/` and valid for one hour. Secure cookies are the production default. Browser code keeps only a CSRF token in memory and sends `X-CSRF-Token` on authenticated POST/DELETE requests; reload it from `/api/session` after page reload. Origins outside the exact allowlist are rejected. Login still returns Bearer tokens for non-browser API clients, which do not require CSRF headers. Browser code should not persist tokens in local/session storage.

Every token has a database session record and signed issuer/audience/expiry. Logout revokes both cookie and Bearer use of that session. Replacing a cookie login revokes the previous browser session. Deleting an account invalidates its sessions. Historical stateless tokens are invalid after this upgrade; sign in again. Expired sessions are removed on successful login; operators can also purge expired records periodically.

Default limits: 20 authentication requests per IP per 15 minutes, 300 other requests per IP per minute. Configure `AUTH_RATE_LIMIT_MAX` and `API_RATE_LIMIT_MAX` if needed. Limits are process-local: use a shared gateway limiter before horizontal scaling. Set `TRUST_PROXY_HOPS` to the exact trusted proxy count; excessive trust permits IP spoofing. Limits return 429 with retry metadata.

## Migrations and existing data

`npm run migrate` records filenames in `SequelizeMeta`, applies pending changes in one PostgreSQL transaction, and takes an advisory lock to serialize migrators. Re-running is safe. Historical migration files accept transaction options while retaining Sequelize CLI compatibility. Startup never applies migrations automatically.

Username normalization first checks for blank credentials and case/whitespace collisions. Ambiguity aborts the entire migration for operator review: accounts are never silently merged/deleted. Review affected users, resolve deliberately in a backed-up database, then retry. A unique index and normalization constraint enforce subsequent writes.

Existing NULL/dangling `SavedData.userId` values remain untouched and invisible to ordinary users. A `NOT VALID` foreign key preserves old rows while enforcing new references. Never assign orphan rows arbitrarily: recover only with reliable owner evidence and validate the constraint after a reviewed backup/repair. Existing duplicate company rows remain preserved; new admin imports serialize duplicate checks. Hand-created tables without migration history require an operator-reviewed baseline, not automatic adoption.

Test upgrades against restored backups before production. Normalization cannot restore original case/whitespace on rollback. No automatic down-migration command is exposed because dropping schema/session additions can lose metadata and invalidate sessions.

## Production operation

Set `NODE_ENV=production`, `DATABASE_URL`, a strong secret, and explicit HTTPS `CORS_ORIGINS`. `DB_SSL=true` verifies PostgreSQL certificates; `DB_SSL_CA_FILE` supports private CAs. Certificate verification is never disabled. Provider URL `sslmode=require`, `verify-ca`, or `verify-full` are normalized to verified TLS without replacing a configured CA. `sslmode=no-verify`, conflicting `disable`, and URL certificate overrides are rejected; use `DB_SSL_CA_FILE` for the CA. `COOKIE_SECURE=false` is only for local HTTP; production HTTP origins are accepted only for loopback hosts with this explicit override. Real deployments require TLS at the reverse proxy.

`SIGTERM`/`SIGINT` mark readiness unavailable, stop accepting connections, drain active requests, and close the SQL pool, with ten seconds before forced exit. HTTP and SQL have finite timeouts. `DB_POOL_MAX` defaults to five connections and accepts 1–50. Provide backups, monitor errors/readiness, and use shared rate limits before multi-instance deployment. Rotate historical committed credentials externally: removing `.env` cannot revoke leaked values.

## Tests and maintenance

`TEST_DATABASE_URL=postgresql://... npm test` requires a dedicated EMPTY database and refuses to mutate one containing tables. It never falls back to the application database. Tests run real migrations twice and seed twice, then exercise SQL/HTTP registration races, cookie/Bearer auth, expiry/ownership/CSRF, atomic imports, pagination/export/delete, admin imports/year filters, CORS/rate/body limits, logout, database failures, and legacy migration safeguards. Fixtures remain for inspection; recreate the disposable database before rerunning.

PGlite is useful for local smoke tests but its socket adapter has single-connection semantics. Set `DB_POOL_MAX=1` only for that local adapter; CI uses normal PostgreSQL with the default pool to exercise actual concurrent transactions. Do not treat a PGlite pass as proof of PostgreSQL multi-connection behavior.

Dependencies are exact-pinned. Express 5 handles rejected async route promises; Sequelize 6 is the stable major. A scoped override selects patched `uuid@11.1.1` for Sequelize; regression tests exercise transactions/generated identifiers. Maintain with `npm ci` and `npm audit --omit=dev`; dependency scans supplement application tests.
