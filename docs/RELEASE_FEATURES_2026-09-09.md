# Pilot, sample and tracker release

Authorized by the user's request to commit, push and deploy all changes.

Application commit: `424c942`, pushed to `origin/codex/deploy-ecoglobe-backend`. Includes pilot scheduling, domestic sample workflow, buyer/seller trackers, marketplace imagery and street maps, and supporting admin/auth compatibility changes.

Local release gates: backend tests (31 passed), web/admin/backend production builds passed, tracker API/SQL checks and browser workflows recorded in their verification documents. The initial build required network access for Google Fonts. Existing lint and React Doctor findings remain documented separately.

Shared `sqldb-ecoglobe-dev`: migrations `20260910_pilots.sql` and `20260911_sample_shipping.sql` applied in one transaction. All existing listing prices, quantities, units and minimum orders compared equal before/after. No reset or seed performed.

Azure ACR build `cak` succeeded. Image: `acrecoglobe7c180adf.azurecr.io/ecoglobe-backend@sha256:9bd8ddb930ad772032e50e0f5f192f37a5dcc048b1be403d5cd4ac6efc662d83`. Previous rollback revision: `ecoglobe-backend-dev--0000018`.

Vercel candidates built from an export of the committed source:
- Web: `https://eco-globe-dev-gftdg80fg-rob-thomas-projects.vercel.app`
- Admin: `https://eco-globe-dev-admin-5woa939fj-rob-thomas-projects.vercel.app`

Paid sample shipping remains unavailable in production until provider verification and activation are completed. Local simulation flags were not deployed. Lab panels remain internal drafts; pilot availability must be entered by admins. No live payment, postage or external notification was triggered by verification.

## Live result

- Azure revision `ecoglobe-backend-dev--0000019`: Healthy, latest ready, 100% traffic. SQL health connected.
- Web deployment `dpl_Eg1og9YjSnnXruDvGT2WuvgBUCCt`: Ready and promoted to `https://eco-globe-dev-web.vercel.app`.
- Admin deployment `dpl_GPbeQH4vCLqeUzCcAMEvqgHZBwSU`: Ready and promoted to `https://eco-globe-dev-admin.vercel.app`.
- Both live `/api/backend/health` endpoints returned HTTP 200 and SQL connected. Unauthenticated tracker and admin pilot API calls returned 401.
- Live browser access to `/buyer/tracker` correctly redirected to login with the tracker return path. No production credentials or test records were introduced; authenticated E2E evidence is the local verification documented for each feature.
- No GitHub Actions run was listed for this branch; successful hosted builds and the recorded local gates are the release verification.

This final documentation commit does not change the deployed application source.
