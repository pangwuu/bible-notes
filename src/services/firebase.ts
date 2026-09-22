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
