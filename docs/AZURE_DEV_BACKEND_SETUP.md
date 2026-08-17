# EcoGlobe Azure Dev Backend Setup

## Current Direction

EcoGlobe's dev/demo backend now uses an Azure-based foundation:

- Azure SQL for relational marketplace data.
- Azure-hosted backend API.
- Azure Key Vault for secrets.
- Azure Storage for documents and images when backend file handling begins.
- Azure budget guardrails from the beginning.

## Azure Resource Defaults

| Area               | Current value                              |
| ------------------ | ------------------------------------------ |
| Subscription       | `Azure subscription Main`                  |
| Resource group     | `rg-ecoglobe-dev`                          |
| Region             | `eastus`                                   |
| Monthly budget cap | `$100`                                     |
| Database server    | `ecoglobedevsql0722.database.windows.net`  |
| Database           | `sqldb-ecoglobe-dev`                       |
| SQL admin user     | `ecoglobeadmin`                            |
| SQL admin password | Key Vault secret `sql-admin-password`      |
| Key Vault          | `kv-ecoglobe-dev`                          |
| Key Vault URI      | `https://kv-ecoglobe-dev.vault.azure.net/` |

## Completed Azure Setup

The following resources have been created in Azure:

- Resource group: `rg-ecoglobe-dev`
- Azure SQL logical server: `ecoglobedevsql0722`
- Azure SQL database: `sqldb-ecoglobe-dev`
- Azure Key Vault: `kv-ecoglobe-dev`
- SQL admin password secret: `sql-admin-password`
- Current-dev-machine SQL firewall rule: `allow-current-dev-machine`
- Monthly budget: `ecoglobe-dev-monthly-budget` at `$100`
- Expanded Azure SQL marketplace schema: `52` `dbo` tables
- SQL-connected backend health and schema endpoints
- Backend password/session auth with bearer tokens

The budget currently exists without email notification recipients. Add notification contacts once the right recipient list is confirmed.

## Database Baseline

The Azure SQL baseline is in:

```text
packages/backend/db/schema.sql
```

The schema follows the database design decisions agreed with the team:

- Integer identity primary keys.
- Integer foreign keys.
- Lookup tables for flexible statuses and account/company types.
- `CreatedByUserId`, `CreatedAt`, `UpdatedByUserId`, and `UpdatedAt` support fields on every table.
- External auth/provider IDs stored as non-primary-key reference fields.

Current operational areas covered:

- Users, companies, company members, buyer profiles, and seller profiles.
- Locations, listings, listing documents, material types, and listing statuses.
- Quotes and orders, including admin-direct order source support.
- Shipments, carriers, escrow, payments, payouts, and disputes.
- Contracts, signatures, notifications, notification preferences, and audit logs.
- Lookup tables for statuses, channels, sources, roles, permissions, actor types, action types, and record types.

Seeded lookup examples:

- Account statuses: `unsubscribed`, `subscribed_buyer`, `subscribed_seller`, `pending_verification`, `verified`, `suspended`
- Company types: `buyer`, `seller`, `both`
- Permission tiers: `view_only`, `requester`, `approver`, `executor`, `admin_override`
- Material types: `industrial_byproduct`, `low_co2_feedstock`, `certified_feedstock`, `used_product`
- Order sources: `quote_acceptance`, `admin_direct`, `contract_milestone`
- Escrow statuses and release rules for funding, delivery confirmation, admin approval, and dispute locks

## Apply Or Reapply Schema

The schema is idempotent for dev/demo use and can be safely rerun:

```bash
SQL_ADMIN_PASSWORD="$(az keyvault secret show --vault-name kv-ecoglobe-dev --name sql-admin-password --query value -o tsv)"

sqlcmd \
  -S ecoglobedevsql0722.database.windows.net \
  -d sqldb-ecoglobe-dev \
  -U ecoglobeadmin \
  -P "$SQL_ADMIN_PASSWORD" \
  -i packages/backend/db/schema.sql \
  -b
```

Verify the baseline table count:

```bash
SQL_ADMIN_PASSWORD="$(az keyvault secret show --vault-name kv-ecoglobe-dev --name sql-admin-password --query value -o tsv)"

sqlcmd \
  -S ecoglobedevsql0722.database.windows.net \
  -d sqldb-ecoglobe-dev \
  -U ecoglobeadmin \
  -P "$SQL_ADMIN_PASSWORD" \
  -Q "SELECT COUNT(*) AS table_count FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo');" \
  -b
```

## Convex Migration Completion Review

The active Convex runtime migration is complete for the current web, mobile, and backend packages:

- Runtime Convex and Better Auth providers, routes, generated bindings, schema, and dependencies have been removed.
- The Azure SQL schema is the relational source of truth for marketplace, transaction, onboarding, finance, logistics, notification, contract, dispute, and audit records.
- The Node API exposes health, schema, endpoint-catalog, OpenAPI, authentication, onboarding, and marketplace lifecycle routes on port `4050` by default.
- Web login, registration, logout, dashboard selection, buyer onboarding, seller onboarding, and protected portal layouts use the backend API boundary.
- Protected buyer, seller, and web-admin routes refresh `/auth/session` and reject sessions whose active account/company role does not match the requested portal.
- Mobile no longer includes the Convex client dependency.
- Local development loads `packages/backend/.env.local` first, then the process environment, without overriding production-provided variables.

