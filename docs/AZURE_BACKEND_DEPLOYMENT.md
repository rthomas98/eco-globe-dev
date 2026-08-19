# EcoGlobe Backend Deployment

The production web application proxies `/api/backend/*` requests to the
Azure-hosted API through the server-only `ECOGLOBE_API_BASE_URL` environment
variable. The browser never receives the Azure SQL connection string or
backend provider secrets.

## Container

Build from the repository root so the backend can use the shared TypeScript
configuration during compilation:

```bash
docker build -f packages/backend/Dockerfile -t ecoglobe-backend:local .
```

The runtime listens on `0.0.0.0:8080` and exposes `GET /health` for the Azure
Container App health probe.

## Required Runtime Configuration

Store secret values as Azure Container App secrets, preferably backed by Azure
Key Vault. Do not put secret values in the image or repository.

- `AZURE_SQL_CONNECTION_STRING`
- `RESEND_API_KEY`
- `DOCUSIGN_PRIVATE_KEY` when DocuSign is activated
- `DOCUSIGN_WEBHOOK_HMAC_SECRET` when DocuSign is activated
- `AZURE_SIGNED_DOCUMENTS_CONTAINER_SAS_URL` when signed-document archiving is activated

Set these non-secret runtime values on the Container App:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=8080`
- `ECOGLOBE_WEB_URL=https://eco-globe-dev-web.vercel.app`
- `CORS_ORIGIN=https://eco-globe-dev-web.vercel.app`
- `RESEND_FROM_EMAIL=noreply@ecoglobeworld.com`
- `ECOGLOBE_EMAIL_TEST_RECIPIENT=kate@leapprosolutions.com`
- `ECOGLOBE_EMAIL_OVERRIDE_ALL=true` until production recipient delivery is approved

## Web Project

Set `ECOGLOBE_API_BASE_URL` on the `eco-globe-dev-web` Vercel project to the
HTTPS Container App origin, without a trailing slash. Redeploy the web project
after changing the environment variable because Vercel applies new values only
to subsequent deployments.

## Release Verification

1. Confirm the Container App reports a healthy revision.
2. Confirm its `/health` response reports Azure SQL as configured and connected.
3. Confirm `https://eco-globe-dev-web.vercel.app/api/backend/health` returns the same healthy response.
4. Sign in through the production web login and verify the expected portal redirect.
5. Verify refresh, sign-out, and wrong-role access in the browser.
