/**
 * Unit Tests for NotesService (Phase 4 Notes CRUD & Tags)
 */

import {
  createNote,
  updateNote,
  deleteNote,
  getNote,
  getUserNotes,
  getNotesByBook,
  getNotesByTag,
  getUserTags,
  getUserNotesPaginated,
  parseNoteId,
} from '../../src/services/notesService';
import { CreateNoteInput, UpdateNoteInput, PassageReference } from '../../src/types/note';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockStorageMap = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorageMap.set(key, value);
  }),
  getItem: jest.fn(async (key: string) => {
    return mockStorageMap.has(key) ? mockStorageMap.get(key)! : null;
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStorageMap.delete(key);
  }),
  clear: jest.fn(async () => {
    mockStorageMap.clear();
  }),
}));

// Mock Firebase dependencies
const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockDoc = jest.fn((...args: any[]) => ({ id: args[2] || 'generated_doc_id' }));
const mockCollection = jest.fn((...args: any[]) => ({ path: args[1] }));
const mockQuery = jest.fn((...args: any[]) => ({ args }));
const mockWhere = jest.fn((...args: any[]) => ({ field: args[0], op: args[1], val: args[2] }));
const mockLimit = jest.fn((...args: any[]) => ({ limit: args[0] }));
const mockStartAfter = jest.fn((...args: any[]) => ({ startAfter: args[0] }));
const mockServerTimestamp = jest.fn(() => 123456789);

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  limit: (...args: any[]) => mockLimit(...args),
  startAfter: (...args: any[]) => mockStartAfter(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock('../../src/services/firebase', () => ({
  db: { app: 'mock_app' },
  auth: {
    currentUser: {
      uid: 'user_123',
      displayName: 'Test User',
    },
  },
}));

describe('NotesService Unit Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  const samplePassage: PassageReference = {
    display: 'John 3:16–17',
    displayString: 'John 3:16–17',
    books: ['John'],
    segments: [
      {
        book: 'John',
        startChapter: 3,
        startVerse: 16,
        endChapter: 3,
        endVerse: 17,
      },
    ],
  };

  const sampleInput: CreateNoteInput = {
    userId: 'user_123',
    passage: samplePassage,
    lightContent: 'God loved the world',
    questionContent: 'How to live this out?',
    arrowContent: 'Love neighbors today',
    tags: ['grace', 'salvation'],
    visibility: 'friends',
  };

  test('parseNoteId validates note ID correctly', () => {
    expect(parseNoteId('note_1')).toBe('note_1');
    expect(() => parseNoteId('')).toThrow('Note ID is required');
    expect(() => parseNoteId('   ')).toThrow('Note ID is required');
  });

  test('createNote writes to Firestore and stores note in AsyncStorage', async () => {
    mockSetDoc.mockResolvedValueOnce(undefined);

    const note = await createNote(sampleInput);

    expect(note.id).toBe('generated_doc_id');
    expect(note.passage.display).toBe('John 3:16–17');
    expect(note.passage.books).toEqual(['John']);
    expect(note.tags).toEqual(['grace', 'salvation']);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    const cached = await AsyncStorage.getItem('note_generated_doc_id');
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!).passage.display).toBe('John 3:16–17');
  });

  test('createNote queues write in AsyncStorage when offline', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('Network offline'));

    const note = await createNote(sampleInput);
    expect(note.id).toBe('generated_doc_id');

    const offlineQueue = await AsyncStorage.getItem('pending_offline_save_generated_doc_id');
    expect(offlineQueue).not.toBeNull();
  });

  test('updateNote updates Firestore document and updates local cache', async () => {
    const existingDocData = {
      id: 'note_abc',
      user_id: 'user_123',
      book: 'John',
      chapter_start: 3,
      verse_start: 16,
      chapter_end: 3,
      verse_end: 17,
      start_verse_id: 26136,
      end_verse_id: 26137,
      light_content: 'Old Light',
      question_content: 'Old Question',
      arrow_content: 'Old Arrow',
      content: 'Old Content',
      tags: ['grace'],
      visibility: 'friends',
      created_at: 1000,
      updated_at: 1000,
    };

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'note_abc',
      data: () => existingDocData,
    });
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    const updates: UpdateNoteInput = {
      lightContent: 'New Light Truth',
      tags: ['grace', 'faith'],
    };

    const updated = await updateNote('note_abc', updates);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(updated.lightContent).toBe('New Light Truth');
    expect(updated.tags).toEqual(['grace', 'faith']);

    const cached = await AsyncStorage.getItem('note_note_abc');
    expect(JSON.parse(cached!).lightContent).toBe('New Light Truth');
  });

  test('deleteNote removes document from Firestore and AsyncStorage', async () => {
    mockDeleteDoc.mockResolvedValueOnce(undefined);
    await AsyncStorage.setItem('note_del_123', JSON.stringify({ id: 'del_123' }));

    await deleteNote('del_123');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    const cached = await AsyncStorage.getItem('note_del_123');
    expect(cached).toBeNull();
  });

  test('getNote fetches from Firestore and caches locally', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'doc_read',
      data: () => ({
        user_id: 'user_123',
        book: 'Romans',
        chapter_start: 8,
        verse_start: 1,
        chapter_end: 8,
        verse_end: 2,
        start_verse_id: 28100,
        end_verse_id: 28101,
        content: 'No condemnation',
        tags: ['assurance'],
        visibility: 'friends',
        created_at: 1000,
        updated_at: 1000,
      }),
    });

    const note = await getNote('doc_read');
    expect(note).not.toBeNull();
    expect(note?.passage.books).toContain('Romans');

    const cached = await AsyncStorage.getItem('note_doc_read');
    expect(cached).not.toBeNull();
  });

  test('getNote falls back to AsyncStorage on network failure', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('Network error'));
    await AsyncStorage.setItem(
      'note_offline_doc',
      JSON.stringify({
        id: 'offline_doc',
        passage: { display: 'Genesis 1:1', books: ['Genesis'], segments: [{ book: 'Genesis', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 1 }] },
      })
    );

    const note = await getNote('offline_doc');
    expect(note).not.toBeNull();
    expect(note?.passage.books).toContain('Genesis');
  });

  test('getUserNotes returns list sorted by updated_at desc and caches index', async () => {
    mockGetDocs.mockResolvedValueOnce([
      {
        id: 'note_1',
        data: () => ({
          user_id: 'user_123',
          passage: { display: 'Genesis 1:1', books: ['Genesis'], segments: [{ book: 'Genesis', start_chapter: 1, start_verse: 1, end_chapter: 1, end_verse: 1 }] },
          tags: ['creation'],
          updated_at: 1000,
          created_at: 1000,
        }),
      },
      {
        id: 'note_2',
        data: () => ({
          user_id: 'user_123',
          passage: { display: 'John 3:16', books: ['John'], segments: [{ book: 'John', start_chapter: 3, start_verse: 16, end_chapter: 3, end_verse: 16 }] },
          tags: ['love', 'grace'],
          updated_at: 2000,
          created_at: 1000,
        }),
      },
    ]);

    const notes = await getUserNotes('user_123');
    expect(notes.length).toBe(2);
    expect(notes[0].id).toBe('note_2'); // higher updated_at first
    expect(notes[1].id).toBe('note_1');

    const cached = await AsyncStorage.getItem('user_notes_user_123');
    expect(cached).not.toBeNull();
  });

  test('getNotesByBook filters user notes by book', async () => {
    mockGetDocs.mockResolvedValueOnce([
      {
        id: 'note_1',
        data: () => ({
          user_id: 'user_123',
          passage: { display: 'Genesis 1:1', books: ['Genesis'], segments: [{ book: 'Genesis', start_chapter: 1, start_verse: 1, end_chapter: 1, end_verse: 1 }] },
          tags: [],
          updated_at: 1000,
        }),
      },
      {
        id: 'note_2',
        data: () => ({
          user_id: 'user_123',
          passage: { display: 'John 3:16', books: ['John'], segments: [{ book: 'John', start_chapter: 3, start_verse: 16, end_chapter: 3, end_verse: 16 }] },
          tags: [],
          updated_at: 2000,
        }),
      },
    ]);

    const genesisNotes = await getNotesByBook('user_123', 'Genesis');
    expect(genesisNotes.length).toBe(1);
    expect(genesisNotes[0].passage.books).toContain('Genesis');
  });

  test('getNotesByTag filters user notes by tag', async () => {
    mockGetDocs.mockResolvedValueOnce([
      {
        id: 'n1',
        data: () => ({ user_id: 'user_123', book: 'John', tags: ['grace', 'faith'], updated_at: 1000 }),
      },
      {
        id: 'n2',
        data: () => ({ user_id: 'user_123', book: 'Romans', tags: ['faith'], updated_at: 2000 }),
      },
    ]);

    const graceNotes = await getNotesByTag('user_123', 'grace');
    expect(graceNotes.length).toBe(1);
    expect(graceNotes[0].id).toBe('n1');

    mockGetDocs.mockResolvedValueOnce([
      {
        id: 'n1',
        data: () => ({ user_id: 'user_123', book: 'John', tags: ['grace', 'faith'], updated_at: 1000 }),
      },
      {
        id: 'n2',
        data: () => ({ user_id: 'user_123', book: 'Romans', tags: ['faith'], updated_at: 2000 }),
      },
    ]);

    const faithNotes = await getNotesByTag('user_123', 'faith');
    expect(faithNotes.length).toBe(2);
  });

  test('getUserTags collects unique sorted tags across notes', async () => {
    mockGetDocs.mockResolvedValueOnce([
      {
        id: 'n1',
        data: () => ({ user_id: 'user_123', tags: ['hope', 'grace'], updated_at: 1000 }),
      },
      {
        id: 'n2',
        data: () => ({ user_id: 'user_123', tags: ['faith', 'grace', 'prayer'], updated_at: 2000 }),
      },
    ]);

    const tags = await getUserTags('user_123');
    expect(tags).toEqual(['faith', 'grace', 'hope', 'prayer']);
  });

  test('getUserNotesPaginated fetches page and returns cursor', async () => {
    const mockSnapDocs = [
      {
        id: 'p1',
        data: () => ({ user_id: 'user_123', book: 'Acts', tags: [], updated_at: 100 }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({
      forEach: (cb: any) => mockSnapDocs.forEach(cb),
      docs: mockSnapDocs,
    });

    const result = await getUserNotesPaginated('user_123', 10);
    expect(result.notes.length).toBe(1);
    expect(result.lastDoc).toEqual(mockSnapDocs[0]);
  });

  test('createNote writes valid Firestore schema and initializes user_notes cache', async () => {
    mockSetDoc.mockResolvedValueOnce(undefined);

    const inputWithoutContent: CreateNoteInput = {
      userId: 'user_123',
      passage: samplePassage,
      tags: ['salvation'],
      visibility: 'friends',
    };

    const note = await createNote(inputWithoutContent);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    const payload = mockSetDoc.mock.calls[0][1];
    expect(payload.passage.display).toBe('John 3:16–17');
    expect(payload.passage.books).toEqual(['John']);
    expect(payload.passage.segments).toHaveLength(1);
    expect(payload.passage.segments[0].book).toBe('John');

    // Verify string fields sanitized (not undefined)
    expect(payload.light_content).toBe('');
    expect(payload.question_content).toBe('');
    expect(payload.arrow_content).toBe('');

    // Verify user_notes cache was populated even when initially empty
    const userNotesCache = await AsyncStorage.getItem('user_notes_user_123');
    expect(userNotesCache).not.toBeNull();
    const parsedList = JSON.parse(userNotesCache!);
    expect(parsedList).toHaveLength(1);
    expect(parsedList[0].id).toBe(note.id);
  });

  test('createNote and updateNote preserve custom section colors', async () => {
    mockSetDoc.mockResolvedValueOnce(undefined);

    const inputWithCustomColors: CreateNoteInput = {
      userId: 'user_123',
      passage: samplePassage,
      templateId: 'custom_template_1',
      templateName: 'Custom Study',
      sections: [
        { id: 's1', title: 'Deep Dive', icon: 'star-outline', color: '#9584B8', content: 'Deep insight' },
        { id: 's2', title: 'Takeaway', icon: 'flag-outline', color: '#4B9B94', content: 'Actionable takeaway' },
      ],
      tags: ['study'],
      visibility: 'friends',
    };

    const created = await createNote(inputWithCustomColors);
    expect(created.sections).toBeDefined();
    expect(created.sections![0].color).toBe('#9584B8');
    expect(created.sections![1].color).toBe('#4B9B94');

    const firestorePayload = mockSetDoc.mock.calls[0][1];
    expect(firestorePayload.sections[0].color).toBe('#9584B8');
    expect(firestorePayload.sections[1].color).toBe('#4B9B94');

    // Test updateNote preserves custom color
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: created.id,
      data: () => firestorePayload,
    });
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    const updated = await updateNote(created.id, {
      sections: [
        { id: 's1', title: 'Deep Dive', icon: 'star-outline', color: '#9584B8', content: 'Updated insight' },
        { id: 's2', title: 'Takeaway', icon: 'flag-outline', color: '#4B9B94', content: 'Updated takeaway' },
      ],
    });

    expect(updated.sections![0].color).toBe('#9584B8');
    const updatePayload = mockUpdateDoc.mock.calls[0][1];
    expect(updatePayload.sections[0].color).toBe('#9584B8');
  });
});
