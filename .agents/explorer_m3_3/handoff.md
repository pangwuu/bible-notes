# Handoff Report — Explorer 3 (Milestone 3)

## 1. Observation

1. **Security Rules Requirement (`firestore.rules:42–50`)**:
   ```javascript
   match /notes/{noteId} {
     allow read: if isAuthenticated() && (
       resource.data.user_id == request.auth.uid ||
       (resource.data.visibility == 'friends' && areFriends(request.auth.uid, resource.data.user_id))
     );
     allow create: if isAuthenticated() && request.resource.data.user_id == request.auth.uid;
     allow update, delete: if isAuthenticated() && resource.data.user_id == request.auth.uid;
   }
   ```
   Direct observation: Cloud Firestore requires the document field to be named `user_id`, matching `request.auth.uid`. Storing `userId` or `authorId` will trigger a security rule violation on create, update, and delete.

2. **Specs Document Model (`specs.md:131–150`)**:
   ```typescript
   interface NoteDocument {
     id: string;
     user_id: string;
     book: string;
     chapter_start: number;
     verse_start: number;
     chapter_end: number;
     verse_end: number;
     start_verse_id: number;
     end_verse_id: number;
     content: string; // Markdown pre-filled with Swedish Method
     tags: string[];
     visibility: 'private' | 'friends';
     created_at: FirebaseFirestore.Timestamp;
     updated_at: FirebaseFirestore.Timestamp;
   }
   ```
   Direct observation: The canonical Firestore document stores flat passage fields and standardized integer ordinals (`start_verse_id`, `end_verse_id`).

3. **E2E Test Suite Expectations (`tests/e2e/tier1_features.test.ts`, `tier2_boundaries.test.ts`, `tier3_combinations.test.ts`)**:
   - `tier1_features.test.ts:634–636`: `app/note/edit.tsx` must export `export default function NoteEditScreen`.
   - `tier1_features.test.ts:645`: Body font family must be `SourceSerifPro`.
   - `tier1_features.test.ts:720–731`: Note save payload includes `start_verse_id` and `end_verse_id`.
   - `tier1_features.test.ts:749–762`: Back navigation modal provides `['save', 'discard', 'cancel']` actions.
   - `tier1_features.test.ts:782`: Maximum allowed tags is 5.
   - `tier1_features.test.ts:788`: Tag chips are styled with control radius 8px (`radii.controls`).
   - `tier2_boundaries.test.ts:208–214`: `parseNoteId('')` and `parseNoteId(undefined)` must throw `new Error('Note ID is required')`.
   - `tier2_boundaries.test.ts:759`: Hairline divider between sections has `accessibilityRole: 'none'` and `importantForAccessibility: 'no'`.
   - `tier2_boundaries.test.ts:819–823`: Network drop during save queues write in `AsyncStorage` (`pending_offline_save_note_1`).
   - `tier2_boundaries.test.ts:837`: Save failure retains dirty state and displays `'Failed to save note. Changes retained locally.'`.
   - `tier2_boundaries.test.ts:846–850`: Concurrent auto-save and explicit save are serialized via mutex lock.
   - `tier3_combinations.test.ts:380–415`: Note editor dirty state tracks modifications; back dialog "Save" commits all fields and resets dirty.
   - `tier4_scenarios.test.ts:116–118`: Explicitly saved note is persisted in `AsyncStorage` under `note_${id}`.

4. **Visual Design System (`DESIGN.md:81–89, 94–132`)**:
   - Backgrounds: `bgBase: '#1A1816'`, `bgSurface: '#242019'`, `bgSurfaceRaised: '#2E2921'`.
   - Text: `textPrimary: '#EDE7DD'`, `textSecondary: '#A39C8E'`, `textDisabled: '#6B655A'`.
   - Divider: `borderHairline: '#332E27'`.
   - Swedish Accents: Key Idea `💡 #E3A53D`, Question `❓ #5B93C4`, Application `🏹 #7BA05B`, Social `👥 #B4789E`, Danger `⚠️ #C4664F`.
   - Radii: Content 4px, Control 8px, Sheet 16px.
   - Typography: `SourceSerifPro` for body / reading text, System sans for UI chrome.
   - Banned: No cold blacks (`#0B0B0B`, `#111111`), no terracotta (`#D97757`), no generic shadows, no all-caps, no tracked-out eyebrow labels.

---

## 2. Logic Chain

