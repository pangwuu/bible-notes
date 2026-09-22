# BRIEFING — 2026-09-22T15:30:30Z

## Mission
Investigate and specify the exact implementation for AuthContext, route protection redirects in app/_layout.tsx, and authentication UI screens (login.tsx, register.tsx, settings.tsx) for Milestone 2.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Auth Context & UI Explorer
- Working directory: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_ui
- Original parent: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Milestone: M2 — Firebase Client & Auth

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in app/ or src/
- Strict compliance with DESIGN.md (no cold near-black backgrounds, no light mode, proper border radii, no generic AI-style shadows, exact hex codes)
- Exact alignment with Firebase JS SDK modular v11 and AsyncStorage persistence
- User profile in Firestore `users/{uid}` matching `firestore.rules`

## Current Parent
- Conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Updated: 2026-09-22T15:30:30Z

## Investigation State
- **Explored paths**: `DISPATCH.md`, `ORIGINAL_REQUEST.md`, `PROJECT.md`, `DESIGN.md`, `specs.md`, `firestore.rules`, `app/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(tabs)/settings.tsx`, `src/constants/theme.ts`, `package.json`, `.agents/explorer_m2_auth_service/*`, `.agents/explorer_m2_firebase/*`
- **Key findings**:
  - Reconciled profile schema across `specs.md`, `DISPATCH.md`, and `firestore.rules`.
  - AuthContext uses `onSnapshot` for real-time reactivity on `users/{uid}` with clean cleanup on signout.
  - Root layout is decoupled into `RootLayout` (providers) and `RootNavigationLayout` (guards & stack) to avoid context hook order errors.
  - Route guards use `useRootNavigationState()?.key` to prevent navigation before mounting.
  - `login.tsx` integrates email/password, error banner, and a React Native Paper Dialog for password reset (`sendPasswordReset`).
  - `register.tsx` includes debounced live username check (500ms), format checking, password confirmation, and error banners.
  - `settings.tsx` displays user profile details, default note visibility toggle synced to Firestore, custom ESV API key input and save action, and sign-out confirmation dialog.
  - Pure redirect matrix logic verified via unit assertion.
- **Unexplored areas**: None within Milestone 2 scope.

## Key Decisions Made
- AuthContext uses `onSnapshot` on `doc(db, 'users', uid)` for immediate UI reactivity on profile/setting changes.
- In `app/_layout.tsx`, separate `RootLayout` and `RootNavigationLayout` to safely consume `useAuth()`.
- Node-executable redirect matrix test designed for test suite.

## Artifact Index
- `.agents/explorer_m2_auth_ui/report.md` — Detailed implementation specification
- `.agents/explorer_m2_auth_ui/handoff.md` — 5-component handoff report
- `.agents/explorer_m2_auth_ui/progress.md` — Liveness heartbeat
