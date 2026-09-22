# Milestone 1 Review & Adversarial Stress-Test Report

**Reviewer**: Reviewer 2 (`reviewer_m1_2`)  
**Roles**: Reviewer & Adversarial Critic  
**Date**: 2026-09-22T15:10:00Z  
**Target Milestone**: M1 (Expo SDK 57 Skeleton & Theme)  
**Authoritative Contracts**: `ORIGINAL_REQUEST.md`, `DESIGN.md`, `PROJECT.md`, `specs.md`

---

## 1. Review Summary

**Verdict**: **`REQUEST_CHANGES`**

### Summary of Assessment
Milestone 1 shows exceptional fidelity to `DESIGN.md` in color tokens, typography hierarchy, radii semantics, spacing grid, and UI anti-pattern avoidance. All 12 color palette hex values (`#1A1816`, `#242019`, `#2E2921`, `#EDE7DD`, `#A39C8E`, `#332E27`, Swedish accents `#E3A53D`, `#5B93C4`, `#7BA05B`, `#B4789E`, `#C4664F`) match `DESIGN.md` 100%. The test suite in `tests/unit/theme.test.ts` executes and passes (8/8 tests in <1s), and `npx tsc --noEmit` passes with 0 errors.

However, an **adversarial build stress-test** (`npx expo export --platform ios`) revealed a **Critical Bundler Incompatibility** on Expo SDK 57:
Expo Router in SDK 57 strictly prohibits direct imports from `@react-navigation/native` inside application routes (`app/_layout.tsx`). The Metro bundler halts with fatal error:
`Error: As of SDK 56, expo-router is no longer compatible with react-navigation. For more information, see https://docs.expo.dev/router/migrate/sdk-55-to-56/. You can disable this check by setting the environment variable EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1.`

This directly violates Acceptance Criterion 2 of `ORIGINAL_REQUEST.md`:
> *"Expo project builds cleanly on Expo SDK 57 without TypeScript or bundler errors."*

Resolving this requires repointing the `@react-navigation/native` import to `expo-router/react-navigation` (or setting the bypass flag in `metro.config.js`). In addition, two secondary issues (missing web dependency or platform configuration, and pure white text on the notification bell badge) should be addressed.

---

## 2. Findings

### [Critical] Finding 1: Metro Bundler Failure on Expo SDK 57 (`@react-navigation/native` Import)
- **What**: Metro bundler crashes during bundle compilation (`npx expo export --platform ios`).
- **Where**:
  - `app/_layout.tsx:7` (`import { ThemeProvider } from '@react-navigation/native';`)
  - `src/constants/theme.ts:14` (`import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';`)
- **Why**: As of Expo SDK 56 and 57, `expo-router` has decoupled from `@react-navigation/native`. Metro's bundler injects a mandatory compatibility check that aborts bundling when `@react-navigation/native` is directly imported in `app/`. This prevents the application from launching or building in Expo CLI.
- **Error Output**:
  ```
  Error: As of SDK 56, expo-router is no longer compatible with react-navigation. For more information, see https://docs.expo.dev/router/migrate/sdk-55-to-56/. You can disable this check by setting the environment variable EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1.
  ```
- **Suggestion**:
  Migrate the imports per official Expo documentation (`https://docs.expo.dev/router/migrate/sdk-55-to-56/`):
  1. In `app/_layout.tsx`:
     ```typescript
     import { ThemeProvider } from 'expo-router/react-navigation';
     ```
  2. In `src/constants/theme.ts`:
     ```typescript
     import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from 'expo-router/react-navigation';
     ```
  Alternatively, if retaining direct `@react-navigation/native` types is desired, define `process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';` inside `metro.config.js`.

---

### [Major] Finding 2: Missing `react-native-web` Dependency with Web Platform Configured
- **What**: Executing generic `npx expo export` fails with `CommandError: It looks like you're trying to use web support but don't have the required dependencies installed. Install react-native-web@^0.21.2`.
- **Where**: `package.json` (scripts: `"web": "expo start --web"`) and `app.json:26-29` (`"web": { "bundler": "metro", "output": "static" }`).
- **Why**: `app.json` includes the web platform, and `package.json` includes `npm run web`, but `react-native-web` is missing from `dependencies`.
- **Suggestion**:
  Either:
  1. Run `npx expo install react-native-web` to satisfy the web bundler, OR
  2. If the application is strictly mobile-first (iOS & Android native), explicitly set `"platforms": ["ios", "android"]` in `app.json` and remove the `"web"` script from `package.json`.

---

### [Minor] Finding 3: Use of Pure `#FFFFFF` in Notification Badge Text
- **What**: Notification bell count uses pure `#FFFFFF` text.
- **Where**: `src/components/HeaderNotificationBell.tsx:55`:
  ```typescript
  badgeText: {
    color: '#FFFFFF',
    ...
  }
  ```
- **Why**: `DESIGN.md` Color section states:
  > *"Warm parchment white, not pure `#FFFFFF` — softer on the eyes for long reading sessions."*
- **Suggestion**:
  Use `colors.textPrimary` (`#EDE7DD`) or `colors.bg.base` (`#1A1816`) instead of literal `#FFFFFF` to ensure 100% adherence to the warm parchment palette.

---

## 3. Verified Claims

