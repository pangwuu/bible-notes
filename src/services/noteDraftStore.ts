/**
 * Device-local drafts for the note editor.
 *
 * Firestore's JS SDK only keeps a durable offline cache on web (IndexedDB). On
 * iOS/Android its cache is in memory, so anything not yet acknowledged by the
 * server is lost if the app is killed. These drafts are the safety net: the
 * editor writes one shortly after every change and deletes it once the server
 * has the same content.
 */

import safeStorage from '../utils/safeStorage';
import type { NoteSectionValue, NoteVisibility, PassageReference } from '../types/note';

const PREFIX = 'note_draft';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export interface NoteDraftPayload {
  title: string;
  passage: PassageReference | null;
  templateId: string;
  sections: NoteSectionValue[];
  tags: string[];
  visibility: NoteVisibility;
}

export interface NoteDraft {
  key: string;
  /** Set for drafts of notes that already exist in Firestore. */
  noteId?: string;
  payload: NoteDraftPayload;
  savedAt: number;
  /**
   * Latest server `updated_at` this device knew about when the draft was written.
   * A newer server value on reopen means the note was edited elsewhere.
   */
  lastKnownServerAt?: number;
}

export function draftKeyForNote(uid: string, noteId: string): string {
  return `${PREFIX}:${uid}:note:${noteId}`;
}

export function newDraftKey(uid: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${PREFIX}:${uid}:new:${suffix}`;
}

export function isNewDraftKey(key: string): boolean {
  return key.includes(':new:');
}

export function toMillis(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (value && typeof (value as any).toMillis === 'function') return (value as any).toMillis();
  if (value && typeof (value as any).seconds === 'number') return (value as any).seconds * 1000;
  return undefined;
}

export function draftHasContent(payload: NoteDraftPayload): boolean {
  return (
    payload.title.trim().length > 0 ||
    payload.sections.some((s) => (s.content || '').trim().length > 0) ||
    payload.tags.length > 0
  );
}

export async function saveDraft(draft: NoteDraft): Promise<boolean> {
  try {
    await safeStorage.setItem(draft.key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export async function loadDraft(key: string): Promise<NoteDraft | null> {
  const raw = await safeStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as NoteDraft;
    if (!parsed?.payload || !Array.isArray(parsed.payload.sections)) return null;
    return { ...parsed, key };
  } catch {
    return null;
  }
}

export async function clearDraft(key: string): Promise<void> {
  await safeStorage.removeItem(key).catch(() => {});
}

/** Unsaved new-note drafts for this user, newest first. Expired drafts are pruned. */
export async function listNewNoteDrafts(uid: string): Promise<NoteDraft[]> {
  const keys = await safeStorage.getAllKeys();
  const prefix = `${PREFIX}:${uid}:new:`;
  const drafts: NoteDraft[] = [];
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    const draft = await loadDraft(key);
    if (!draft || Date.now() - draft.savedAt > MAX_AGE_MS || !draftHasContent(draft.payload)) {
      await clearDraft(key);
      continue;
    }
    drafts.push(draft);
  }
  return drafts.sort((a, b) => b.savedAt - a.savedAt);
}
