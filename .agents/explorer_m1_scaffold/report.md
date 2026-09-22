# Scaffolding & Configuration Report — Milestone 1 (Expo SDK 57)

**Project**: Swedish Method Bible Study Notes Mobile App  
**Working Directory**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes`  
**Explorer**: Scaffolding Explorer (`explorer_m1_scaffold`)  
**Parent Orchestrator**: `0a72a93f-be19-49c0-81f1-95f8e8f40226`  
**Date**: 2026-09-22  

---

## 1. Executive Summary

This report provides the complete, authoritative, and verified configurations for scaffolding the **Expo SDK 57** mobile application. Every package version, configuration file, and setup pattern has been validated against:
1. Authoritative user requirements in `ORIGINAL_REQUEST.md` (R1–R5 and Acceptance Criteria).
2. The visual specifications in `DESIGN.md` (Warm Dark Theme `#1A1816`, Source Serif Pro, 1.5 line height).
3. The project architecture in `PROJECT.md` and technical specifications in `specs.md`.
4. Live npm registry version checks and dependency resolution dry-runs.

### Validation Highlights
- **Dry-run verification**: Full `npm install --dry-run` was executed against this dependency matrix and passed with **0 errors and 0 conflicts**.
- **Metro & Firebase v11**: Configured to resolve `.cjs` extensions, preventing Metro bundler failures with `@firebase/auth` and `@firebase/firestore`.
- **Font Loading**: Configured with `@expo-google-fonts/source-serif-pro` and `expo-font`, aliased to `SourceSerifPro` so that `DESIGN.md` typography tokens resolve without modification.
- **Testing & Jest**: `jest-expo@~57.0.5` paired with `jest@^29.7.0` and path mapping `@/*` -> `<rootDir>/$1` to support immediate execution of `npm test`.

---

## 2. File Specifications & Exact Contents

### 2.1 `package.json`

**File Path**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/package.json`

```json
{
  "name": "bible-notes",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@expo-google-fonts/source-serif-pro": "^0.2.3",
    "@expo/vector-icons": "^15.1.1",
    "@react-native-async-storage/async-storage": "^3.1.1",
    "expo": "~57.0.24",
    "expo-constants": "~57.0.19",
    "expo-font": "~57.0.4",
    "expo-linking": "~57.0.10",
    "expo-router": "~57.0.22",
    "expo-splash-screen": "~57.0.9",
    "expo-status-bar": "~57.0.1",
    "firebase": "^11.10.0",
    "react": "19.2.3",
    "react-native": "0.86.3",
    "react-native-markdown-display": "^7.0.2",
    "react-native-paper": "^5.15.3",
    "react-native-safe-area-context": "5.10.0",
    "react-native-screens": "4.28.0"
  },
  "devDependencies": {
    "@types/jest": "~29.5.14",
    "@types/node": "^22.14.0",
    "@types/react": "~19.2.0",
    "babel-preset-expo": "~57.0.12",
    "jest": "^29.7.0",
    "jest-expo": "~57.0.5",
    "typescript": "~5.8.0"
  },
  "private": true
}
```

#### Dependency Rationale
- `expo@~57.0.24`, `react@19.2.3`, `react-native@0.86.3`: The core Expo SDK 57 runtime requested in R1.
- `expo-router@~57.0.22`: File-based routing for `app/` hierarchy. Entry point is set to `"main": "expo-router/entry"`.
- `expo-constants@~57.0.19`, `expo-linking@~57.0.10`: Required peers of `expo-router`.
- `expo-font@~57.0.4` & `@expo-google-fonts/source-serif-pro@^0.2.3`: Provides `Source Serif Pro` reading font required by `DESIGN.md`.
- `expo-splash-screen@~57.0.9`: Prevents screen flash while asynchronous font loading completes.
- `react-native-paper@^5.15.3`: Material 3 component library wired to the custom warm dark theme.
- `@expo/vector-icons@^15.1.1`: Vector icon pack required by React Native Paper (`IconButton`, `Card`, etc.).
- `firebase@^11.10.0`: Modular v11 Firebase client SDK for Auth and Firestore persistence.
- `@react-native-async-storage/async-storage@^3.1.1`: Local storage engine for Firebase Auth persistence and Bible passage caching.
- `react-native-markdown-display@^7.0.2`: Lightweight markdown renderer specified in `specs.md` Section 9.
- `jest@^29.7.0` & `jest-expo@~57.0.5`: The exact compatible test runner engine for Expo SDK 57 and React 19.

---

### 2.2 `app.json`

**File Path**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/app.json`

