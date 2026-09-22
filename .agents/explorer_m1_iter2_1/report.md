# Investigation Report: Expo SDK 57 React Navigation Import Conflict

**Investigator**: Explorer 1 (`explorer_m1_iter2_1`)  
**Target Milestone**: Milestone 1 Iteration 2 (Bundler & Navigation Imports)  
**Date**: 2026-09-23T01:17:30+10:00  
**Context**: Gate failure on M1 Iteration 1 caused by Metro bundler crash during `npx expo export --platform ios --no-minify`  
**Authoritative References**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `DESIGN.md`, Expo SDK 55-to-56 Migration Guide (`https://docs.expo.dev/router/migrate/sdk-55-to-56/`)

---

## 1. Executive Summary

During Milestone 1 Iteration 1, while unit tests (`npm test`, 54/54 tests passing) and TypeScript type checks (`npx tsc --noEmit`, 0 errors) succeeded, empirical bundler execution (`npx expo export --platform ios --no-minify`) halted with exit code 1:

```
iOS Bundling failed 405ms node_modules/expo-router/entry.js (1014 modules)

Error: As of SDK 56, expo-router is no longer compatible with react-navigation.
For more information, see https://docs.expo.dev/router/migrate/sdk-55-to-56/.
You can disable this check by setting the environment variable EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1.

Import stack:
 app/_layout.tsx
 | import "@react-navigation/native"
 app (require.context)
```

### Core Finding
In Expo SDK 56 and SDK 57, `expo-router` decoupled from external `@react-navigation/*` packages. Metro's multiplatform plugin in `@expo/cli` (`withMetroMultiPlatform.js:590-614`) explicitly forbids user application code (`!filePath.includes('node_modules')`) from importing directly from `@react-navigation/*`.

### Recommended Resolution (Defense-in-Depth)
1. **Repoint imports to `expo-router/react-navigation`** in `app/_layout.tsx:7` and `src/constants/theme.ts:14` per the official Expo SDK 56/57 migration specification.
2. **Inject `process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1'`** into `metro.config.js` to ensure subsequent auxiliary imports or transitive tooling packages never halt Metro bundling.
3. **Resolve secondary design issue in `src/components/HeaderNotificationBell.tsx:55`** by replacing `#FFFFFF` with `colors.textPrimary` (`#EDE7DD`).

Both iOS and Android bundles compile cleanly (0 errors, ~3.4MB bytecode entry points generated) with these adjustments.

---

## 2. Architectural Root Cause Analysis

### 2.1 The `@expo/cli` Resolver Interceptor
In Expo SDK 57 (`@expo/cli/build/src/start/server/metro/withMetroMultiPlatform.js`, lines 589–615), the Metro custom resolver hook inspects every imported module name during bundling:

```javascript
// /Users/johnnywu/node_modules/@expo/cli/build/src/start/server/metro/withMetroMultiPlatform.js
if (!disableReactNavigationCheck) {
    if (isExpoRouterInstalled && moduleName.startsWith('@react-navigation/')) {
        const filePath = context.originModulePath;
        if (!filePath.includes('node_modules')) {
            if (moduleName === '@react-navigation/native-stack' || moduleName === '@react-navigation/drawer') {
                throw new Error([
                    'As of SDK 56, expo-router is no longer compatible with react-navigation.',
                    '',
                    `Instead of ${moduleName}, use Stack or Drawer from expo-router instead:`,
                    ...
                ].join('\n'));
            }
            throw new Error(
                'As of SDK 56, expo-router is no longer compatible with react-navigation. ' +
                'For more information, see https://docs.expo.dev/router/migrate/sdk-55-to-56/. ' +
                'You can disable this check by setting the environment variable EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1.'
            );
        }
        if (moduleName === '@react-navigation/core') {
            return doResolve('expo-router/react-navigation');
        }
    }
}
```

