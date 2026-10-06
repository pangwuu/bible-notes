/**
 * Unit Tests for NotesService Offline Fallback, Network Drops, and Storage Resilience
 * Covers Area 2 of the Failure Modes Test Plan:
 * - createNote network failure -> writes pending offline queue and caches note locally
 * - updateNote network failure -> stores delta payload in pending offline queue
 * - deleteNote network failure -> resilient local cache cleanup
 * - corrupt local storage JSON handling -> returns null / empty array safely without crash
 * - getUserNotes network failure -> falls back cleanly to local user cache
 */

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
  getAllKeys: jest.fn(async () => {
    return Array.from(mockStorageMap.keys());
  }),
}));

import {
  createNote,
  updateNote,
  deleteNote,
  getNote,
  getUserNotes,
  getUserNotesPaginated,
} from '../../src/services/notesService';
import { CreateNoteInput, UpdateNoteInput, PassageReference } from '../../src/types/note';

const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockDoc = jest.fn((...args: any[]) => ({ id: args[2] || 'offline_generated_id' }));
const mockCollection = jest.fn((...args: any[]) => ({ path: args[1] }));
const mockQuery = jest.fn((...args: any[]) => ({ args }));
const mockWhere = jest.fn((...args: any[]) => ({ field: args[0], op: args[1], val: args[2] }));
const mockLimit = jest.fn((...args: any[]) => ({ limit: args[0] }));
const mockStartAfter = jest.fn((...args: any[]) => ({ startAfter: args[0] }));
const mockServerTimestamp = jest.fn(() => 1700000000);
const mockDeleteField = jest.fn(() => '__DELETE_FIELD__');

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
  deleteField: () => mockDeleteField(),
}));

jest.mock('../../src/services/firebase', () => ({
  db: { app: 'mock_app' },
  auth: {
    currentUser: {
      uid: 'offline_user_999',
      displayName: 'Offline Apostle',
    },
  },
}));

