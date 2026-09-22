# Milestone 2 Adversarial Challenge Report

**Agent**: `challenger_m2_2`  
**Milestone**: M2 — Firebase Client Integration & Authentication  
**Date**: 2026-09-22T18:36:00Z  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Executive Summary

Empirical Challenger 2 independently audited the Milestone 2 deliverables across five dimensions:
1. **TypeScript Type System & Compiler**: Passed (`npm run typecheck` exited 0).
2. **Expo Native Bundling**: Passed (`npx expo export -p ios --no-minify` bundled 1528 modules into `dist/` with Hermes bytecode).
3. **Route Guards & Navigation Lifecycle**: Passed (stable 1-step convergence, no infinite redirect cycles or mount race conditions).
4. **Prohibited Color Tokens**: Passed (0 executable occurrences of `#000000`, `#0B0B0B`, `#111111`, `#D97757`, or `#FFFFFF`).
5. **Visual Design Anti-Patterns**: **FAILED**. In `app/(tabs)/settings.tsx`, lines 276–277 apply `textTransform: 'uppercase'` and `letterSpacing: 0.5` to `sectionHeader`, directly violating `DESIGN.md`'s prohibition against ALL-CAPS tracked-out eyebrow labels above headings and mandatory sentence-case styling.

A new test suite (`tests/unit/challenger2_m2.test.ts`) was authored and executed, reproducing the failure with exit code 1.

---

## 2. Empirical Verification Matrix

| Area | Command / Method | Observed Result | Status |
|---|---|---|---|
| **TypeScript Types** | `npm run typecheck` (`tsc --noEmit`) | Exited 0 with 0 errors (`strict: true`) | PASS |
| **Expo Export Bundling** | `npx expo export -p ios --no-minify` | Bundled 1528 modules into `dist/`, generated Hermes `.hbc` | PASS |
| **Route Guard Cycle Detection** | `tests/unit/challenger2_m2.test.ts` (13 route paths × 4 state pairs) | 100% routes reach fixed point in $\le 1$ step; 0 redirects when unmounted/loading | PASS |
| **Banned Color Tokens** | AST & Regex scanner on `app/**/*.tsx`, `src/**/*.ts` | 0 occurrences of `#000000`, `#0B0B0B`, `#111111`, `#D97757`, `#FFFFFF` | PASS |
| **Design Anti-Patterns** | AST & Regex scanner on `app/**/*.tsx`, `src/**/*.ts` | Found `textTransform: 'uppercase'`, `letterSpacing: 0.5` in `app/(tabs)/settings.tsx` | **FAIL** |

---

## 3. Detailed Challenges & Findings

### 🔴 Finding 1: Prohibited ALL-CAPS Tracked-Out Eyebrow Labels in Settings (`app/(tabs)/settings.tsx`)

- **Severity**: Medium (Design System & Specification Compliance)
- **Violation**: `DESIGN.md` Section "Do not do this (anti-patterns to actively avoid)":
  > *"These are the tells of ungrounded, templated AI output. Antigravity should treat this list as a checklist to fail on purpose:*
  > *- No ALL-CAPS tracked-out eyebrow labels above headings."*  
  > (Lines 13–17)
  
  And `DESIGN.md` Section "Typography":
  > *"Sentence case everywhere — headings, buttons, labels. No all-caps."*  
  > (Line 59)

- **Verbatim Code Observed** (`app/(tabs)/settings.tsx`, lines 270–278):
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
  Applied in JSX on lines 114 & 131:
  ```tsx
  <Text style={styles.sectionHeader}>Preferences</Text>
  ...
  <Text style={styles.sectionHeader}>Crossway ESV API</Text>
  ```
