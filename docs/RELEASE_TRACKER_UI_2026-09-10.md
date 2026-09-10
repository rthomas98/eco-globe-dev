# RFQ, sidebar and tracker tooltip release

Application commit `52856d5` was pushed to `origin/codex/deploy-ecoglobe-backend` and deployed at the user's request.

Changes: expandable RFQ request details (demo records labelled), fixed buyer/seller desktop sidebars with independent content scrolling, and tracker stage/status tooltips for collapsed and expanded rows. Expanded stage controls also expose their statuses to keyboard and assistive-technology users.

Validation: web TypeScript and targeted ESLint passed. Local browser verified RFQ expansion, sidebar position on a scrolled long product page, and keyboard-visible tracker tooltip status. Both Vercel production builds passed; existing non-blocking build warnings remain.

Ready deployments promoted to their existing live domains:
- Web `dpl_4T7FwDf7tsKaq7YegyuLREgcWdZz`: https://eco-globe-dev-web.vercel.app
- Admin `dpl_3PtqbbQc3jTm5v3G3jDormkkZxPL`: https://eco-globe-dev-admin.vercel.app

Candidate and live health endpoints returned HTTP 200 with backend SQL connected. No backend or database mutation was needed. Authenticated production workflows were not rerun; UI interaction evidence is from the local environment. Both builds used clean archives of the application commit.

This documentation-only follow-up does not change deployed application source.