describe('Area 2: Notes Service Offline Fallback & Network Failures', () => {
  const samplePassage: PassageReference = {
    display: 'Romans 8:28',
    displayString: 'Romans 8:28',
    books: ['Romans'],
    segments: [
      {
        book: 'Romans',
        startChapter: 8,
        startVerse: 28,
        endChapter: 8,
        endVerse: 28,
      },
    ],
  };

  const sampleInput: CreateNoteInput = {
    userId: 'offline_user_999',
    passage: samplePassage,
    lightContent: 'All things work together for good',
    questionContent: 'Even during suffering?',
    arrowContent: 'Trust God through hardship',
    tags: ['providence', 'sovereignty'],
    visibility: 'private',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('createNote network failures', () => {
    test('queues payload to pending_offline_save and caches locally when setDoc rejects with network error', async () => {
      mockSetDoc.mockRejectedValueOnce(new Error('Network connection lost'));

      const note = await createNote(sampleInput);

      expect(note.id).toBe('offline_generated_id');
      expect(note.userId).toBe('offline_user_999');
      expect(note.lightContent).toBe('All things work together for good');

      // Verify pending offline save was queued
      const pendingQueue = await AsyncStorage.getItem('pending_offline_save_offline_generated_id');
      expect(pendingQueue).not.toBeNull();
      const parsedQueue = JSON.parse(pendingQueue!);
      expect(parsedQueue.id).toBe('offline_generated_id');
      expect(parsedQueue.light_content).toBe('All things work together for good');
      expect(parsedQueue.visibility).toBe('private');

      // Verify note is also cached in local storage for immediate access
      const cachedNote = await AsyncStorage.getItem('note_offline_generated_id');
      expect(cachedNote).not.toBeNull();
      const parsedNote = JSON.parse(cachedNote!);
      expect(parsedNote.id).toBe('offline_generated_id');
      expect(parsedNote.passage.display).toBe('Romans 8:28');

      // Verify user_notes list cache is populated with new note
      const userNotes = await AsyncStorage.getItem('user_notes_offline_user_999');
      expect(userNotes).not.toBeNull();
      const parsedList = JSON.parse(userNotes!);
      expect(parsedList).toHaveLength(1);
      expect(parsedList[0].id).toBe('offline_generated_id');
    });

    test('prepends new note to existing user_notes cache even if Firestore setDoc fails', async () => {
      mockSetDoc.mockRejectedValueOnce(new Error('Firestore unavailable'));

      const existingNotes = [
        {
          id: 'pre_existing_note_1',
          userId: 'offline_user_999',
          title: 'Older note',
          passage: samplePassage,
          sections: [],
          tags: ['old'],
          visibility: 'private' as const,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];
      await AsyncStorage.setItem('user_notes_offline_user_999', JSON.stringify(existingNotes));

      await createNote(sampleInput);

      const userNotes = await AsyncStorage.getItem('user_notes_offline_user_999');
      const parsedList = JSON.parse(userNotes!);
      expect(parsedList).toHaveLength(2);
      expect(parsedList[0].id).toBe('offline_generated_id');
      expect(parsedList[1].id).toBe('pre_existing_note_1');
    });
  });

  describe('updateNote network failures', () => {
    test('queues delta updates to pending_offline_save and updates local cache when updateDoc rejects', async () => {
      // Mock existing note in local cache
      const cachedExisting = {
        id: 'note_update_123',
        userId: 'offline_user_999',
        passage: samplePassage,
        title: 'Original Title',
        lightContent: 'Original Light',
        tags: ['original'],
        visibility: 'private' as const,
        createdAt: 1000,
        updatedAt: 1000,
      };
      await AsyncStorage.setItem('note_note_update_123', JSON.stringify(cachedExisting));

      // Network error during updateDoc
      mockUpdateDoc.mockRejectedValueOnce(new Error('Network timeout'));

      const updates: UpdateNoteInput = {
        title: 'Updated Offline Title',
        lightContent: 'Refined Light Content',
        tags: ['updated', 'offline'],
      };

      const result = await updateNote('note_update_123', updates);

      // Verify returned object reflects the update
      expect(result.title).toBe('Updated Offline Title');
      expect(result.lightContent).toBe('Refined Light Content');
      expect(result.tags).toEqual(['updated', 'offline']);

      // Verify pending offline delta was saved
      const pendingDelta = await AsyncStorage.getItem('pending_offline_save_note_update_123');
      expect(pendingDelta).not.toBeNull();
      const parsedDelta = JSON.parse(pendingDelta!);
      expect(parsedDelta.title).toBe('Updated Offline Title');
      expect(parsedDelta.light_content).toBe('Refined Light Content');
      expect(parsedDelta.tags).toEqual(['updated', 'offline']);

      // Verify updated note was written to note_ cache
      const updatedCache = await AsyncStorage.getItem('note_note_update_123');
      expect(JSON.parse(updatedCache!).title).toBe('Updated Offline Title');
    });

    test('throws descriptive error if updating note that exists neither on Firestore nor in local cache', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      await expect(
        updateNote('non_existent_note', { title: 'Ghost Note' })
      ).rejects.toThrow('Note non_existent_note not found');
    });
  });

  describe('deleteNote network failures and local resilience', () => {
    test('cleans up local cache and pending writes even when deleteDoc rejects', async () => {
      const noteToDelete = {
        id: 'note_del_999',
        userId: 'offline_user_999',
        passage: samplePassage,
        tags: [],
        visibility: 'private' as const,
      };
      await AsyncStorage.setItem('note_note_del_999', JSON.stringify(noteToDelete));
      await AsyncStorage.setItem(
        'pending_offline_save_note_del_999',
        JSON.stringify({ some: 'pending write' })
      );
      await AsyncStorage.setItem(
        'user_notes_offline_user_999',
        JSON.stringify([noteToDelete, { id: 'other_note', passage: samplePassage }])
      );

      mockDeleteDoc.mockRejectedValueOnce(new Error('Delete rejected: offline'));

      // Should complete without throwing
      await expect(deleteNote('note_del_999')).resolves.not.toThrow();

      // Verify both note cache and pending offline saves are wiped
      const noteCache = await AsyncStorage.getItem('note_note_del_999');
      expect(noteCache).toBeNull();

      const pendingCache = await AsyncStorage.getItem('pending_offline_save_note_del_999');
      expect(pendingCache).toBeNull();

      // Verify removed from user_notes cache
      const userList = await AsyncStorage.getItem('user_notes_offline_user_999');
      const parsedList = JSON.parse(userList!);
      expect(parsedList).toHaveLength(1);
      expect(parsedList[0].id).toBe('other_note');
    });
  });

  describe('Corrupted local storage handling', () => {
    test('getNote gracefully returns null when local cache contains corrupted JSON', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Network offline'));
      await AsyncStorage.setItem('note_corrupt_id', '{ malformed_json:::');

      const result = await getNote('corrupt_id');
      expect(result).toBeNull();
    });

    test('getUserNotes gracefully returns empty array when cached list contains corrupted JSON', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Network offline'));
      await AsyncStorage.setItem('user_notes_offline_user_999', 'INVALID_JSON_CONTENT!!!');

      const result = await getUserNotes('offline_user_999');
      expect(result).toEqual([]);
    });

    test('getUserNotesPaginated falls back safely to getUserNotes on network failure', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Network error on cursor query'));

      const cachedUserNotes = [
        {
          id: 'note_paginated_1',
          userId: 'offline_user_999',
          passage: samplePassage,
          tags: [],
          visibility: 'private' as const,
          updated_at: 1000,
        },
      ];
      await AsyncStorage.setItem(
        'user_notes_offline_user_999',
        JSON.stringify(cachedUserNotes)
      );

      const paginatedResult = await getUserNotesPaginated('offline_user_999', 10);
      expect(paginatedResult.notes).toHaveLength(1);
      expect(paginatedResult.notes[0].id).toBe('note_paginated_1');
      expect(paginatedResult.lastDoc).toBeNull();
    });
  });
});
