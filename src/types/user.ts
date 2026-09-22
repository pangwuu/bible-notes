/**
 * User and Profile Types for Swedish Method Bible Notes.
 * Reconciles specs.md, firestore.rules, and Milestone 2 requirements.
 */

export type NoteVisibility = 'private' | 'friends';

export interface UserSettings {
  default_visibility?: NoteVisibility;
  custom_esv_api_key?: string;
}

export interface UserDocument {
  id: string; // matches Firebase Auth uid (specs.md compatibility)
  uid: string; // matches Firebase Auth uid (DISPATCH.md compatibility)
  email: string;
  username: string; // unique lowercase username (^[a-z0-9_]{3,20}$)
  display_name: string;
  full_name: string; // alias for display_name
  default_visibility: NoteVisibility;
  settings?: UserSettings;
  custom_esv_api_key?: string;
  created_at: any; // FieldValue.serverTimestamp() or Timestamp
  updated_at: any; // FieldValue.serverTimestamp() or Timestamp
}

export type UserProfile = UserDocument;

export interface RegisterUserParams {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface AuthResponse {
  user: any; // Firebase User
  profile: UserProfile | null;
}