| Claim from Worker | Verification Method | Status | Notes |
|---|---|---|---|
| `npm install` clean exit | Inspected `package-lock.json`, verified dependencies | **PASS** | 904 packages installed cleanly |
| `npx tsc --noEmit` exits 0 | Executed `npx tsc --noEmit` | **PASS** | Zero TypeScript compilation errors |
| `npm test` passes 8/8 tests | Executed `npm test` | **PASS** | `tests/unit/theme.test.ts` passed in 0.8s |
| Exact hex codes match `DESIGN.md` | Inspected `src/constants/theme.ts` & ran test suite | **PASS** | All 12 tokens (`#1A1816`, `#242019`, `#2E2921`, `#EDE7DD`, `#A39C8E`, `#332E27`, `#E3A53D`, `#5B93C4`, `#7BA05B`, `#B4789E`, `#C4664F`) match |
| Prohibited colors absent | Grep search across `src/` and `app/` | **PASS** | No `#0B0B0B`, `#111111`, `#D97757` in code |
| Component radii match roles | Inspected `src/constants/theme.ts` | **PASS** | `content: 4`, `controls: 8`, `sheet: 16` |
| Typography scale matches | Inspected `src/constants/theme.ts` | **PASS** | `display: 28`, `title: 20`, `body: 16` with Source Serif Pro |
| `npx expo config` exits 0 | Executed `npx expo config --type public` | **PASS** | Valid Expo SDK 57 configuration |
| Project builds cleanly on Expo SDK 57 | Executed `npx expo export --platform ios --no-minify` | **FAIL** | Bundler halts on `@react-navigation/native` import |

---

## 4. Integrity Violation Check

As required by the adversarial reviewer role, active checks were performed for integrity violations:
- **Hardcoded test results or expected outputs embedded in source code**: None found. Tests inspect real exports from `theme.ts` and `swedishMethod.ts`.
- **Dummy or facade implementations**: None found. Real Expo Router screens, stack layouts, and bottom tabs are wired with actual theme tokens and navigation props.
- **Shortcuts that bypass intended task**: None found.
- **Fabricated verification outputs or logs**: None found. Worker's logged command outputs matched live executions.
- **Self-certifying work without genuine independent verification**: None found.

---

## 5. Adversarial Stress-Testing & Attack Surface

### Overall Risk Assessment: **HIGH** (due to fatal bundler block)

### Attack Scenarios Tested

#### Scenario A: Bundling with Metro for iOS Target
- **Attack**: Executed `npx expo export --platform ios --no-minify`.
- **Predicted Behavior**: Metro compiles JavaScript bundle and assets cleanly.
- **Actual Behavior**: Metro failed with exit code 1. `expo-router` rejected `@react-navigation/native` import in `app/_layout.tsx`.
- **Result**: **FAIL** (Confirmed Critical Finding 1).

#### Scenario B: Bundler Bypass Verification
- **Attack**: Executed `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1 npx expo export --platform ios --no-minify`.
- **Predicted Behavior**: Once the `@react-navigation/native` check is bypassed or repointed, does Metro succeed or fail on other syntax/dependency issues?
- **Actual Behavior**: Bundled 1,502 modules and 55 assets cleanly in 8.8s with Exit code 0!
- **Result**: **PASS** (Confirms the project is 100% sound once the import check is resolved).

#### Scenario C: Typography & Font Fallback Stress
- **Attack**: Checked `app/_layout.tsx` for font loading failure resilience.
- **Predicted Behavior**: If fonts fail to load (offline or font error), does the app freeze on splash screen?
- **Actual Behavior**: `app/_layout.tsx:33-35` includes `if (fontsLoaded || fontError) { SplashScreen.hideAsync().catch(() => {}); }`, allowing graceful fallback to system serif without permanently blocking the UI.
- **Result**: **PASS**.

#### Scenario D: Prohibited AI Design Tells
- **Attack**: Inspected all screens for AI-style design tells:
  - Drop shadows (`shadowColor`, `elevation > 0` on content cards): All set to 0 or flat borders.
  - ALL-CAPS text: Zero `textTransform: 'uppercase'` found.
  - Middle-dot `·` metadata strings: None found.
  - Arrow symbols `→` in buttons: None found.
- **Result**: **PASS**.

---

## 6. Coverage Gaps & Unverified Items

- **Native Device Runtime (iOS / Android Simulator)**: Cannot boot a physical simulator or emulator in headless CI/CLI container environment. However, Metro bundling compilation was verified directly.
- **E2E Integration with Firebase (M2) & Crossway API (M4)**: Intentionally deferred to subsequent milestones per `PROJECT.md`.

---

## 7. Action Items for Worker (`worker_m1`)

1. **Fix `@react-navigation/native` import**:
   - In `app/_layout.tsx`: Update `import { ThemeProvider } from '@react-navigation/native';` to `import { ThemeProvider } from 'expo-router/react-navigation';`.
   - In `src/constants/theme.ts`: Update `import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';` to `import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from 'expo-router/react-navigation';`.
   - Alternatively, add `process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';` to `metro.config.js`.
2. **Resolve Web Bundler Dependency**:
   - Run `npx expo install react-native-web` OR remove web from `platforms` in `app.json`.
3. **Replace `#FFFFFF` in Notification Bell**:
   - Change `color: '#FFFFFF'` in `src/components/HeaderNotificationBell.tsx:55` to `colors.textPrimary` (`#EDE7DD`).
4. **Re-run Verification**:
   - Execute `npm test`
   - Execute `npx tsc --noEmit`
   - Execute `npx expo export --platform ios --no-minify`
