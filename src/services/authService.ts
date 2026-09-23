/**
 * Authentication Service for Swedish Method Bible Notes.
 * Manages Firebase Auth lifecycle and Firestore user profile documents.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  User,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateDisplayName,
  normalizeUsername,
} from '../utils/validation';
import { UserProfile, UserDocument } from '../types/user';

export interface RegisterResponse {
  user: User;
  profile: UserProfile;
}

export interface LoginResponse {
  user: User;
  profile: UserProfile | null;
}

/**
 * Generates N-gram substrings of length >= 3 across username, displayName, and email prefix
 * to enable partial substring search without external full-text search infrastructure.
 */
export function generateSearchTokens(username?: string, displayName?: string, email?: string): string[] {
  const tokenSet = new Set<string>();

  const processWord = (text?: string) => {
    if (!text) return;
    const clean = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const len = clean.length;
    // Generate all sliding substrings of length >= 3
    for (let start = 0; start < len; start++) {
      for (let end = start + 3; end <= Math.min(start + 15, len); end++) {
        tokenSet.add(clean.substring(start, end));
      }
    }
    // Also include exact clean word
    if (clean.length > 0) {
      tokenSet.add(clean);
    }
  };

  processWord(username);
  processWord(displayName);
  if (email) {
    const emailPrefix = email.split('@')[0];
    processWord(emailPrefix);
  }

  return Array.from(tokenSet);
}

/**
 * Checks if a username is available in Firestore.
 * Performs format validation and lowercases before query.
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const formatValidation = validateUsername(username);
  if (!formatValidation.isValid) {
    return false;
  }

  const normalized = normalizeUsername(username);

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', normalized), limit(1));
    const snap = await getDocs(q);
    return snap.empty;
  } catch (error: any) {
    // If client is unauthenticated and firestore.rules block read with permission-denied,
    // allow client to proceed to registerUser where authenticated check & rollback is enforced.
    if (error?.code === 'permission-denied') {
      // In unauthenticated context, read is restricted by firestore.rules;
      // return true so registration form proceeds to registerUser() where atomic check & rollback is enforced.
      return true;
    }
    throw error;
  }
}

/**
 * Fetches the user profile document from Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as UserProfile;
}

/**
 * Registers a new user with email, password, username, and display name.
 * 1. Validates inputs client-side.
 * 2. Checks username availability.
 * 3. Creates Firebase Auth user.
 * 4. Verifies username uniqueness post-auth to prevent race conditions.
 * 5. Updates Auth profile displayName.
 * 6. Creates Firestore users/{uid} document.
 */
export async function registerUser(
  email: string,
  password: string,
  username: string,
  displayName: string
): Promise<RegisterResponse> {
  // 1. Input Validation
  if (!validateEmail(email)) {
    throw new Error('Please enter a valid email address');
  }

  const passwordVal = validatePassword(password);
  if (!passwordVal.isValid) {
    throw new Error(passwordVal.error || 'Invalid password');
  }

  const usernameVal = validateUsername(username);
  if (!usernameVal.isValid) {
    throw new Error(usernameVal.error || 'Invalid username');
  }

  const displayNameVal = validateDisplayName(displayName);
  if (!displayNameVal.isValid) {
    throw new Error(displayNameVal.error || 'Invalid display name');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = normalizeUsername(username);
  const trimmedDisplayName = displayName.trim();

  // 2. Pre-check username availability
  const isAvailable = await checkUsernameAvailable(normalizedUsername);
  if (!isAvailable) {
    throw new Error('Username is already taken');
  }

  // 3. Create Firebase Auth user
  let userCredential: UserCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }

  const user = userCredential.user;

  try {
    // 4. Authenticated uniqueness check (guaranteed to pass firestore.rules)
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', normalizedUsername), limit(2));
    const snap = await getDocs(q);
    const conflictingDoc = snap.docs.find((d) => d.id !== user.uid);
    if (conflictingDoc) {
      // Rollback newly created user
      await deleteUser(user);
      throw new Error('Username is already taken');
    }

    // 5. Update Firebase Auth displayName
    await updateProfile(user, { displayName: trimmedDisplayName });

    // 6. Create Firestore profile document
    const now = serverTimestamp();
    const searchTokens = generateSearchTokens(normalizedUsername, trimmedDisplayName, normalizedEmail);

    const profileDoc: UserDocument = {
      id: user.uid,
      uid: user.uid,
      email: normalizedEmail,
      username: normalizedUsername,
      display_name: trimmedDisplayName,
      full_name: trimmedDisplayName,
      default_visibility: 'friends',
      settings: {
        default_visibility: 'friends',
        custom_esv_api_key: '',
      },
      custom_esv_api_key: '',
      search_tokens: searchTokens,
      created_at: now,
      updated_at: now,
    };

    await setDoc(doc(db, 'users', user.uid), profileDoc);

    return {
      user,
      profile: profileDoc,
    };
  } catch (err: any) {
    // If profile creation failed, attempt rollback of auth user
    try {
      if (auth.currentUser && auth.currentUser.uid === user.uid) {
        await deleteUser(user);
      }
    } catch (cleanupErr) {
      console.error('Failed to clean up orphaned auth user after profile error:', cleanupErr);
    }
    throw err;
  }
}

/**
 * Logs in user using email and password.
 */
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  if (!email || !email.trim()) {
    throw new Error('Email is required');
  }
  if (!password) {
    throw new Error('Password is required');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await getUserProfile(userCredential.user.uid);
    return {
      user: userCredential.user,
      profile,
    };
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

/**
 * Signs out current user.
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!validateEmail(email)) {
    throw new Error('Please enter a valid email address');
  }

  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

/**
 * Updates user profile fields in Firestore.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  if (!uid) throw new Error('User ID is required');

  try {
    const userDocRef = doc(db, 'users', uid);
    const payload: any = {
      ...updates,
      updated_at: serverTimestamp(),
    };

    // If updating display name, synchronize full_name, Firebase Auth, and search_tokens
    if (updates.display_name) {
      payload.full_name = updates.display_name;
      if (auth.currentUser && auth.currentUser.uid === uid) {
        await updateProfile(auth.currentUser, { displayName: updates.display_name });
      }

      // Fetch current profile to regenerate search_tokens with username & email
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const currentData = snap.data() as UserProfile;
          payload.search_tokens = generateSearchTokens(
            currentData.username || '',
            updates.display_name,
            currentData.email || ''
          );
        }
      } catch (err) {
        console.warn('Failed to regenerate search_tokens on profile update:', err);
      }
    }

    await updateDoc(userDocRef, payload);
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

/**
 * Formats Firebase Auth errors into clear, friendly messages.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unknown error occurred';
  const code = error.code || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already in use by another account.';
    case 'auth/invalid-email':
      return 'The email address is invalid.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}