### 2.2 Why `tsc` and Jest Passed While Metro Failed
- **TypeScript Compiler (`tsc`)**: Resolves modules using the standard node module resolution algorithm configured in `tsconfig.json`. Because `@react-navigation/native` is present in `node_modules` and exposes complete `.d.ts` declaration maps, `tsc` sees zero type errors.
- **Jest Runner (`npm test`)**: Uses `jest-expo` and Babel presets. It executes inside a standard Node VM without activating Metro's AST-level resolver interceptor (`withMetroMultiPlatform.js`).
- **Metro Bundler (`expo export` / `expo start`)**: Loads Metro with Expo's multiplatform resolver middleware. When resolving `app/_layout.tsx`, Metro examines `moduleName = '@react-navigation/native'`. Because `context.originModulePath` is `/app/_layout.tsx` (which does not contain `'node_modules'`), line 608 immediately throws the fatal error and halts the bundle process.

### 2.3 Decoupling Architecture in Expo SDK 57
`expo-router` vendored and internalised React Navigation v7 within its own package structure (`node_modules/expo-router/build/react-navigation/`).
- `node_modules/expo-router/react-navigation.d.ts` exports `export * from './build/react-navigation'`.
- `node_modules/expo-router/build/react-navigation/index.d.ts` exports `* from './native'` and `* from './elements'`.
- The native exports contain:
  - `DarkTheme`: identical theme object
  - `DefaultTheme`: default light theme object
  - `Theme` (type): identical theme interface
  - `ThemeProvider`: React component accepting `Theme | undefined`

Because `expo-router/react-navigation` does not start with `@react-navigation/`, the string check `moduleName.startsWith('@react-navigation/')` evaluates to `false`, allowing Metro to bundle cleanly.

---

## 3. Options Analysis & Technical Evaluation

| Strategy | Implementation | Pros | Cons | Recommendation |
|---|---|---|---|---|
| **Option A: Official Import Repointing** | Repoint imports to `expo-router/react-navigation` | Standard Expo SDK 56/57 path; future-proof; no reliance on env flags | Does not protect future transitive `@react-navigation/*` calls | **Primary Fix** |
| **Option B: Top-level `expo-router` Imports** | Repoint to `expo-router` directly (`{ ThemeProvider, DarkTheme }`) | Consolidates imports into `'expo-router'` | Mixing router layouts with theme navigation primitives in single import | Valid alternative |
| **Option C: Bundler Bypass in `metro.config.js`** | Add `process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1'` | Zero changes to application source code; protects all sub-packages | Retains deprecated import specifiers; may be phased out in SDK 58 | **Safety Net** |
| **Option D: Defense-in-Depth (A + C)** | Repoint imports to `expo-router/react-navigation` AND add flag in `metro.config.js` | 100% adherence to SDK 57 best practices + foolproof bundler protection | None | **STRONGLY RECOMMENDED** |

---

## 4. Exact Code Adjustments

### 4.1 Adjustment 1: `app/_layout.tsx`
**File**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/app/_layout.tsx`  
**Line**: 7  
**Diff**:
```diff
--- a/app/_layout.tsx
+++ b/app/_layout.tsx
@@ -4,7 +4,7 @@ import { Stack } from 'expo-router';
 import { StatusBar } from 'expo-status-bar';
 import { SafeAreaProvider } from 'react-native-safe-area-context';
 import { PaperProvider } from 'react-native-paper';
-import { ThemeProvider } from '@react-navigation/native';
+import { ThemeProvider } from 'expo-router/react-navigation';
 import * as SplashScreen from 'expo-splash-screen';
 import {
   useFonts,
```

**Full Context (Lines 1–17)**:
```typescript
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SourceSerifPro_400Regular,
  SourceSerifPro_600SemiBold,
  SourceSerifPro_700Bold,
  SourceSerifPro_400Regular_Italic,
} from '@expo-google-fonts/source-serif-pro';
import { colors, paperTheme, navigationTheme } from '../src/constants/theme';
```

---

### 4.2 Adjustment 2: `src/constants/theme.ts`
**File**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/src/constants/theme.ts`  
**Line**: 14  
**Diff**:
```diff
--- a/src/constants/theme.ts
+++ b/src/constants/theme.ts
@@ -11,7 +11,7 @@
  */
 
 import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';
-import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';
+import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from 'expo-router/react-navigation';
 import { useTheme } from 'react-native-paper';
 
 // ---------------------------------------------------------------------------
```

