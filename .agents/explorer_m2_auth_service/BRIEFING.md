# BRIEFING — 2026-09-23T01:29:00Z

## Mission
Investigate and specify exact implementation for src/utils/validation.ts, src/services/authService.ts, Firestore user profile schemas, username uniqueness enforcement, and unit tests in tests/unit/authValidation.test.ts for Milestone 2.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Auth Service & Validation Explorer
- Working directory: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_service
- Original parent: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Milestone: M2 — Firebase Client & Auth

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in src/ (report in .agents/ folder)
- Modular Firebase JS SDK v11
- Enforce username format: 3–20 lowercase alphanumeric + underscore (^[a-z0-9_]{3,20}$)
- Minimum 6 characters for password
- Firestore rules compliance: users/{userId} allow read: if authenticated; allow create, update: if isOwner(userId)
- Clean separation from explorer_m2_firebase (config) and explorer_m2_auth_ui (context/screens)

## Current Parent
- Conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Updated: 2026-09-23T01:29:00Z

## Investigation State
- **Explored paths**: DISPATCH.md, ORIGINAL_REQUEST.md, PROJECT.md, firestore.rules, specs.md, explorer_domain_firebase/report.md, jest.config.js, existing unit tests.
- **Key findings**:
  1. Validation: Exact regex `/^[a-z0-9_]{3,20}$/` for usernames and `/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/` for email. Verified via Node tests.
  2. Schema reconciliation: Bridged specs.md (`id`, `full_name`, `default_visibility`) and DISPATCH.md (`uid`, `display_name`, `settings`) by populating both in `UserDocument`.
  3. Username uniqueness: Authenticated check in `registerUser` with `deleteUser` rollback on collision handles `firestore.rules` constraint (`allow read: if isAuthenticated()`).
  4. Unit test suite: Comprehensive Jest mocks covering 100% of validation rules, error formatting, and mocked auth service methods.
- **Unexplored areas**: None within scope.

## Key Decisions Made
- Reconciled Firestore profile schema to contain both `id`/`uid` and `display_name`/`full_name` to prevent cross-module breakage.
- Designed `registerUser` with safety rollback deleting newly created Firebase Auth account if username collision or Firestore write failure occurs.

## Artifact Index
- DISPATCH.md — Assignment instructions
- report.md — Comprehensive technical report with verbatim implementation code
- handoff.md — 5-component handoff report for worker/orchestrator
- progress.md — Liveness and task completion tracking
