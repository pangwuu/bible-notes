const mockNativeStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, val: string) => {
    mockNativeStore.set(key, val);
  }),
  getItem: jest.fn(async (key: string) => {
    return mockNativeStore.has(key) ? mockNativeStore.get(key)! : null;
  }),
  removeItem: jest.fn(async (key: string) => {
    mockNativeStore.delete(key);
  }),
  getAllKeys: jest.fn(async () => {
    return Array.from(mockNativeStore.keys());
  }),
  clear: jest.fn(async () => {
    mockNativeStore.clear();
  }),
}));

import safeStorage from '../../src/utils/safeStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('SafeStorage Unit Tests', () => {
  beforeEach(async () => {
    safeStorage._clearMemoryStore();
    mockNativeStore.clear();
    jest.clearAllMocks();
  });

  test('setItem and getItem work normally when AsyncStorage is functional', async () => {
    await safeStorage.setItem('test_key', 'hello_world');
    const val = await safeStorage.getItem('test_key');
    expect(val).toBe('hello_world');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('test_key', 'hello_world');
  });

  test('removeItem removes value from storage and memory', async () => {
    await safeStorage.setItem('key_to_delete', 'value123');
    await safeStorage.removeItem('key_to_delete');
    const val = await safeStorage.getItem('key_to_delete');
    expect(val).toBeNull();
  });

  test('falls back seamlessly to memory store when AsyncStorage.setItem throws Native module null', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error('Native module is null, cannot access legacy storage')
    );

    // Should not throw
    await expect(safeStorage.setItem('offline_key', 'offline_val')).resolves.not.toThrow();

    // Value should still be retrievable from in-memory fallback
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
      new Error('Native module is null, cannot access legacy storage')
    );
    const val = await safeStorage.getItem('offline_key');
    expect(val).toBe('offline_val');
  });

  test('falls back seamlessly to memory store when AsyncStorage.getItem throws', async () => {
    // Populate in memory first
    await safeStorage.setItem('resilient_key', 'resilient_val');

    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
      new Error('Native module is null, cannot access legacy storage')
    );

    const val = await safeStorage.getItem('resilient_key');
    expect(val).toBe('resilient_val');
  });

  test('getAllKeys falls back to in-memory keys when AsyncStorage throws', async () => {
    await safeStorage.setItem('key1', 'val1');
    await safeStorage.setItem('key2', 'val2');

    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(
      new Error('Native module is null, cannot access legacy storage')
    );

    const keys = await safeStorage.getAllKeys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
  });
});
