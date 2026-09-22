# Milestone 1 Empirical Challenge Report

**Author**: Challenger 1 (`challenger_m1_1`)  
**Target Milestone**: M1 (Expo SDK 57 Skeleton & Theme)  
**Date**: 2026-09-22T15:10:00Z  
**Verdict**: `REQUEST_CHANGES`

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

While TypeScript compilation (`npx tsc --noEmit`) and Jest tests (`npm test`) execute cleanly, empirical execution of the Expo SDK 57 bundler (`npx expo export -p ios` and `npx expo export -p android`) revealed a **critical bundler crash**:
`Error: As of SDK 56, expo-router is no longer compatible with react-navigation.`

This directly violates the Acceptance Criterion in `ORIGINAL_REQUEST.md`:
> *"Expo project builds cleanly on Expo SDK 57 without TypeScript or bundler errors."*

The root cause, reproducible commands, and recommended fixes are documented below.

---

## Challenges

### [Critical] Challenge 1: Bundler Crash on Expo SDK 57 due to direct `@react-navigation/*` imports

- **Assumption Challenged**: Worker M1 claimed that the project builds cleanly on Expo SDK 57 because `npx expo config` and `npx tsc --noEmit` succeeded.
- **Attack Scenario / Empirical Reproduction**:
  Execute an actual Metro dry bundling/export:
  ```bash
  npx expo export -p ios --clear --no-bytecode
  ```
  **Observed Output**:
  ```
  iOS Bundling failed 8023ms node_modules/expo-router/entry.js (1273 modules)

  Error: As of SDK 56, expo-router is no longer compatible with react-navigation.
  For more information, see https://docs.expo.dev/router/migrate/sdk-55-to-56/.
  You can disable this check by setting the environment variable EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1.

  Import stack:
   app/_layout.tsx
   | import "@react-navigation/native"

   app (require.context)
  ```
- **Blast Radius**:
  Any developer running `npm start`, `npx expo start`, or `npx expo export` in a clean environment will experience an immediate bundler crash during module resolution.
- **Root Cause**:
  In Expo SDK 56 and SDK 57, Metro's multiplatform plugin (`@expo/cli/build/src/start/server/metro/withMetroMultiPlatform.js`) inspects user code (`!filePath.includes('node_modules')`) and throws if it directly imports from `@react-navigation/*`.
  - `app/_layout.tsx` (line 7): `import { ThemeProvider } from '@react-navigation/native';`
  - `src/constants/theme.ts` (line 14): `import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';`
