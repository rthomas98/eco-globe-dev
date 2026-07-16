# SoloTerm

EcoGlobe includes a root `solo.yml` so the local development stack can be loaded into [SoloTerm](https://soloterm.com/docs) with shared command definitions.

## Included commands

| Command          | Behavior             | Local address                                                   |
| ---------------- | -------------------- | --------------------------------------------------------------- |
| Web App          | Starts automatically | http://localhost:4040                                           |
| Admin App        | Starts automatically | http://localhost:4041                                           |
| Convex Backend   | Starts automatically | Uses the deployment configured in `packages/backend/.env.local` |
| Mobile App       | Manual               | Expo development server                                         |
| Type Check       | Manual               | Runs the monorepo TypeScript checks                             |
| Production Build | Manual               | Builds the monorepo with Turborepo                              |

## Setup

1. Install the workspace dependencies with `pnpm install`.
2. Configure the Convex values described in `apps/web/.env.local.example`.
3. Add the EcoGlobe repository folder as a project in SoloTerm.
4. Review and trust the commands imported from `solo.yml`.

SoloTerm requires local approval before file-defined commands can auto-start. Mobile, type-check, and build commands remain manual so opening the project does not launch an interactive Expo session or one-shot validation work unexpectedly.

Validate the shared configuration with:

```bash
pnpm solo:check
```
