# DocuSign eSignature integration

EcoGlobe uses DocuSign for the signing ceremony while Azure SQL remains the source of truth for contracts, signers, status, and audit history. Completed agreements and completion certificates are copied to EcoGlobe-controlled Azure Blob Storage.

## User flow

1. An authorized buyer, seller, or administrator creates a contract and assigns exactly one buyer signer and one seller signer.
2. EcoGlobe creates an envelope from the approved DocuSign template. The template must contain `Buyer` and `Seller` recipient roles.
3. DocuSign emails each signer. An authenticated signer can also select **Sign with DocuSign** in EcoGlobe; the backend creates a single-use embedded signing URL that expires in about five minutes.
4. DocuSign Connect posts recipient and envelope events to EcoGlobe. The backend verifies the HMAC before processing the event and reconciles current status from the DocuSign API.
5. When the envelope is complete, EcoGlobe downloads the combined signed agreement and certificate of completion, writes both to Azure Blob Storage, and marks the contract active.

The signing return URL is navigation only. It must never be used as proof that a signature completed; the webhook/API reconciliation is authoritative.

## DocuSign setup

Build and test in a free [DocuSign developer account](https://developers.docusign.com/platform/account/). Developer envelopes are not legally binding. The production integration key is obtained later through [DocuSign Go-Live](https://developers.docusign.com/platform/go-live/) and requires an eligible production API or enterprise plan.

1. In the developer account, create one integration named `EcoGlobe Backend`.
2. Use OAuth JWT Grant for the server-owned sender account. Generate an RSA keypair and grant the integration user the `signature impersonation` consent scope.
3. Create an EcoGlobe contract template with recipient roles named `Buyer` and `Seller`. Place all required tabs for both roles.
4. Create a DocuSign Connect 2.0 configuration that sends JSON events to `https://<backend-host>/api/docusign/webhook` for envelope sent, delivered, completed, declined, and voided events.
5. Enable HMAC signing on that Connect configuration and store the secret only in Azure Key Vault/backend configuration.
6. Create a private Azure Blob container for completed agreements and certificates. Give the backend a write-only SAS or managed-identity equivalent; do not expose the container SAS to web/mobile clients.

## Backend configuration

Copy the DocuSign section from `packages/backend/.env.local.example`. Secrets belong in local untracked environment files for development and Azure Key Vault for deployed environments.

- `DOCUSIGN_ENVIRONMENT`: `demo` while testing; `production` only after Go-Live.
- `DOCUSIGN_INTEGRATION_KEY`: OAuth integration key/client ID.
- `DOCUSIGN_USER_ID`: API user GUID for the system sender.
- `DOCUSIGN_ACCOUNT_ID`: API account GUID, not the human-readable account number.
- `DOCUSIGN_BASE_URI`: `https://demo.docusign.net` for the developer environment; use the production account base URI returned by DocuSign after Go-Live.
- `DOCUSIGN_PRIVATE_KEY`: RSA private key PEM. Escaped newlines are supported locally.
- `DOCUSIGN_TEMPLATE_ID`: approved contract template GUID.
- `DOCUSIGN_RETURN_URL`: EcoGlobe page shown after the signing ceremony.
- `DOCUSIGN_WEBHOOK_HMAC_SECRET`: Connect HMAC secret.
- `AZURE_SIGNED_DOCUMENTS_CONTAINER_SAS_URL`: private container SAS with Create and Write permissions.

Never use `NEXT_PUBLIC_*` for any DocuSign key, RSA material, HMAC secret, or Azure SAS.

## API boundary

- `GET /api/docusign/status` — admin-only readiness check; returns missing variable names, never values.
- `POST /api/contracts/:id/docusign-envelope` — creates and sends one envelope; rejects duplicate envelope creation.
- `POST /api/signatures/:id/docusign-view` — signer-only, short-lived embedded signing URL.
- `POST /api/docusign/envelopes/:id/sync` — authorized recovery/reconciliation path.
- `POST /api/docusign/webhook` — public network endpoint protected by DocuSign HMAC and idempotent event storage.

## Release verification

1. Apply the additive migration with `pnpm --filter=@eco-globe/backend db:migrate:docusign`. It does not reset the database.
2. Confirm `GET /api/docusign/status` reports `configured: true`, `templateConfigured: true`, and `immutableStorageConfigured: true`.
3. Send a sandbox envelope to two test signers and complete both signatures.
4. Confirm signer states progress through sent, viewed, and signed.
5. Confirm duplicate Connect delivery returns success without creating a second event.
6. Confirm the contract becomes active only after DocuSign reports envelope completion.
7. Open the archived agreement and certificate from EcoGlobe-authorized download endpoints.
8. Complete DocuSign Go-Live, replace demo identifiers and base URI with production values, and repeat the smoke test using production-safe test parties.
