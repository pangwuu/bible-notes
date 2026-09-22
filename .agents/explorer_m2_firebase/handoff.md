# Handoff Report: M2 Firebase Client & Configuration

**Author**: Firebase Configuration Explorer  
**Milestone**: M2 (Firebase Client & Auth)  
**Target Files**: `src/services/firebase.ts`, `src/types/firebase.d.ts`, `tests/unit/firebase.test.ts`  
**Date**: 2026-09-22  

---

## 1. Observation

1. **Firebase & AsyncStorage Dependency Versions**:
   In `/Users/johnnywu/Desktop/My-small-projects/bible_notes/package.json`:
   - Line 18: `"@react-native-async-storage/async-storage": "^3.1.1"`
   - Line 27: `"firebase": "^11.10.0"`
2. **TypeScript Compilation Error TS2305**:
   Direct import of `getReactNativePersistence` from `'firebase/auth'` produces:
   ```
   error TS2305: Module '"firebase/auth"' has no exported member 'getReactNativePersistence'.
   ```
   Inspection of `node_modules/firebase/node_modules/@firebase/auth/package.json` lines 14-38 showed that `"exports"` maps the root `"."` types to `./dist/auth-public.d.ts`, which omits `getReactNativePersistence`. The definition only exists under `./dist/rn/index.rn.d.ts`.
3. **Node & Jest Environment Runtime Discrepancy**:
   Executing `node -e "const auth = require('firebase/auth'); console.log(typeof auth.getReactNativePersistence);"` returned `undefined`.
   In Jest (`testEnvironment: 'node'` configured in `jest.config.js` line 19), unconditionally calling `getReactNativePersistence(AsyncStorage)` throws:
   ```
   TypeError: (0, _auth.getReactNativePersistence) is not a function
   ```
4. **AsyncStorage v3 Export Structure**:
   Inspection of `node_modules/@react-native-async-storage/async-storage/package.json` lines 14-18 revealed:
   ```json
   "./jest": {
     "source": "./src/jest/AsyncStorageMock.ts",
     "types": "./lib/typescript/jest/AsyncStorageMock.d.ts",
     "default": "./lib/module/jest/AsyncStorageMock.js"
   }
   ```
   Requiring the legacy mock path `@react-native-async-storage/async-storage/jest/async-storage-mock` fails with `Cannot find module`, while `require('@react-native-async-storage/async-storage/jest')` succeeds.
5. **Verified Live Project Credentials**:
   From `PROJECT.md` line 85 and DISPATCH line 18:
   - `projectId`: `'bible-notes-sweedish'`
   - `apiKey`: `'AIzaSyC_sKH5ZPgT0J6ZvvB5isV0KIDi8xBNleE'`
   - `authDomain`: `'bible-notes-sweedish.firebaseapp.com'`
   - `storageBucket`: `'bible-notes-sweedish.firebasestorage.app'`
   - `messagingSenderId`: `'641152478914'`
   - `appId`: `'1:641152478914:web:d2e49874c858749015955b'`
   - `databaseURL`: `'https://bible-notes-sweedish-default-rtdb.asia-southeast1.firebasedatabase.app'`

---

## 2. Logic Chain

1. From **Observation 2**, because `firebase/auth` root type definitions omit `getReactNativePersistence`, importing it directly will cause `npm run typecheck` (`tsc --noEmit`) to fail. Therefore, providing an ambient declaration in `src/types/firebase.d.ts` alongside an inline `// @ts-ignore` in `src/services/firebase.ts` satisfies strict TypeScript type checking while preserving runtime functionality.
2. From **Observation 3**, in Jest's Node environment, `getReactNativePersistence` resolves to `undefined`. If `src/services/firebase.ts` executes `getReactNativePersistence(AsyncStorage)` unconditionally during module evaluation, every test that directly or indirectly imports Firebase will crash before executing.
3. Therefore, implementing runtime feature detection (`typeof getReactNativePersistence === 'function' ? getReactNativePersistence(AsyncStorage) : undefined`) ensures that:
   - On physical devices and Expo simulators (React Native runtime), `getReactNativePersistence` is evaluated and configures AsyncStorage persistence for Auth.
   - In Node/Jest unit testing, `persistence` safely defaults to undefined (in-memory persistence), allowing unit tests to import `firebase.ts` without throwing native module or undefined function errors.
