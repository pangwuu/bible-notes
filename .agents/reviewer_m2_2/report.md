# Review Report: Milestone 2 (Firebase Client Integration & Authentication)

**Reviewer**: `reviewer_m2_2`  
**Milestone**: M2 — Firebase Client Integration & Authentication  
**Date**: 2026-09-23  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Executive Summary

A comprehensive quality and adversarial review of Milestone 2 deliverables was performed, focusing on `src/context/AuthContext.tsx`, `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, and `app/(tabs)/settings.tsx`.

The core authentication flows, Firebase v11 modular integration, Firestore user profile schemas, username uniqueness verification with rollback, and Expo Router navigation guards are architected with genuine production logic. Bundling via `npx expo export -p ios --no-minify` succeeded with 1,528 modules, and TypeScript typechecking (`tsc --noEmit`) completed with 0 errors.

However, an explicit design anti-pattern prohibited by `DESIGN.md` was discovered in `app/(tabs)/settings.tsx` (ALL-CAPS tracked-out eyebrow headers using `textTransform: 'uppercase'` and `letterSpacing: 0.5`), which causes `npm test` to fail on `tests/unit/challenger2_m2.test.ts`. Consequently, the milestone verdict is **REQUEST_CHANGES** until this defect is resolved.

---

## 2. Findings

### [Major] Finding 1: Prohibited ALL-CAPS Tracked-Out Eyebrow Labels in Settings Screen

- **What**: In `app/(tabs)/settings.tsx`, the `sectionHeader` style applies `textTransform: 'uppercase'` and `letterSpacing: 0.5` to the section headers ("Preferences" and "Crossway ESV API").
- **Where**: `app/(tabs)/settings.tsx`, lines 270–278:
  ```tsx
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ```
- **Why**: 
  1. `DESIGN.md` Line 17 explicitly defines as an anti-pattern:
     > "- No ALL-CAPS tracked-out eyebrow labels above headings."
  2. `DESIGN.md` Line 59 reiterates:
     > "Sentence case everywhere — headings, buttons, labels. No all-caps."
  3. This causes `npm test` to fail on `tests/unit/challenger2_m2.test.ts`:
     ```
     FAIL tests/unit/challenger2_m2.test.ts
     ● Challenger 2 — Adversarial M2 Suite › DESIGN.md Anti-Pattern: ALL-CAPS & Tracked-out Eyebrow Labels › Zero UI components use textTransform: "uppercase" or letterSpacing tracking on headings/labels
     ```
- **Suggested Fix**: In `app/(tabs)/settings.tsx`, remove `textTransform: 'uppercase'` and `letterSpacing: 0.5` from `styles.sectionHeader`. Retain sentence case typography (`Preferences`, `Crossway ESV API`).

---

### [Minor] Finding 2: In-line Local Helper in `tests/unit/authRouting.test.ts` (Facade Risk)

- **What**: In `tests/unit/authRouting.test.ts`, the redirect matrix test defines `calculateRedirect` as a local function within the test file rather than importing the routing logic from an exported utility.
- **Where**: `tests/unit/authRouting.test.ts`, lines 4–18.
- **Why**: Testing an in-file local function instead of production code introduces the risk of test/production drift if `app/_layout.tsx` changes.
- **Suggested Fix**: Extract the route guard decision logic into a shared utility function (e.g. `src/utils/routeGuard.ts` or `getAuthRedirectRoute`) and import it in both `app/_layout.tsx` and `tests/unit/authRouting.test.ts`.

---

## 3. Verified Claims & Deep Inspection

### 3.1 Design Token & Aesthetic Conformance

| Token / Style | Specification (`DESIGN.md`) | Implementation Status | Notes |
|---|---|---|---|
| Background Base | `#1A1816` | **Verified** | Used as root background in all screens & stack |
| Surface | `#242019` | **Verified** | Used for form cards, inputs, and dialogs |
| Surface Raised | `#2E2921` | **Verified** | Used for banners, button fills, avatar circle |
| Hairline Border | `#332E27` | **Verified** | 1px borders on inputs, cards, dialogs |
| Text Primary | `#EDE7DD` | **Verified** | Used for headings and body content |
| Text Secondary | `#A39C8E` | **Verified** | Used for labels, helper text, and secondary copy |
| Key Idea Accent | `#E3A53D` | **Verified** | Used for primary action buttons and active borders |
| Danger Accent | `#C4664F` | **Verified** | Used for error banners and destructive Sign Out button |
| Application Accent| `#7BA05B` | **Verified** | Used for success feedback banners |
| Border Radii | 4px (content), 8px (controls), 16px (dialogs) | **Verified** | `radius.control` (8px) used for buttons/cards, `radius.sheet` (16px) for dialogs |
| Drop Shadows | Prohibited (0 opacity / no elevation) | **Verified** | Zero drop shadows across all reviewed screens |
| Sentence Case | Mandatory everywhere | **Violated in Settings** | `styles.sectionHeader` in `settings.tsx` forces uppercase |

---

### 3.2 Route Guarding & Navigation Architecture (`app/_layout.tsx`)