Repository references to `.convex` that remain in disk-maintenance documentation and tooling describe disposable local cache cleanup; they are not application runtime dependencies.

## Local Backend Foundation

The local backend package is the Azure SQL-oriented API foundation.

Current local pieces:

- `packages/backend/src/index.ts` exposes health and schema verification endpoints.
- `packages/backend/src/api.ts` exposes the first REST CRUD endpoints.
- `packages/backend/src/database.ts` manages Azure SQL pooling and metadata queries.
- `packages/backend/db/schema.sql` contains the Azure SQL marketplace baseline schema.
- `packages/backend/.env.local.example` documents the local connection string key.
- Root dev scripts now use `dev:api` for the backend API.

Copy the example before running the API locally, then supply the dev connection string through the copied file or the process environment:

```bash
cp packages/backend/.env.local.example packages/backend/.env.local
pnpm dev:api
```

The API does not require a repository-tracked secret and `.env.local` remains ignored.

Local smoke endpoints:

```text
GET http://127.0.0.1:4050/health
GET http://127.0.0.1:4050/schema/tables
```

Expected `/health` response when `AZURE_SQL_CONNECTION_STRING` is configured:

```json
{
  "ok": true,
  "service": "eco-globe-backend",
  "database": {
    "configured": true,
    "connected": true
  }
}
```

Expected `/schema/tables` response includes:

```json
{
  "ok": true,
  "count": 52,
  "tables": []
}
```

## Current API Endpoint Groups

The backend exposes a discoverable endpoint catalog at `GET /api/endpoints.json` and an OpenAPI document at `GET /api/openapi.json`. Implemented groups include:

Auth endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/session`
- `POST /auth/logout`
- `POST /auth/dev/seed-demo-users`
- `GET /auth/dev/browser-test`

- Users, companies, company members, locations, and buyer/seller onboarding profiles.
- Listings, quotes, orders, admin-direct orders, notifications, and notification preferences.
- Carriers, shipments, escrows, payments, payouts, and disputes.
- Contracts, signatures, and admin audit logs.
- Stripe onboarding session placeholders at the backend boundary for buyer billing and seller payouts.

Use the endpoint catalog or OpenAPI document as the current route source of truth instead of maintaining a duplicate route list here.

Backend auth behavior:

- Passwords are stored as salted PBKDF2 hashes in `UserPasswords`.
- Sessions store only SHA-256 token hashes in `UserSessions`; the browser-facing Next.js proxy stores the raw session token only in an `HttpOnly`, expiring cookie and never exposes it to client JavaScript.
- `POST /auth/register` creates a password-backed user.
- `POST /auth/login` returns user/company context through the web proxy; native/API clients may use the one-time bearer token directly.
- Browser requests use `/api/backend/*`, which forwards the `HttpOnly` cookie to the backend and revalidates `/auth/session` on protected portal entry.
- Native/API clients use `Authorization: Bearer <token>` for protected endpoints.
- `POST /auth/logout` revokes the server session and clears the browser cookie.
- `POST /auth/dev/seed-demo-users` seeds demo buyer, seller, and admin accounts in non-production environments.
- `GET /auth/dev/browser-test` opens a browser-visible smoke test page in non-production environments.
- CORS/OPTIONS support is enabled for browser-based frontend and preview testing.

Seeded demo auth accounts:

- Buyer: `demo.buyer@ecoglobe.com`
- Seller: `demo.seller@ecoglobe.com`
- Admin: `demo.admin@ecoglobe.com`
- Configure the local-only password with `ECOGLOBE_DEMO_PASSWORD` before seeding; no default credential is committed or returned by the API.

Example authenticated request:

```bash
TOKEN="$(curl -sS -X POST http://127.0.0.1:4050/auth/login \
  -H "content-type: application/json" \
  -d "$(jq -n --arg password "$ECOGLOBE_DEMO_PASSWORD" '{email:"demo.seller@ecoglobe.com",password:$password,role:"seller"}')" \
  | jq -r '.token')"

curl -X POST http://127.0.0.1:4050/api/companies \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{"legalName":"Demo Supplier LLC","companyTypeCode":"seller","verificationStatusCode":"verified"}'
```

## Next Backend Steps

1. Add budget notification email recipients for 50%, 80%, and 100%.
2. Complete endpoint-by-endpoint authorization hardening so every data read and mutation enforces the company/member permission model server-side.
3. Replace remaining public and dashboard demo data with live API queries under the existing client/API boundary.
4. Connect the standalone admin application to the shared Azure auth/session flow.
5. Add Azure Storage when document/image upload flows are connected to the backend.
6. Choose and provision backend hosting, most likely a low-cost Azure Container Apps or Azure Functions setup for dev/demo.
7. Add versioned production migrations; the current idempotent schema remains the dev/demo bootstrap baseline.
8. Replace payment and signature placeholders with approved provider integrations and add production notification delivery.
