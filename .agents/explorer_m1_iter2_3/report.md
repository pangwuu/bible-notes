# Expo Export & Build Validation Report (Milestone 1 Iteration 2)

**Explorer**: Explorer 3 (Expo Export & Build Validation)  
**Date**: 2026-09-22T15:20:00Z  
**Target Project**: Swedish Method Bible Study Notes Mobile App (`bible-notes`)  
**Scope**: `app.json` platform configuration, Metro bundler export execution, Jest tests, TypeScript type checking  

---

## Executive Summary

1. **Root Cause 1 (Web Prerequisite Error)**: `app.json` omitted an explicit `platforms` array while containing a `"web"` configuration block. By default, Expo CLI (`@expo/cli` SDK 57) expands `all` export targets to `['ios', 'android', 'web']`. When exporting web without `react-native-web` and `react-dom` installed, `WebSupportProjectPrerequisite` halts execution immediately with code 1.
2. **Root Cause 2 (SDK 56/57 Navigation Check)**: In Expo SDK 56+, `expo-router`'s Metro resolver plugin (`withMetroMultiPlatform.ts`) intercepts any application-level import matching `@react-navigation/*` (specifically in `app/_layout.tsx` and `src/constants/theme.ts`) and aborts bundling unless `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` is set. Attempting to reroute those imports to `expo-router` breaks Jest unit testing due to uncompiled ESM dependencies (`standard-navigation`) and undefined theme mocks.
3. **Validated Solution**:
   - In `app.json`: Add `"platforms": ["ios", "android"]` and remove the obsolete `"web"` block.
   - In `metro.config.js`: Inject `process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';` directly above `getDefaultConfig(__dirname)`.
4. **Verification Results**:
   - `npx expo export -p ios --no-minify`: **PASS** (1,502 modules bundled, Hermes bytecode generated, 55 assets, exit code 0).
   - `npx expo export -p android --no-minify`: **PASS** (1,633 modules bundled, Hermes bytecode generated, 58 assets, exit code 0).
   - Full `npx expo export`: **PASS** (both iOS & Android production bundles created in `dist/`, 66 assets, metadata.json, exit code 0).
   - Unit Tests (`npm test`): **PASS** (3/3 test suites, 54/54 tests passing).
   - Typecheck (`npm run typecheck`): **PASS** (0 errors).

---

## 1. Investigation of `app.json` Platform Settings

### 1.1 Current Configuration vs CLI Behavior
Current `app.json` contains:
```json
    "ios": {
      "supportsTablet": true,
      "userInterfaceStyle": "dark",
      "bundleIdentifier": "com.biblenotes.app"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#1A1816"
      },
      "userInterfaceStyle": "dark",
      "package": "com.biblenotes.app"
    },
    "web": {
      "bundler": "metro",
      "output": "static"
    },
```
Notice the absence of the top-level `"platforms"` key.

In `@expo/config` (`getPlatformsFromConfig.ts`) and `@expo/cli` (`resolveOptions.ts`):
```typescript
const platformsFromConfig = getPlatformsFromConfig(projectRoot, exp);
// Evaluates to: ['ios', 'android', 'web']
```
When running `npx expo export` (which defaults to `-p all`), `resolvePlatformOption` expands `all` against `platformsAvailable`, selecting all three platforms.

In `exportAppAsync.ts`:
```typescript
if (platforms.includes('web')) {
  await new WebSupportProjectPrerequisite(projectRoot).assertAsync();
}
```
Because `react-native-web` is not installed, `@expo/cli` throws:
```
CommandError: It looks like you're trying to use web support but don't have the required dependencies installed.
Install react-native-web@^0.21.2 by running:
npx expo install react-native-web
If you're not using web, please ensure you remove the "web" string from the platforms array in the project Expo config.
```

### 1.2 Comparison of Strategic Options

| Dimension | Option A: Native-Only (`["ios", "android"]`) | Option B: Add Web (`react-native-web`) |
|---|---|---|
| **Authoritative Alignment** | **Strictly aligned.** `ORIGINAL_REQUEST.md` states: *"Build a cross-platform native mobile app for personal Bible study notes..."* and R1 specifies native bottom tab and stack navigation. | Unrequested deviation. Web SSG requires extensive shimming for mobile-first native components. |
| **Dependencies** | **0 new dependencies.** | Requires `react-dom@19.2.3`, `react-native-web@^0.21.2`, and `@expo/metro-runtime`. |
| **React 19 Compatibility** | **100% verified** with `react@19.2.3` and `react-native@0.86.3`. | `react-native-web` has known peer dependency warnings with React 19 canary/latest. |
| **Export Performance** | **Fast**: Only builds iOS & Android Hermes bundles. | Slow: Adds static site generation (SSG) step via `@expo/router-server`. |
| **Maintenance Burden** | Zero additional overhead. | High: Must guard against DOM/window references in future services (Firebase AsyncStorage, SQLite, etc.). |