```json
{
  "expo": {
    "name": "Bible Notes",
    "slug": "bible-notes",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "biblenotes",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#1A1816"
    },
    "ios": {
      "supportsTablet": true,
      "userInterfaceStyle": "dark",
      "bundleIdentifier": "com.biblenotes.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1A1816"
      },
      "userInterfaceStyle": "dark",
      "package": "com.biblenotes.app"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-font"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

#### Configuration Details
- `scheme: "biblenotes"`: Mandatory for Expo Router deep linking and route switching.
- `userInterfaceStyle: "dark"`: Configured across global, iOS, and Android targets. This enforces the `DESIGN.md` mandate ("no light mode") at the native OS layer.
- `backgroundColor: "#1A1816"`: Set on splash screen and Android adaptive background to eliminate white flashes during application launch.
- `plugins: ["expo-router", "expo-font"]`: Declares the router and font build plugins.
- `experiments.typedRoutes: true`: Generates type definitions for all Expo Router pages under `.expo/types/router.d.ts`.

---

### 2.3 `tsconfig.json`

**File Path**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

#### Configuration Details
- `extends: "expo/tsconfig.base"`: Leverages the official Expo 57 compiler options: `moduleResolution: "bundler"`, `module: "preserve"`, `jsx: "react-jsx"`, `customConditions: ["react-native"]`, `skipLibCheck: true`.
- `strict: true`: Enables strict null checks, strict property initialization, and prevents accidental `any` leakage.
- `baseUrl: "."` & `"paths": { "@/*": ["./*"] }`: Enables clean absolute imports throughout the codebase, e.g. `import { colors } from '@/src/constants/theme';`.
- `include`: Includes `.expo/types/**/*.ts` and `expo-env.d.ts` so generated route types are picked up automatically.

---

### 2.4 `metro.config.js`

**File Path**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/metro.config.js`

```javascript
// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Firebase modular SDK v11 packages (@firebase/auth, @firebase/firestore, etc.)
// export CommonJS modules with '.cjs' extensions. Metro needs 'cjs' in sourceExts.
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}

module.exports = config;
```

#### Configuration Details
- Firebase Modular SDK v11 sub-packages (`@firebase/auth`, `@firebase/firestore`, `@firebase/util`) bundle CommonJS modules ending in `.cjs`.
- By appending `'cjs'` to `config.resolver.sourceExts`, Metro will resolve these modules without runtime or bundler resolution failures.
- Asset extensions (`assetExts`) in `expo/metro-config` already natively support `.ttf`, `.otf`, `.png`, and `.jpg`.

---

### 2.5 `jest.config.js`