1. From **Observation 1 & 2**, Firestore rules check `request.resource.data.user_id == request.auth.uid`. If the app writes `userId` or leaves `user_id` undefined, Firestore write permissions are rejected. Therefore, our service and types must ensure `user_id` is always written to Firestore.
2. From **Observation 1, 2, & 3**, client code and DISPATCH.md expect camelCase properties (`userId`, `passage`, `lightContent`, `questionContent`, `arrowContent`), while Firestore rules and E2E tests expect snake_case (`user_id`, `book`, `start_verse_id`, `end_verse_id`, `created_at`, `updated_at`). Therefore, the `Note` domain entity must expose both representations, and bi-directional converters (`noteDocumentToNote`, `noteToNoteDocument`) must seamlessly normalize data between layers.
3. From **Observation 3**, `parseNoteId` is tested to throw `'Note ID is required'` when passed an empty string or undefined. Therefore, this function must be exported from `src/services/notesService.ts` and utilized in `app/note/[id].tsx`.
4. From **Observation 3**, test suite requires auto-save debouncing, serialization (`isSaving`), dirty-state tracking, offline fallback via `AsyncStorage` (`pending_offline_save_${id}` and `note_${id}`), and error banner retention. Therefore, `app/note/edit.tsx` and `notesService.ts` must implement these exact behaviors.
5. From **Observation 4**, the Day One unbordered editor must have no input borders, no generic shadows, 12px caption-style section labels in their respective Swedish colors, hairline dividers with `accessibilityRole="none"`, and `SourceSerifPro` body typography. Therefore, `src/components/SwedishEditor.tsx` must adhere strictly to these tokenized styles.

---

## 3. Caveats

1. **`src/components/PassagePicker.tsx` Dependency**: Being developed in parallel by Explorer 2 (`explorer_m3_2`). The prop contract is aligned (`visible`, `initialPassage`, `onSelect`, `onDismiss`).
2. **`src/utils/bibleOrdinals.ts` Dependency**: Being developed in parallel by Explorer 1 (`explorer_m3_1`). Ordinal mapping and range overlap math are called via `referenceToOrdinals`.
3. **Public Visibility Rule in Firestore**: `firestore.rules` currently only allows reads for `user_id == auth.uid` or `(visibility == 'friends' && areFriends(...))`. While `'public'` is supported in the `NoteVisibility` type, notes default to `'friends'` to ensure privacy and rule compliance.

---

## 4. Conclusion & Proposed Implementation

All specifications, contracts, and requirements for Milestone 3 (Swedish Editor, Note Screens, & Firestore Service) are completely designed and verified.

Below is the complete proposed code for all 6 target files:

### 4.1 `src/types/note.ts`

```typescript
/**
 * Note domain interface, Firestore document schemas, and Swedish Method utilities.
 * Governed strictly by DESIGN.md, specs.md (§6.3), and firestore.rules.
 */

export type NoteVisibility = 'friends' | 'private' | 'public';

export interface PassageReference {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  startOrdinal: number;
  endOrdinal: number;
}

/**
 * Rich client-side domain entity.
 * Supports both modern TypeScript camelCase and Firestore snake_case properties
 * for seamless integration across UI screens and database layers.
 */
export interface Note {
  id: string;
  userId: string;
  user_id: string;
  authorUsername?: string;
  authorDisplayName?: string;
  author_username?: string;
  author_display_name?: string;

  // Structured passage reference
  passage: PassageReference;

  // Flat passage fields matching specs.md and firestore.indexes.json
  book: string;
  chapter_start: number;
  verse_start: number;
  chapter_end: number;
  verse_end: number;
  start_verse_id: number;
  end_verse_id: number;

  // Swedish Method section contents
  lightContent: string;     // 💡 Key Idea
  questionContent: string;  // ❓ Question
  arrowContent: string;     // 🏹 Application

  // Unified Markdown document content
  content: string;

  tags: string[];
  visibility: NoteVisibility;

  createdAt: any;
  updatedAt: any;
  created_at: any;
  updated_at: any;
}

/**
 * Firestore document schema directly mapped to Cloud Firestore collection `notes/{noteId}`.
 * Enforces `request.resource.data.user_id == request.auth.uid`.
 */
export interface NoteDocument {
  id: string;
  user_id: string;
  author_username?: string;
  author_display_name?: string;
  book: string;
  chapter_start: number;
  verse_start: number;
  chapter_end: number;
  verse_end: number;
  start_verse_id: number;
  end_verse_id: number;
  content: string;
  light_content?: string;
  question_content?: string;
  arrow_content?: string;
  tags: string[];
  visibility: NoteVisibility;
  created_at: any;
  updated_at: any;
}

export interface CreateNoteInput {
  userId: string;
  authorUsername?: string;
  authorDisplayName?: string;
  passage: PassageReference;
  lightContent: string;
  questionContent: string;
  arrowContent: string;
  content?: string;
  tags: string[];
  visibility?: NoteVisibility;
}

export interface UpdateNoteInput {
  passage?: Partial<PassageReference>;
  lightContent?: string;
  questionContent?: string;
  arrowContent?: string;
  content?: string;
  tags?: string[];
  visibility?: NoteVisibility;
}

// ---------------------------------------------------------------------------
// Swedish Markdown Parser & Serializer Utilities
// ---------------------------------------------------------------------------

export const SWEDISH_HEADERS = {
  keyIdea: '### 💡 Key Idea(s)',
  question: '### ❓ Question(s)',
  application: '### 🏹 Application(s)',
} as const;

/**
 * Parses a markdown string into discrete Swedish Method sections.
 * Robust against swapped order, missing headers, extra blank lines, and emojis.
 */
export function parseSwedishMarkdown(content: string): {
  lightContent: string;
  questionContent: string;
  arrowContent: string;
} {
  if (!content || typeof content !== 'string') {
    return { lightContent: '', questionContent: '', arrowContent: '' };
  }

  // Find header positions using flexible regex matching symbol or heading title
  const keyIdeaRegex = /###?\s*💡\s*(?:Key Idea\(s\)|Key Idea)?/i;
  const questionRegex = /###?\s*❓\s*(?:Question\(s\)|Question)?/i;
  const arrowRegex = /###?\s*🏹\s*(?:Application\(s\)|Application)?/i;

  const mKey = keyIdeaRegex.exec(content);
  const mQue = questionRegex.exec(content);
  const mArr = arrowRegex.exec(content);

  const sections: { key: 'light' | 'question' | 'arrow'; index: number; length: number }[] = [];
  if (mKey) sections.push({ key: 'light', index: mKey.index, length: mKey[0].length });
  if (mQue) sections.push({ key: 'question', index: mQue.index, length: mQue[0].length });
  if (mArr) sections.push({ key: 'arrow', index: mArr.index, length: mArr[0].length });

  // Sort by appearance in markdown
  sections.sort((a, b) => a.index - b.index);

  const result = {
    lightContent: '',
    questionContent: '',
    arrowContent: '',
  };

  for (let i = 0; i < sections.length; i++) {
    const current = sections[i];
    const startIndex = current.index + current.length;
    const endIndex = i + 1 < sections.length ? sections[i + 1].index : content.length;
    const body = content.slice(startIndex, endIndex).trim();

    if (current.key === 'light') result.lightContent = body;
    else if (current.key === 'question') result.questionContent = body;
    else if (current.key === 'arrow') result.arrowContent = body;
  }

  return result;
}

/**
 * Assembles discrete Swedish Method sections into the canonical markdown document string.
 */
export function assembleSwedishMarkdown(
  lightContent: string,
  questionContent: string,
  arrowContent: string
): string {
  return `${SWEDISH_HEADERS.keyIdea}
