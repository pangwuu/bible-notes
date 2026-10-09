/**
 * Unit Test for AuthContext enable_friends precedence resolution.
 * Verifies that settings.enable_friends takes precedence over root enable_friends,
 * defaults to true, and synchronizes across both normalized profile fields.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';

let mockCurrentDocData: any = null;

const mockFirebaseUser = {
  uid: 'user_precedence_1',
  email: 'test@bible.org',
  displayName: 'Tester',
};

jest.mock('../../src/services/firebase', () => ({
  auth: { currentUser: mockFirebaseUser },
  db: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth, callback) => {
    callback(mockFirebaseUser);
    return jest.fn();
  }),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'user_precedence_1' })),
  onSnapshot: jest.fn((_docRef, onNext) => {
    onNext({
      exists: () => true,
      data: () => mockCurrentDocData,
    });
    return jest.fn();
  }),
  getDoc: jest.fn(),
}));

describe('AuthContext enable_friends precedence resolution', () => {
  test('prioritizes settings.enable_friends (false) over root enable_friends (true)', async () => {
    mockCurrentDocData = {
      email: 'test@bible.org',
      username: 'tester',
      display_name: 'Tester',
      enable_friends: true,
      settings: {
        enable_friends: false,
      },
    };

    const { result } = await renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.profile?.enable_friends).toBe(false);
    expect(result.current.profile?.settings?.enable_friends).toBe(false);
  });

  test('prioritizes settings.enable_friends (true) over root enable_friends (false)', async () => {
    mockCurrentDocData = {
      email: 'test@bible.org',
      username: 'tester',
      display_name: 'Tester',
      enable_friends: false,
      settings: {
        enable_friends: true,
      },
    };

    const { result } = await renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.profile?.enable_friends).toBe(true);
    expect(result.current.profile?.settings?.enable_friends).toBe(true);
  });

  test('defaults to true when neither settings nor root enable_friends is defined', async () => {
    mockCurrentDocData = {
      email: 'test@bible.org',
      username: 'tester',
      display_name: 'Tester',
      settings: {},
    };

    const { result } = await renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.profile?.enable_friends).toBe(true);
    expect(result.current.profile?.settings?.enable_friends).toBe(true);
  });

  test('falls back to root enable_friends (false) when settings.enable_friends is undefined', async () => {
    mockCurrentDocData = {
      email: 'test@bible.org',
      username: 'tester',
      display_name: 'Tester',
      enable_friends: false,
      settings: {},
    };

    const { result } = await renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.profile?.enable_friends).toBe(false);
    expect(result.current.profile?.settings?.enable_friends).toBe(false);
  });

  test('falls back to root enable_friends (true) when settings.enable_friends is undefined', async () => {
    mockCurrentDocData = {
      email: 'test@bible.org',
      username: 'tester',
      display_name: 'Tester',
      enable_friends: true,
      settings: {},
    };

    const { result } = await renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.profile?.enable_friends).toBe(true);
    expect(result.current.profile?.settings?.enable_friends).toBe(true);
  });
});
