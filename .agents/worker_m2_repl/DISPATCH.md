# DISPATCH — Milestone 2 Replacement Worker (Firebase Client Integration & Authentication)

## Role & Working Directory
- Role: Implementation Worker (`teamwork_preview_worker`)
- Working Directory: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m2_repl`

## Authoritative Request & Specifications
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` verbatim before starting.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`.
- Read Explorer Reports:
  - `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_firebase/report.md`
  - `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_service/report.md`
  - `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_ui/report.md`

## File Ownership
You exclusively own and will create/update:
- `src/types/firebase.d.ts`
- `src/services/firebase.ts`
- `src/types/user.ts`
- `src/utils/validation.ts`
- `src/services/authService.ts`
- `src/context/AuthContext.tsx`
- `app/_layout.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/(tabs)/settings.tsx`
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
- Implementation report in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m2_repl/report.md`.
- Handoff in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m2_repl/handoff.md` with build/test execution output.
- Send completion message to parent orchestrator (`0a72a93f-be19-49c0-81f1-95f8e8f40226`).

## 2026-09-23T04:21:56Z
You are the Replacement Implementation Worker for Milestone 2 (M2: Firebase Client Integration & Authentication).
Your working directory is: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m2_repl
Read your dispatch file at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m2_repl/DISPATCH.md
Read the authoritative user request at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md
Read PROJECT.md at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md
Implement:
1. src/types/firebase.d.ts & src/services/firebase.ts (modular v11 setup with AsyncStorage auth persistence and dual-runtime safe initialization)
2. src/types/user.ts, src/utils/validation.ts, & src/services/authService.ts (user validation, register, login, logout, password reset, profile CRUD)
3. src/context/AuthContext.tsx, app/_layout.tsx (auth guards), app/(auth)/login.tsx, app/(auth)/register.tsx, and app/(tabs)/settings.tsx
4. tests/unit/authValidation.test.ts & tests/unit/firebase.test.ts
Run npm test, npm run typecheck, and npx expo export -p ios --no-minify. Ensure all pass.