- **Mitigation**:
  According to the official [Expo SDK 56/57 Migration Guide](https://docs.expo.dev/router/migrate/sdk-55-to-56/):
  1. Repoint application imports to `expo-router/react-navigation`:
     - In `app/_layout.tsx`:
       ```tsx
       import { ThemeProvider } from 'expo-router/react-navigation';
       ```
     - In `src/constants/theme.ts`:
       ```tsx
       import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from 'expo-router/react-navigation';
       ```
  2. Alternatively, if `@react-navigation/native` direct imports are temporarily preserved, set `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` in `package.json` scripts. Repointing imports to `expo-router/react-navigation` is strongly recommended as the clean, standard Expo SDK 57 solution.

---

### [Medium] Challenge 2: Missing `react-native-web` with web scripts & config present

- **Assumption Challenged**: `package.json` includes `"web": "expo start --web"`, and `app.json` includes `"web": { "bundler": "metro", "output": "static" }`.
- **Attack Scenario / Empirical Reproduction**:
  Execute web export:
  ```bash
  npx expo export -p web --clear
  ```
  **Observed Output**:
  ```
  CommandError: It looks like you're trying to use web support but don't have the required dependencies installed.
  Install react-native-web@^0.21.2 by running:
  npx expo install react-native-web
  If you're not using web, please ensure you remove the "web" string from the platforms array in the project Expo config.
  ```
- **Blast Radius**:
  Running `npm run web` or building web preview fails immediately.
- **Mitigation**:
  If web is in scope for developer preview, install `react-native-web` and `react-dom`. If web is explicitly out of scope for Milestone 1 native mobile, remove `"web"` from `package.json` scripts and `app.json` platforms to prevent user confusion.

---

### [Low] Challenge 3: Hardcoded `#FFFFFF` in `src/components/HeaderNotificationBell.tsx`

- **Assumption Challenged**: All visual components conform 100% to `DESIGN.md` color tokens.
- **Attack Scenario / Empirical Reproduction**:
  Inspect `src/components/HeaderNotificationBell.tsx` line 55:
  ```tsx
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  ```
  `DESIGN.md` line 30 states:
  > *"Warm parchment white, not pure #FFFFFF — softer on the eyes for long reading sessions"*
- **Blast Radius**:
  Minor visual design inconsistency where pure white `#FFFFFF` is displayed instead of the parchment theme token.
- **Mitigation**:
  Replace `color: '#FFFFFF'` with `color: colors.textPrimary` (or `colors.text.primary` which is `#EDE7DD`).

---

## Stress Test Results

| # | Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---------------|-------------------|-----------------|--------|
| 1 | `npx tsc --noEmit` | Clean compilation with 0 errors | Exited 0, 0 errors | **PASS** |
| 2 | `npx tsc --noEmit --strict` | Clean compilation under strict flags | Exited 0, 0 errors | **PASS** |
| 3 | `npm test -- --coverage` | 100% unit tests pass with coverage | 3 suites, 54 tests passed | **PASS** |
| 4 | `npx expo config` | Valid Expo SDK 57.0.0 JSON output | Valid JSON with sdkVersion 57.0.0 | **PASS** |
| 5 | `npx expo export -p ios --clear` | Clean Metro bundle for iOS | Throws: `expo-router is no longer compatible with react-navigation` | **FAIL** (CRITICAL) |
| 6 | `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1 npx expo export -p ios` | Bundles with env bypass | Generated iOS bundle (2.5MB entry JS) | **PASS** (Workaround) |
| 7 | `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1 npx expo export -p android` | Bundles Android with env bypass | Generated Android bundle (2.8MB entry JS) | **PASS** (Workaround) |
| 8 | `npx expo export -p web --clear` | Clean web bundle | Throws: missing `react-native-web` | **FAIL** (MEDIUM) |
| 9 | Top-level dependencies resolution | All packages in package.json resolvable | 0 missing dependencies | **PASS** |
| 10 | Banned hex codes check (`#0B0B0B`, `#111111`, `#D97757`) | Banned colors completely absent from code | No banned colors in executable code | **PASS** |
| 11 | Component styles drop shadow check | `elevation: 0`, `shadowOpacity: 0` | All cards and sheets have 0 shadow | **PASS** |
| 12 | Middle dot / arrow anti-pattern check | No middle-dot metadata or `→` in labels | 0 violations found | **PASS** |

---

## Unchallenged Areas

- **Firebase Modular v11 SDK Runtime Connections**: Deferred to Milestone 2 per `PROJECT.md`.
- **AsyncStorage Runtime Persistence**: Mocked/deferred to Milestone 2.
- **Verse Ordinal Math & Crossway ESV API**: Deferred to Milestones 3 & 4.

---

## Actionable Next Steps for Worker M1

1. In `app/_layout.tsx`:
   Change:
   ```tsx
   import { ThemeProvider } from '@react-navigation/native';
   ```
   To:
   ```tsx
   import { ThemeProvider } from 'expo-router/react-navigation';
   ```
2. In `src/constants/theme.ts`:
   Change:
   ```tsx
   import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';
   ```
   To:
   ```tsx
   import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from 'expo-router/react-navigation';
   ```
3. In `src/components/HeaderNotificationBell.tsx`:
   Change `color: '#FFFFFF'` to `color: colors.textPrimary`.
4. (Optional/Recommended): In `package.json`, either install `react-native-web` or remove `"web"` script if web export is not part of native scope.
5. Re-run `npx expo export -p ios --clear --no-bytecode` to confirm bundler succeeds without any environment variable bypass.
