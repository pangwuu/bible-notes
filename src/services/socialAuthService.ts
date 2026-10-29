/**
 * Apple / Google sign-in via Firebase Auth credentials.
 * Client IDs come from EXPO_PUBLIC_* env vars — buttons no-op with a clear error when unset.
 */

import { Platform } from 'react-native';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getUserProfile, formatAuthError } from './authService';
import type { UserDocument } from '../types/user';

export function isGoogleAuthConfigured(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  return Boolean(
    env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID
  );
}

export function isAppleAuthAvailable(os: string = Platform.OS): boolean {
  return os === 'ios';
}

/**
 * Creates a minimal Firestore profile when a social user signs in for the first time.
 * Username stays empty until the complete-profile screen fills it in.
 */
export async function ensureSocialUserProfile(user: User): Promise<UserDocument | null> {
  const existing = await getUserProfile(user.uid);
  if (existing) return existing;

  const email = (user.email || '').toLowerCase();
  const displayName = user.displayName || email.split('@')[0] || 'Bible Reader';
  const now = serverTimestamp();

  const profileDoc: UserDocument = {
    id: user.uid,
    uid: user.uid,
    email,
    username: '',
    display_name: displayName,
    full_name: displayName,
    default_visibility: 'friends',
    enable_friends: true,
    settings: {
      default_visibility: 'friends',
      enable_friends: true,
      custom_esv_api_key: '',
    },
    custom_esv_api_key: '',
    search_tokens: [],
    created_at: now,
    updated_at: now,
  };

  await setDoc(doc(db, 'users', user.uid), profileDoc, { merge: true });
  return profileDoc;
}

export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    await ensureSocialUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

export async function signInWithAppleIdentityToken(
  identityToken: string,
  fullName?: { givenName?: string | null; familyName?: string | null } | null
): Promise<User> {
  if (!identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }
  try {
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({ idToken: identityToken });
    const result = await signInWithCredential(auth, credential);

    const composedName = [fullName?.givenName, fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (composedName && !result.user.displayName) {
      await updateProfile(result.user, { displayName: composedName });
    }

    await ensureSocialUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    throw new Error(formatAuthError(error));
  }
}

export async function hasCompletedUsername(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return false;
  const username = (snap.data() as any)?.username;
  return typeof username === 'string' && username.trim().length >= 3;
}
