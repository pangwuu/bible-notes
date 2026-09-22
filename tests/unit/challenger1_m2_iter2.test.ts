/**
/**
 * Challenger 1 Adversarial Suite (Milestone 2 Iteration 2)
 * Empirical Verification & Stress Testing:
 * 1. Auth Routing Matrix, Boundary Conditions & Cycle Invariants
 * 2. Input Validation Fuzzing & Injection Defense (Email, Username, Password, Display Name)
 * 3. Firebase Auth Error Mapping & Malformed Error Object Resilience
 * 4. Username Uniqueness, Race Conditions & Rollback Verification
 * 5. Settings Screen Anti-Pattern & DESIGN.md Conformance Scan
 */

import fs from 'fs';
import path from 'path';
import {
  getAuthRedirect,
  isInAuthGroup,
  AUTH_ROUTE,
  TABS_ROUTE,
} from '../../src/utils/authRouting';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateDisplayName,
  validateConfirmPassword,
  normalizeUsername,
  USERNAME_REGEX,
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
} from '../../src/utils/validation';
import { formatAuthError } from '../../src/services/authService';

// Mock Firebase for AuthService unit tests
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockSignOut = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
const mockUpdateProfile = jest.fn();
const mockDeleteUser = jest.fn();

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  deleteUser: (...args: any[]) => mockDeleteUser(...args),
}));

