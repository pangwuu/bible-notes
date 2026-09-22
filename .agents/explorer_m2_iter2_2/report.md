# Architecture Investigation & Recommendation: Route Protection Logic Utility Extraction

## Executive Summary
This report recommends extracting the route protection redirect logic from `app/_layout.tsx` and the in-test mock in `tests/unit/authRouting.test.ts` into a dedicated production utility module: `src/utils/authRouting.ts`. This resolves the architectural defect identified by Reviewer 2 and the Auditor where tests validated a locally declared function rather than production routing code.

---

## 1. Problem Statement & Audit Findings

During Milestone 2 review, Reviewer 2 and the System Auditor noted:
1. In `tests/unit/authRouting.test.ts` (lines 4–18), the test suite defined a local duplicate function `calculateRedirect`:
   ```typescript
   function calculateRedirect(user: { uid: string } | null, loading: boolean, segments: Segment[]): string | null { ... }
   ```
2. In `app/_layout.tsx` (lines 36–44), the root layout executed inline routing conditionals inside a `useEffect` hook without referencing an exported, testable domain utility:
   ```typescript
   const inAuthGroup = segments[0] === '(auth)';
   if (!user && !inAuthGroup) {
     router.replace('/(auth)/login');
   } else if (user && inAuthGroup) {
     router.replace('/(tabs)');
   }
   ```
3. Because the production layout and unit test suite each maintained their own divergent copies of the routing logic, any regression or modification in `app/_layout.tsx` could pass CI tests despite broken redirect behavior in production.

---

## 2. Proposed Architecture: `src/utils/authRouting.ts`

### 2.1 Interface Contract
The utility is placed in `src/utils/authRouting.ts` as a pure, side-effect-free module adhering to the interface contract:

```typescript
export const AUTH_ROUTE = '/(auth)/login';
export const TABS_ROUTE = '/(tabs)';

export function isInAuthGroup(segments: readonly string[] | string[]): boolean;

export function getAuthRedirect(
  isAuthenticated: boolean,
  segments: readonly string[] | string[],
  loading?: boolean
): string | null;
```

### 2.2 Design Decisions & Rationale
1. **Pure Function with Default Parameters**:
   - `getAuthRedirect(isAuthenticated, segments)` satisfies the exact 2-argument signature specified in task dispatch: `export function getAuthRedirect(isAuthenticated: boolean, segments: string[]): string | null`.
   - The optional 3rd argument `loading: boolean = false` ensures that if auth resolution is in flight, `null` is returned without triggering redirects. Callers in `app/_layout.tsx` that already check `loading` can call `getAuthRedirect(Boolean(user), segments)` seamlessly.
2. **Defensive Segments Handling**:
   - Expo Router `useSegments()` returns an array of route segment strings (e.g. `['(tabs)', 'index']`, `['(auth)', 'login']`, or `[]` at the root path).
   - `isInAuthGroup` safely validates `Array.isArray(segments) && segments.length > 0 && segments[0] === '(auth)'`, avoiding `Cannot read properties of undefined` if an empty or invalid array is supplied.
3. **Finite State Redirect Matrix (Single-Step Fixed Point)**:
   - As validated by Challenger 2's cycle detector, all transitions reach their target in at most 1 hop with zero infinite loop risk:
     - Unauthenticated user outside `(auth)` -> redirects to `/(auth)/login`.
     - Unauthenticated user inside `(auth)` -> returns `null` (allows login/register navigation).
     - Authenticated user inside `(auth)` -> redirects to `/(tabs)`.
     - Authenticated user outside `(auth)` -> returns `null` (allows reading notes, settings, etc.).

---

## 3. Concrete Implementation Plan

### 3.1 Target 1: Create `src/utils/authRouting.ts`
Full content:
```typescript
/**
 * Route protection and redirect logic for authentication lifecycle.
 * Centralizes redirect decisions between public auth screens and protected app screens.
 */

export const AUTH_ROUTE = '/(auth)/login';
export const TABS_ROUTE = '/(tabs)';

/**
 * Checks whether the current route segments belong to the (auth) group.
 *
 * @param segments - Array of route segments from Expo Router's useSegments()
 * @returns true if the root segment is '(auth)', false otherwise
 */
export function isInAuthGroup(segments: readonly string[] | string[]): boolean {
  return Array.isArray(segments) && segments.length > 0 && segments[0] === '(auth)';
}

/**
 * Determines whether an authentication-based redirect is required.
 *
 * Redirect rules:
 * 1. While loading is true, returns null (do not redirect while resolving).
 * 2. If unauthenticated and outside (auth) group, redirect to /(auth)/login.
 * 3. If authenticated and inside (auth) group, redirect to /(tabs).
 * 4. Otherwise, return null (stay on current route).
 *
 * @param isAuthenticated - Whether the user is currently authenticated
 * @param segments - Array of route segments from Expo Router's useSegments()
 * @param loading - Optional flag indicating if auth state is resolving (defaults to false)
 * @returns Target route string if redirect is needed, or null if no redirect
 */
export function getAuthRedirect(
  isAuthenticated: boolean,
  segments: readonly string[] | string[],
  loading: boolean = false
): string | null {
  if (loading) {
    return null;
  }

  const inAuth = isInAuthGroup(segments);

  if (!isAuthenticated && !inAuth) {
    return AUTH_ROUTE;
  }

  if (isAuthenticated && inAuth) {
    return TABS_ROUTE;
  }

  return null;
}
```

