# Test Infrastructure & Specification Document (TEST_INFRA.md)

## 1. Overview & Architecture

This document defines the comprehensive opaque-box test infrastructure and execution framework for the **Swedish Method Bible Study Notes Mobile App** (`bible_notes`).

The test suite is structured into four distinct verification tiers designed to guarantee strict adherence to the project's authoritative specifications (`ORIGINAL_REQUEST.md`, `DESIGN.md`, `specs.md`, and `PROJECT.md`):

- **Tier 1: Feature Coverage** — Happy-path isolation testing verifying all 36 functional features.
- **Tier 2: Boundary & Corner Cases** — Extreme values, input limits, malformed payloads, security boundaries, and edge conditions.
- **Tier 3: Cross-Feature Combinations** — Pairwise and multi-feature interaction flows (e.g. Auth → Profile → Notes → Overlap Engine → Notifications).
- **Tier 4: Real-World Application Scenarios** — End-to-end full user journeys simulating real human Bible study routines and mutual-friend interactions.

---

## 2. Test Environment & Framework

- **Runtime:** Node.js (v22+) with TypeScript (`typescript ~5.8.0`)
- **Test Runner:** Jest (`jest ^29.7.0`, `jest-expo ~57.0.5`)
- **Execution Config:** `jest.config.js` with `testEnvironment: 'node'` and path mapping `@/* -> <rootDir>/*`
- **Isolation Principle:** Every test is hermetic, self-contained, sets up its own fixtures, and leaves no mutable global state.

---

## 3. Directory Layout

```
bible_notes/
├── TEST_INFRA.md                      # This infrastructure & specification document
├── TEST_READY.md                      # Test readiness certification
├── jest.config.js                     # Jest configuration
├── package.json                       # Scripts: "npm test", "npm run test:coverage"
├── tests/
│   ├── unit/                          # Unit & adversarial tests
│   │   ├── theme.test.ts
│   │   ├── themeAdversarial.test.ts
│   │   └── adversarial.test.ts
│   └── e2e/                           # 4-Tier Opaque-box E2E test suites
│       ├── tier1_features.test.ts     # Tier 1: Feature coverage (>=5 tests per feature)
│       ├── tier2_boundaries.test.ts   # Tier 2: Boundary & corner cases (>=5 tests per feature)
│       ├── tier3_combinations.test.ts # Tier 3: Cross-feature combinations & interactions
│       └── tier4_scenarios.test.ts    # Tier 4: Real-world user journeys & workflows
```

---

## 4. 36-Feature Inventory & Coverage Matrix

