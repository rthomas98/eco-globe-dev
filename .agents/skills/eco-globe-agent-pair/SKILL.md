---
name: eco-globe-agent-pair
description: Coordinate Eco Globe backend and frontend changes using supervised Orca workers, isolated runtimes, and reciprocal review.
---

# Eco Globe paired development

Read `AGENTS.md` and `docs/ORCA_DEVELOPMENT.md` before dispatch.

1. Inspect Git status and the selected base. Preserve existing changes. Use separate prepared worktrees for implementation so local credentials, ports, and writable files do not collide.
2. Create an Orca Run and Tasks using the installed orchestration skill. Codex owns backend/API/SQL and runtime tooling; Claude owns web/admin/mobile UI. Assign each shared file (types, manifests, integration tests) to exactly one editor.
3. Use Codex `gpt-6-astra`, medium reasoning, Standard service; Claude `claude-fable-5-1`, medium. Never add Fast or permission-bypass flags. Read launch receipts rather than trusting agent self-identification.
4. Review the other agent's exact diff. Return concrete defects and evidence; the owner fixes them. Repeat focused review after fixes and integrate only the reviewed files.
5. Run runtime isolation tests, backend tests, types, lint, builds and applicable browser stories on the combined revision. Record pre-existing failures separately. SQL-unconfigured runtime checks do not prove authenticated/database workflows.
6. Record the final commit or file hashes, tests, browser evidence and blockers. Agreement alone is insufficient. Release completed Orca workers. Commit/push/deploy only when requested.

For requested images, use the installed image-generation tool and a task-specific prompt. Prefer the user's Astra image-generation choice only if that tool actually offers it; otherwise report the actual available generator. Do not claim a text-model setting chooses the image model.
