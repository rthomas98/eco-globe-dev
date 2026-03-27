# EcoGlobe - Development Timeline

## Overview

**Duration**: 5 months (20 weeks)

## Phase Schedule

| Phase | Weeks | Duration |
|-------|-------|----------|
| Discovery & Solution Design | W1–W3 | 3 weeks |
| Architecture & Environment Setup | W2–W4 | 3 weeks |
| UI Framework & Shared Components | W2–W6 | 5 weeks |
| Authentication & User Management | W4–W7 | 4 weeks |
| Public Portal Development | W3–W9 | 7 weeks |
| Seller Portal Development | W7–W16 | 10 weeks |
| Buyer Portal Development | W8–W20 | 13 weeks |
| Admin Portal Development | W12–W20 | 9 weeks |
| Shared Core Services | W10–W17 | 8 weeks |

## Gantt Chart

```
Phase                              M1          M2          M3          M4          M5
                                W1 W2 W3 W4  W5 W6 W7 W8  W9 W10 W11 W12 W13 W14 W15 W16 W17 W18 W19 W20
Discovery & Solution Design      ■  ■  ■
Architecture & Environment Setup    ■  ■  ■
UI Framework & Shared Components    ■  ■  ■  ■  ■
Authentication & User Management          ■  ■  ■  ■
Public Portal Development             ■  ■  ■  ■  ■  ■  ■
Seller Portal Development                        ■  ■  ■  ■   ■   ■   ■   ■   ■   ■
Buyer Portal Development                            ■  ■  ■   ■   ■   ■   ■   ■   ■   ■   ■   ■   ■
Admin Portal Development                                               ■   ■   ■   ■   ■   ■   ■   ■   ■
Shared Core Services                                        ■   ■   ■   ■   ■   ■   ■   ■
```

## Key Dependencies

- **Architecture & Environment Setup** must complete before portal development begins
- **UI Framework & Shared Components** feeds into all portal development
- **Authentication & User Management** is prerequisite for authenticated portals (Seller, Buyer, Admin)
- **Public Portal** starts earliest (W3) as it has the fewest auth dependencies
- **Seller Portal** begins W7, overlapping with Auth completion
- **Buyer Portal** is the longest phase (W8–W20), runs through project end
- **Admin Portal** starts latest (W12), depends on Seller/Buyer data models being established
- **Shared Core Services** runs W10–W17, built iteratively as portal needs are clarified
