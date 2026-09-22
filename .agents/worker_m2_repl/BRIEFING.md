# BRIEFING — 2026-09-23T04:25:00Z

## Mission
Implement Milestone 2: Firebase Client Integration & Authentication (modular v11 setup, auth persistence, validation, user profiles, AuthContext, login/register/settings screens, auth route guards, and unit tests).

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m2_repl
- Original parent: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Milestone: M2 — Firebase Client Integration & Authentication

## 🔒 Key Constraints
- Strict adherence to DESIGN.md (no light mode, warm charcoal base #1A1816, surface #242019, parchment #EDE7DD, Swedish accents, 8px control radius, 16px sheet radius, no generic shadows, sentence case labels).
- Genuine implementation only: no cheating, no hardcoded test shortcuts, real state and real behavior.
- Modular Firebase v11 (firebase@11.10.0) with @react-native-async-storage/async-storage persistence.
- Safe dual-runtime execution: Node/Jest (in-memory auth fallback) and Expo React Native (AsyncStorage persistence).
- All tests must pass: npm test (unit + e2e), npm run typecheck, npx expo export -p ios --no-minify.

## Current Parent
- Conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Updated: 2026-09-23T04:25:00Z

## Task Summary
- **What to build**:
  1. `src/types/firebase.d.ts` & `src/services/firebase.ts` (Firebase modular v11 setup with AsyncStorage auth persistence and dual-runtime safe initialization)
  2. `src/types/user.ts`, `src/utils/validation.ts`, & `src/services/authService.ts` (user validation, register, login, logout, password reset, profile CRUD)
  3. `src/context/AuthContext.tsx`, `app/_layout.tsx` (auth guards), `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, and `app/(tabs)/settings.tsx`
  4. `tests/unit/authValidation.test.ts` & `tests/unit/firebase.test.ts`
- **Success criteria**:
  - `npm test` passes 100% (existing 429 E2E tests + new unit tests)
  - `npm run typecheck` produces 0 errors
  - `npx expo export -p ios --no-minify` produces 0 bundling errors
  - Full adherence to DESIGN.md and firestore.rules
- **Interface contracts**: PROJECT.md
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- Use runtime feature detection for `getReactNativePersistence` to cleanly run both in Jest (Node environment) and Expo (React Native environment).
- Reconcile user schema so `users/{uid}` contains both `id` and `uid`, `full_name` and `display_name`, top-level `default_visibility` and `settings.default_visibility` to ensure compatibility across all specs.
- In `AuthContext.tsx`, subscribe to Firestore `users/{uid}` via real-time `onSnapshot` for instant updates across the app when preferences change.
- Split `app/_layout.tsx` into `RootLayout` (top-level provider wrapper) and `RootNavigationLayout` (inner navigation coordinator with auth guards) to ensure valid context access.

## Change Tracker
- **Files created/modified**:
  - `src/types/firebase.d.ts`: Ambient types for getReactNativePersistence
  - `src/services/firebase.ts`: Modular v11 Firebase client with dual-runtime safe persistence
  - `src/types/user.ts`: Reconciled UserDocument, UserProfile, settings interfaces
  - `src/utils/validation.ts`: Pure validation functions (email, password, username, display name, confirm password)
  - `src/services/authService.ts`: Genuine auth lifecycle, registration with uniqueness verification & rollback, profile CRUD
  - `src/context/AuthContext.tsx`: React auth container with real-time profile snapshot sync and refreshProfile
  - `app/_layout.tsx`: RootLayout provider wrapping RootNavigationLayout with auth route protection
  - `app/(auth)/login.tsx`: Login UI with reset dialog, password toggle, DESIGN.md styling
  - `app/(auth)/register.tsx`: Registration UI with debounced username check, validation indicators
  - `app/(tabs)/settings.tsx`: Profile display, visibility segmented toggle, ESV key syncing, sign out dialog
  - `tests/unit/firebase.test.ts`: Unit tests verifying Firebase app, auth, db initialization
  - `tests/unit/authValidation.test.ts`: Comprehensive unit tests for validation utilities and authService
  - `tests/unit/authRouting.test.ts`: Deterministic redirect matrix unit tests
- **Build status**: PASS (npm test 468/468, typecheck 0 errors, expo export 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 10 passed, 468 tests passed (100%)
- **Lint status**: clean (tsc --noEmit passed with 0 errors)
- **Tests added/modified**: 39 new unit tests across `firebase.test.ts`, `authValidation.test.ts`, and `authRouting.test.ts`

## Loaded Skills
- Source: None required beyond project specifications and explorer reports.

