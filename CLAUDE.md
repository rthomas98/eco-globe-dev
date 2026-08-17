# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: EcoGlobe

A feedstock and biomass marketplace platform connecting sellers with buyers through a managed marketplace. Covers the full transaction lifecycle: listing, discovery, order management, delivery coordination, and financial settlement.

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Web**: Next.js 15 (App Router, Turbopack), React 19, Tailwind CSS v4
- **Mobile**: Expo (React Native) with Expo Router, NativeWind
- **Backend**: Azure-hosted API service with Azure SQL as the relational source of truth
- **Auth**: Azure-backed bearer sessions with company/member role validation and RBAC foundations
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
  backend/      → Azure API service and SQL schema/migrations
  ui/           → Shared UI components (shadcn/ui pattern)
  shared/       → Shared types, constants, utilities
  typescript-config/ → Shared tsconfig presets
  eslint-config/     → Shared ESLint configs
```

### Key Patterns

- **Modular pages**: Each page imports a component — avoid inline page logic
- **Portal route groups**: Web portals use Next.js route groups: `(public)`, `(seller)`, `(buyer)`, `(admin)`
- **Portal isolation**: Portals share core services but maintain separate route trees and layouts
- **Azure SQL as source of truth**: Marketplace, transaction, escrow, logistics, contracts, notifications, and audit records should be modeled relationally
- **API boundary**: Web, admin, and mobile clients should call the backend API rather than embedding database logic in UI components
- **Build-safe env**: Local `.env.local` files should contain only development-safe API URLs and secrets references

### Auth Setup

- Auth and RBAC are implemented against the Azure-backed API layer; extend the existing bearer-session and company/member permission model rather than adding client-side auth state.
- Buyer, seller, and admin permissions should follow the company/member model in `docs/DATABASE_DESIGN_PLAN.md`.

## Commands

```bash
# Development (all apps)
pnpm dev

# Development (specific apps)
pnpm dev:web          # Next.js only
pnpm dev:mobile       # Expo only
pnpm dev:api          # Backend API only

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

# Backend API
pnpm --filter=@eco-globe/backend build
pnpm --filter=@eco-globe/backend start
```

## Environment Setup

1. Copy local environment examples to `.env.local` as they are added.
2. Set API URLs and Azure-backed secret references for local development.
3. Keep production secrets in Azure Key Vault.

## Documentation

- [Project Overview](docs/PROJECT_OVERVIEW.md) — System architecture, feature summary, estimation breakdown
- [Timeline](docs/TIMELINE.md) — 5-month/20-week development phases and dependencies
- [Feature Specs](docs/FEATURE_SPECS.md) — Complete feature inventory by system with descriptions and effort levels

## Design Principles

- **Shared core reuse**: Auth, search, workflow, reporting, and notification services are centralized — do not duplicate across portals
- Do not reset the database when adding a new feature or fixing issues
