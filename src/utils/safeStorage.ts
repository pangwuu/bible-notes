/**
 * SafeStorage Utility
 * In-memory fallback cache with defensive AsyncStorage resolution.
 * 
 * Guarantees that:
 * 1. Top-level evaluation never throws even if AsyncStorage native module is null at load time.
 * 2. If AsyncStorage fails or throws (missing bridge, quota limit, corrupted storage),
 *    the app falls back seamlessly to memoryStore and operations succeed.
 * 3. All operations (getItem, setItem, removeItem, getAllKeys) are safe against exceptions.
 */

const memoryStore = new Map<string, string>();
let loggedNativeWarning = false;
let resolvedAsyncStorage: any = undefined;

function getNativeStorage(): any {
  if (resolvedAsyncStorage !== undefined) {
    return resolvedAsyncStorage;
  }
  try {
    const mod = require('@react-native-async-storage/async-storage');
    resolvedAsyncStorage = mod?.default || mod;
  } catch (err) {
    resolvedAsyncStorage = null;
    if (!loggedNativeWarning) {
      loggedNativeWarning = true;
      console.warn(
        '[SafeStorage] Could not load native AsyncStorage module; operating in-memory:',
        (err as any)?.message || err
      );
    }
  }
  return resolvedAsyncStorage;
}

function logStorageWarning(operation: string, key: string, error: unknown): void {
  if (!loggedNativeWarning) {
    loggedNativeWarning = true;
    const msg = (error as any)?.message || String(error);
    console.warn(
      `[SafeStorage] AsyncStorage.${operation} failed for "${key}". Falling back to in-memory store. Error: ${msg}`
    );
  }
}

export const safeStorage = {
  /**
   * Retrieves an item from AsyncStorage.
   * If AsyncStorage succeeds, syncs memoryStore and returns the value.
   * If AsyncStorage throws an exception or is null, falls back to memoryStore.
   */
  async getItem(key: string): Promise<string | null> {
    const storage = getNativeStorage();
    if (storage && typeof storage.getItem === 'function') {
      try {
        const val = await storage.getItem(key);
        if (val !== null && val !== undefined) {
          memoryStore.set(key, val);
          return val;
        }
        memoryStore.delete(key);
        return null;
      } catch (err) {
        logStorageWarning('getItem', key, err);
      }
    }
    return memoryStore.get(key) ?? null;
  },

  /**
   * Persists an item to memoryStore immediately and asynchronously synchronizes
   * to AsyncStorage. Does NOT throw if AsyncStorage fails.
   */
  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
    const storage = getNativeStorage();
    if (storage && typeof storage.setItem === 'function') {
      try {
        await storage.setItem(key, value);
      } catch (err) {
        logStorageWarning('setItem', key, err);
      }
    }
  },

  /**
   * Removes an item from both memoryStore and AsyncStorage.
   */
  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);
    const storage = getNativeStorage();
    if (storage && typeof storage.removeItem === 'function') {
      try {
        await storage.removeItem(key);
      } catch (err) {
        logStorageWarning('removeItem', key, err);
      }
    }
  },

  /**
   * Retrieves all keys. If AsyncStorage fails, returns memoryStore keys.
   */
  async getAllKeys(): Promise<readonly string[]> {
    const storage = getNativeStorage();
    if (storage && typeof storage.getAllKeys === 'function') {
      try {
        return await storage.getAllKeys();
      } catch (err) {
        logStorageWarning('getAllKeys', '*', err);
      }
    }
    return Array.from(memoryStore.keys());
  },

  /**
   * Clears both memoryStore and AsyncStorage.
   */
  async clear(): Promise<void> {
    memoryStore.clear();
    const storage = getNativeStorage();
    if (storage && typeof storage.clear === 'function') {
      try {
        await storage.clear();
      } catch (err) {
        logStorageWarning('clear', '*', err);
      }
    }
  },

  /**
   * Resets the in-memory fallback store and resets warning flags (useful in tests).
   */
  _clearMemoryStore(): void {
    memoryStore.clear();
    loggedNativeWarning = false;
    resolvedAsyncStorage = undefined;
  },
};

export default safeStorage;