### 3.2 Target 2: Update `app/_layout.tsx`
Import `getAuthRedirect` and wire into `RootNavigationLayout`:

#### Before:
```typescript
import { colors, paperTheme, navigationTheme } from '../src/constants/theme';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

// ...

function RootNavigationLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait until navigation container is fully mounted and auth check is done
    if (!navigationState?.key || loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Unauthenticated user attempting to access protected screens
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Authenticated user attempting to access auth screens
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, navigationState?.key]);
```

#### After:
```typescript
import { colors, paperTheme, navigationTheme } from '../src/constants/theme';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { getAuthRedirect } from '../src/utils/authRouting';

// ...

function RootNavigationLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait until navigation container is fully mounted and auth check is done
    if (!navigationState?.key || loading) {
      return;
    }

    const redirectRoute = getAuthRedirect(Boolean(user), segments);
    if (redirectRoute) {
      router.replace(redirectRoute as any);
    }
  }, [user, loading, segments, navigationState?.key]);
```

### 3.3 Target 3: Update `tests/unit/authRouting.test.ts`
Remove local `calculateRedirect` declaration and directly import `getAuthRedirect`, `isInAuthGroup`, `AUTH_ROUTE`, and `TABS_ROUTE`.

#### Complete Updated Test File:
```typescript
import {
  getAuthRedirect,
  isInAuthGroup,
  AUTH_ROUTE,
  TABS_ROUTE,
} from '../../src/utils/authRouting';

describe('Auth Route Protection Redirect Matrix', () => {
  describe('getAuthRedirect', () => {
    test('when loading is true, returns null regardless of auth state or route', () => {
      expect(getAuthRedirect(false, ['(tabs)'], true)).toBeNull();
      expect(getAuthRedirect(true, ['(auth)', 'login'], true)).toBeNull();
      expect(getAuthRedirect(false, ['(auth)', 'login'], true)).toBeNull();
      expect(getAuthRedirect(true, ['(tabs)'], true)).toBeNull();
    });

    test('unauthenticated user outside (auth) redirects to /(auth)/login', () => {
      expect(getAuthRedirect(false, ['(tabs)'])).toBe('/(auth)/login');
      expect(getAuthRedirect(false, ['note', '1'])).toBe('/(auth)/login');
      expect(getAuthRedirect(false, ['notifications'])).toBe('/(auth)/login');
      expect(getAuthRedirect(false, ['friend', 'profile'])).toBe('/(auth)/login');
    });

    test('unauthenticated user inside (auth) does not redirect', () => {
      expect(getAuthRedirect(false, ['(auth)', 'login'])).toBeNull();
      expect(getAuthRedirect(false, ['(auth)', 'register'])).toBeNull();
    });

    test('authenticated user inside (auth) redirects to /(tabs)', () => {
      expect(getAuthRedirect(true, ['(auth)', 'login'])).toBe('/(tabs)');
      expect(getAuthRedirect(true, ['(auth)', 'register'])).toBe('/(tabs)');
    });

    test('authenticated user outside (auth) stays on current route (no redirect)', () => {
      expect(getAuthRedirect(true, ['(tabs)'])).toBeNull();
      expect(getAuthRedirect(true, ['note', '456'])).toBeNull();
      expect(getAuthRedirect(true, ['friend', '789'])).toBeNull();
      expect(getAuthRedirect(true, ['notifications'])).toBeNull();
    });

    test('empty segments array is treated as outside auth group', () => {
      expect(getAuthRedirect(false, [])).toBe('/(auth)/login');
      expect(getAuthRedirect(true, [])).toBeNull();
    });
  });

  describe('isInAuthGroup helper', () => {
    test('correctly identifies (auth) group', () => {
      expect(isInAuthGroup(['(auth)'])).toBe(true);
      expect(isInAuthGroup(['(auth)', 'login'])).toBe(true);
      expect(isInAuthGroup(['(auth)', 'register'])).toBe(true);
    });

    test('returns false for non-auth groups and empty array', () => {
      expect(isInAuthGroup(['(tabs)'])).toBe(false);
      expect(isInAuthGroup(['note', '1'])).toBe(false);
      expect(isInAuthGroup([])).toBe(false);
    });
  });

  describe('Route Constants', () => {
    test('AUTH_ROUTE and TABS_ROUTE match design specification', () => {
      expect(AUTH_ROUTE).toBe('/(auth)/login');
      expect(TABS_ROUTE).toBe('/(tabs)');
    });
  });
});
```

---

## 4. Verification & Empirical Validation

The proposed utility and test suite were empirically verified with Jest:
- Command: `npx jest --testMatch "<rootDir>/.agents/explorer_m2_iter2_2/**/*.test.ts" --testPathIgnorePatterns "/node_modules/"`
- Results:
  - Test suites: 1 passed, 1 total
  - Tests: 9 passed, 9 total
  - Execution time: 2.538 s
  - Status: All assertions passed cleanly without warning or regression.

---

## 5. Artifact Summary
The following reference artifacts have been created in `.agents/explorer_m2_iter2_2/`:
1. `proposed_authRouting.ts` — Full production utility implementation
2. `proposed_authRouting.test.ts` — Verified unit test suite
3. `proposed_changes.patch` — Unified git diff patch for all 3 targets
4. `handoff.md` — Formal 5-component handoff document for Developer 2
