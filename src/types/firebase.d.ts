import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  /**
   * Returns a persistence object that wraps AsyncStorage from
   * `@react-native-async-storage/async-storage` for React Native.
   */
  export function getReactNativePersistence(storage: unknown): Persistence;
}
