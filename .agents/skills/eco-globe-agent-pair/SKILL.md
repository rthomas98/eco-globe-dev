---
name: eco-globe-agent-pair
description: Coordinate Eco Globe backend and frontend changes using T3 Code delegated workers, isolated runtimes, and reciprocal review.
---

# Eco Globe paired development

Read `AGENTS.md` and `docs/T3_DEVELOPMENT.md` before dispatch.

1. Inspect Git status and the selected base. Preserve existing changes; T3 worktrees start from the local commit and do not copy uncommitted edits. Use separate worktrees (`delegate_task` with `isolation: "worktree"`) for implementation so local credentials, ports, and writable files do not collide.
2. Dispatch T3 delegated tasks. Codex owns backend/API/SQL and runtime tooling; Claude owns web/admin/mobile UI. Assign each shared file (types, manifests, integration tests) to exactly one editor, and put the ownership and guardrails in each task brief.
3. Use Codex `gpt-6.1-sol` with `{reasoningEffort: "medium", serviceTier: "default"}`; Claude `claude-opus-5-5` with `{effort: "medium", fastMode: false}`. Pass options explicitly. Never request Fast mode or priority service. Check the returned provider, model and options rather than trusting agent self-identification.
4. Review the other agent's exact diff in a new `delegate_task` round per review, carrying the brief and prior findings. Return concrete defects and evidence; the owner fixes them. Repeat focused review after fixes and integrate only the reviewed commits.
5. Run runtime isolation tests, backend tests, types, lint, builds and applicable browser stories on the combined revision. Record pre-existing failures separately. SQL-unconfigured runtime checks do not prove authenticated/database workflows.
6. Record the final commit or file hashes, tests, browser evidence and blockers. Agreement alone is insufficient. Cancel unfinished tasks. Commit/push/deploy only when requested.

For requested images, use the installed image-generation tool and a task-specific prompt. Prefer the user's Astra image-generation choice only if that tool actually offers it; otherwise report the actual available generator. Do not claim a text-model setting chooses the image model.
