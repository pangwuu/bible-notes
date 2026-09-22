# Progress — Milestone 2 Replacement Implementation

Last visited: 2026-09-23T04:30:00Z

## Status: COMPLETE
All tasks completed, tested, and verified:
1. [x] Baseline verification: `npm test` (429 passing), `npm run typecheck` (0 errors), `npx expo export` (clean)
2. [x] Step 1: Create `src/types/firebase.d.ts` and `src/services/firebase.ts` (Modular v11, AsyncStorage persistence, dual-runtime safety)
3. [x] Step 2: Create `tests/unit/firebase.test.ts` (4/4 tests passing)
4. [x] Step 3: Create `src/types/user.ts` and `src/utils/validation.ts` (user schema, regex, validation contracts)
5. [x] Step 4: Create `src/services/authService.ts` (register, login, logout, password reset, profile CRUD, uniqueness verification & rollback)
6. [x] Step 5: Create `tests/unit/authValidation.test.ts` (30/30 tests passing)
7. [x] Step 6: Create `src/context/AuthContext.tsx` (Auth state, real-time snapshot sync, refreshProfile, signOut)
8. [x] Step 7: Update `app/_layout.tsx` (RootLayout + RootNavigationLayout with route protection guards)
9. [x] Step 8: Update `app/(auth)/login.tsx` (Login UI with password reset modal dialog, error banners, DESIGN.md tokens)
10. [x] Step 9: Update `app/(auth)/register.tsx` (Registration UI with debounced username check, validation indicators)
11. [x] Step 10: Update `app/(tabs)/settings.tsx` (Profile display, note visibility syncing, ESV key syncing, sign out dialog)
12. [x] Step 11: Run full verification (`npm test` 468/468 passed, `npm run typecheck` 0 errors, `npx expo export -p ios --no-minify` clean)
13. [ ] Step 12: Write report.md & handoff.md, notify orchestrator
