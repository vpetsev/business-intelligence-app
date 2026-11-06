# Business Intelligence App

A Next.js client and Express/PostgreSQL API for exploring sample company data and
managing a signed-in user's own CSV imports. The client and server are separate
applications with independent npm lockfiles; the root package only orchestrates
commands and browser tests.

## Supported baseline

- Node.js 26 LTS and its bundled npm.
- PostgreSQL 16 for the supported local/CI database baseline.
- Docker Engine/Desktop with Compose v2 for the container quickstart, or an
  independently managed PostgreSQL instance for native development.
- Chromium for the Playwright end-to-end and accessibility checks.

The repository includes CI configuration, but a file in Git does not prove a
successful CI or production deployment. Check the Actions run for the exact
commit you plan to deploy. No old demo URL is treated as a supported deployment.

## Quickstart with local containers

From the repository root:

```sh
node deploy/init-local-env.cjs
docker compose up --build --detach --wait
docker compose run --rm api npm run seed
```

The first command creates fresh local database/signing secrets in an ignored
`.env` with restrictive file permissions and refuses to overwrite an existing
file. Compose waits for PostgreSQL, applies migrations in a one-shot service,
then starts the API and production-built client. The API uses development
configuration for local HTTP; production deployments use stricter HTTPS settings.
Open http://localhost:3000 and register a new account; no shared/default password
is installed. If you change `WEB_PORT`, update `CORS_ORIGINS` to that exact client
origin as well.

The API is at http://localhost:3001; readiness is `/health/ready`. All published
ports bind only to the local machine. `docker compose logs --follow api client`
shows service logs. `docker compose down` stops the services while retaining the
named database volume. Changing `POSTGRES_PASSWORD` after a volume was initialized
does not rotate the database role's password; use the operator rotation procedure.

The Compose configuration is for local HTTP. Production requires HTTPS, Secure
cookies, managed secrets and appropriate database/proxy settings; see
[deployment and recovery](deploy/OPERATIONS.md).

## Native development

```sh
nvm use
npm ci
npm run setup
cp -n server/.env.example server/.env
cp -n client/.env.example client/.env.local
```

Create a dedicated local PostgreSQL database, then edit `server/.env` using the
[server environment reference](server/README.md). Set its database connection and
a fresh random `JWT_PASSWORD` of at least 32 bytes. Configure `CORS_ORIGINS` for
`http://localhost:3000`; use non-Secure cookies only for local HTTP. Set the
server-only client `BACKEND_URL=http://127.0.0.1:3001` in `client/.env.local`.
Never copy production credentials into this workspace.

```sh
npm run db:migrate
npm run db:seed
npm run dev:api
```

In another terminal from the repository root:

```sh
npm run dev:client
```

The native client and API use ports 3000 and 3001. The seed command adds sample
company rows idempotently; account seeding is optional and explicitly configured.
The browser uses `/api/backend/...` on the client's origin, and Next proxies that
path to the API. `BACKEND_URL` is used when building the rewrite, so restart the
development server or rebuild the production client after changing it.

## Data flow and CSV contract

1. Register/sign in through the client; the API issues an HttpOnly session cookie.
2. Upload a UTF-8 CSV through the authenticated dashboard. The client parses and
   validates it; the API independently validates every row and owns the final check.
3. The API takes ownership from the authenticated account, saves rows in
   PostgreSQL, and returns completed results. Listing, exporting and deleting
   imports are scoped to that same account.
4. Public sample-company charts read a separate dataset. A private CSV import is
   not automatically published as a public company chart.

```csv
company,Revenue,Expenses,costAndExpenses,grossProfit
Example Company,1000.50,400.25,400.25,600.25
Second Company,800,200,,
```

| Column | Contract |
| --- | --- |
| `company` | Required nonempty company name, at most 120 characters. |
| `Revenue` | Required finite decimal value. Header is case-sensitive. |
| `Expenses` | Required finite decimal value. Header is case-sensitive. |
| `costAndExpenses` | Optional finite decimal; defaults to `Expenses` when omitted/blank. |
| `grossProfit` | Optional finite decimal; defaults to `Revenue - Expenses` when omitted/blank. |

An import contains 1–1,000 rows and must fit the API's 1 MiB JSON request limit
(after CSV parsing). Numeric values must have at most four decimal places and be
between -999,999,999,999 and 999,999,999,999. Do not include currency symbols or
thousands separators in numeric cells. The interface displays amounts in USD;
provide USD figures because no currency conversion is performed. The application
does not infer an accounting policy. Check the saved table after import.
Exact API responses, pagination and validation errors are documented in
[server/README.md](server/README.md).

## Validation

```sh
npm run lint --prefix client
npm run test:client
npm run build
npm audit --include=dev --audit-level=moderate
npm audit --prefix server --include=dev --audit-level=moderate
npm audit --prefix client --include=dev --audit-level=moderate
```

The API suite requires a **fresh empty, disposable PostgreSQL database** and
refuses a populated schema. Configure `TEST_DATABASE_URL` through your local
environment, then run `npm run test:api`. It applies real migrations and performs HTTP/database
regressions; it is not a mocked SQL test. Use a new disposable database for each
API run, never the application or production database.

For browser tests, use a different dedicated database:

```sh
# Set E2E_DATABASE_URL to your separate disposable PostgreSQL database first.
NODE_ENV=test TEST_DATABASE_URL="$E2E_DATABASE_URL" DATABASE_URL="$E2E_DATABASE_URL" npm run db:migrate
NODE_ENV=test TEST_DATABASE_URL="$E2E_DATABASE_URL" DATABASE_URL="$E2E_DATABASE_URL" npm run db:seed
BACKEND_URL=http://127.0.0.1:8321 npm run build
npx --no-install playwright install chromium
npm run test:e2e
```

Playwright starts the API on port 8321 and the production client on port 8320.
Its database is distinct from the empty-database regression suite. Browser and
accessibility diagnostics are written to ignored `playwright-report/` and
`test-results/` directories. Use `npm run test:e2e:report` to inspect a report.

The **Quality** workflow installs all three lockfiles, checks repository hygiene,
audits production/development dependencies for moderate-or-higher advisories,
runs API tests against PostgreSQL 16, runs client lint/tests/build, applies migrations
and seeds twice on a separate E2E database, and runs browser/accessibility tests.
A separate job builds Compose images and checks service readiness. GitHub-hosted
PostgreSQL services and Playwright browser installation follow their official
[GitHub](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)
and [Playwright](https://playwright.dev/docs/ci-intro) guidance. Require passing
checks in branch protection after the workflow has run successfully.

## Deploy and maintain

- [Deployment, backups, credential rotation and legacy-owner recovery](deploy/OPERATIONS.md)
- [Security policy and reporting](SECURITY.md)
- [API configuration and behavior](server/README.md)

Environment files, installed dependencies, generated Next output, backups and
browser traces are not source artifacts. Preserve lockfiles and the retained
public theme assets; do not commit local build outputs. Dependabot configuration
proposes dependency and GitHub Action updates; review and test those changes
before merging them.

Original application by Victor Petsev and David Carlisle.
