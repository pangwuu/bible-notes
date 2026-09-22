/**
 * Automated Unit Test Suite for Auth Validation, Profile Schema & AuthService.
 * Verifies Milestone 2 Auth specifications.
 */

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

// Mock Firebase dependencies
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
  formatAuthError,
} from '../../src/services/authService';

describe('Authentication Validation Utility Tests', () => {
  describe('validateEmail', () => {
    test('accepts valid standard and complex emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co')).toBe(true);
      expect(validateEmail('user+tag@sub.domain.org')).toBe(true);
      expect(validateEmail('first_last@domain.io')).toBe(true);
      expect(validateEmail('  trimmed@example.com  ')).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('   ')).toBe(false);
      expect(validateEmail('no-at-sign.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('test@domain')).toBe(false);
      expect(validateEmail('test@domain.c')).toBe(false); // TLD < 2 chars
      expect(validateEmail('test user@domain.com')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('accepts passwords of 6 or more characters', () => {
      expect(validatePassword('123456')).toEqual({ isValid: true });
      expect(validatePassword('password123')).toEqual({ isValid: true });
      expect(validatePassword('VerySecure_Pass!2026')).toEqual({ isValid: true });
    });

    test('rejects passwords shorter than 6 characters', () => {
      const res = validatePassword('12345');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Password must be at least 6 characters');
    });

    test('rejects empty or missing password', () => {
      expect(validatePassword('')).toEqual({
        isValid: false,
        error: 'Password is required',
      });
      expect(validatePassword(null as any)).toEqual({
        isValid: false,
        error: 'Password is required',
      });
    });
  });

  describe('validateUsername', () => {
    test('accepts valid usernames between 3 and 20 chars', () => {
      expect(validateUsername('abc')).toEqual({ isValid: true });
      expect(validateUsername('john_doe')).toEqual({ isValid: true });
      expect(validateUsername('alex2026')).toEqual({ isValid: true });
      expect(validateUsername('a_b_c_1_2_3')).toEqual({ isValid: true });
      expect(validateUsername('twenty_chars_usernam')).toEqual({ isValid: true }); // 20 chars
    });

    test('rejects usernames shorter than 3 characters', () => {
      expect(validateUsername('ab')).toEqual({
        isValid: false,
        error: 'Username must be at least 3 characters',
      });
      expect(validateUsername('a')).toEqual({
        isValid: false,
        error: 'Username must be at least 3 characters',
      });
    });

    test('rejects usernames longer than 20 characters', () => {
      expect(validateUsername('twenty_one_chars_long_')).toEqual({
        isValid: false,
        error: 'Username must be at most 20 characters',
      });
    });

    test('rejects uppercase letters', () => {
      expect(validateUsername('John_Doe')).toEqual({
        isValid: false,
        error: 'Username must contain only lowercase letters, numbers, and underscores',
      });
      expect(validateUsername('ALEX')).toEqual({
        isValid: false,
        error: 'Username must contain only lowercase letters, numbers, and underscores',
      });
    });

    test('rejects disallowed special characters, periods, hyphens, and spaces', () => {
      expect(validateUsername('john.doe')).toEqual({
        isValid: false,
        error: 'Username must contain only lowercase letters, numbers, and underscores',
      });
      expect(validateUsername('john-doe')).toEqual({
        isValid: false,
        error: 'Username must contain only lowercase letters, numbers, and underscores',
      });
      expect(validateUsername('john doe')).toEqual({
        isValid: false,
        error: 'Username must contain only lowercase letters, numbers, and underscores',
      });
      expect(validateUsername('john@doe')).toEqual({
        isValid: false,
        error: 'Username must contain only lowercase letters, numbers, and underscores',
      });
    });

    test('rejects empty username', () => {
      expect(validateUsername('')).toEqual({
        isValid: false,
        error: 'Username is required',
      });
    });
  });

  describe('normalizeUsername', () => {
    test('trims whitespace and converts to lowercase', () => {
      expect(normalizeUsername('  John_Doe  ')).toBe('john_doe');
      expect(normalizeUsername('ALEX2026')).toBe('alex2026');
      expect(normalizeUsername('')).toBe('');
      expect(normalizeUsername(null as any)).toBe('');
    });
  });

  describe('validateDisplayName', () => {
    test('accepts valid names between 1 and 50 characters', () => {
      expect(validateDisplayName('John Doe')).toEqual({ isValid: true });
      expect(validateDisplayName('Sarah')).toEqual({ isValid: true });
      expect(validateDisplayName('A')).toEqual({ isValid: true });
    });

    test('rejects empty or whitespace-only names', () => {
      expect(validateDisplayName('')).toEqual({
        isValid: false,
        error: 'Display name is required',
      });
      expect(validateDisplayName('    ')).toEqual({
        isValid: false,
        error: 'Display name is required',
      });
    });

    test('rejects names exceeding 50 characters', () => {
      const longName = 'A'.repeat(51);
      expect(validateDisplayName(longName)).toEqual({
        isValid: false,
        error: 'Display name must be at most 50 characters',
      });
    });
  });

  describe('validateConfirmPassword', () => {
    test('accepts matching passwords', () => {
      expect(validateConfirmPassword('secret123', 'secret123')).toEqual({ isValid: true });
    });

    test('rejects mismatched passwords', () => {
      expect(validateConfirmPassword('secret123', 'secret456')).toEqual({
        isValid: false,
        error: 'Passwords do not match',
      });
    });

    test('rejects empty confirmation', () => {
      expect(validateConfirmPassword('secret123', '')).toEqual({
        isValid: false,
        error: 'Please confirm your password',
      });
    });
  });

  describe('formatAuthError', () => {
    test('maps standard Firebase error codes to friendly strings', () => {
      expect(formatAuthError({ code: 'auth/email-already-in-use' })).toBe(
        'This email address is already in use by another account.'
      );
      expect(formatAuthError({ code: 'auth/invalid-credential' })).toBe(
        'Invalid email or password.'
      );
      expect(formatAuthError({ code: 'auth/wrong-password' })).toBe(
        'Incorrect password. Please try again.'
      );
      expect(formatAuthError({ code: 'auth/user-not-found' })).toBe(
        'No account found with this email address.'
      );
      expect(formatAuthError({ code: 'auth/weak-password' })).toBe(
        'Password must be at least 6 characters.'
      );
      expect(formatAuthError({ code: 'auth/too-many-requests' })).toBe(
        'Too many attempts. Please wait a moment and try again.'
      );
      expect(formatAuthError({ code: 'auth/network-request-failed' })).toBe(
        'Network connection error. Please check your internet connection.'
      );
      expect(formatAuthError({ message: 'Custom error' })).toBe('Custom error');
      expect(formatAuthError(null)).toBe('An unknown error occurred');
    });
  });
});

describe('AuthService Integration Tests (Mocked Firebase)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkUsernameAvailable', () => {
    test('returns false immediately for invalid username format', async () => {
      const result = await checkUsernameAvailable('ab');
      expect(result).toBe(false);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    test('returns true when Firestore returns empty query snapshot', async () => {
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
      const result = await checkUsernameAvailable('new_user');
      expect(result).toBe(true);
      expect(mockGetDocs).toHaveBeenCalled();
    });

    test('returns false when Firestore finds an existing document', async () => {
      mockGetDocs.mockResolvedValueOnce({ empty: false, docs: [{ id: 'existing_uid' }] });
      const result = await checkUsernameAvailable('existing_user');
      expect(result).toBe(false);
      expect(mockGetDocs).toHaveBeenCalled();
    });
  });

  describe('registerUser', () => {
    test('rejects early when email is invalid without calling Firebase', async () => {
      await expect(
        registerUser('invalid-email', 'password123', 'valid_user', 'Display Name')
      ).rejects.toThrow('Please enter a valid email address');
      expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test('rejects early when username format is invalid', async () => {
      await expect(
        registerUser('test@example.com', 'password123', 'Bad_Username', 'Display Name')
      ).rejects.toThrow('Username must contain only lowercase letters');
      expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test('rejects when username is already taken before auth creation', async () => {
      mockGetDocs.mockResolvedValueOnce({ empty: false, docs: [{ id: 'uid1' }] });
      await expect(
        registerUser('test@example.com', 'password123', 'taken_user', 'Display Name')
      ).rejects.toThrow('Username is already taken');
      expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    test('successfully registers user and creates profile document', async () => {
      // 1. Username pre-check: empty (available)
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

      // 2. Auth creation: userCredential
      const mockUser = { uid: 'uid_123', email: 'test@example.com' };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

      // 3. Post-auth check: empty (no conflict)
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

      // 4. Update profile and setDoc succeed
      mockUpdateProfile.mockResolvedValueOnce(undefined);
      mockSetDoc.mockResolvedValueOnce(undefined);

      const result = await registerUser(
        'test@example.com',
        'password123',
        'valid_user',
        'John Doe'
      );

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'John Doe' });
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          uid: 'uid_123',
          id: 'uid_123',
          email: 'test@example.com',
          username: 'valid_user',
          display_name: 'John Doe',
          full_name: 'John Doe',
          default_visibility: 'friends',
        })
      );
      expect(result.profile.username).toBe('valid_user');
      expect(result.user.uid).toBe('uid_123');
    });

    test('rolls back auth user if post-creation username collision is detected', async () => {
      // Pre-check passed
      mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });

      const mockUser = { uid: 'new_uid', email: 'test@example.com' };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

      // Post-auth check found conflicting doc with different uid
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'other_uid', data: () => ({ username: 'taken_user' }) }],
      });

      mockDeleteUser.mockResolvedValueOnce(undefined);

      await expect(
        registerUser('test@example.com', 'password123', 'taken_user', 'John Doe')
      ).rejects.toThrow('Username is already taken');

      expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  describe('loginUser', () => {
    test('calls signInWithEmailAndPassword and retrieves user profile', async () => {
      const mockUser = { uid: 'uid_login' };
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: 'uid_login', username: 'logged_user' }),
      });

      const res = await loginUser('test@example.com', 'password123');
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(res.user.uid).toBe('uid_login');
      expect(res.profile?.username).toBe('logged_user');
    });
  });

  describe('logoutUser', () => {
    test('calls signOut with auth instance', async () => {
      mockSignOut.mockResolvedValueOnce(undefined);
      await logoutUser();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('sendPasswordReset', () => {
    test('validates email before calling sendPasswordResetEmail', async () => {
      await expect(sendPasswordReset('bad-email')).rejects.toThrow(
        'Please enter a valid email address'
      );
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();

      mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);
      await sendPasswordReset('valid@example.com');
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'valid@example.com'
      );
    });
  });
});