`RootNavigationLayout` coordinates route protection via `useAuth()`, `useSegments()`, and `useRootNavigationState()`:
1. **Loading State Protection**: While `loading === true`, `RootNavigationLayout` renders `<ActivityIndicator color={colors.accentKeyIdea} />` and holds off rendering `<Stack>`, guaranteeing that unauthenticated users never flash protected screens while AsyncStorage session restoration is pending.
2. **Mount Readiness**: The guard checks `if (!navigationState?.key || loading) return;`, ensuring Expo Router's navigation container is fully mounted before attempting route replacements.
3. **Unauthenticated Redirection**: If `!user && !inAuthGroup`, unauthenticated access to `(tabs)`, `note/[id]`, `note/edit`, `friend/[id]`, or `notifications` immediately executes `router.replace('/(auth)/login')`.
4. **Authenticated Redirection**: If `user && inAuthGroup`, an authenticated user landing on `(auth)` is redirected via `router.replace('/(tabs)')`.
5. **Cycle Resistance**: Each transition reaches a fixed point within at most 1 redirect step, eliminating infinite redirect loops.

---

### 3.3 Auth Context & Lifecycle (`src/context/AuthContext.tsx`)

1. **Dual-Listener Pattern**: `onAuthStateChanged` manages the primary auth state, while an internal `onSnapshot` dynamically synchronizes `users/{uid}` in real-time.
2. **Listener Teardown**: Cleans up previous `onSnapshot` listeners when auth state transitions, and unsubscribes both auth and Firestore listeners on unmount, preventing memory leaks.
3. **Graceful Fallback**: If the Firestore profile document has not yet synced after user creation, a provisional fallback profile is constructed from `User` metadata, preventing null-pointer exceptions in child screens.
4. **Offline Resilience**: Snapshot error callbacks log warnings without crashing and ensure `loading` is set to `false`, preventing the app from being stuck in an infinite spinner.

---

### 3.4 UX & Form Validation (`login.tsx` & `register.tsx`)

1. **Registration Form**:
   - Live debounced (500ms) username check validates against `^[a-z0-9_]{3,20}$`.
   - Normalizes to lowercase and informs user with dynamic color-coded feedback (`accentApplication` for available, `accentDanger` for taken/invalid).
   - Requires full name, valid email, minimum 6-character password, and password confirmation matching.
   - Disables submission during in-flight checks or invalid states.
2. **Login Form**:
   - Validates email and non-empty password before dispatching Firebase requests.
   - Eye/eye-off toggle for password visibility.
   - In-modal password reset flow with email validation and inline feedback.
3. **Settings Screen**:
   - Profile avatar with initial letter, display name, username, and email.
   - Synchronizes `default_visibility` ('friends' vs 'private') directly to Firestore profile.
   - Synchronizes custom ESV API token to Firestore profile with temporary feedback toast.
   - Sign out confirmation dialog with loading indicator to prevent duplicate sign-out requests.

---

## 4. Verification Command Output

### 4.1 Unit Test Suite (`npm test`)
```bash
> jest
FAIL tests/unit/challenger2_m2.test.ts
  ● Challenger 2 — Adversarial M2 Suite › DESIGN.md Anti-Pattern: ALL-CAPS & Tracked-out Eyebrow Labels › Zero UI components use textTransform: "uppercase" or letterSpacing tracking on headings/labels

    - Array []
    + Array [
    +   Object {
    +     "file": "app/(tabs)/settings.tsx",
    +     "line": 276,
    +     "text": "textTransform: 'uppercase',",
    +   },
    +   Object {
    +     "file": "app/(tabs)/settings.tsx",
    +     "line": 277,
    +     "text": "letterSpacing: 0.5,",
    +   },
    + ]

PASS tests/e2e/tier3_combinations.test.ts
PASS tests/e2e/tier4_scenarios.test.ts
PASS tests/unit/theme.test.ts
PASS tests/e2e/tier1_features.test.ts
PASS tests/e2e/tier2_boundaries.test.ts
PASS tests/unit/authValidation.test.ts
PASS tests/unit/authRouting.test.ts
PASS tests/unit/adversarial.test.ts
PASS tests/unit/firebase.test.ts
PASS tests/unit/themeAdversarial.test.ts

Test Suites: 1 failed, 10 passed, 11 total
Tests:       1 failed, 480 passed, 481 total
Snapshots:   0 total
Time:        1.977 s
```

### 4.2 TypeScript Typechecking (`npm run typecheck`)
```bash
> tsc --noEmit
(Exit code 0 — 0 errors)
```

### 4.3 Expo iOS Bundling (`npx expo export -p ios --no-minify`)
```bash
iOS Bundled 6634ms node_modules/expo-router/entry.js (1528 modules)
Exported: dist
(Exit code 0 — 0 errors)
```

---

## 5. Required Actions for Approval

1. **Remove ALL-CAPS and tracking in Settings Screen**:
   In `app/(tabs)/settings.tsx`, remove `textTransform: 'uppercase'` and `letterSpacing: 0.5` from `styles.sectionHeader`.
2. **Re-run Test Suite**:
   Execute `npm test` to verify that all 11 test suites (including `tests/unit/challenger2_m2.test.ts`) pass with 0 failures.
