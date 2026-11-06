# Operations and recovery

This guide describes operator procedures. It does not create infrastructure,
rotate live credentials, change ownership, or promise an availability target.
Record the deployed commit, image digest, migration state and environment owner
for each deployment. The Docker files accept a `NODE_IMAGE` build argument so a
reviewed base-image digest can be pinned by the release pipeline.

## Deploy the client on Vercel

Import this GitHub repository and set **Root Directory** to `client`, framework
to Next.js, Node.js to 26, install command to `npm ci`, and build command to
`npm run build`. Vercel supports selecting a project subdirectory independently
of other applications in the same repository. [Vercel monorepo documentation](https://vercel.com/docs/monorepos)

The reported deployment failure selected obsolete Node.js 12.x. This repository
now requests `26.x` in its package engines. Vercel gives `engines.node` precedence
over the project's Node setting; select the `client` root and align the project
setting with 26 as well, then redeploy. [Vercel Node version selection](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

Set the server-only `BACKEND_URL` to the reachable HTTPS API origin for each
environment. Production and preview deployments should use separate APIs and
databases. The Next rewrite is generated at build time, so changing its backend
requires a new client build/deployment. Never put database or JWT secrets into
Vercel's public client variables. Configure the API's `CORS_ORIGINS` with the
exact client origins that may use it; do not allow every `*.vercel.app` origin.

The Express API is a separate process with persistent PostgreSQL storage. It is
not deployed by selecting the client folder on Vercel. Use the API container on
a service with TLS termination, health checks, environment secrets and database
connectivity. Consult [Next self-hosting guidance](https://nextjs.org/docs/app/guides/self-hosting)
when operating the client container behind your own reverse proxy.

## Deploy the API container

From the repository root:

```sh
docker build -f deploy/Dockerfile.api -t bi-api:reviewed .
```

Supply these values through the runtime platform, not the image build:

| Variable | Production meaning |
| --- | --- |
| `NODE_ENV=production` | Enables production configuration. |
| `DATABASE_URL` | Dedicated application database and least-privilege runtime role. |
| `JWT_PASSWORD` | Random signing secret of at least 32 bytes. |
| `CORS_ORIGINS` | Comma-separated exact HTTPS client origins. |
| `COOKIE_SECURE=true` | Secure session cookies over HTTPS. |
| `TRUST_PROXY_HOPS` | Verified number of trusted reverse-proxy hops; default 0. |
| `DB_SSL=true` | Verify TLS for the database connection. |
| `DB_SSL_CA_FILE` | Optional readable, mounted provider CA certificate file. |
| `HOST=0.0.0.0`, `PORT=3001` | Container listener; map it through the platform. |

See [the server reference](../server/README.md) for rate limits, optional demo
accounts, administrative imports and all environment options. The local Compose
file runs the API with development configuration, binds ports to loopback and
permits non-Secure cookies for local HTTP; it is not an internet-facing
production topology.

Run `npm run migrate` as a single release job from the new API image before
routing traffic to that version. Migrations are recorded and serialized; a
failure must stop the rollout. Normal API startup does not run migrations or
silently repair customer data. Seed sample company data with `npm run seed` only
when desired; it is idempotent and does not grant ownership to legacy imports.

Probe `/health/live` for process liveness and `/health/ready` for database/schema
readiness. Drain connections and allow graceful termination during replacement.
Capture HTTP status/error rates and readiness failures without logging passwords,
cookies, Authorization headers or CSV bodies. The built-in process-local rate
limits need a shared store or an upstream limiter before horizontally scaling.

## Back up and verify recovery

Keep encrypted backups outside the application host, restrict access, and define
retention/RPO/RTO with the data owner. Use PostgreSQL client tools compatible
with the server. Configure credentials in a protected PostgreSQL service/passfile
or secret manager instead of embedding them in shell history.

For a configured `bi_backup` PostgreSQL service:

```sh
umask 077
mkdir -p backups
PGSERVICE=bi_backup pg_dump --format=custom --no-owner --no-acl \
  --file="backups/bi-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

A logical dump contains a consistent database snapshot, but not cluster-wide
roles or provider configuration. Record those separately. [PostgreSQL backup reference](https://www.postgresql.org/docs/16/backup-dump.html)

For a recovery drill, create a **new empty database** on an isolated service and
configure a `bi_restore_check` service to point only to it. Confirm its hostname,
database name and empty public schema before restoring. Then run:

```sh
pg_restore --list backups/chosen-backup.dump
pg_restore --exit-on-error --single-transaction --no-owner --no-acl \
  --dbname='service=bi_restore_check' backups/chosen-backup.dump
```

The `chosen-backup.dump` path is the operator-selected backup; inspect its origin
before running it. These commands omit `--clean` and `--create`, so they do not
drop an existing database. Set application-role grants explicitly on the restored
database, verify expected table/row counts and migration records, and smoke-test
an isolated API with an authorized account. Never run the empty-database test
suite against recovered customer data. Record restore duration and the outcome.
[PostgreSQL restore reference](https://www.postgresql.org/docs/16/app-pgrestore.html)

Rehearse application rollback separately: route to the previous compatible image
only if its schema contract still holds. Do not automatically reverse migrations
or restore over a live database. Preserve the failed deployment's data and logs
for diagnosis.

## Rotate previously exposed credentials

1. Inventory the affected environment and issuer without copying secret values
   into tickets or commits. Treat values previously committed to Git as exposed.
2. Back up the database, create replacement credentials at the provider, and
   update the deployment's secret configuration. Verify a new connection before
   revoking the old credential; avoid leaving both valid indefinitely.
3. Rotate `JWT_PASSWORD` and restart all API instances together. Existing signed
   sessions will be invalidated, so users must sign in again. Also rotate any
   configured guest/demo passwords and remove unused accounts.
4. Verify the old credentials no longer work, review access logs with the account
   owner, and check deployments/CI variables for stale copies. If Git history
   remediation is needed, plan it separately with maintainers; deleting a file
   or rewriting history cannot replace credential revocation.

No live credential is changed by the repository's migration or setup scripts.

## Recover ownerless legacy imports without guessing

Older versions could save rows with a null `SavedData.userId`. The current
application leaves them inaccessible to ordinary user queries; it does not infer
ownership from a submitted user ID, company name or upload timestamp.

1. Take a verified backup and inventory affected IDs in a restricted, read-only
   database session:

   ```sql
   SELECT id, company, "createdAt"
   FROM "SavedData"
   WHERE "userId" IS NULL
   ORDER BY id;
   ```

2. Establish ownership from authoritative historical upload records plus verified
   account identity. Company names and approximate dates are not sufficient proof.
   Leave ambiguous rows unassigned; do not give them to the first claimant or a
   shared guest account.
3. Prepare an explicit row-ID → existing-user-ID mapping with its evidence and
   reviewer recorded outside the repository. Rehearse it on an isolated restored
   copy. Check foreign keys, row counts and cross-user read/export/delete denial.
4. Have an authorized database operator apply only the reviewed mapping in a
   transaction: lock the listed rows, require their owner still to be null, verify
   each destination user exists and each affected-row count matches, and roll back
   on any mismatch. Commit only the reviewed mapping and retain the recovery audit
   record. No generic ownership-repair command is supplied or run automatically.

The same caution applies if username normalization detects duplicates: migrations
halt rather than merge identities. Resolve the ambiguity with the account owners
and an explicit reviewed mapping before rerunning the migration.