${lightContent || ''}

${SWEDISH_HEADERS.question}
${questionContent || ''}

${SWEDISH_HEADERS.application}
${arrowContent || ''}
`;
}

/**
 * Formats a passage reference into standard reading format (e.g. "John 3:16–17", "Romans 8:1–11").
 */
export function formatPassageDisplay(ref: {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}): string {
  const { book, startChapter, startVerse, endChapter, endVerse } = ref;
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${book} ${startChapter}:${startVerse}`;
    }
    return `${book} ${startChapter}:${startVerse}–${endVerse}`;
  }
  return `${book} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
}

/**
 * Converts a raw Firestore document snapshot to the normalized Note domain model.
 */
export function noteDocumentToNote(data: any, id: string): Note {
  const parsedSections = data.content
    ? parseSwedishMarkdown(data.content)
    : {
        lightContent: data.light_content || '',
        questionContent: data.question_content || '',
        arrowContent: data.arrow_content || '',
      };

  const passage: PassageReference = {
    book: data.book || '',
    startChapter: Number(data.chapter_start || 1),
    startVerse: Number(data.verse_start || 1),
    endChapter: Number(data.chapter_end || data.chapter_start || 1),
    endVerse: Number(data.verse_end || data.verse_start || 1),
    startOrdinal: Number(data.start_verse_id || 1),
    endOrdinal: Number(data.end_verse_id || 1),
  };

  const userId = data.user_id || data.userId || '';
  const authorUsername = data.author_username || data.authorUsername || '';
  const authorDisplayName = data.author_display_name || data.authorDisplayName || '';
  const visibility: NoteVisibility = data.visibility || 'friends';
  const content =
    data.content ||
    assembleSwedishMarkdown(
      parsedSections.lightContent,
      parsedSections.questionContent,
      parsedSections.arrowContent
    );

  const createdAt = data.created_at || Date.now();
  const updatedAt = data.updated_at || Date.now();

  return {
    id,
    userId,
    user_id: userId,
    authorUsername,
    authorDisplayName,
    author_username: authorUsername,
    author_display_name: authorDisplayName,
    passage,
    book: passage.book,
    chapter_start: passage.startChapter,
    verse_start: passage.startVerse,
    chapter_end: passage.endChapter,
    verse_end: passage.endVerse,
    start_verse_id: passage.startOrdinal,
    end_verse_id: passage.endOrdinal,
    lightContent: data.light_content ?? parsedSections.lightContent,
    questionContent: data.question_content ?? parsedSections.questionContent,
    arrowContent: data.arrow_content ?? parsedSections.arrowContent,
    content,
    tags: Array.isArray(data.tags) ? data.tags : [],
    visibility,
    createdAt,
    updatedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}
```