const mockDoc = jest.fn((...args: any[]) => ({ id: args[2], path: `users/${args[2]}` }));
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockGetDocs = jest.fn();
const mockServerTimestamp = jest.fn(() => 'MOCK_TIMESTAMP');

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  limit: (...args: any[]) => mockLimit(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock('../../src/services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

import {
  checkUsernameAvailable,
  registerUser,
  loginUser,
  logoutUser,
  sendPasswordReset,
} from '../../src/services/authService';

describe('Challenger 1 — Empirical Verification & Adversarial Stress Tests', () => {
  // =========================================================================
  // 1. Auth Routing Matrix & Boundary Robustness
  // =========================================================================
  describe('Auth Routing & Boundary Invariants', () => {
    test('Constants match exact routing paths', () => {
      expect(AUTH_ROUTE).toBe('/(auth)/login');
      expect(TABS_ROUTE).toBe('/(tabs)');
    });

    test('isInAuthGroup handles dirty / edge-case inputs gracefully without throwing', () => {
      expect(isInAuthGroup([])).toBe(false);
      expect(isInAuthGroup(null as any)).toBe(false);
      expect(isInAuthGroup(undefined as any)).toBe(false);
      expect(isInAuthGroup('not-an-array' as any)).toBe(false);
      expect(isInAuthGroup(123 as any)).toBe(false);
      expect(isInAuthGroup({} as any)).toBe(false);
      expect(isInAuthGroup(['(auth)'])).toBe(true);
      expect(isInAuthGroup(['(auth)', 'login'])).toBe(true);
      expect(isInAuthGroup(['(auth)', 'register'])).toBe(true);
      expect(isInAuthGroup(['auth'])).toBe(false); // must have parentheses
      expect(isInAuthGroup(['(tabs)'])).toBe(false);
    });

    test('getAuthRedirect returns null whenever loading is true regardless of inputs', () => {
      const inputs = [
        { isAuth: false, segments: [], loading: true },
        { isAuth: false, segments: ['(tabs)'], loading: true },
        { isAuth: false, segments: ['(auth)', 'login'], loading: true },
        { isAuth: true, segments: ['(tabs)'], loading: true },
        { isAuth: true, segments: ['(auth)', 'login'], loading: true },
        { isAuth: true, segments: ['note', '123'], loading: true },
        { isAuth: false, segments: null as any, loading: true },
      ];

      for (const input of inputs) {
        expect(getAuthRedirect(input.isAuth, input.segments, input.loading)).toBeNull();
      }
    });

    test('Unauthenticated user outside auth group is always redirected to AUTH_ROUTE', () => {
      const outsideRoutes: string[][] = [
        [],
        ['(tabs)'],
        ['(tabs)', 'index'],
        ['(tabs)', 'notes'],
        ['(tabs)', 'friends'],
        ['(tabs)', 'settings'],
        ['note', 'some-id'],
        ['note', 'edit'],
        ['friend', 'friend-id'],
        ['notifications'],
        ['unexpected', 'nested', 'path'],
      ];

      for (const route of outsideRoutes) {
        expect(getAuthRedirect(false, route)).toBe(AUTH_ROUTE);
        expect(getAuthRedirect(false, route, false)).toBe(AUTH_ROUTE);
      }
    });

    test('Unauthenticated user inside auth group stays without redirection (null)', () => {
      const authRoutes: string[][] = [
        ['(auth)'],
        ['(auth)', 'login'],
        ['(auth)', 'register'],
        ['(auth)', 'forgot-password'],
      ];

      for (const route of authRoutes) {
        expect(getAuthRedirect(false, route)).toBeNull();
        expect(getAuthRedirect(false, route, false)).toBeNull();
      }
    });

    test('Authenticated user inside auth group is redirected to TABS_ROUTE', () => {
      const authRoutes: string[][] = [
        ['(auth)'],
        ['(auth)', 'login'],
        ['(auth)', 'register'],
        ['(auth)', 'forgot-password'],
      ];

      for (const route of authRoutes) {
        expect(getAuthRedirect(true, route)).toBe(TABS_ROUTE);
        expect(getAuthRedirect(true, route, false)).toBe(TABS_ROUTE);
      }
    });

    test('Authenticated user outside auth group stays on current route (null)', () => {
      const appRoutes: string[][] = [
        ['(tabs)'],
        ['(tabs)', 'index'],
        ['(tabs)', 'settings'],
        ['note', 'id-1'],
        ['note', 'edit'],
        ['friend', 'user-2'],
        ['notifications'],
      ];

      for (const route of appRoutes) {
        expect(getAuthRedirect(true, route)).toBeNull();
      }
    });

    test('Redirect state transitions are idempotent and reach a fixed point in 1 step', () => {
      // Test every route under both authenticated and unauthenticated conditions
      const allCandidateRoutes = [
        ['(auth)', 'login'],
        ['(auth)', 'register'],
        ['(tabs)'],
        ['(tabs)', 'notes'],
        ['note', '123'],
        ['friend', '456'],
        ['notifications'],
        [],
      ];

      for (const isAuth of [false, true]) {
        for (const segments of allCandidateRoutes) {
          const firstRedirect = getAuthRedirect(isAuth, segments);
          if (firstRedirect !== null) {
            // Convert target redirect path to route segments
            // '/(auth)/login' -> ['(auth)', 'login']
            // '/(tabs)' -> ['(tabs)']
            const nextSegments = firstRedirect.split('/').filter(Boolean);
            const secondRedirect = getAuthRedirect(isAuth, nextSegments);
            // The next redirect must be null: convergence in 1 step
            expect(secondRedirect).toBeNull();
          }
        }
      }
    });
  });

  // =========================================================================
  // 2. Validation Fuzzing & Injection Defense
  // =========================================================================
  describe('Input Validation Adversarial Matrix', () => {
    describe('validateEmail adversarial inputs', () => {
      test('Rejects malformed and adversarial email inputs', () => {
        const invalidEmails = [
          '',
          '   ',
          'plainaddress',
          '#@%^%#$@#$@#.com', // multiple @
          '@example.com', // missing local part
          'Joe Smith <email@example.com>', // angles and spaces
          'email.example.com', // missing @
          'email@example@example.com', // double @
          'email@example', // missing TLD
          'email with spaces@domain.com', // spaces in local part
          'email@domain with space.com', // spaces in domain
          'user@domain.c', // single character TLD rejected (< 2 chars)
          'email@111.222.333.44444', // numeric TLD rejected
        ];

        for (const em of invalidEmails) {
          expect(validateEmail(em)).toBe(false);
        }
      });

      test('Accepts valid standard and complex emails', () => {
        const validEmails = [
          'simple@example.com',
          'very.common@example.com',
          'disposable.style.email.with+symbol@example.com',
          'other.email-with-hyphen@example.com',
          'fully-qualified-domain@example.co.uk',
          'user_name@domain.io',
          '   padded@example.com   ', // trimmed
        ];

        for (const em of validEmails) {
          expect(validateEmail(em)).toBe(true);
        }
      });
    });

    describe('validateUsername adversarial & boundary inputs', () => {
      test('Exact length boundary enforcement: [3, 20]', () => {
        expect(validateUsername('a'.repeat(2)).isValid).toBe(false);
        expect(validateUsername('a'.repeat(3)).isValid).toBe(true);
        expect(validateUsername('a'.repeat(20)).isValid).toBe(true);
        expect(validateUsername('a'.repeat(21)).isValid).toBe(false);
      });

      test('Rejects injection strings and scripting attempts in username', () => {
        const injectionPayloads = [
          "admin'--",
          "admin' OR '1'='1",
          '<script>alert(1)</script>',
          'javascript:void(0)',
          'user;DROP TABLE users;',
          '${7*7}',
          '{{constructor}}',
          '../etc/passwd',
          'null\0byte',
          'user\nname',
        ];

        for (const payload of injectionPayloads) {
          const res = validateUsername(payload);
          expect(res.isValid).toBe(false);
        }
      });

      test('Strict lowercase enforcement: uppercase letters must be rejected', () => {
        expect(validateUsername('User123').isValid).toBe(false);
        expect(validateUsername('user_A').isValid).toBe(false);
        expect(validateUsername('USER').isValid).toBe(false);
      });

      test('normalizeUsername trims and lowercases safely', () => {
        expect(normalizeUsername('  ABC_123  ')).toBe('abc_123');
        expect(normalizeUsername('')).toBe('');
        expect(normalizeUsername(null as any)).toBe('');
        expect(normalizeUsername(undefined as any)).toBe('');
      });
    });

    describe('validatePassword boundary & type safety', () => {
      test('Requires minimum 6 characters', () => {
        expect(validatePassword('').isValid).toBe(false);
        expect(validatePassword('12345').isValid).toBe(false);
        expect(validatePassword('123456').isValid).toBe(true);
        expect(validatePassword('a'.repeat(100)).isValid).toBe(true);
      });

      test('Rejects non-string and missing password inputs safely', () => {
        expect(validatePassword(null as any).isValid).toBe(false);
        expect(validatePassword(undefined as any).isValid).toBe(false);
        expect(validatePassword(123456 as any).isValid).toBe(false);
      });
    });

    describe('validateDisplayName boundaries', () => {
      test('Accepts 1 to 50 characters, rejects empty or whitespace-only', () => {
        expect(validateDisplayName('').isValid).toBe(false);
        expect(validateDisplayName('   ').isValid).toBe(false);
        expect(validateDisplayName('A').isValid).toBe(true);
        expect(validateDisplayName('A'.repeat(50)).isValid).toBe(true);
        expect(validateDisplayName('A'.repeat(51)).isValid).toBe(false);
      });
    });

    describe('validateConfirmPassword match verification', () => {
      test('Enforces exact match and rejects empty confirm password', () => {
        expect(validateConfirmPassword('pass123', 'pass123').isValid).toBe(true);
        expect(validateConfirmPassword('pass123', 'Pass123').isValid).toBe(false);
        expect(validateConfirmPassword('pass123', 'pass123 ').isValid).toBe(false);
        expect(validateConfirmPassword('pass123', '').isValid).toBe(false);
      });
    });
  });

  // =========================================================================
  // 3. Firebase Auth Error Mapping & Formatting
  // =========================================================================
  describe('Firebase Auth Error Mapping Exhaustiveness', () => {
    const EXPECTED_MAPPINGS: Record<string, string> = {
      'auth/email-already-in-use': 'This email address is already in use by another account.',
      'auth/invalid-email': 'The email address is invalid.',
      'auth/operation-not-allowed': 'Email and password sign-in is not enabled.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/user-disabled': 'This user account has been disabled.',
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      'auth/network-request-failed': 'Network connection error. Please check your internet connection.',
    };

    test('Maps all 10 canonical Firebase Auth error codes to friendly strings', () => {
      for (const [code, expectedMessage] of Object.entries(EXPECTED_MAPPINGS)) {
        expect(formatAuthError({ code })).toBe(expectedMessage);
      }
    });

    test('Gracefully handles unmapped, malformed, or missing error objects', () => {
      expect(formatAuthError(null)).toBe('An unknown error occurred');
      expect(formatAuthError(undefined)).toBe('An unknown error occurred');
      expect(formatAuthError({})).toBe('An unexpected error occurred.');
      expect(formatAuthError({ code: 'auth/unknown-code', message: 'Custom message' })).toBe(
        'Custom message'
      );
      expect(formatAuthError(new Error('Standard JS error'))).toBe('Standard JS error');
      expect(formatAuthError('String error')).toBe('An unexpected error occurred.');
    });
  });

  // =========================================================================
  // 4. Username Uniqueness & Rollback Stress Tests
  // =========================================================================
  describe('Username Uniqueness & Rollback Scenarios', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('checkUsernameAvailable rejects invalid format before Firestore query', async () => {
      const res = await checkUsernameAvailable('ab'); // 2 chars
      expect(res).toBe(false);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    test('checkUsernameAvailable rejects uppercase without querying Firestore', async () => {
      const res = await checkUsernameAvailable('UPPER_USER');
      expect(res).toBe(false);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    test('checkUsernameAvailable queries Firestore for valid lowercase username', async () => {
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
      const res = await checkUsernameAvailable('valid_user');
      expect(res).toBe(true);
      expect(mockWhere).toHaveBeenCalledWith('username', '==', 'valid_user');
    });

    test('registerUser cleans up auth user if Firestore document creation fails', async () => {
      // 1. Available check passes
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

      // 2. Auth creation succeeds
      const mockUser = { uid: 'uid_test_fail', email: 'test@example.com' };
      const { auth: mockAuth } = require('../../src/services/firebase');
      mockAuth.currentUser = mockUser;
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

      // 3. Post-auth uniqueness check passes
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
      mockUpdateProfile.mockResolvedValueOnce(undefined);

      // 4. Firestore setDoc throws an error (e.g. network disconnect)
      mockSetDoc.mockRejectedValueOnce(new Error('Firestore write failure'));
      mockDeleteUser.mockResolvedValueOnce(undefined);

      await expect(
        registerUser('test@example.com', 'password123', 'valid_user', 'Full Name')
      ).rejects.toThrow('Firestore write failure');
      expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
      mockAuth.currentUser = null;
    });

    test('registerUser rejects uppercase username before auth creation', async () => {
      await expect(
        registerUser('user2@example.com', 'password123', 'EXISTING_USER', 'Second User')
      ).rejects.toThrow('Username must contain only lowercase letters, numbers, and underscores');
      expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test('registerUser handles duplicate username collision post-auth with rollback', async () => {
      // Pre-check passed
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

      const mockUser = { uid: 'uid_second', email: 'user2@example.com' };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

      // Conflicting doc exists
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'uid_first', data: () => ({ username: 'existing_user' }) }],
      });
      mockDeleteUser.mockResolvedValueOnce(undefined);

      await expect(
        registerUser('user2@example.com', 'password123', 'existing_user', 'Second User')
      ).rejects.toThrow('Username is already taken');

      expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Settings Screen & Anti-Pattern Regression Scan
  // =========================================================================
  describe('DESIGN.md Anti-Pattern Regression Verification', () => {
    test('app/(tabs)/settings.tsx contains no uppercase textTransform or letterSpacing', () => {
      const settingsPath = path.resolve(__dirname, '../../app/(tabs)/settings.tsx');
      const content = fs.readFileSync(settingsPath, 'utf-8');

      expect(content).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(content).not.toMatch(/letterSpacing:\s*\d/);
    });

    test('app/(tabs)/settings.tsx section headers use sentence case', () => {
      const settingsPath = path.resolve(__dirname, '../../app/(tabs)/settings.tsx');
      const content = fs.readFileSync(settingsPath, 'utf-8');

      // Check section header strings
      expect(content).toContain('>Preferences<');
      expect(content).toContain('>Crossway ESV API<');
      // Should not contain all-caps PREFERENCES
      expect(content).not.toContain('>PREFERENCES<');
    });
  });
});
