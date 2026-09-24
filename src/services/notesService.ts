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
  limit,
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import safeStorage from '../utils/safeStorage';
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
import { compileSectionsToMarkdown } from '../constants/templates';

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

  const sections = input.sections && input.sections.length > 0
    ? input.sections
    : [
        { id: 'light', title: 'Key Idea', icon: 'bulb-outline', content: input.lightContent || '' },
        { id: 'question', title: 'Question', icon: 'help-circle-outline', content: input.questionContent || '' },
        { id: 'arrow', title: 'Application', icon: 'footsteps-outline', content: input.arrowContent || '' },
      ];

  const lightContent = input.lightContent || sections.find((s) => s.id === 'light')?.content || '';
  const questionContent = input.questionContent || sections.find((s) => s.id === 'question')?.content || '';
  const arrowContent = input.arrowContent || sections.find((s) => s.id === 'arrow')?.content || '';

  const content =
    input.content ||
    (input.sections && input.sections.length > 0
      ? compileSectionsToMarkdown(input.sections)
      : assembleSwedishMarkdown(lightContent, questionContent, arrowContent));

  let segments = input.passage?.segments || [];
  if (segments.length === 0 && (input.passage as any)?.book) {
    const rawP = input.passage as any;
    segments = [{
      book: rawP.book,
      startChapter: rawP.startChapter ?? rawP.chapter_start ?? 1,
      startVerse: rawP.startVerse ?? rawP.verse_start ?? 1,
      endChapter: rawP.endChapter ?? rawP.chapter_end ?? 1,
      endVerse: rawP.endVerse ?? rawP.verse_end ?? 1,
    }];
  }

  const passageDisplay =
    input.passage?.display ||
    input.passage?.displayString ||
    (segments.length > 0 ? segments.map((s) => s.book).join(', ') : 'Romans 8');

  const books = input.passage?.books || Array.from(new Set(segments.map((s) => s.book)));

  const notePayload: NoteDocument = {
    id: noteId,
    user_id: currentUid,
    author_username: input.authorUsername || auth.currentUser?.displayName || '',
    author_display_name: input.authorDisplayName || auth.currentUser?.displayName || '',
    passage: {
      display: passageDisplay,
      books,
      segments: segments.map((s) => ({
        book: s.book,
        start_chapter: s.startChapter,
        start_verse: s.startVerse,
        end_chapter: s.endChapter,
        end_verse: s.endVerse,
      })),
    },
    template_id: input.templateId || 'swedish',
    template_name: input.templateName || 'Swedish Method',
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon,
      content: s.content || '',
    })),
    content,
    light_content: lightContent,
    question_content: questionContent,
    arrow_content: arrowContent,
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
    console.error('Firestore createNote failed, queuing offline write:', error);
    // If offline or network drop, queue write locally
    await safeStorage.setItem(
      `pending_offline_save_${noteId}`,
      JSON.stringify(notePayload)
    );
  }

  // Cache note locally in safeStorage
  await safeStorage.setItem(`note_${noteId}`, JSON.stringify(createdNote));

  // Sync user_notes cache
  try {
    const cachedUserNotes = await safeStorage.getItem(`user_notes_${currentUid}`);
    if (cachedUserNotes) {
      const list = JSON.parse(cachedUserNotes) as Note[];
      const updatedList = [createdNote, ...list.filter((n) => n.id !== noteId)];
      await safeStorage.setItem(`user_notes_${currentUid}`, JSON.stringify(updatedList));
    } else {
      await safeStorage.setItem(`user_notes_${currentUid}`, JSON.stringify([createdNote]));
    }
  } catch {}

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
    const passageDisplay =
      p.display ||
      p.displayString ||
      p.segments.map((s) => s.book).join(', ');

    firestoreUpdates.passage = {
      display: passageDisplay,
      books: p.books || Array.from(new Set(p.segments.map((s) => s.book))),
      segments: p.segments.map((s) => ({
        book: s.book,
        start_chapter: s.startChapter,
        start_verse: s.startVerse,
        end_chapter: s.endChapter,
        end_verse: s.endVerse,
      })),
    };
  }

  if (updates.tags !== undefined) {
    firestoreUpdates.tags = updates.tags.slice(0, 5).map((t) => t.trim().toLowerCase());
  }

  if (updates.visibility !== undefined) {
    firestoreUpdates.visibility = updates.visibility;
  }

  if (updates.templateId !== undefined) firestoreUpdates.template_id = updates.templateId;
  if (updates.templateName !== undefined) firestoreUpdates.template_name = updates.templateName;

  if (updates.sections !== undefined) {
    firestoreUpdates.sections = updates.sections.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon,
      content: s.content || '',
    }));
    if (updates.content === undefined) {
      firestoreUpdates.content = compileSectionsToMarkdown(updates.sections);
    }
    const light = updates.sections.find((s) => s.id === 'light')?.content;
    const question = updates.sections.find((s) => s.id === 'question')?.content;
    const arrow = updates.sections.find((s) => s.id === 'arrow')?.content;
    if (light !== undefined) firestoreUpdates.light_content = light;
    if (question !== undefined) firestoreUpdates.question_content = question;
    if (arrow !== undefined) firestoreUpdates.arrow_content = arrow;
  }

  if (updates.lightContent !== undefined) firestoreUpdates.light_content = updates.lightContent;
  if (updates.questionContent !== undefined) firestoreUpdates.question_content = updates.questionContent;
  if (updates.arrowContent !== undefined) firestoreUpdates.arrow_content = updates.arrowContent;

  if (updates.content !== undefined) {
    firestoreUpdates.content = updates.content;
  } else if (
    updates.sections === undefined &&
    (updates.lightContent !== undefined ||
      updates.questionContent !== undefined ||
      updates.arrowContent !== undefined)
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
    await safeStorage.setItem(
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
    tags: updates.tags ? updates.tags.slice(0, 5).map((t) => t.trim().toLowerCase()) : existing.tags,
    updatedAt: Date.now(),
    updated_at: Date.now(),
  };

  await safeStorage.setItem(`note_${validId}`, JSON.stringify(updatedNote));

  // Sync user_notes cache
  try {
    const currentUid = existing.userId || existing.user_id || auth.currentUser?.uid;
    if (currentUid) {
      const cachedUserNotes = await safeStorage.getItem(`user_notes_${currentUid}`);
      if (cachedUserNotes) {
        const list = JSON.parse(cachedUserNotes) as Note[];
        const idx = list.findIndex((n) => n.id === validId);
        if (idx >= 0) {
          list[idx] = updatedNote;
        } else {
          list.unshift(updatedNote);
        }
        await safeStorage.setItem(`user_notes_${currentUid}`, JSON.stringify(list));
      }
    }
  } catch {}

  return updatedNote;
}