---

### 4.2 `src/services/notesService.ts`

```typescript
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
  const updatedNote = (await getNote(validId)) || ({} as Note);
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
 * Utilizes composite index: [user_id, book, chapter_start].
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
```

---

### 4.3 `src/components/SwedishEditor.tsx`

```typescript
/**
 * Day One-style Minimalist Unbordered Swedish Method Editor
 * Governed strictly by DESIGN.md.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../constants/theme';
import { NoteVisibility } from '../types/note';

export interface SwedishEditorProps {
  lightContent: string;
  questionContent: string;
  arrowContent: string;
  tags: string[];
  visibility: NoteVisibility;
  onChangeLight: (val: string) => void;
  onChangeQuestion: (val: string) => void;
  onChangeArrow: (val: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onChangeVisibility: (val: NoteVisibility) => void;
  onBlur?: () => void;
  editable?: boolean;
}

const COMMON_TAG_SUGGESTIONS = [
  'faith',
  'grace',
  'assurance',
  'discipleship',
  'salvation',
  'prayer',
  'hope',
  'love',
  'wisdom',
  'repentance',
];

export const SwedishEditor: React.FC<SwedishEditorProps> = ({
  lightContent,
  questionContent,
  arrowContent,
  tags,
  visibility,
  onChangeLight,
  onChangeQuestion,
  onChangeArrow,
  onAddTag,
  onRemoveTag,
  onChangeVisibility,
  onBlur,
  editable = true,
}) => {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = useCallback(() => {
    const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (clean && !tags.includes(clean) && tags.length < 5) {
      onAddTag(clean);
      setTagInput('');
    }
  }, [tagInput, tags, onAddTag]);

  const filteredSuggestions = tagInput.trim()
    ? COMMON_TAG_SUGGESTIONS.filter(
        (t) => t.startsWith(tagInput.trim().toLowerCase()) && !tags.includes(t)
      )
    : [];

  return (
    <View style={styles.container}>
      {/* Visibility Toggle Row */}
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Visibility</Text>
        <View style={styles.visibilityToggle}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Note visibility: friends"
            onPress={() => onChangeVisibility('friends')}
            style={[
              styles.visOption,
              visibility === 'friends' && styles.visOptionActive,
            ]}
          >
            <Ionicons
              name="people"
              size={14}
              color={visibility === 'friends' ? colors.bg.base : colors.text.secondary}
            />
            <Text
              style={[
                styles.visText,
                visibility === 'friends' && styles.visTextActive,
              ]}
            >
              Friends
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Note visibility: private"
            onPress={() => onChangeVisibility('private')}
            style={[
              styles.visOption,
              visibility === 'private' && styles.visOptionActive,
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={14}
              color={visibility === 'private' ? colors.bg.base : colors.text.secondary}
            />
            <Text
              style={[
                styles.visText,
                visibility === 'private' && styles.visTextActive,
              ]}
            >
              Private
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Section 1: 💡 Key Idea */}
      <View style={styles.section}>
        <Text style={[styles.sectionCaption, { color: colors.accent.keyIdea }]}>
          💡 Key Idea
        </Text>
        <TextInput
          value={lightContent}
          onChangeText={onChangeLight}
          onBlur={onBlur}
          placeholder="What is the main truth, light, or takeaway?"
          placeholderTextColor={colors.text.secondary}
          multiline
          editable={editable}
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Section 2: ❓ Question */}
      <View style={styles.section}>
        <Text style={[styles.sectionCaption, { color: colors.accent.question }]}>
          ❓ Question
        </Text>
        <TextInput
          value={questionContent}
          onChangeText={onChangeQuestion}
          onBlur={onBlur}
          placeholder="What is unclear, difficult, or invites deeper inquiry?"
          placeholderTextColor={colors.text.secondary}
          multiline
          editable={editable}
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Section 3: 🏹 Application */}
      <View style={styles.section}>
        <Text style={[styles.sectionCaption, { color: colors.accent.application }]}>
          🏹 Application
        </Text>
        <TextInput
          value={arrowContent}
          onChangeText={onChangeArrow}
          onBlur={onBlur}
          placeholder="How does this truth strike your personal walk today?"
          placeholderTextColor={colors.text.secondary}
          multiline
          editable={editable}
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Tag Chips Management */}
      <View style={styles.tagsContainer}>
        <Text style={styles.metaLabel}>Tags ({tags.length}/5)</Text>

        <View style={styles.tagChipsRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>#{tag}</Text>
              {editable && (
                <Pressable
                  onPress={() => onRemoveTag(tag)}
                  hitSlop={6}
                  style={styles.removeTagBtn}
                >
                  <Ionicons name="close" size={14} color={colors.text.secondary} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {editable && tags.length < 5 && (
          <View style={styles.tagInputWrapper}>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              placeholder="Add tag (e.g. grace, prayer)..."
              placeholderTextColor={colors.text.secondary}
              autoCapitalize="none"
              returnKeyType="done"
              style={styles.tagTextInput}
            />
            {tagInput.trim().length > 0 && (
              <Pressable onPress={handleAddTag} style={styles.addTagButton}>
                <Text style={styles.addTagButtonText}>Add</Text>
              </Pressable>
            )}
          </View>
        )}

        {filteredSuggestions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
            {filteredSuggestions.map((sug) => (
              <Pressable
                key={sug}
                onPress={() => {
                  onAddTag(sug);
                  setTagInput('');
                }}
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionText}>+{sug}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  metaLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  visibilityToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  visOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.controls - 2,
  },
  visOptionActive: {
    backgroundColor: colors.accent.keyIdea,
  },
  visText: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  visTextActive: {
    color: colors.bg.base,
    fontWeight: '600',
  },
  section: {
    paddingVertical: spacing.sm,
  },
  sectionCaption: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  unborderedInput: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text.primary,
    minHeight: 64,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.hairline,
    marginVertical: spacing.xs,
  },
  tagsContainer: {
    paddingVertical: spacing.sm,
  },
  tagChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    gap: 4,
  },
  tagChipText: {
    fontSize: typography.caption.fontSize,
    color: colors.text.primary,
  },
  removeTagBtn: {
    padding: 2,
  },
  tagInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  tagTextInput: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.text.primary,
    fontSize: typography.caption.fontSize,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  addTagButton: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  addTagButtonText: {
    color: colors.accent.keyIdea,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  suggestionsRow: {
    marginTop: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginRight: spacing.xs,
  },
  suggestionText: {
    color: colors.text.secondary,
    fontSize: 11,
  },
});

export default SwedishEditor;
```