**Recommendation**: Adopt **Option A**. Add `"platforms": ["ios", "android"]` and remove the `"web"` object from `app.json`.

---

## 2. Investigation of Metro Bundler Navigation Check

### 2.1 Cause Analysis
When testing native export (`npx expo export -p ios --no-minify`), Metro Bundler failed with:
```
Error: As of SDK 56, expo-router is no longer compatible with react-navigation.
For more information, see https://docs.expo.dev/router/migrate/sdk-55-to-56/.
You can disable this check by setting the environment variable EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1.
Import stack:
 app/_layout.tsx
 | import "@react-navigation/native"
 app (require.context)
```

In `@expo/cli/build/src/start/server/metro/withMetroMultiPlatform.js` (lines 590–615):
```javascript
if (!disableReactNavigationCheck) {
    if (isExpoRouterInstalled && moduleName.startsWith('@react-navigation/')) {
        const filePath = context.originModulePath;
        if (!filePath.includes('node_modules')) {
            throw new Error('As of SDK 56, expo-router is no longer compatible with react-navigation...');
        }
    }
}
```
Expo Router SDK 56+ deliberately disallows direct imports from `@react-navigation/*` in application code unless `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` is set.

In the application:
1. `app/_layout.tsx:7`: `import { ThemeProvider } from '@react-navigation/native';`
2. `src/constants/theme.ts:14`: `import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';`

### 2.2 Why Changing Imports to `expo-router` Causes Regressions
We tested replacing `@react-navigation/native` imports with `expo-router`:
```typescript
import { ThemeProvider, DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from 'expo-router';
```
While this satisfies Metro, it **broke the Jest test suite (`npm test`)**:
1. `node_modules/expo-router` pulls in `standard-navigation/lib/src/index.js`, which uses uncompiled ESM `import * as React from 'react'`. Jest threw `SyntaxError: Cannot use import statement outside a module`.
2. In Node unit tests, `DarkTheme` from `expo-router` is not fully initialized (`NavigationDarkTheme.colors` is undefined), causing multiple tests in `theme.test.ts` and `adversarial.test.ts` to crash with `TypeError: Cannot read properties of undefined (reading 'colors')`.

### 2.3 The Optimal Fix
Placing `process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';` inside `metro.config.js`:
- Executes automatically whenever Metro initializes (both in dev `npx expo start` and production `npx expo export`).
- Does not require developers or CI to remember CLI environment variable prefixes.
- Preserves 100% test compatibility and type safety across `app/` and `src/constants/theme.ts`.
- Causes zero regressions to Jest (54/54 tests pass).

---

## 3. Recommended Export Commands & Verification Matrix

| Verification Target | Recommended Command | Expected Result |
|---|---|---|
| **Quick iOS Export (Debug)** | `npx expo export -p ios --no-minify` | Fast compilation, unminified JS / Hermes bundle in `dist/`. Ideal for local bundler smoke tests. |
| **Quick Android Export (Debug)** | `npx expo export -p android --no-minify` | Fast compilation, unminified Android bundle in `dist/`. |
| **Full Production Export (Milestone Gate)** | `npx expo export` | Bundles both iOS and Android in parallel, generates optimized Hermes bytecode (`.hbc`), asset manifest, and `metadata.json`. |
| **Unit Test Suite** | `npm test` | All 3 test suites pass, 54 unit and adversarial tests pass. |
| **TypeScript Typecheck** | `npm run typecheck` | `tsc --noEmit` exits with 0 errors. |

---

## 4. Machine-Applicable Patch

The patch has been written and verified with `git apply --check` at:
`/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_iter2_3/build_export_fix.patch`

```diff
--- a/app.json
+++ b/app.json
@@ -23,10 +23,10 @@
       "userInterfaceStyle": "dark",
       "package": "com.biblenotes.app"
     },
-    "web": {
-      "bundler": "metro",
-      "output": "static"
-    },
+    "platforms": [
+      "ios",
+      "android"
+    ],
     "plugins": [
       "expo-router",
       "expo-font"
--- a/metro.config.js
+++ b/metro.config.js
@@ -1,5 +1,9 @@
 // Learn more https://docs.expo.dev/guides/customizing-metro
 const { getDefaultConfig } = require('expo/metro-config');
+
+// As of SDK 56, expo-router checks for @react-navigation imports unless disabled.
+// ThemeProvider and NavigationDarkTheme are imported for theme integration.
+process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = "1";
 
 /** @type {import('expo/metro-config').MetroConfig} */
 const config = getDefaultConfig(__dirname);
```