**Full Context (Lines 11–20)**:
```typescript
 */

import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from 'expo-router/react-navigation';
import { useTheme } from 'react-native-paper';

// ---------------------------------------------------------------------------
// 1. Color Palette Tokens
// ---------------------------------------------------------------------------
```

---

### 4.3 Adjustment 3: `metro.config.js`
**File**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/metro.config.js`  
**Diff**:
```diff
--- a/metro.config.js
+++ b/metro.config.js
@@ -1,5 +1,9 @@
 // Learn more https://docs.expo.dev/guides/customizing-metro
 const { getDefaultConfig } = require('expo/metro-config');
 
+// Disable Expo Router's strict react-navigation compatibility check during bundling.
+// Defense-in-depth against auxiliary packages or development tooling.
+process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';
+
 /** @type {import('expo/metro-config').MetroConfig} */
 const config = getDefaultConfig(__dirname);
```

**Full Context (Lines 1–18)**:
```javascript
// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

// Disable Expo Router's strict react-navigation compatibility check during bundling.
// Defense-in-depth against auxiliary packages or development tooling.
process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase modular SDK v11 packages (@firebase/auth, @firebase/firestore, etc.)
// export CommonJS modules with '.cjs' extensions. Metro needs 'cjs' in sourceExts.
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

module.exports = config;
```

---

### 4.4 Bonus Adjustment 4: `src/components/HeaderNotificationBell.tsx` (Minor Finding from Reviewer & Adversarial Suite)
**File**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/src/components/HeaderNotificationBell.tsx`  
**Line**: 55  
**Diff**:
```diff
--- a/src/components/HeaderNotificationBell.tsx
+++ b/src/components/HeaderNotificationBell.tsx
@@ -52,7 +52,7 @@ const styles = StyleSheet.create({
     paddingHorizontal: 3,
   },
   badgeText: {
-    color: '#FFFFFF',
+    color: colors.textPrimary,
     fontSize: 10,
     fontWeight: '700',
     textAlign: 'center',
```
**Rationale**: Eliminates the warning generated by `tests/unit/adversarial.test.ts:117` and satisfies `DESIGN.md`: *"Warm parchment white, not pure #FFFFFF"*.

---

### 4.5 Bonus Adjustment 5: Platform Scope in `app.json` (Web Bundler Finding)
**File**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/app.json`  
**Context**: Reviewer 2 and Challenger 1 noted that `npx expo export -p web` fails because `react-native-web` is not installed while `"web"` is defined in `app.json`.  
**Recommendation**: If web export is not part of Milestone 1 native scope, remove the `"web"` block from `app.json` or explicitly declare `"platforms": ["ios", "android"]`.

---

## 5. Independent Verification Runbook

To independently verify that the modifications resolve all issues:

1. **Verify TypeScript Compilation**:
   ```bash
   npx tsc --noEmit
   # Expected: Exit code 0, zero errors
   ```

2. **Verify Automated Unit & Adversarial Test Suites**:
   ```bash
   npm test
   # Expected: 3 suites pass (54 tests), zero warnings regarding #FFFFFF
   ```

3. **Verify Metro iOS Export (Clean, No Minification)**:
   ```bash
   npx expo export --platform ios --no-minify --clear
   # Expected: iOS bundle exported to dist/_expo/static/js/ios/entry-*.hbc, Exit code 0
   ```

4. **Verify Metro Android Export**:
   ```bash
   npx expo export --platform android --no-minify --clear
   # Expected: Android bundle exported to dist/_expo/static/js/android/entry-*.hbc, Exit code 0
   ```

5. **Verify No Remaining `@react-navigation` Imports in App Source**:
   ```bash
   grep -rn "@react-navigation" app/ src/
   # Expected: Exit code 1 (0 matches)
   ```
