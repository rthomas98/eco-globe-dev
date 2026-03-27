# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: EcoGlobe

A feedstock and biomass marketplace platform connecting sellers with buyers through a managed marketplace. Covers the full transaction lifecycle: listing, discovery, order management, delivery coordination, and financial settlement.

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Web**: Next.js 15 (App Router, Turbopack), React 19, Tailwind CSS v4
- **Mobile**: Expo (React Native) with Expo Router, NativeWind
- **Backend**: Convex (real-time database, serverless functions)
- **Auth**: Better Auth via `@convex-dev/better-auth` (Convex integration)
- **UI**: shadcn/ui pattern with `@eco-globe/ui` shared package (CVA + tailwind-merge)
- **Language**: TypeScript everywhere

## Architecture

**4 portals + shared core services:**

- **Public Portal** — Unauthenticated: homepage, public stock browsing, registration/lead capture
- **Seller Portal** — Authenticated: onboarding, listing management, sales pipeline, accounting, reports
- **Buyer Portal** — Authenticated: marketplace search, order management (pickup + delivery), accounting
- **Admin Portal** — Internal: transaction oversight, listing moderation, user management, finance, KPI reporting
- **Shared Core** — Auth & RBAC, document management, search engine, workflow engine, reporting, notifications, audit logging

### Monorepo Structure

```
apps/
  web/          → Next.js (all 4 portals via route groups)
  mobile/       → Expo React Native app
packages/
  backend/      → Convex schema, functions, auth (shared by web + mobile)
  ui/           → Shared UI components (shadcn/ui pattern)
  shared/       → Shared types, constants, utilities
  typescript-config/ → Shared tsconfig presets
  eslint-config/     → Shared ESLint configs
```

### Key Patterns

- **Modular pages**: Each page imports a component — avoid inline page logic
- **Portal route groups**: Web portals use Next.js route groups: `(public)`, `(seller)`, `(buyer)`, `(admin)`
- **Portal isolation**: Portals share core services but maintain separate route trees and layouts
- **Convex as single backend**: All data, auth, and server logic lives in `packages/backend/convex/`
- **Auth flow**: Better Auth + Convex plugin → JWT-based auth → `ConvexBetterAuthProvider` wraps app
- **Build-safe env**: `apps/web/.env` has placeholder Convex URLs for build; real values go in `.env.local`

### Auth Setup

- **Client**: `apps/web/src/lib/auth-client.ts` — `createAuthClient` with cross-domain + convex plugins
- **Server**: `apps/web/src/lib/auth-server.ts` — `convexBetterAuthNextJs` for SSR/server actions
- **Route handler**: `apps/web/src/app/api/auth/[...all]/route.ts` — mounts Better Auth endpoints
- **Backend**: `packages/backend/convex/auth.ts` — Convex-side auth with Better Auth

## Commands

```bash
# Development (all apps)
pnpm dev

# Development (specific apps)
pnpm dev:web          # Next.js only
pnpm dev:mobile       # Expo only
pnpm dev:convex       # Convex dev server only

# Build
pnpm build            # Build all
pnpm turbo run build --filter=@eco-globe/web  # Build web only

# Type checking
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format

# Clean
pnpm clean

# Convex
pnpm --filter=@eco-globe/backend convex dev      # Start Convex dev
pnpm --filter=@eco-globe/backend convex deploy    # Deploy to production
```

## Environment Setup

1. Copy `apps/web/.env.local.example` to `apps/web/.env.local`
2. Run `pnpm --filter=@eco-globe/backend convex dev` to get your Convex URL
3. Set `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` in `.env.local`

## Documentation

- [Project Overview](docs/PROJECT_OVERVIEW.md) — System architecture, feature summary, estimation breakdown
- [Timeline](docs/TIMELINE.md) — 5-month/20-week development phases and dependencies
- [Feature Specs](docs/FEATURE_SPECS.md) — Complete feature inventory by system with descriptions and effort levels

## Design Principles

- **Shared core reuse**: Auth, search, workflow, reporting, and notification services are centralized — do not duplicate across portals
- Do not reset the database when adding a new feature or fixing issues
