# Lab testing referral implementation

Source: EcoGlobe_Lab_Testing_1.docx, September 2026, read in Chrome including all nine pages and five mockups. The user confirmed that example panels must remain internal drafts.

## Delivery order

1. Add SQL-backed lab referrals, versioned panel configuration, internal handling notes, and batch-specific reports with authenticated file downloads. Keep the existing company/member authorization boundary.
2. Add one reusable customer form in listing analysis and the sample-request flow. Capture listing context, category scope, optional tests, additional concerns, turnaround preference, and report-sharing consent. Default to private company sharing. Unknown categories and draft panels say “testing scope to be confirmed.”
3. Add an internal admin queue for assignment, status and notes, draft panel management, and report attachment. Store actual uploaded PDF bytes and actual result labels, values and units. Show shared reports in listing analysis and Documents; private reports remain accessible only to the requesting company and internal staff.
4. Review backend and frontend changes reciprocally, integrate into the existing local corrections, and run types, lint, build, runtime isolation, focused API/SQL and Chrome verification.
5. Record exact files, acceptance evidence, and deployment boundaries. Preserve the currently deployed pricing patch and newer live sample workflow; do not overwrite the live application with the older local baseline.

## Customer behavior

The form is a referral request, with no payment or booking promise. EcoGlobe confirms the laboratory, scope, cost and timing before booking. Turnaround choices are standard, expedited and not urgent, without promised durations. Display “This does not replace your own testing” and “Results describe a batch.”

Optional tests are grouped under processing behavior, contaminants and safety, regulatory and compliance, and consistency across the stream. Save the selected scope and configuration version with the request. Submissions must survive retry without duplicate records. The sample placement opens the same form and links an existing sample request when available.

Draft families: biomass and wood; recovered polymers; oils and liquids; mineral and industrial solids. The examples are internal configuration, not lab-approved public offerings. Publication requires explicit internal review metadata. No invented accreditation, lab relationship, pricing, discount, or sample result.

Reports require laboratory name, batch reference, sample date, report date and actual headline results. Shared reports may say “Independently tested” with the laboratory/date and batch context. Never say “EcoGlobe certified.” Consent revocation must also remove public and seller file access.

## Boundaries

- No standalone buyer/seller lab navigation and no material-checkout placement.
- Paid coordination, seller certification at listing time and an in-house laboratory are future work.
- No laboratory outreach, external email, charge or real shipment is authorized by the document itself.
- No database reset. Dedicated local SQL fixtures only for verification; no production migration as a side effect of tests.
- Existing workbook pricing remains authoritative; mockup prices are illustrative.
- Local baseline contains prior uncommitted corrections; live contains a newer sample workflow and the verified pricing patch. Preserve both and document compatibility before any separately requested deployment.

## Acceptance

- Both entry points use the same form and persisted queue; unavailable or unpublished listings cannot create requests.
- Company-scoped private requests/reports cannot be read by sellers, another company or anonymous visitors. A company admin is not an internal admin.
- Published shared reports are visible only under the applicable listing visibility rules; file download enforces the same rules.
- Draft panels and internal notes never leak into public responses.
- Real file validation, retry/idempotency, empty/error states and narrow-screen form behavior are verified.
- Exact final checks and remaining limitations are recorded in a companion verification report.

## Pilot desk checklist (no new screen)

During the existing pilot conversation, ask whether a batch-specific independent report would help the buyer decide. If so, open the listing's same lab request form, confirm the buyer's concern and sharing preference, and record any sample reference. Confirm laboratory, scope, cost and timing with the buyer before booking. Laboratory outreach and commercial agreements remain team operations, outside this implementation.