- **Blast Radius**: Renders `PREFERENCES` and `CROSSWAY ESV API` as tracked-out all-caps eyebrow headers above the preference cards, creating an explicit AI-default tell forbidden by the design system.
- **Empirical Reproduction**:
  Running `npm test -- tests/unit/challenger2_m2.test.ts` yields:
  ```
  FAIL tests/unit/challenger2_m2.test.ts
  ● Challenger 2 — Adversarial M2 Suite › DESIGN.md Anti-Pattern: ALL-CAPS & Tracked-out Eyebrow Labels › Zero UI components use textTransform: "uppercase" or letterSpacing tracking on headings/labels

    expect(received).toEqual(expected) // deep equality

    - Expected  -  1
    + Received  + 12

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
  ```
- **Required Action for Worker**:
  In `app/(tabs)/settings.tsx`, remove `textTransform: 'uppercase'` and `letterSpacing: 0.5` from `styles.sectionHeader`. Keep `fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.xs`. Ensure text renders in sentence case (`Preferences`, `Crossway ESV API`).

---

### 🟢 Verification 2: Route Guard Safety & Cycle Freedom (`app/_layout.tsx`)

- **Analysis**:
  ```tsx
  useEffect(() => {
    if (!navigationState?.key || loading) {
      return;
    }
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, navigationState?.key]);
  ```
- **Cycle Proof**:
  - Unauthenticated user navigating to any protected route (`(tabs)`, `note/[id]`, `notifications`): `!inAuthGroup` is true $\to$ redirects to `/(auth)/login` $\to$ next state has `segments[0] === '(auth)'` $\to$ condition becomes false $\to$ stable (1 step).
  - Authenticated user navigating to `(auth)/login` or `(auth)/register`: `inAuthGroup` is true $\to$ redirects to `/(tabs)` $\to$ next state has `segments[0] === '(tabs)'` $\to$ condition becomes false $\to$ stable (1 step).
  - When `loading === true`, the guard returns early, and `RootNavigationLayout` renders an `ActivityIndicator` without mounting the `<Stack>`, preventing redirect thrashing while Firebase Auth initializes from AsyncStorage.
  - When `navigationState?.key` is missing, the guard returns early, avoiding calls to `router.replace` prior to root navigator hydration.
- **Result**: No race conditions or infinite redirect loops exist.

---

### 🟢 Verification 3: Color Tokens & Pure White Scanner

- **Scan Target**: All source files in `app/` and `src/`.
- **Banned Patterns Checked**:
  - `#000000` / `#000` (pure black)
  - `#0B0B0B` (near-black)
  - `#111111` (near-black)
  - `#D97757` (AI terracotta)
  - `#FFFFFF` / `#fff` (pure white)
- **Observations**:
  - Found 0 occurrences in executable code.
  - `src/constants/theme.ts` mentions them only in comment blocks defining anti-patterns.
  - All UI elements uniformly consume `colors.textPrimary` (`#EDE7DD`), `colors.bgBase` (`#1A1816`), `colors.bgSurface` (`#242019`), and Swedish Method accents (`#E3A53D`, `#5B93C4`, `#7BA05B`).
- **Result**: Fully compliant with color rules.

---

### 🟢 Verification 4: TypeScript Strict Typecheck & Bundling

- **Command**: `npm run typecheck`
  - Exit code: 0
  - Flags: `"strict": true` configured in `tsconfig.json`.
- **Command**: `npx expo export -p ios --no-minify`
  - Exit code: 0
  - Output directory: `dist/`
  - Module count: 1528 modules
  - Hermes Bytecode generation: verified `dist/_expo/static/js/ios/entry-*.hbc` (4.7MB) generated without compilation errors.
- **Result**: PASS.

---

## 4. Verdict & Next Steps

**Verdict**: **REQUEST_CHANGES**

**Action Required**:
1. Worker must update `app/(tabs)/settings.tsx`:
   Remove `textTransform: 'uppercase'` (line 276) and `letterSpacing: 0.5` (line 277).
2. Worker must re-run `npm test` to verify that all 481 tests pass (including `tests/unit/challenger2_m2.test.ts`).
3. Worker re-submits handoff report for Milestone 2 completion.