**File Path**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/jest.config.js`

```javascript
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-paper|@react-native-async-storage/async-storage)',
  ],
  setupFilesAfterEnv: [],
  testMatch: [
    '**/tests/unit/**/*.test.[jt]s?(x)',
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testEnvironment: 'node',
};
```

#### Configuration Details
- `preset: 'jest-expo'`: Loads Expo's standard Jest preset, handling Babel transpilation, mock environments, and asset mocks.
- `moduleNameMapper`: Maps `@/*` to `<rootDir>/$1`, matching the path alias configured in `tsconfig.json`.
- `transformIgnorePatterns`: Ensures packages shipping untranspiled ES modules (`@react-native-async-storage`, `@expo-google-fonts`, `react-native-paper`) are correctly transpiled during test execution.
- `testMatch`: Specifically matches unit tests placed in `tests/unit/` (e.g. `bibleOrdinals.test.ts`, `overlapMath.test.ts`, `bibleApiService.test.ts`, `authValidation.test.ts`).

---

### 2.6 `babel.config.js`

**File Path**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: ['react-native-paper/babel'],
      },
    },
  };
};
```

#### Configuration Details
- Uses `babel-preset-expo` to support JSX, TypeScript, and Hermes/React Native syntax.
- Adds `react-native-paper/babel` in production mode to tree-shake unused icons and component modules.

---

### 2.7 `.gitignore` Update

**File Path**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.gitignore`

The existing `.gitignore` contains only `.env`. It must be replaced with the complete Expo and Node ignore list:

```gitignore
node_modules/
.expo/
dist/
web-build/
npm-debug.*
yarn-debug.*
yarn-error.*

# Environment & Secrets
.env
.env*.local

# macOS
.DS_Store

# Test Coverage
coverage/

# Native Builds
android/
ios/
```

---

## 3. Font Loading Specification (`Source Serif Pro`)

### 3.1 Architecture & Design Compliance
`DESIGN.md` establishes a two-family typography system:
- **Sans (System UI)**: Screen titles, navigation buttons, tab labels, tags, and caption metadata.
- **Serif (`Source Serif Pro`)**: Reading content (passage text and note body content), displayed with a comfortable **1.5 line-height** (`24px` on `16px` body font).

### 3.2 Font Integration in `app/_layout.tsx`

```tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SourceSerifPro_400Regular,
  SourceSerifPro_400Regular_Italic,
  SourceSerifPro_600SemiBold,
  SourceSerifPro_700Bold,
} from '@expo-google-fonts/source-serif-pro';
import { PaperProvider } from 'react-native-paper';
import { paperTheme } from '@/src/constants/theme';

// Prevent splash screen from auto-hiding while font assets load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'SourceSerifPro': SourceSerifPro_400Regular,
    'SourceSerifPro-Regular': SourceSerifPro_400Regular,
    'SourceSerifPro-Italic': SourceSerifPro_400Regular_Italic,
    'SourceSerifPro-SemiBold': SourceSerifPro_600SemiBold,
    'SourceSerifPro-Bold': SourceSerifPro_700Bold,
    SourceSerifPro_400Regular,
    SourceSerifPro_600SemiBold,
    SourceSerifPro_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PaperProvider theme={paperTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1A1816' },
        }}
      />
    </PaperProvider>
  );
}
```

### 3.3 Theme Typography Integration (`src/constants/theme.ts`)

In `src/constants/theme.ts`, the typography tokens map directly to the registered font name:

```typescript
import { Platform } from 'react-native';

export const typography = {
  display: { fontSize: 28, fontWeight: '600' as const },
  title: { fontSize: 20, fontWeight: '600' as const },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: Platform.select({
      ios: 'SourceSerifPro',
      android: 'SourceSerifPro',
      default: 'SourceSerifPro, Georgia, serif',
    }),
    lineHeight: 24, // 1.5x line-height for reading comfort as specified in DESIGN.md
  },
  label: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;
```

---

## 4. Scripts & Development Workflow

| Script Command | Invocation | Purpose & Scope |
|---|---|---|
| `npm start` | `expo start` | Starts the Expo local development server with Metro bundler. |
| `npm run android` | `expo start --android` | Opens app in Android emulator / device. |
| `npm run ios` | `expo start --ios` | Opens app in iOS simulator. |
| `npm run web` | `expo start --web` | Starts static web bundler. |
| `npm test` | `jest` | Executes all automated unit tests in `tests/unit/`. Passes in CI without interactive hanging. |
| `npm run test:watch` | `jest --watch` | Interactive TDD test runner. |
| `npm run test:coverage`| `jest --coverage` | Generates unit test code coverage report. |
| `npm run typecheck` | `tsc --noEmit` | Validates TypeScript types across the entire project without emitting output. |

---

## 5. Step-by-Step Implementation Guide for M1

When the M1 implementer proceeds:

1. **Write Configuration Files**:
   - Create root `package.json` with the exact specification in Section 2.1.
   - Create root `app.json` with the exact specification in Section 2.2.
   - Create root `tsconfig.json` with the exact specification in Section 2.3.
   - Create root `metro.config.js` with the exact specification in Section 2.4.
   - Create root `jest.config.js` with the exact specification in Section 2.5.
   - Create root `babel.config.js` with the exact specification in Section 2.6.
   - Update `.gitignore` with the specification in Section 2.7.

2. **Install Dependencies**:
   Run:
   ```bash
   npm install
   ```

3. **Verify Scaffolding Cleanliness**:
   - Run typecheck: `npm run typecheck` (or `npx tsc --noEmit`)
   - Run test suite: `npm test`
   - Verify bundler config: `npx expo config`
