# DISPATCH — Milestone 2 Worker (Firebase Client Integration & Authentication)

## Role & Working Directory
- Role: Implementation Worker (`teamwork_preview_worker`)
- Working Directory: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m2`

## Authoritative Request & Specifications
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` verbatim before starting.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`.
- Read Explorer Reports:
  - `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_firebase/report.md`
  - `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_service/report.md`
  - `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_ui/report.md`

## File Ownership
You exclusively own and will create/update:
- `src/services/firebase.ts` (modular v11 setup with AsyncStorage persistence & dual-runtime safe initialization)
- `src/types/firebase.d.ts` (ambient types for getReactNativePersistence)
- `src/types/user.ts` (UserProfile schema)
- `src/utils/validation.ts` (email, password, username, display name validation)
- `src/services/authService.ts` (registerUser, loginUser, logoutUser, sendPasswordReset, checkUsernameAvailable, profile CRUD)
- `src/context/AuthContext.tsx` (onAuthStateChanged + users/{uid} onSnapshot listener)
- `app/_layout.tsx` (AuthProvider wrapping + auth route redirect guards)
- `app/(auth)/login.tsx` (email/password login, error banner, password reset modal)
- `app/(auth)/register.tsx` (display name, username availability check, email, password, error banner)
- `app/(tabs)/settings.tsx` (user profile display, default visibility toggle, custom ESV key, logout modal)
- `tests/unit/authValidation.test.ts`
- `tests/unit/firebase.test.ts`

## Tasks
1. Create `src/types/firebase.d.ts` and `src/services/firebase.ts` according to `explorer_m2_firebase/report.md`.
2. Create `src/types/user.ts`, `src/utils/validation.ts`, and `src/services/authService.ts` according to `explorer_m2_auth_service/report.md`.
3. Create `src/context/AuthContext.tsx` and update `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, and `app/(tabs)/settings.tsx` according to `explorer_m2_auth_ui/report.md`.
4. Create `tests/unit/authValidation.test.ts` and `tests/unit/firebase.test.ts`.
5. Run `npm test` and ensure all tests pass (54 existing + new unit tests + 429 E2E tests).
6. Run `npm run typecheck` (`npx tsc --noEmit`) and ensure 0 errors.
7. Run `npx expo export -p ios --no-minify` to ensure zero bundling errors.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverables
- Fully implemented, genuine Firebase modular v11 integration, authentication, and user profiles.
- Implementation report in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m2/report.md`.
- Handoff in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m2/handoff.md` with build/test execution output.
- Send completion message to parent orchestrator (`0a72a93f-be19-49c0-81f1-95f8e8f40226`).
