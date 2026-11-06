# Security policy

Security fixes target the current default branch. Historical demo deployments
and old commits are not supported releases. Run the current tests, review
dependency alerts, and deploy a reviewed commit rather than a floating branch.

## Report an issue

Use this repository's GitHub **Security → Report a vulnerability** workflow if
private reporting is enabled. Otherwise contact the repository maintainer
privately through their GitHub profile before sharing sensitive reproduction
details. No response-time or remediation SLA is promised.

Do not place passwords, signing keys, database connection strings, customer CSVs,
session cookies, or backup files in public issues, pull requests or test logs.
Use synthetic accounts and isolated databases for reproductions.

## Application boundaries

- User imports belong to the authenticated account. Client-supplied owner IDs
  are not authority to read, create, export or delete another account's records.
- The browser accesses the API through the Next same-origin proxy. Session
  cookies are HttpOnly; state-changing cookie requests require the application's
  CSRF token. Production cookies require HTTPS and the Secure flag.
- Configure exact allowed origins and the verified reverse-proxy hop count.
  A CORS allowlist is not a substitute for authentication or ownership checks.
- Guest accounts are optional, read-only shared identities. Enable them only
  with dedicated non-sensitive demo data; anyone with guest access can read
  that account's data.
- Public company samples and private uploaded records are separate datasets.
  Limit administrative company-data imports with `ADMIN_USERNAMES`.

## Deployment responsibilities

Store production secrets in the hosting provider's secret manager. Never expose
them through `NEXT_PUBLIC_*`, Docker build arguments, source control, or images.
Use TLS for public traffic and database connections where supported; validate
database certificates with the provider's CA instead of disabling verification.
Review dependency update pull requests and keep the Node 26 security patch level
and container images current.

Previously committed credentials must be rotated at their issuer. Removing an
environment file from the latest commit does not revoke it or erase existing
clones/history. See [credential rotation and recovery](deploy/OPERATIONS.md).

CI uses disposable credentials and databases. Its integration tests require an
empty database and intentionally refuse populated schemas; never provide a
production database URL to a test job. Backups and test traces can contain
account data and must have restricted retention and access.
