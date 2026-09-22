# Firebase Configuration & Client Architecture Report (Milestone 2)

**Role**: Firebase Configuration Explorer  
**Milestone**: M2 — Firebase Client Integration & Authentication  
**Target File**: `src/services/firebase.ts`  
**Firebase SDK Version**: Modular v11 (`firebase@11.10.0`)  
**Storage Driver**: `@react-native-async-storage/async-storage@3.1.1`  
**Target Project**: `bible-notes-sweedish`  
**Date**: 2026-09-22  

---

## 1. Executive Summary

This report establishes the verified, production-grade specification for `src/services/firebase.ts`, integrating the modular Firebase v11 JavaScript SDK with React Native AsyncStorage auth persistence and linking to the live Firebase project `bible-notes-sweedish`.

### Key Technical Findings:
1. **TypeScript Typing Discrepancy for `getReactNativePersistence`**:
   `firebase/auth` bundles its React Native entry point (`@firebase/auth/dist/rn/index.js`), but its default root TypeScript definition (`auth-public.d.ts`) omits `getReactNativePersistence`. Direct imports in strict TypeScript cause `TS2305: Module '"firebase/auth"' has no exported member 'getReactNativePersistence'`.
   - **Resolution**: Provide ambient typing in `src/types/firebase.d.ts` and annotate the import in `firebase.ts` with `// @ts-ignore`.
2. **Node & Jest Environment Divergence (`testEnvironment: 'node'`)**:
   In Node and Jest environments, Node module resolution selects `@firebase/auth/dist/node/index.js` where `getReactNativePersistence` is `undefined`. Directly calling `getReactNativePersistence(AsyncStorage)` in Node/Jest throws `TypeError: getReactNativePersistence is not a function`.
   - **Resolution**: Use runtime defensive feature detection:
     `const persistence = typeof getReactNativePersistence === 'function' ? getReactNativePersistence(AsyncStorage) : undefined;`
     In mobile runtimes (Expo iOS/Android/Web), this evaluates to `true` and enables persistent AsyncStorage auth. In Node/Jest unit testing, it cleanly falls back to default in-memory auth, allowing `npm test` to pass with zero mock requirements just to import `firebase.ts`.
3. **Idempotence & Fast Refresh Safety**:
   In Expo React Native development, Fast Refresh re-executes module code. Calling `initializeApp` or `initializeAuth` more than once throws duplicate app / already initialized errors.
   - **Resolution**: Standard singleton pattern with `getApps().length === 0 ? initializeApp(...) : getApp()` and `try { initializeAuth(...) } catch { getAuth(app) }`.
4. **AsyncStorage v3 Jest Mock Export Path**:
   `@react-native-async-storage/async-storage` v3.1.1 maps `./jest` in `package.json` to `./lib/module/jest/AsyncStorageMock.js`. The legacy mock path `@react-native-async-storage/async-storage/jest/async-storage-mock` fails in v3.1.1. When testing AsyncStorage explicitly in Jest, the correct import path is `require('@react-native-async-storage/async-storage/jest')`.

---

## 2. Live Project Credentials

The project `bible-notes-sweedish` has been verified with the following configuration:

```typescript
export const firebaseConfig = {
  apiKey: "AIzaSyC_sKH5ZPgT0J6ZvvB5isV0KIDi8xBNleE",
  authDomain: "bible-notes-sweedish.firebaseapp.com",
  projectId: "bible-notes-sweedish",
  storageBucket: "bible-notes-sweedish.firebasestorage.app",
  messagingSenderId: "641152478914",
  appId: "1:641152478914:web:d2e49874c858749015955b",
  databaseURL: "https://bible-notes-sweedish-default-rtdb.asia-southeast1.firebasedatabase.app",
};
```

---

## 3. Exact Implementation Specification

### 3.1 Primary File: `src/services/firebase.ts`

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
 * 
 * - In React Native mobile runtimes (iOS, Android, Expo Go), getReactNativePersistence
 *   is defined and wraps AsyncStorage for persistent sessions across app restarts.
 * - In Node/Jest unit test environments, getReactNativePersistence is undefined;
 *   Auth initializes with default in-memory persistence to avoid native module crashes.
 * - If called multiple times (e.g., during Fast Refresh), catches the error and
 *   returns the existing initialized Auth instance via getAuth(app).
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

### 3.2 Companion Type Declaration: `src/types/firebase.d.ts`

To guarantee 100% strict TypeScript compliance (`tsc --noEmit`) and provide IDE auto-complete:

```typescript
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  /**
   * Returns a persistence object that wraps AsyncStorage from
   * `@react-native-async-storage/async-storage` for React Native.
   */
  export function getReactNativePersistence(storage: unknown): Persistence;
}
```

---

## 4. Node & Jest Compatibility Strategy

### 4.1 Native Module Isolation in Unit Tests
In Jest with `testEnvironment: 'node'`, native React Native modules (like TurboModule `RNCAsyncStorage`) are not available in the Node process.
Because `src/services/firebase.ts` guards `getReactNativePersistence`:
- Any unit test can import `src/services/firebase.ts` (or `src/services/authService.ts`) directly without mocking AsyncStorage just to initialize the module.
- `app`, `auth`, and `db` initialize cleanly as legitimate Firebase instances pointing to `bible-notes-sweedish`.

### 4.2 Mocking AsyncStorage for Direct Unit Tests
When testing modules that directly call AsyncStorage methods (such as `src/services/cacheService.ts` or `src/services/bibleApiService.ts`), use the v3.1.1 mock:

```typescript
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest')
);
```

*(Note: Never use the legacy path `@react-native-async-storage/async-storage/jest/async-storage-mock`, as v3.1.1 removed that file from the package export map).*

---

## 5. Verification Test Suite: `tests/unit/firebase.test.ts`

The implementer should add the following unit test to ensure ongoing verification under `npm test`:

```typescript
import { app, auth, db, firebaseConfig } from '../../src/services/firebase';

describe('Firebase Service Initialization', () => {
  test('initializes default Firebase App with bible-notes-sweedish credentials', () => {
    expect(app).toBeDefined();
    expect(app.name).toBe('[DEFAULT]');
    expect(app.options.projectId).toBe('bible-notes-sweedish');
    expect(app.options.apiKey).toBe('AIzaSyC_sKH5ZPgT0J6ZvvB5isV0KIDi8xBNleE');
    expect(app.options.appId).toBe('1:641152478914:web:d2e49874c858749015955b');
  });

  test('initializes Auth instance attached to default App', () => {
    expect(auth).toBeDefined();
    expect(auth.app.name).toBe('[DEFAULT]');
  });

  test('initializes Firestore instance attached to default App', () => {
    expect(db).toBeDefined();
    expect(db.type).toBe('firestore');
    expect(db.app.options.projectId).toBe('bible-notes-sweedish');
  });

  test('firebaseConfig matches live project constants', () => {
    expect(firebaseConfig.projectId).toBe('bible-notes-sweedish');
    expect(firebaseConfig.authDomain).toBe('bible-notes-sweedish.firebaseapp.com');
  });
});
```

---

## 6. Implementation Checklist for Milestone 2

| Step | Action | Path |
|------|--------|------|
| 1 | Create TypeScript ambient declaration | `src/types/firebase.d.ts` |
| 2 | Create Firebase client service | `src/services/firebase.ts` |
| 3 | Create unit test | `tests/unit/firebase.test.ts` |
| 4 | Run type checking | `npm run typecheck` (`tsc --noEmit`) |
| 5 | Run automated tests | `npm test` |