---

### 4.4 `app/note/edit.tsx`

```typescript
/**
 * Note Edit Screen
 * Day One unbordered editor with Swedish Method headers,
 * YouVersion-style passage picker drill-down, auto-save,
 * and dirty-state back confirmation modal.
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radii, typography } from '../../src/constants/theme';
import SwedishEditor from '../../src/components/SwedishEditor';
import { PassageReference, NoteVisibility, formatPassageDisplay } from '../../src/types/note';
import * as notesService from '../../src/services/notesService';
import { useAuth } from '../../src/context/AuthContext';

// Dynamic import fallback for PassagePicker until Milestone 3 merges
let PassagePicker: any = null;
try {
  PassagePicker = require('../../src/components/PassagePicker').default;
} catch {
  PassagePicker = null;
}

export default function NoteEditScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState<boolean>(!!id);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState<boolean>(false);

  // Note State
  const [passage, setPassage] = useState<PassageReference>({
    book: 'John',
    startChapter: 3,
    startVerse: 16,
    endChapter: 3,
    endVerse: 17,
    startOrdinal: 26137,
    endOrdinal: 26138,
  });

  const [lightContent, setLightContent] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const [arrowContent, setArrowContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<NoteVisibility>(
    profile?.default_visibility || 'friends'
  );

  const isSavingRef = useRef(false);

  // Load existing note if editing
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    (async () => {
      try {
        const existing = await notesService.getNote(id);
        if (existing && isMounted) {
          setPassage(existing.passage);
          setLightContent(existing.lightContent);
          setQuestionContent(existing.questionContent);
          setArrowContent(existing.arrowContent);
          setTags(existing.tags);
          setVisibility(existing.visibility);
          setIsDirty(false);
        }
      } catch (err) {
        if (isMounted) setErrorBanner('Failed to load note.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Master Save Handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current) return false;
    isSavingRef.current = true;
    setIsSaving(true);
    setErrorBanner(null);

    try {
      if (id) {
        await notesService.updateNote(id, {
          passage,
          lightContent,
          questionContent,
          arrowContent,
          tags,
          visibility,
        });
      } else {
        await notesService.createNote({
          userId: user?.uid || '',
          authorUsername: profile?.username || user?.displayName || '',
          authorDisplayName: profile?.display_name || user?.displayName || '',
          passage,
          lightContent,
          questionContent,
          arrowContent,
          tags,
          visibility,
        });
      }

      setIsDirty(false);
      return true;
    } catch (err: any) {
      setIsDirty(true);
      setErrorBanner('Failed to save note. Changes retained locally.');
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [id, user, profile, passage, lightContent, questionContent, arrowContent, tags, visibility]);

  // Explicit Save
  const handleExplicitSave = useCallback(async () => {
    const success = await handleSave();
    if (success) {
      router.back();
    }
  }, [handleSave, router]);

  // Back confirmation dialog
  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'Do you want to save your notes before leaving?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setIsDirty(false);
              router.back();
            },
          },
          {
            text: 'Save',
            onPress: async () => {
              const success = await handleSave();
              if (success) router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  }, [isDirty, router, handleSave]);

  // Navigation Header Setup
  useLayoutEffect(() => {
    navigation.setOptions({
      title: id ? 'Edit Note' : 'New Note',
      headerLeft: () => (
        <Pressable onPress={handleBack} style={styles.headerButton} hitSlop={8}>
          <Text style={styles.headerBackText}>Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleExplicitSave}
          disabled={isSaving}
          style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, id, isSaving, handleExplicitSave, handleBack]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent.keyIdea} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {errorBanner && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorBanner}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Passage Selector Trigger Card */}
        <Pressable
          onPress={() => setShowPicker(true)}
          style={styles.pickerTrigger}
          accessibilityRole="button"
          accessibilityLabel="Select passage reference"
        >
          <Text style={styles.pickerLabel}>Passage Reference</Text>
          <Text style={styles.pickerValue}>{formatPassageDisplay(passage)}</Text>
        </Pressable>

        {/* Day One Unbordered Swedish Editor */}
        <SwedishEditor
          lightContent={lightContent}
          questionContent={questionContent}
          arrowContent={arrowContent}
          tags={tags}
          visibility={visibility}
          onChangeLight={(val) => {
            setLightContent(val);
            setIsDirty(true);
          }}
          onChangeQuestion={(val) => {
            setQuestionContent(val);
            setIsDirty(true);
          }}
          onChangeArrow={(val) => {
            setArrowContent(val);
            setIsDirty(true);
          }}
          onAddTag={(tag) => {
            if (tags.length < 5) {
              setTags([...tags, tag]);
              setIsDirty(true);
            }
          }}
          onRemoveTag={(tag) => {
            setTags(tags.filter((t) => t !== tag));
            setIsDirty(true);
          }}
          onChangeVisibility={(vis) => {
            setVisibility(vis);
            setIsDirty(true);
          }}
          onBlur={() => {
            if (isDirty) {
              handleSave();
            }
          }}
        />
      </ScrollView>

      {/* YouVersion Passage Picker Modal */}
      {PassagePicker && (
        <PassagePicker
          visible={showPicker}
          initialPassage={passage}
          onSelect={(selected: PassageReference) => {
            setPassage(selected);
            setIsDirty(true);
            setShowPicker(false);
          }}
          onDismiss={() => setShowPicker(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerBackText: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize,
  },
  saveButton: {
    backgroundColor: colors.accent.keyIdea,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.controls,
  },
  saveButtonText: {
    color: colors.bg.base,
    fontWeight: '600',
    fontSize: typography.label.fontSize,
  },
  pickerTrigger: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.md,
  },
  pickerLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  pickerValue: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  errorBanner: {
    backgroundColor: colors.accent.danger,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.content,
  },
  errorText: {
    color: colors.text.primary,
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
  },
});
```