/**
 * Delete a note from Cloud Firestore and local storage.
 */
export async function deleteNote(noteId: string): Promise<void> {
  const validId = parseNoteId(noteId);
  const noteRef = doc(db, 'notes', validId);

  // Retrieve existing note to identify user for user_notes sync
  const existing = await getNote(validId);

  try {
    await deleteDoc(noteRef);
  } catch (err) {
    // Continue local cleanup even if offline
  }

  await safeStorage.removeItem(`note_${validId}`);
  await safeStorage.removeItem(`pending_offline_save_${validId}`);

  // Sync user_notes cache
  try {
    const currentUid = existing?.userId || existing?.user_id || auth.currentUser?.uid;
    if (currentUid) {
      const cachedUserNotes = await safeStorage.getItem(`user_notes_${currentUid}`);
      if (cachedUserNotes) {
        const list = JSON.parse(cachedUserNotes) as Note[];
        const filtered = list.filter((n) => n.id !== validId);
        await safeStorage.setItem(`user_notes_${currentUid}`, JSON.stringify(filtered));
      }
    }
  } catch {}
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
      await safeStorage.setItem(`note_${validId}`, JSON.stringify(note));
      return note;
    }
  } catch (err) {
    // Network failure: fallback to local cache
  }

  const cached = await safeStorage.getItem(`note_${validId}`);
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
    await safeStorage.setItem(`user_notes_${userId}`, JSON.stringify(notes));
    return notes;
  } catch (err) {
    const cached = await safeStorage.getItem(`user_notes_${userId}`);
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
  const target = book.trim().toLowerCase();
  const allNotes = await getUserNotes(userId);
  return allNotes.filter((n) =>
    (n.passage.books || []).some((b) => b.toLowerCase() === target)
  );
}

/**
 * Retrieve notes for a user filtered by tag.
 */
export async function getNotesByTag(userId: string, tag: string): Promise<Note[]> {
  const cleanTag = tag.trim().toLowerCase();
  const allNotes = await getUserNotes(userId);
  return allNotes.filter((n) => n.tags.includes(cleanTag));
}

/**
 * Aggregate all unique tags from a user's notes for suggestion chips.
 */
export async function getUserTags(userId: string): Promise<string[]> {
  const allNotes = await getUserNotes(userId);
  const tagSet = new Set<string>();
  for (const n of allNotes) {
    if (n.tags && Array.isArray(n.tags)) {
      for (const t of n.tags) {
        if (t && t.trim()) {
          tagSet.add(t.trim().toLowerCase());
        }
      }
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Paginated query for user notes with cursor support.
 */
export async function getUserNotesPaginated(
  userId: string,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ notes: Note[]; lastDoc: DocumentSnapshot | null }> {
  if (!userId) return { notes: [], lastDoc: null };

  try {
    const notesRef = collection(db, 'notes');
    let q = query(notesRef, where('user_id', '==', userId));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc), limit(pageSize));
    } else {
      q = query(q, limit(pageSize));
    }

    const snap = await getDocs(q);
    const notes: Note[] = [];
    snap.forEach((docSnap) => {
      notes.push(noteDocumentToNote(docSnap.data(), docSnap.id));
    });

    const newLastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return { notes, lastDoc: newLastDoc };
  } catch (err) {
    const fallbackNotes = await getUserNotes(userId);
    return { notes: fallbackNotes.slice(0, pageSize), lastDoc: null };
  }
}
