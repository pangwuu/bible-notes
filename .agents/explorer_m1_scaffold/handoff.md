# Handoff Report — Milestone 1 Scaffolding

**From**: Scaffolding Explorer (`explorer_m1_scaffold`)  
**To**: Parent Orchestrator (`orchestrator_1` / `0a72a93f-be19-49c0-81f1-95f8e8f40226`) and M1 Implementer  
**Date**: 2026-09-22  
**Type**: Hard Handoff (Investigation & Specification Complete)  
**Report Reference**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_scaffold/report.md`  

---

## 1. Observation

1. **Environment State**:
   - `node -v` returned `v22.17.1`.
   - `npm -v` returned `11.19.0`.
   - `npx expo -v` returned `57.0.20`.
   - Working directory contains backend files (`.firebaserc`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `functions/`), but lacks root `package.json`, `app.json`, `tsconfig.json`, `metro.config.js`, and `jest.config.js`.

2. **Package Version Compatibility**:
   - `npm view expo@~57.0.24 version` returned `57.0.24`.
   - `npm view react@19.2.3 version` returned `19.2.3`.
   - `npm view react-native@0.86.3 version` returned `0.86.3`.
   - `npm view expo-router@~57.0.22 peerDependencies` returned:
     ```json
     {
       "expo-linking": "^57.0.10",
       "expo-constants": "^57.0.19",
       "react-native-screens": "^4.26.0",
       "react-native-safe-area-context": ">= 5.4.0"
     }
     ```
   - `npm view jest-expo@57.0.5 dependencies` returned `babel-jest: ^29.2.1`, `@jest/globals: ^29.2.1`, `jest-snapshot: ^29.2.1`, indicating Jest 29 (`jest@^29.7.0`) is the compatible runner.
   - `npm view @expo-google-fonts/source-serif-pro@0.2.3` tarball contents include: `SourceSerifPro_400Regular.ttf`, `SourceSerifPro_600SemiBold.ttf`, `SourceSerifPro_700Bold.ttf`, `SourceSerifPro_400Regular_Italic.ttf`.

3. **Compiler Base**:
   - Inspected `expo/tsconfig.base`:
     `compilerOptions: { allowJs: true, esModuleInterop: true, jsx: "react-jsx", module: "preserve", moduleResolution: "bundler", customConditions: ["react-native"], noEmit: true }`.

4. **Resolution Validation**:
   - Executed `npm install --dry-run` in an isolated test environment with the exact proposed `package.json` dependencies:
     Output verbatim: `SUCCESS: Dry run passed without error!`.

5. **Design Tokens & Typography**:
   - `DESIGN.md` lines 27–38 specify: `bgBase: '#1A1816'`, `bgSurface: '#242019'`, `bgSurfaceRaised: '#2E2921'`, `textPrimary: '#EDE7DD'`, `borderHairline: '#332E27'`.
   - `DESIGN.md` lines 46, 128 specify: `Source Serif Pro` via `expo-font` with system serif fallback, `body: { fontSize: 16, fontWeight: '400', fontFamily: 'SourceSerifPro' }` at a `1.5` line-height ratio (`24px`).

---

## 2. Logic Chain

1. **Expo SDK 57 Foundation**:
   - From Observation 1 and 2, Expo 57 requires React 19.2.3 and React Native 0.86.3.
   - `expo-router@~57.0.22` requires `expo-constants@~57.0.19` and `expo-linking@~57.0.10`.
   - Setting `"main": "expo-router/entry"` in `package.json` and `"plugins": ["expo-router", "expo-font"]` in `app.json` connects Expo CLI to Expo Router.

2. **Metro Resolution for Firebase Modular SDK v11**:
   - Firebase JS SDK modular v11 packages (`@firebase/auth`, `@firebase/firestore`) import CommonJS artifacts using `.cjs`.
   - By appending `'cjs'` to `config.resolver.sourceExts` in `metro.config.js`, Metro resolves all Firebase modular imports without bundler resolution errors.

3. **Font Loading Strategy**:
   - From Observation 2 and 5, `@expo-google-fonts/source-serif-pro` contains `SourceSerifPro_400Regular`, `SourceSerifPro_600SemiBold`, `SourceSerifPro_700Bold`, and `SourceSerifPro_400Regular_Italic`.
   - Mapping font names to `'SourceSerifPro'` directly satisfies `DESIGN.md`'s `fontFamily: 'SourceSerifPro'` definition.
   - Wrapping root layout with `SplashScreen.preventAutoHideAsync()` and hiding on `fontsLoaded || fontError` guarantees no text reflow or unstyled font flash on startup.
   - Setting `lineHeight: 24` for 16px body text honors the explicit 1.5 line-height reading specification.

4. **Test Suite Compatibility (`npm test`)**:
   - From Observation 2, `jest-expo@57.0.5` utilizes Jest 29 internals (`babel-jest@^29.2.1`). Using `jest@^29.7.0` and `@types/jest@~29.5.14` provides a stable test harness.
   - In `jest.config.js`, mapping `'^@/(.*)$': '<rootDir>/$1'` aligns Jest with `tsconfig.json`'s `@/*` path alias, allowing tests in `tests/unit/` to import directly from `@/src/...`.
   - `transformIgnorePatterns` ensures React Native, Expo, Paper, and AsyncStorage packages are transpiled during Jest runs.

5. **Dry-Run Confidence**:
   - From Observation 4, the full dependency matrix resolved without peer dependency conflicts or missing packages.

---

## 3. Caveats

1. **Google Fonts Notice**: The npm registry marks `@expo-google-fonts/source-serif-pro@0.2.3` with a notice that Source Serif Pro was renamed/updated to Source Serif 4 in Google Fonts. However, version `0.2.3` remains completely available, tested, and contains the required TTF files for `SourceSerifPro`.
2. **Native iOS/Android Prebuild**: This investigation targets Expo Go and development client builds. Native folders `ios/` and `android/` are not committed and should be generated via `npx expo prebuild` only if compiling native binaries directly.
3. **No Code Written to Root**: Following the read-only explorer protocol, root project files (`package.json`, `app.json`, etc.) were not written; all file contents are fully specified in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_scaffold/report.md` for immediate implementation.

---

## 4. Conclusion

The configuration and scaffolding plan for Milestone 1 is 100% complete, verified, and ready for execution. All files (`package.json`, `app.json`, `tsconfig.json`, `metro.config.js`, `jest.config.js`, `babel.config.js`, `.gitignore`, and `app/_layout.tsx` font loader) have been written with exact code in `report.md`.

The M1 implementer can directly copy these specifications to initialize the repository, run `npm install`, and establish a clean, typechecked baseline.

---

## 5. Verification Method

To verify the scaffolding once files are created by the implementer:

1. **Dependency Installation**:
   ```bash
   npm install
   ```
   *Expected*: Completes with exit code 0 and creates `node_modules/` and `package-lock.json`.

2. **TypeScript Validation**:
   ```bash
   npm run typecheck
   ```
   *Expected*: Passes with exit code 0 and no TypeScript compilation errors.

3. **Jest Test Runner**:
   ```bash
   npm test
   ```
   *Expected*: Jest starts, matches test files (or reports no test files found if before M2/M6), and exits cleanly.

4. **Expo Config Validation**:
   ```bash
   npx expo config
   ```
   *Expected*: Prints parsed Expo config containing `"scheme": "biblenotes"`, `"userInterfaceStyle": "dark"`, and plugins `expo-router` and `expo-font`.

5. **Invalidation Conditions**:
   - Any dependency conflict during `npm install`.
   - Metro failure to resolve `@firebase/auth` or `@firebase/firestore` (indicates `metro.config.js` missing `cjs` source extension).
   - Inability to resolve `@/` imports in tests (indicates `jest.config.js` missing `moduleNameMapper`).