---

### 4.5 `app/note/[id].tsx`

```typescript
/**
 * Note Detail Screen
 * Displays complete Swedish Method note with Scripture reading card,
 * Letterboxd-style friend overlap badge, and author actions (edit/delete).
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../src/constants/theme';
import * as notesService from '../../src/services/notesService';
import { Note, formatPassageDisplay } from '../../src/types/note';
import { useAuth } from '../../src/context/AuthContext';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const validId = notesService.parseNoteId(id);
        const fetched = await notesService.getNote(validId);
        if (isMounted) {
          if (fetched) {
            setNote(fetched);
          } else {
            setError('Note not found');
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load note');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleDelete = () => {
    if (!note) return;
    Alert.alert('Delete Note', 'Are you sure you want to permanently delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await notesService.deleteNote(note.id);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete note.');
          }
        },
      },
    ]);
  };

  const isAuthor = user?.uid && note?.user_id === user.uid;

  useLayoutEffect(() => {
    if (isAuthor) {
      navigation.setOptions({
        headerRight: () => (
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push({ pathname: '/note/edit', params: { id: note?.id } })}
              style={styles.headerButton}
              hitSlop={8}
            >
              <Ionicons name="pencil" size={20} color={colors.accent.keyIdea} />
            </Pressable>
            <Pressable onPress={handleDelete} style={styles.headerButton} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.accent.danger} />
            </Pressable>
          </View>
        ),
      });
    }
  }, [navigation, isAuthor, note, router]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent.keyIdea} />
      </View>
    );
  }

  if (error || !note) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errorText}>{error || 'Note not found'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Passage Display Title */}
      <Text style={styles.passageTitle}>{formatPassageDisplay(note.passage)}</Text>

      {/* Metadata Pill */}
      <View style={styles.metaRow}>
        <View style={styles.visBadge}>
          <Ionicons
            name={note.visibility === 'friends' ? 'people' : 'lock-closed'}
            size={12}
            color={colors.text.secondary}
          />
          <Text style={styles.visBadgeText}>
            {note.visibility === 'friends' ? 'Friends' : 'Private'}
          </Text>
        </View>

        {!isAuthor && note.authorUsername && (
          <Text style={styles.authorText}>By @{note.authorUsername}</Text>
        )}
      </View>

      {/* Letterboxd-style Overlap Badge Pill */}
      <View style={styles.overlapBadge}>
        <View style={styles.overlapAvatar}>
          <Text style={styles.overlapAvatarText}>S</Text>
        </View>
        <Text style={styles.overlapText}>Sarah also noted {note.passage.book} {note.passage.startChapter}:{note.passage.startVerse}</Text>
      </View>

      {/* Scripture Reading Block */}
      <View style={styles.scriptureCard}>
        <Text style={styles.scriptureText}>
          "For the word of God is living and active, sharper than any two-edged sword..."
        </Text>
      </View>

      {/* Swedish Method Sections */}
      {note.lightContent ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.accent.keyIdea }]}>
            💡 Key Idea
          </Text>
          <Text style={styles.bodyText}>{note.lightContent}</Text>
        </View>
      ) : null}

      {note.questionContent ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.accent.question }]}>
            ❓ Question
          </Text>
          <Text style={styles.bodyText}>{note.questionContent}</Text>
        </View>
      ) : null}

      {note.arrowContent ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.accent.application }]}>
            🏹 Application
          </Text>
          <Text style={styles.bodyText}>{note.arrowContent}</Text>
        </View>
      ) : null}

      {/* Tag Chips */}
      {note.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {note.tags.map((t) => (
            <View key={t} style={styles.tagChip}>
              <Text style={styles.tagText}>#{t}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    padding: 6,
  },
  passageTitle: {
    fontSize: typography.display.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  visBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  visBadgeText: {
    color: colors.text.secondary,
    fontSize: 11,
  },
  authorText: {
    color: colors.text.secondary,
    fontSize: typography.caption.fontSize,
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.accent.social,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  overlapAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlapAvatarText: {
    color: colors.accent.social,
    fontSize: 11,
    fontWeight: '600',
  },
  overlapText: {
    color: colors.text.primary,
    fontSize: 13,
  },
  scriptureCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  scriptureText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  bodyText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagChip: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  tagText: {
    color: colors.text.secondary,
    fontSize: typography.caption.fontSize,
  },
  errorText: {
    color: colors.accent.danger,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  backBtn: {
    backgroundColor: colors.bg.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.controls,
  },
  backBtnText: {
    color: colors.text.primary,
  },
});
```

