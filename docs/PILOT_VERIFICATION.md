# Pilot feature verification

## Scope

The implementation follows the supplied Pilot Request, Pilot Scheduled and Pilot Desk mockups and the Word workflow brief. The user confirmed that admins add real available call slots. This feature is implemented and tested locally; no new deployment or shared Azure migration is part of this turn.

The request saves before booking. Pilot pricing and payment remain off-platform. Call reservations use SQL availability, not an external calendar provider. Email preference records a staff follow-up request; it does not send an email. Buyer identity is released only by the buyer's proceed action after an offer. Internal notes and next-action text remain private. Domestic US pickup and delivery locations are supported in this v1.

## Automated checks

- Final integrated workspace type checking passed for web, admin, mobile, shared, UI and backend.
- 22 runtime isolation tests passed.
- 20 backend unit tests passed, including pilot load/tonnage validation, staff transition restrictions and future UTC slot validation.
- The initial sandboxed backend test run hit an existing localhost `listen EPERM` restriction. The same suite passed with localhost permissions in the sanitized isolated runtime.
- Dedicated local SQL pilot integration passed on final privacy/fulfilment logic: input and tenant validation, duplicate request reuse, two simultaneous bookings for one slot (one success and one conflict), booked slot protection, email preference, searchable attributed notes, milestone ownership/date, buyer consent, seller identity redaction/release, single shipment handoff on retries, admin-only pilot shipment updates and database persistence.
- Two simultaneous identical request submissions returned the same request ID. Latest automated fixtures: pilot PR-10, email fallback PR-11, shipment 5, listing 1009. These are synthetic local test records, not live customer activity.
- 11 frontend pilot tests passed, including Central Time daylight-saving conversion, validation, stage mapping and retained request IDs.
- Real administrator session checks passed for non-demo identity, expiry, malformed values and role shape. Standalone admin login also passed in Chrome with the local SQL administrator.
- Web and standalone admin production builds passed in the isolated frontend checkout. Subsequent fulfilment display changes passed focused TypeScript and ESLint checks; final combined workspace types passed after integration.
- Workspace lint reported no errors and 54 existing warnings in the frontend review. React Doctor's broader comparison against origin/main reported 118 findings, including two errors in existing proxy/public-product code outside the pilot change; this is not a clean repository-wide React Doctor certification.

Run the SQL story with the owning API stopped:

```sh
nvm use
python3 scripts/orca-pilot-check.py
```

Use the retained isolated checkout and its owned database per ORCA_DEVELOPMENT.md. Never run this helper against Azure or reset existing data.

## Browser story

Completed using the real local API and owned SQL database, with the buyer in the in-app browser and administrator in Chrome:

1. Submitted PR-5, saw honest empty availability, saved email follow-up preference and reloaded successfully.
2. Added a real 15-minute administrator slot for 11 September 2026, 10:30 AM Central.
3. Opened the pilot form from listing 1009, submitted PR-6 with two loads, approximately 45 tonnes, timing, two receiving constraints and a trial objective.
4. Booked the admin slot; the admin desk showed the saved request, owner, timing, objective and constraints.
5. Saved an attributed lane note, checked the introductory-call milestone, saved the next action and advanced through call held, working the lane and offer sent.
6. Buyer confirmed synthetic off-platform agreement and identity-sharing consent; admin changed to Moving and recorded consent.
7. Admin handoff created SHP-4 linked to PR-6. The receipt persisted on reload, and the shipment appeared in fulfilment. API retry checks separately proved a single handoff record.
8. Standalone admin at port 20017 accepted the real administrator, loaded PR-6 after reload and found it by the saved “regional carrier” note.
9. Seller interest hid names on unapproved requests and displayed the buyer name on PR-6 after consent. Buyer and seller logistics showed SHP-4 as Awaiting coordination / No carrier booked, without pilot pricing or order controls.
10. Request and confirmation layouts fit a 390-pixel viewport with no horizontal overflow. Invalid form submission focused the first load option and displayed required-field errors. No browser console errors were observed in the final in-app checks.

Chrome initially lost its real session when a separate mock-backed frontend test logged into the same hostname on another port. That test was stopped, the real administrator signed in again, and the SQL-backed browser story above completed. Mock-browser evidence is not used as proof of persistence.

## Review and source boundary

Codex reviewed the frontend integration; Claude reviewed the backend and shared authentication changes. Review corrections covered real admin identity, admin route access, seller projection privacy, validation focus, truthful shipment labels and exclusion of pilots from order quote/dispatch controls. Owner eligibility intentionally requires active internal admin-override membership. Booked slots retain history; administrators can correct milestones after completion.

The final primary and running preview source files were compared byte-for-byte; SHA-256 values are recorded in PILOT_SOURCE_MANIFEST.json. The source remains uncommitted. No production deployment, external email, calendar invite, carrier booking or payment was performed. Existing unrelated demo logistics content remains outside this pilot feature.