| # | Feature Code | Feature Name | Tier 1 Target | Tier 2 Target | Primary Authority |
|---|---|---|---|---|---|
| 1 | F01 | Expo SDK 57 Scaffolding | Dependencies, config, tsconfig | Version mismatches, empty scripts | `ORIGINAL_REQUEST.md` R1 |
| 2 | F02 | Design Tokens & Theme | Exact hex codes, frozen tokens | AI anti-patterns, contrast ratio | `DESIGN.md` §Color |
| 3 | F03 | Typography Integration | Source Serif Pro, type scale | Fallbacks, no ALL-CAPS, line heights | `DESIGN.md` §Typography |
| 4 | F04 | Component Radii & Styling | 4px content, 8px controls, 16px sheets | Zero drop shadows, sheet top radii | `DESIGN.md` §Components |
| 5 | F05 | Route Tree & Navigation | Auth, tabs, note, friend, notifications | Dynamic route params, presentation styles | `specs.md` §9 |
| 6 | F06 | Bottom Tab Navigation | 4 tabs (Home, Notes, Friends, Settings) | Tab switching, active tints, badges | `specs.md` §9 |
| 7 | F07 | Firebase Modular v11 Setup | Config, AsyncStorage persistence | Offline init, singleton check | `ORIGINAL_REQUEST.md` R2 |
| 8 | F08 | Email/Password Registration | Sign up, valid schema, hashing | Format invalidity, weak passwords | `specs.md` §5.7 |
| 9 | F09 | Email/Password Login & Logout | Login, token storage, sign out | Invalid credentials, whitespace trim | `specs.md` §5.7 |
| 10 | F10 | Password Reset | Reset request, email dispatch | Malformed emails, rate limits | `specs.md` §5.7 |
| 11 | F11 | User Profile in Firestore | `users/{uid}` schema, author update | Prohibited delete, unauthenticated access | `specs.md` §6.1, `firestore.rules` |
| 12 | F12 | Username Uniqueness | 3-20 lowercase alphanumeric + _ | Length bounds, uppercase, special chars | `ORIGINAL_REQUEST.md` R2 |
| 13 | F13 | Auth State & Protection | Redirect unauth -> login, auth -> tabs | Deep link guards, splash hold | `specs.md` §5.7 |
| 14 | F14 | Canonical Verse Metadata | 66 books, 1,189 chapters, 31,102 verses | Non-canonical books, chapter bounds | `specs.md` §5.1 |
| 15 | F15 | 1D Integer Ordinal Mapping | Gen 1:1 -> 1, Rev 22:21 -> 31,102 | Out of bounds (0, 31,103), invalid verses | `specs.md` §5.1 |
| 16 | F16 | Range Overlap Math | Intersecting verse intervals | Disjoint, boundary-touching, inverted | `specs.md` §5.6 |
| 17 | F17 | Step-by-Step Passage Picker | Book -> Chapter -> Verse drill-down | End < start, cross-chapter validation | `specs.md` §5.2, `DESIGN.md` |
| 18 | F18 | Unbordered Note Editor | Day One style unbordered editor | Massive input, unicode/emoji handling | `DESIGN.md` §Editor |
| 19 | F19 | Swedish Method Headers | 💡 Key Idea, ❓ Question, 🏹 Application | Missing header, corrupted template | `specs.md` §5.1, `DESIGN.md` |
| 20 | F20 | Auto-Save & Explicit Save | Auto-save on blur, Save button | Debounce, network drops, rapid edits | `ORIGINAL_REQUEST.md` R3 |
| 21 | F21 | Back Navigation Modal | Save / Discard / Cancel prompt | Clean state bypass, double tap, cancel | `ORIGINAL_REQUEST.md` R3 |
| 22 | F22 | Tag Chips & Suggestions | Tag chips, suggestions, max 5 | >5 tags blocked, duplicates, casing | `specs.md` §5.1 |
| 23 | F23 | Note Visibility Setting | 'friends' vs 'private' | Rules enforcement, default fallback | `specs.md` §5.5, `firestore.rules` |
| 24 | F24 | Crossway ESV API Client | Bearer token auth, query format | HTTP 429/500 failover, empty queries | `ORIGINAL_REQUEST.md` R4 |
| 25 | F25 | Public Domain WEB Fallback | Failover to https://bible-api.com/ | 404 handling, cross-chapter formatting | `specs.md` §8 |
| 26 | F26 | AsyncStorage Passage Cache | Cache key format, read/write | Storage quota limits, corrupted JSON | `specs.md` §8 |
| 27 | F27 | Custom User ESV Key Override | Settings override stored in profile | Invalid key fallback, whitespace trim | `ORIGINAL_REQUEST.md` R4 |
| 28 | F28 | Offline Passage Display | Cached text offline, status banner | Uncached offline state, network toggle | `specs.md` §11 |
| 29 | F29 | Exact-Match User Search | Search by exact username or email | Case insensitivity, partial rejection | `specs.md` §5.4 |
| 30 | F30 | Mutual Friendship Flow | `${uidA}_${uidB}` sorted composite ID | Self-friend request, duplicate request | `specs.md` §6.2, `firestore.rules` |
| 31 | F31 | Friend Profile Shared Notes | Feed of friend's 'friends' notes | Private notes blocked, non-friend blocked | `specs.md` §5.3, `firestore.rules` |
| 32 | F32 | Client-Side Overlap Engine | Overlap evaluation across friend notes | Cross-chapter overlap, different books | `specs.md` §5.6 |
| 33 | F33 | Overlap Notification Creation | Deterministic notification doc write | Duplicate notifications, auth rule check | `specs.md` §5.6, `firestore.rules` |
| 34 | F34 | Inline Overlap Badge Pills | Letterboxd pill, avatar + text | Dismiss state, multiple friends stack | `DESIGN.md` §Friends |
| 35 | F35 | Notification Center & Badge | Bell icon unread badge, modal list | 0 unread hidden, 99+ cap, mark read | `specs.md` §5.6 |
| 36 | F36 | Core Unit Test Suite | Passes `npm test`, ordinals, auth | Test isolation, deterministic execution | `ORIGINAL_REQUEST.md` AC |

---

## 5. Authoritative Expected Output Derivation

All test assertions derive expected values from official project specifications:
1. **Visual & Theme Properties:** Derived verbatim from `DESIGN.md` (§2 Color, §Typography, §Components).
2. **Security & Data Invariants:** Derived verbatim from `firestore.rules` (composite document IDs, ownership, status).
3. **Database Schemas & Endpoints:** Derived verbatim from `specs.md` (§6 Data Model, §8 Bible Text Integration).
4. **Canonical Scripture Mathematics:** Derived from Protestant Canon metadata (66 books, 31,102 verses, continuous 1D ordinal mapping, closed interval overlap formula: `max(s1, s2) <= min(e1, e2)`).

---

## 6. How to Run Tests

### Run Full Test Suite
```bash
npm test
```

### Run E2E Test Suites Only
```bash
npx jest tests/e2e
```

### Run Targeted Tiers
```bash
npx jest tests/e2e/tier1_features.test.ts
npx jest tests/e2e/tier2_boundaries.test.ts
npx jest tests/e2e/tier3_combinations.test.ts
npx jest tests/e2e/tier4_scenarios.test.ts
```

### Run with Coverage
```bash
npm run test:coverage
```