4. From **Observation 4**, if unit tests mock AsyncStorage directly, they must use `require('@react-native-async-storage/async-storage/jest')` to match v3.1.1 package exports.
5. Combining Observations 1, 2, 3, and 5 yields an idempotent, production-ready implementation of `src/services/firebase.ts` that exports `app`, `auth`, and `db`.

---

## 3. Caveats

1. **Firestore Offline Persistence in React Native**: We intentionally initialized Firestore with `getFirestore(app)`. In browser environments, developers often use `persistentLocalCache`, but React Native lacks native IndexedDB support out of the box unless custom SQLite or polyfills are added. `getFirestore(app)` works reliably across both React Native and Jest.
2. **Network Connection During Unit Tests**: Unit tests importing `src/services/firebase.ts` instantiate Firebase client instances configured with project credentials. Pure unit tests should not make live network calls against Firestore or Auth; tests for services (`authService`, `notesService`) should mock Firebase methods (`signInWithEmailAndPassword`, `getDocs`, etc.).

---

## 4. Conclusion

The exact implementation for Milestone 2 is finalized:

### 1. `src/services/firebase.ts`
```typescript
/**
 * Firebase Client Integration for Swedish Method Bible Study App
 * 
 * Target project: bible-notes-sweedish
 * Framework: Expo SDK 57 (React Native 0.86, React 19)
 * SDK: Firebase JS SDK Modular v11
 * Persistence: @react-native-async-storage/async-storage
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is exported by React Native entry point but missing from root public TS types
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyC_sKH5ZPgT0J6ZvvB5isV0KIDi8xBNleE',
  authDomain: 'bible-notes-sweedish.firebaseapp.com',
  projectId: 'bible-notes-sweedish',
  storageBucket: 'bible-notes-sweedish.firebasestorage.app',
  messagingSenderId: '641152478914',
  appId: '1:641152478914:web:d2e49874c858749015955b',
  databaseURL: 'https://bible-notes-sweedish-default-rtdb.asia-southeast1.firebasedatabase.app',
};

// Idempotent App initialization (safe under Fast Refresh & multiple imports)
export const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

/**
 * Idempotent Auth initialization with React Native AsyncStorage persistence.
 */
function createAuth(): Auth {
  try {
    const persistence = typeof getReactNativePersistence === 'function'
      ? getReactNativePersistence(AsyncStorage)
      : undefined;

    return initializeAuth(app, {
      ...(persistence ? { persistence } : {}),
    });
  } catch (_error) {
    return getAuth(app);
  }
}

export const auth: Auth = createAuth();

// Idempotent Cloud Firestore instance
export const db: Firestore = getFirestore(app);

export type { FirebaseApp, Auth, Firestore };
```

### 2. `src/types/firebase.d.ts`
```typescript
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
```

---

## 5. Verification Method

1. **Type Checking Verification**:
   Run:
   ```bash
   npm run typecheck
   ```
   **Expected Result**: Zero TypeScript errors (`tsc --noEmit` exits with 0).
2. **Unit Test Verification**:
   Inspect `tests/unit/firebase.test.ts` (as specified in `report.md`) and run:
   ```bash
   npm test
   ```
   **Expected Result**: All test suites pass, including Firebase initialization tests.
3. **Invalidation Conditions**:
   The specification is invalidated if:
   - Upgrading to Firebase v12 changes the package export structure or `initializeAuth` signature.
   - Upgrading `@react-native-async-storage/async-storage` changes the Jest mock path.
