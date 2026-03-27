# EcoGlobe - Project Overview

## Platform Description

EcoGlobe is a **feedstock and biomass marketplace platform** that connects sellers of feedstock materials with buyers through a managed marketplace. The platform facilitates the entire transaction lifecycle — from listing and discovery through order management, delivery coordination, and financial settlement.

## System Architecture

The platform consists of **4 portals** and a **shared core services layer**:

```
┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Public     │  │    Seller    │  │    Buyer     │  │    Admin     │
│   Portal     │  │    Portal    │  │    Portal    │  │    Portal    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │     Shared Core       │
                    │  Auth, Search, Docs,  │
                    │  Workflow, Reporting,  │
                    │  Notifications, Audit │
                    └───────────────────────┘
```

### Public Portal (3 features | 350 hours)
Unauthenticated entry point — marketing homepage, public stock browsing, and user registration/lead capture.

### Seller Portal (7 features | 790 hours)
Full seller lifecycle — onboarding/verification, feedstock listing management, sales pipeline, accounting/payouts, reports, notifications, and settings.

### Buyer Portal (9 features | 780 hours)
Full buyer lifecycle — onboarding, marketplace search/discovery, order management (pickup + delivery), accounting/invoices, company setup, notifications, and settings.

### Admin Portal (8 features | 970 hours)
Platform operations — transaction oversight, listing moderation, seller/buyer management, finance/escrow reconciliation, KPI reporting, global settings, and notification management.

### Shared Core (7 features | 600 hours)
Cross-cutting services — authentication & RBAC, document management, search engine, workflow/approval engine, reporting services, notification services, and audit/security logging.

## Estimation Summary

| System | Features | Hours | % of Total |
|--------|----------|-------|------------|
| Public Portal | 3 | 350 | 10.0% |
| Seller Portal | 7 | 790 | 22.6% |
| Buyer Portal | 9 | 780 | 22.3% |
| Admin Portal | 8 | 970 | 27.8% |
| Shared Core | 7 | 600 | 17.2% |
| **Core Total** | **34** | **3,490** | |
| Environment Setup & DevOps | — | 160 | |
| QA / Testing | — | 320 | |
| **Grand Total** | | **3,970** | |
