/**
 * Validation utilities for Authentication & User Profiles.
 * Adheres strictly to Milestone 2 specifications:
 * - Email format verification
 * - Password minimum 6 characters
 * - Username 3–20 lowercase/alphanumeric/underscore: ^[a-z0-9_]{3,20}$
 * - Display Name length and content validation
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
export const MIN_PASSWORD_LENGTH = 6;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;
export const MAX_DISPLAY_NAME_LENGTH = 50;

/**
 * Validates email format.
 * Returns true if valid, false otherwise.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates password meets minimum 6 character requirement.
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password is required',
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validates username format: 3–20 characters, lowercase letters, numbers, and underscores only.
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || typeof username !== 'string') {
    return {
      isValid: false,
      error: 'Username is required',
    };
  }

  const trimmed = username.trim();

  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return {
      isValid: false,
      error: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
    };
  }

  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return {
      isValid: false,
      error: `Username must be at most ${MAX_USERNAME_LENGTH} characters`,
    };
  }

  if (/[A-Z]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username must contain only lowercase letters, numbers, and underscores',
    };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username must contain only lowercase letters, numbers, and underscores',
    };
  }

  return { isValid: true };
}

/**
 * Normalizes username by trimming and converting to lowercase.
 */
export function normalizeUsername(username: string): string {
  if (!username || typeof username !== 'string') return '';
  return username.trim().toLowerCase();
}

/**
 * Validates display name: non-empty, 1-50 characters.
 */
export function validateDisplayName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Display name is required',
    };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Display name is required',
    };
  }

  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      isValid: false,
      error: `Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validates password confirmation matches original password.
 */
export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return {
      isValid: false,
      error: 'Please confirm your password',
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'Passwords do not match',
    };
  }

  return { isValid: true };
}
