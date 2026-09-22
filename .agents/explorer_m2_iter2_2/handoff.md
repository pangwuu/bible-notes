# Handoff Report: Route Protection Logic Utility Extraction

## 1. Observation
1. **In-Test Logic Duplication in `tests/unit/authRouting.test.ts`**:
   At lines 4–18 of `tests/unit/authRouting.test.ts`, the test suite declares an internal function:
   ```typescript
   function calculateRedirect(
     user: { uid: string } | null,
     loading: boolean,
     segments: Segment[]
   ): string | null {
     if (loading) return null;
     const inAuthGroup = segments[0] === '(auth)';
     if (!user && !inAuthGroup) {
       return '/(auth)/login';
     }
     if (user && inAuthGroup) {
       return '/(tabs)';
     }
     return null;
   }
   ```
   No production code from `src/` is imported or exercised by `tests/unit/authRouting.test.ts`.

2. **Inline Conditional Logic in `app/_layout.tsx`**:
   At lines 36–44 of `app/_layout.tsx`, the root layout determines redirects inline inside a `useEffect`:
   ```typescript
   const inAuthGroup = segments[0] === '(auth)';

   if (!user && !inAuthGroup) {
     // Unauthenticated user attempting to access protected screens
     router.replace('/(auth)/login');
   } else if (user && inAuthGroup) {
     // Authenticated user attempting to access auth screens
     router.replace('/(tabs)');
   }
   ```

3. **Current Utility Directory Structure**:
   `src/utils/` currently contains only `src/utils/validation.ts`. No `authRouting.ts` module currently exists.

4. **Task Dispatch Requirement**:
   Task dispatch requested extracting the redirect decision logic into `src/utils/authRouting.ts`:
   ```typescript
   export function getAuthRedirect(isAuthenticated: boolean, segments: string[]): string | null { ... }
   ```
   And wiring `app/_layout.tsx` to use this utility, while updating `tests/unit/authRouting.test.ts` to import and test the production function directly.

5. **Empirical Validation of Proposed Implementation**:
   Executing Jest on the proposed module and unit tests:
   ```bash
   npx jest --testMatch "<rootDir>/.agents/explorer_m2_iter2_2/**/*.test.ts" --testPathIgnorePatterns "/node_modules/"
   ```
   Yielded:
   ```
   PASS .agents/explorer_m2_iter2_2/proposed_authRouting.test.ts
     Auth Route Protection Redirect Matrix
       getAuthRedirect
         ✓ when loading is true, returns null regardless of auth state or route (24 ms)
         ✓ unauthenticated user outside (auth) redirects to /(auth)/login (1 ms)
         ✓ unauthenticated user inside (auth) does not redirect (1 ms)
         ✓ authenticated user inside (auth) redirects to /(tabs)
         ✓ authenticated user outside (auth) stays on current route (no redirect)
         ✓ empty segments array is treated as outside auth group
       isInAuthGroup helper
         ✓ correctly identifies (auth) group (1 ms)
         ✓ returns false for non-auth groups and empty array (1 ms)
       Route Constants
         ✓ AUTH_ROUTE and TABS_ROUTE match design specification
   Test Suites: 1 passed, 1 total
   Tests:       9 passed, 9 total
   ```

---

## 2. Logic Chain
1. From Observation 1, `tests/unit/authRouting.test.ts` only validates a local helper function `calculateRedirect`, leaving the production routing behavior in `app/_layout.tsx` (Observation 2) uncovered by unit testing.
2. From Observation 2, `app/_layout.tsx` contains the exact same branching conditions (`inAuthGroup = segments[0] === '(auth)'`, `!user && !inAuthGroup` -> `'/(auth)/login'`, `user && inAuthGroup` -> `'/(tabs)'`) hardcoded into the component lifecycle.
3. From Observation 3 and 4, extracting this logic into a pure utility in `src/utils/authRouting.ts` creates a single source of truth for routing rules that can be shared between `app/_layout.tsx` and `tests/unit/authRouting.test.ts`.
4. Supporting `loading: boolean = false` as an optional 3rd argument in `getAuthRedirect(isAuthenticated: boolean, segments: readonly string[] | string[], loading: boolean = false): string | null` preserves exact 2-argument compatibility with the signature in Observation 4 (`getAuthRedirect(isAuthenticated, segments)`), while also allowing pure testing and handling of pending auth state.
5. In `app/_layout.tsx`, replacing lines 36–44 with `const redirectRoute = getAuthRedirect(Boolean(user), segments); if (redirectRoute) router.replace(redirectRoute as any);` decouples UI layout from route policy math.
6. In `tests/unit/authRouting.test.ts`, deleting `calculateRedirect` and importing `getAuthRedirect` ensures that unit tests directly assert the behavior of production code.
7. From Observation 5, all 9 unit tests across redirect matrices, helper checks, and boundary cases pass cleanly against the proposed implementation.

---

## 3. Caveats
1. `app/_layout.tsx` also guards against navigation when `!navigationState?.key || loading` before computing redirects; keeping this early guard ensures React Navigation does not throw unmounted root container warnings.
2. In `app/_layout.tsx`, `router.replace` requires a typed route or cast (`as any` / `as Href`); using `router.replace(redirectRoute as any)` matches existing layout code.
3. This investigation was conducted in read-only mode in accordance with Teamwork rules. No production files in `app/`, `src/`, or `tests/` were modified directly; all changes are staged as proposals and patches in `.agents/explorer_m2_iter2_2/`.

---

## 4. Conclusion
1. Create `src/utils/authRouting.ts` exporting `AUTH_ROUTE`, `TABS_ROUTE`, `isInAuthGroup`, and `getAuthRedirect(isAuthenticated: boolean, segments: readonly string[] | string[], loading: boolean = false): string | null`. Reference implementation: `.agents/explorer_m2_iter2_2/proposed_authRouting.ts`.
2. Update `app/_layout.tsx` to import `getAuthRedirect` and replace lines 36–44 with `const redirectRoute = getAuthRedirect(Boolean(user), segments); if (redirectRoute) router.replace(redirectRoute as any);`.
3. Update `tests/unit/authRouting.test.ts` to import `getAuthRedirect`, `isInAuthGroup`, `AUTH_ROUTE`, and `TABS_ROUTE`, removing the local `calculateRedirect` function. Reference test suite: `.agents/explorer_m2_iter2_2/proposed_authRouting.test.ts`.
4. Complete machine-applicable diff is available at `.agents/explorer_m2_iter2_2/proposed_changes.patch`.

---

## 5. Verification Method
1. **Apply the patch or copy files**:
   - Write `.agents/explorer_m2_iter2_2/proposed_authRouting.ts` to `src/utils/authRouting.ts`.
   - Update `app/_layout.tsx` per `proposed_changes.patch`.
   - Update `tests/unit/authRouting.test.ts` per `proposed_changes.patch`.
2. **Execute Unit Tests**:
   ```bash
   npx jest tests/unit/authRouting.test.ts
   ```
   Expected result: 1 test suite passed, 9 tests passed.
3. **Execute Full Test Suite**:
   ```bash
   npm test
   ```
   Expected result: `tests/unit/authRouting.test.ts` passes alongside other unit and e2e suites.
4. **Invalidation Conditions**:
   - `tests/unit/authRouting.test.ts` imports a function not exported by `src/utils/authRouting.ts`.
   - `getAuthRedirect` produces cyclic redirects between `/(auth)/login` and `/(tabs)` when tested against `tests/unit/challenger2_m2.test.ts`.