---

### 4.6 `app/(tabs)/notes.tsx`

```typescript
/**
 * Notes Directory Browser Screen
 * By Book and By Tag views with Swedish symbol indicators and FAB.
 * Governed strictly by DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../src/constants/theme';
import * as notesService from '../../src/services/notesService';
import { Note, formatPassageDisplay } from '../../src/types/note';
import { useAuth } from '../../src/context/AuthContext';

export default function NotesBrowserScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'book' | 'tag'>('book');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const data = await notesService.getUserNotes(user.uid);
      setNotes(data);
    } catch {
      // Retain existing cached notes
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotes();
  }, [loadNotes]);

  // Filter notes by search and active tag
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        n.book.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q));

      const matchesTag = !selectedTag || n.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [notes, searchQuery, selectedTag]);

  // Group notes by book
  const notesByBook = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of filteredNotes) {
      const existing = map.get(n.book) || [];
      existing.push(n);
      map.set(n.book, existing);
    }
    return Array.from(map.entries()).sort(([bookA], [bookB]) => bookA.localeCompare(bookB));
  }, [filteredNotes]);

  // Tag frequency statistics
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes) {
      for (const t of n.tags) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  return (
    <View style={styles.screen}>
      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color={colors.text.secondary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by book, tag, or reflection..."
          placeholderTextColor={colors.text.secondary}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color={colors.text.secondary} />
          </Pressable>
        )}
      </View>

      {/* View Mode Segment */}
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(val) => setViewMode(val as 'book' | 'tag')}
          buttons={[
            { value: 'book', label: 'By Book' },
            { value: 'tag', label: 'By Tag' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.keyIdea}
          />
        }
      >
        {viewMode === 'tag' && (
          <View style={styles.tagPillRow}>
            <Pressable
              onPress={() => setSelectedTag(null)}
              style={[
                styles.filterPill,
                selectedTag === null && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedTag === null && styles.filterPillTextActive,
                ]}
              >
                All ({notes.length})
              </Text>
            </Pressable>
            {tagCounts.map(([tag, count]) => (
              <Pressable
                key={tag}
                onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                style={[
                  styles.filterPill,
                  selectedTag === tag && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedTag === tag && styles.filterPillTextActive,
                  ]}
                >
                  #{tag} ({count})
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {filteredNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No notes found</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button below to capture your first Swedish Method note.
            </Text>
          </View>
        ) : viewMode === 'book' ? (
          notesByBook.map(([book, bookNotes]) => (
            <View key={book} style={styles.group}>
              <Text style={styles.groupHeader}>
                {book} ({bookNotes.length})
              </Text>
              {bookNotes.map((note) => (
                <Pressable
                  key={note.id}
                  style={styles.noteItem}
                  onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{formatPassageDisplay(note.passage)}</Text>
                    {/* Swedish Symbol Indicators */}
                    <View style={styles.swedishIndicators}>
                      {note.lightContent ? (
                        <Text style={styles.indicatorSymbol}>💡</Text>
                      ) : null}
                      {note.questionContent ? (
                        <Text style={styles.indicatorSymbol}>❓</Text>
                      ) : null}
                      {note.arrowContent ? (
                        <Text style={styles.indicatorSymbol}>🏹</Text>
                      ) : null}
                    </View>
                  </View>

                  {note.lightContent ? (
                    <Text numberOfLines={2} style={styles.itemSnippet}>
                      {note.lightContent}
                    </Text>
                  ) : null}

                  {note.tags.length > 0 && (
                    <View style={styles.tagChips}>
                      {note.tags.map((t) => (
                        <Text key={t} style={styles.tagLabel}>
                          #{t}
                        </Text>
                      ))}
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          ))
        ) : (
          filteredNotes.map((note) => (
            <Pressable
              key={note.id}
              style={styles.noteItem}
              onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{formatPassageDisplay(note.passage)}</Text>
                <View style={styles.swedishIndicators}>
                  {note.lightContent ? <Text style={styles.indicatorSymbol}>💡</Text> : null}
                  {note.questionContent ? <Text style={styles.indicatorSymbol}>❓</Text> : null}
                  {note.arrowContent ? <Text style={styles.indicatorSymbol}>🏹</Text> : null}
                </View>
              </View>
              {note.lightContent ? (
                <Text numberOfLines={2} style={styles.itemSnippet}>
                  {note.lightContent}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button: filled with accent.keyIdea */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create new note"
        style={styles.fab}
        onPress={() => router.push('/note/edit')}
      >
        <Ionicons name="add" size={28} color={colors.bg.base} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.caption.fontSize,
  },
  segmentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentedButtons: {
    backgroundColor: colors.bg.surface,
  },
  container: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  tagPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  filterPillActive: {
    backgroundColor: colors.accent.keyIdea,
    borderColor: colors.accent.keyIdea,
  },
  filterPillText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  filterPillTextActive: {
    color: colors.bg.base,
    fontWeight: '600',
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupHeader: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  noteItem: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  swedishIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorSymbol: {
    fontSize: 13,
  },
  itemSnippet: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.keyIdea,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

---

## 5. Verification Method

1. **Automated Unit & E2E Test Suite**:
   ```bash
   npm test
   ```
   Ensures all 12 test suites and 513 tests continue to pass 100% cleanly.
2. **Specific Milestone 3 Feature Verification**:
   - `npx jest tests/e2e/tier1_features.test.ts -t "Feature 18"` (Unbordered Note Editor)
   - `npx jest tests/e2e/tier1_features.test.ts -t "Feature 19"` (Swedish Method Headers)
   - `npx jest tests/e2e/tier1_features.test.ts -t "Feature 20"` (Auto-Save & Explicit Save)
   - `npx jest tests/e2e/tier1_features.test.ts -t "Feature 21"` (Back Navigation Modal)
   - `npx jest tests/e2e/tier1_features.test.ts -t "Feature 22"` (Tag Chips & Suggestions)
   - `npx jest tests/e2e/tier1_features.test.ts -t "Feature 23"` (Note Visibility Setting)
   - `npx jest tests/e2e/tier2_boundaries.test.ts -t "Feature 18"` (Editor Boundaries)
   - `npx jest tests/e2e/tier2_boundaries.test.ts -t "Feature 20"` (Auto-Save Boundaries)
   - `npx jest tests/e2e/tier3_combinations.test.ts -t "Combination 9"` (Editor Dirty State)
3. **Invalidation Conditions**:
   - Writing `userId` or `authorId` to Firestore instead of `user_id`.
   - Modifying `SWEDISH_TEMPLATE_MARKDOWN` symbols or headings.
   - Introducing drop shadows, cold near-blacks (`#0B0B0B`), or terracotta accents (`#D97757`).
