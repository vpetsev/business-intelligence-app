# BI App client

The client uses the supported Next.js Pages Router, React, and Chart.js. It keeps the original BI App branding and assets. See the repository README for database setup, production deployment, Docker, and end-to-end tests.

## Local development

Use Node 26.x. Copy `.env.example` to `.env.local`, run `npm ci`, then `npm run dev`. The API defaults to `http://127.0.0.1:3001`.

`BACKEND_URL` is a server-only origin. Next.js builds the `/api/backend/*` rewrite into its output, so set this variable **before** `npm run build` and rebuild when changing API hosts. Do not use `NEXT_PUBLIC_*` for API credentials.

## Application behavior

- `/explore` lists companies and available years from the API. Company pages sort reporting dates and filter calendar years, preserve missing metrics, label synthetic demo data, and provide a numeric table alongside the charts.
- `/register` and `/login` submit labeled forms. Browser authentication uses an HttpOnly cookie. Session state and the CSRF token stay in memory; no bearer token is persisted. Reload and window focus recheck the session. Logout revokes it on the server.
- `/my-data` requires an account. CSV imports accept 1–1,000 rows up to 1 MB, validate the API column schema and numerical bounds, then save the batch. Paginated rows can be charted, exported, and deleted. Guest accounts are read-only. Charts show the current page, not a total across all saved records. CSV amounts remain decimal strings through import and table rendering so all supported digits survive an export/reimport round trip; only canvas plotting converts amounts to approximate JavaScript numbers.
- Registration does not automatically sign in. A registration success takes the user to the login page.

## Verification

```sh
npm run lint
npm test
npm run build
npm start
```

Vitest tests exercise the API request contract, session restoration and races, form failure/retry states, CSV validation, calendar-year filtering, missing numeric values, and saved-data operations. Tests stub only the API/network and canvas rendering; root Playwright tests cover the full browser/API/database path and accessibility. Browser tests verify native file-picker validation, which jsdom does not implement completely.

Template-derived informational pages remain for compatibility; the main navigation points to the working application flows.
