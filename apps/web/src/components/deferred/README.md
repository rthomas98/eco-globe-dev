# Deferred preview source

Components in this folder (and the unreferenced admin centers under
`automation/`, `finance/`, `governance/`, `mobile/`, `partners/`, and
`logistics/admin-map-intelligence-center.tsx`) are preserved concept previews.
They contain illustrative, hardcoded records and are **not imported by any
active route**. Active routes render `components/preview/feature-unavailable.tsx`
instead. Wire a preview back in only after it reads real backend data.
