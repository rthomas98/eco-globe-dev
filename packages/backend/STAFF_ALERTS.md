# Operate staff alerts

Apply `db/migrations/20261019_staff_alerts.sql` before starting this backend revision. The migration adds `dbo.StaffNotificationOutbox` and its work index. It preserves existing records and can run again. It adds no SQL triggers and does not backfill historical alerts.

## Configure delivery

Leave `STAFF_ALERT_EMAIL_ENABLED` absent or `false` until delivery is approved. Events still enqueue in the transaction that changes the pilot or listing. Disabled processing makes no SQL or network requests.

For the approved staff inbox, configure these settings on the backend service:

| Setting                                | Value                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `STAFF_ALERT_EMAIL_ENABLED`            | `false` until activation                                                            |
| `STAFF_ALERT_EMAIL_RECIPIENTS`         | `info@ecoglobeworld.com`                                                            |
| `STAFF_ALERT_EMAIL_ALLOWED_RECIPIENTS` | `info@ecoglobeworld.com`                                                            |
| `STAFF_ALERT_ADMIN_URL`                | The standalone admin site's origin, without a path, query, credentials, or fragment |
| `RESEND_API_KEY`                       | Existing backend secret reference                                                   |
| `RESEND_FROM_EMAIL`                    | Existing verified sender                                                            |

Keep `ECOGLOBE_WEB_URL` unchanged. Staff alerts use the separate admin origin for `/admin/pilots/:id` and `/admin/listings/:id` links.

The existing email redirection policy still applies. If its effective destination differs from the configured staff recipients, processing stops that job in `needs_review` without sending. For an approved development delivery, set `ECOGLOBE_EMAIL_TEST_RECIPIENT` to the same approved test address used in both staff recipient settings. Do not disable the global redirect to work around a staff alert failure.

After checking the recipient, allowlist, redirect, admin origin, and transport, set `STAFF_ALERT_EMAIL_ENABLED=true`. The minute timer processes at most ten jobs per tick. Activation is an operator action outside the implementation worker's authority.

No buyer acknowledgements are created. The events mean that a pilot was created, that its contact preference changed to email, or that a listing entered pending review. Repeating the same preference or status, reading records, and unrelated edits while already pending review do not enqueue another event. A later transition back into review creates a new event. Published listing edits and relevant document changes also return the listing to review.

## Inspect and reconcile jobs

Use an admin bearer session to call `GET /api/admin/staff-alerts`. The response includes the latest 100 jobs with state, attempts, timestamps, provider ID, and a sanitized failure reason. Responses, including authentication failures, are private and uncached. There is no public or buyer queue endpoint and no resend API.

For older jobs, query `dbo.StaffNotificationOutbox` using authorized operational access. `EventJson` contains only the event kind and record ID. `EventKey` supplies the stable provider key `staff-alert-<lowercase UUID>`. The processor saves the rendered email once before its first send and reuses that payload for any retry. It never replaces a saved recipient or email body.

Only an explicit provider rate-limit rejection can retry automatically, after five minutes. Three attempts, one hour since the first attempt, or 23 hours since event creation ends automatic processing. Expired send leases, network failures, timeouts, missing provider confirmation, and other rejections enter `needs_review`. A database failure after a successful send leaves the send claim intact for reconciliation.

For `needs_review`, first check the event key, saved recipient, attempt times, and provider history. If delivery occurred, record the provider confirmation and resolve the job as sent through an approved operational procedure. If delivery is unconfirmed, retain the job for investigation. Do not clear attempts, replace event keys or saved payloads, or requeue an ambiguous delivery. A new send requires a separate approved reconciliation decision, especially after the provider's idempotency window.

To stop delivery, set `STAFF_ALERT_EMAIL_ENABLED=false` and restart the service. Retain the table, events, payloads, and delivery history.

## Verify in an owned local runtime

Run backend unit tests with `pnpm --filter=@eco-globe/backend test` and types with `pnpm --filter=@eco-globe/backend type-check` in the sanitized Orca environment. `scripts/orca-runtime.py` explicitly disables staff delivery and clears recipient, allowlist, and admin-origin settings.

When the dedicated Orca SQL runtime is ready, run `test:staff-alerts:sql` with its verified local connection, database name in `ORCA_SQL_DATABASE`, owner marker in `ORCA_SQL_MARKER`, and `ORCA_STAFF_ALERT_SMOKE=1`. Supply `ORCA_STAFF_ALERT_FIXTURE_PATH` as a new private file path to retain synthetic seller, buyer, admin, and viewer login credentials for local browser checks. Never publish that file.

The smoke refuses shared SQL and configured provider credentials. It retains synthetic fixtures, checks migration reruns and transaction rollback, exercises HTTP transitions and access denials, and verifies that close/restore preserves documents, pilots, orders, and existing records. Its email transport is stubbed. A passing run establishes local SQL behavior, not actual provider delivery or production readiness.

Seller close remains `DELETE /api/listings/:id`, which updates status to `closed`. Restore remains `PATCH /api/listings/:id` with `listingStatusCode: "draft"`. Both use the existing seller authorization and retain related records. Close and restore audit entries use the existing `dbo.AuditLogs` schema in the same transaction as the status change.
