/**
 * User and Profile Types for Swedish Method Bible Notes.
 * Reconciles specs.md, firestore.rules, and Milestone 2 requirements.
 */

import { NoteTemplate } from './template';

export type NoteVisibility = 'private' | 'friends';

export type BibleTranslation =
  | 'ESV'
  | 'BSB'
  | 'NIV'
  | 'NASB'
  | 'NIRV'
  | 'AMP'
  | 'WEB'
  | 'ASV'
  | 'FBV'
  | 'LSV'
  | 'GNV'
  | 'CPDV'
  | 'KJV'
  | 'BBE'
  | 'CSB'
  | 'NLT'
  | 'NKJV'
  | number;

export interface UserSettings {
  default_visibility?: NoteVisibility;
  custom_esv_api_key?: string;
  preferred_translation?: BibleTranslation;
  preferred_version_id?: number;
  default_font_size?: number;
  default_template_id?: string;
  enable_friends?: boolean;
  push_notifications_enabled?: boolean;
  expo_push_token?: string;
}

export interface UserDocument {
  id: string; // matches Firebase Auth uid (specs.md compatibility)
  uid: string; // matches Firebase Auth uid (DISPATCH.md compatibility)
  email: string;
  username: string; // unique lowercase username (^[a-z0-9_]{3,20}$)
  display_name: string;
  full_name: string; // alias for display_name
  default_visibility: NoteVisibility;
  default_template_id?: string;
  enable_friends?: boolean;
  preferred_translation?: BibleTranslation;
  preferred_version_id?: number;
  settings?: UserSettings;
  custom_esv_api_key?: string;
  custom_templates?: NoteTemplate[];
  search_tokens?: string[];
  expo_push_token?: string;
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
