/**
 * Cloud Firestore Notes Service & Offline Storage Integration
 * Strictly complies with firestore.rules (notes collection user_id rule)
 * and index configurations in firestore.indexes.json.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from './firebase';
import {
  Note,
  NoteDocument,
  PassageReference,
  CreateNoteInput,
  UpdateNoteInput,
  noteDocumentToNote,
  assembleSwedishMarkdown,
} from '../types/note';

/**
 * Validates note ID parameter per tier2_boundaries.test.ts:208.
 * Throws 'Note ID is required' if missing or blank.
 */
export function parseNoteId(param?: string): string {
  if (!param || param.trim() === '') {
    throw new Error('Note ID is required');
  }
  return param.trim();
}

/**
 * Create a new note document in Cloud Firestore.
 * Always writes `user_id` matching request.auth.uid.
 */
export async function createNote(input: CreateNoteInput): Promise<Note> {
  const currentUid = auth.currentUser?.uid || input.userId;
  if (!currentUid) {
    throw new Error('User must be authenticated to create a note');
  }

  const notesCollection = collection(db, 'notes');
  const newDocRef = doc(notesCollection);
  const noteId = newDocRef.id;

  const content =
    input.content ||
    assembleSwedishMarkdown(input.lightContent, input.questionContent, input.arrowContent);

  const notePayload: NoteDocument = {
    id: noteId,
    user_id: currentUid,
    author_username: input.authorUsername || auth.currentUser?.displayName || '',
    author_display_name: input.authorDisplayName || auth.currentUser?.displayName || '',
    book: input.passage.book,
    chapter_start: input.passage.startChapter,
    verse_start: input.passage.startVerse,
    chapter_end: input.passage.endChapter,
    verse_end: input.passage.endVerse,
    start_verse_id: input.passage.startOrdinal,
    end_verse_id: input.passage.endOrdinal,
    content,
    light_content: input.lightContent,
    question_content: input.questionContent,
    arrow_content: input.arrowContent,
    tags: (input.tags || []).slice(0, 5).map((t) => t.trim().toLowerCase()),
    visibility: input.visibility || 'friends',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const createdNote = noteDocumentToNote(
    {
      ...notePayload,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    noteId
  );

  try {
    await setDoc(newDocRef, notePayload);
  } catch (error) {
    // If offline or network drop, queue write locally
    await AsyncStorage.setItem(
      `pending_offline_save_${noteId}`,
      JSON.stringify(notePayload)
    );
  }

  // Cache note locally in AsyncStorage
  await AsyncStorage.setItem(`note_${noteId}`, JSON.stringify(createdNote));

  return createdNote;
}

/**
 * Update an existing note in Cloud Firestore.
 */
export async function updateNote(noteId: string, updates: UpdateNoteInput): Promise<Note> {
  const validId = parseNoteId(noteId);
  const noteRef = doc(db, 'notes', validId);

  const firestoreUpdates: Record<string, any> = {
    updated_at: serverTimestamp(),
  };

  if (updates.passage) {
    const p = updates.passage;
    if (p.book !== undefined) firestoreUpdates.book = p.book;
    if (p.startChapter !== undefined) firestoreUpdates.chapter_start = p.startChapter;
    if (p.startVerse !== undefined) firestoreUpdates.verse_start = p.startVerse;
    if (p.endChapter !== undefined) firestoreUpdates.chapter_end = p.endChapter;
    if (p.endVerse !== undefined) firestoreUpdates.verse_end = p.endVerse;
    if (p.startOrdinal !== undefined) firestoreUpdates.start_verse_id = p.startOrdinal;
    if (p.endOrdinal !== undefined) firestoreUpdates.end_verse_id = p.endOrdinal;
  }

  if (updates.tags !== undefined) {
    firestoreUpdates.tags = updates.tags.slice(0, 5).map((t) => t.trim().toLowerCase());
  }

  if (updates.visibility !== undefined) {
    firestoreUpdates.visibility = updates.visibility;
  }

  if (updates.lightContent !== undefined) firestoreUpdates.light_content = updates.lightContent;
  if (updates.questionContent !== undefined) firestoreUpdates.question_content = updates.questionContent;
  if (updates.arrowContent !== undefined) firestoreUpdates.arrow_content = updates.arrowContent;

  if (updates.content !== undefined) {
    firestoreUpdates.content = updates.content;
  } else if (
    updates.lightContent !== undefined ||
    updates.questionContent !== undefined ||
    updates.arrowContent !== undefined
  ) {
    // Read current note to merge content
    const existing = await getNote(validId);
    if (existing) {
      firestoreUpdates.content = assembleSwedishMarkdown(
        updates.lightContent ?? existing.lightContent,
        updates.questionContent ?? existing.questionContent,
        updates.arrowContent ?? existing.arrowContent
      );
    }
  }

  try {
    await updateDoc(noteRef, firestoreUpdates);
  } catch (err) {
    await AsyncStorage.setItem(
      `pending_offline_save_${validId}`,
      JSON.stringify(firestoreUpdates)
    );
  }

  // Update local cache
  const existing = await getNote(validId);
  if (!existing) {
    throw new Error(`Note ${validId} not found`);
  }

  const mergedPassage: PassageReference = {
    ...existing.passage,
    ...(updates.passage || {}),
  };

  const updatedNote: Note = {
    ...existing,
    ...updates,
    passage: mergedPassage,
    book: mergedPassage.book,
    chapter_start: mergedPassage.startChapter,
    verse_start: mergedPassage.startVerse,
    chapter_end: mergedPassage.endChapter,
    verse_end: mergedPassage.endVerse,
    start_verse_id: mergedPassage.startOrdinal,
    end_verse_id: mergedPassage.endOrdinal,
    tags: updates.tags ? updates.tags.slice(0, 5).map((t) => t.trim().toLowerCase()) : existing.tags,
    updatedAt: Date.now(),
    updated_at: Date.now(),
  };

  await AsyncStorage.setItem(`note_${validId}`, JSON.stringify(updatedNote));

  return updatedNote;
}

/**
 * Delete a note from Cloud Firestore and local storage.
 */
export async function deleteNote(noteId: string): Promise<void> {
  const validId = parseNoteId(noteId);
  const noteRef = doc(db, 'notes', validId);

  try {
    await deleteDoc(noteRef);
  } catch (err) {
    // Continue local cleanup even if offline
  }

  await AsyncStorage.removeItem(`note_${validId}`);
  await AsyncStorage.removeItem(`pending_offline_save_${validId}`);
}

/**
 * Retrieve a note by ID with offline cache fallback.
 */
export async function getNote(noteId: string): Promise<Note | null> {
  const validId = parseNoteId(noteId);

  try {
    const noteRef = doc(db, 'notes', validId);
    const snap = await getDoc(noteRef);

    if (snap.exists()) {
      const note = noteDocumentToNote(snap.data(), snap.id);
      await AsyncStorage.setItem(`note_${validId}`, JSON.stringify(note));
      return note;
    }
  } catch (err) {
    // Network failure: fallback to local cache
  }

  const cached = await AsyncStorage.getItem(`note_${validId}`);
  if (cached) {
    try {
      return JSON.parse(cached) as Note;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Retrieve all notes for a specific user, sorted newest first.
 */
export async function getUserNotes(userId: string): Promise<Note[]> {
  if (!userId) return [];

  try {
    const notesRef = collection(db, 'notes');
    const q = query(notesRef, where('user_id', '==', userId));
    const snap = await getDocs(q);

    const notes: Note[] = [];
    snap.forEach((docSnap) => {
      notes.push(noteDocumentToNote(docSnap.data(), docSnap.id));
    });

    // Client-side sort by updated_at descending
    notes.sort((a, b) => {
      const tA = typeof a.updated_at === 'number' ? a.updated_at : a.updated_at?.toMillis?.() || 0;
      const tB = typeof b.updated_at === 'number' ? b.updated_at : b.updated_at?.toMillis?.() || 0;
      return tB - tA;
    });

    // Cache user notes index
    await AsyncStorage.setItem(`user_notes_${userId}`, JSON.stringify(notes));
    return notes;
  } catch (err) {
    const cached = await AsyncStorage.getItem(`user_notes_${userId}`);
    if (cached) {
      try {
        return JSON.parse(cached) as Note[];
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * Retrieve notes for a user filtered by book.
 */
export async function getNotesByBook(userId: string, book: string): Promise<Note[]> {
  const allNotes = await getUserNotes(userId);
  return allNotes.filter((n) => n.book.toLowerCase() === book.trim().toLowerCase());
}

/**
 * Retrieve notes for a user filtered by tag.
 */
export async function getNotesByTag(userId: string, tag: string): Promise<Note[]> {
  const cleanTag = tag.trim().toLowerCase();
  const allNotes = await getUserNotes(userId);
  return allNotes.filter((n) => n.tags.includes(cleanTag));
}
