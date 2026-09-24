/**
 * Comprehensive Unit Tests for Note Overlap Discovery & Calculations (Stage 7)
 */

import {
  findFriendNoteOverlaps,
  notifyFriendsOfNoteOverlap,
} from '../../src/services/noteOverlapService';
import { checkRangeOverlap, referenceToOrdinals } from '../../src/utils/bibleOrdinals';
import { Note, PassageReference } from '../../src/types/note';

// Mock Firebase dependencies
const mockGetDocs = jest.fn();
const mockSetDoc = jest.fn();
const mockDoc = jest.fn((...args: any[]) => ({ id: args[2] || 'mock_doc_id' }));
const mockCollection = jest.fn((...args: any[]) => ({ path: args[1] }));
const mockQuery = jest.fn((...args: any[]) => ({ args }));
const mockWhere = jest.fn((...args: any[]) => ({ field: args[0], op: args[1], val: args[2] }));

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  serverTimestamp: () => 123456789,
}));

jest.mock('../../src/services/firebase', () => ({
  db: {},
}));

const mockGetFriends = jest.fn();
jest.mock('../../src/services/friendService', () => ({
  getFriends: (...args: any[]) => mockGetFriends(...args),
}));

describe('Note Overlap Math & Discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pure Mathematical Closed Interval Overlap [s1, e1] and [s2, e2]', () => {
    test('exact identical range overlap', () => {
      const res = checkRangeOverlap([100, 110], [100, 110]);
      expect(res.overlaps).toBe(true);
      expect(res.overlapRange).toEqual([100, 110]);
    });

    test('partial overlap: range A begins before range B and ends inside B', () => {
      const res = checkRangeOverlap([10, 25], [20, 35]);
      expect(res.overlaps).toBe(true);
      expect(res.overlapRange).toEqual([20, 25]);
    });

    test('partial overlap: range B begins before range A and ends inside A', () => {
      const res = checkRangeOverlap([50, 70], [40, 55]);
      expect(res.overlaps).toBe(true);
      expect(res.overlapRange).toEqual([50, 55]);
    });

    test('complete containment: range A inside range B', () => {
      const res = checkRangeOverlap([20, 30], [10, 40]);
      expect(res.overlaps).toBe(true);
      expect(res.overlapRange).toEqual([20, 30]);
    });

    test('complete containment: range B inside range A', () => {
      const res = checkRangeOverlap([5, 50], [15, 25]);
      expect(res.overlaps).toBe(true);
      expect(res.overlapRange).toEqual([15, 25]);
    });

    test('single-verse boundary touch (overlap at exact border verse)', () => {
      const res = checkRangeOverlap([10, 20], [20, 30]);
      expect(res.overlaps).toBe(true);
      expect(res.overlapRange).toEqual([20, 20]);
    });

    test('strictly adjacent ranges do not overlap', () => {
      const res = checkRangeOverlap([10, 19], [20, 30]);
      expect(res.overlaps).toBe(false);
      expect(res.overlapRange).toBeUndefined();
    });

    test('completely disjoint non-adjacent ranges do not overlap', () => {
      const res = checkRangeOverlap([1, 10], [50, 60]);
      expect(res.overlaps).toBe(false);
      expect(res.overlapRange).toBeUndefined();
    });
  });

  describe('Bible Passage Ordinal Mapping and Cross-Chapter Overlaps', () => {
    test('Romans 8:28 (single verse) overlaps with Romans 8:28–30', () => {
      const [s1, e1] = referenceToOrdinals('Romans', 8, 28, 8, 28);
      const [s2, e2] = referenceToOrdinals('Romans', 8, 28, 8, 30);
      const res = checkRangeOverlap([s1, e1], [s2, e2]);
      expect(res.overlaps).toBe(true);
      expect(res.overlapRange).toEqual([s1, e1]);
    });

    test('Cross-chapter overlap: John 1:50–2:2 overlaps with John 2:1–5', () => {
      const [s1, e1] = referenceToOrdinals('John', 1, 50, 2, 2);
      const [s2, e2] = referenceToOrdinals('John', 2, 1, 2, 5);
      const res = checkRangeOverlap([s1, e1], [s2, e2]);
      expect(res.overlaps).toBe(true);
    });

    test('Different chapters in same book without overlap: Romans 7:1–10 vs Romans 8:1–10', () => {
      const [s1, e1] = referenceToOrdinals('Romans', 7, 1, 7, 10);
      const [s2, e2] = referenceToOrdinals('Romans', 8, 1, 8, 10);
      const res = checkRangeOverlap([s1, e1], [s2, e2]);
      expect(res.overlaps).toBe(false);
    });
  });

  describe('findFriendNoteOverlaps with Firestore queries', () => {
    const targetPassage: PassageReference = {
      display: 'Romans 8:28–30',
      books: ['Romans'],
      segments: [
        {
          book: 'Romans',
          startChapter: 8,
          startVerse: 28,
          endChapter: 8,
          endVerse: 30,
        },
      ],
    };

    test('returns empty array when user has no friends', async () => {
      mockGetFriends.mockResolvedValueOnce([]);

      const overlaps = await findFriendNoteOverlaps('user_current', targetPassage);
      expect(overlaps).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    test('discovers overlapping note from mutual friend', async () => {
      mockGetFriends.mockResolvedValueOnce([
        {
          friendshipId: 'f1',
          friendUid: 'friend_sarah',
          friendProfile: {
            uid: 'friend_sarah',
            username: 'sarah_smith',
            display_name: 'Sarah Smith',
          },
          status: 'accepted',
        },
      ]);

      // Mock friend's notes in Romans
      mockGetDocs.mockResolvedValueOnce({
        forEach: (cb: any) => {
          cb({
            id: 'note_sarah_1',
            data: () => ({
              user_id: 'friend_sarah',
              passage: {
                display: 'Romans 8:26–29',
                books: ['Romans'],
                segments: [
                  {
                    book: 'Romans',
                    startChapter: 8,
                    startVerse: 26,
                    endChapter: 8,
                    endVerse: 29,
                  },
                ],
              },
              visibility: 'friends',
              content: '### 💡 Key Idea\nSpirit intercedes',
            }),
          });
        },
      });

      const overlaps = await findFriendNoteOverlaps('user_current', targetPassage);

      expect(overlaps).toHaveLength(1);
      expect(overlaps[0].friendProfile.display_name).toBe('Sarah Smith');
      expect(overlaps[0].note.id).toBe('note_sarah_1');
      expect(overlaps[0].overlapSegments).toEqual([
        {
          book: 'Romans',
          startChapter: 8,
          startVerse: 26,
          endChapter: 8,
          endVerse: 29,
        },
      ]);
    });

    test('ignores notes with no ordinal overlap', async () => {
      mockGetFriends.mockResolvedValueOnce([
        {
          friendshipId: 'f1',
          friendUid: 'friend_sarah',
          friendProfile: {
            uid: 'friend_sarah',
            username: 'sarah_smith',
            display_name: 'Sarah Smith',
          },
          status: 'accepted',
        },
      ]);

      // Mock friend's note in Romans 1
      mockGetDocs.mockResolvedValueOnce({
        forEach: (cb: any) => {
          cb({
            id: 'note_sarah_romans1',
            data: () => ({
              user_id: 'friend_sarah',
              passage: {
                display: 'Romans 1:1–5',
                books: ['Romans'],
                segments: [
                  {
                    book: 'Romans',
                    startChapter: 1,
                    startVerse: 1,
                    endChapter: 1,
                    endVerse: 5,
                  },
                ],
              },
              visibility: 'friends',
              content: 'Paul a servant',
            }),
          });
        },
      });

      const overlaps = await findFriendNoteOverlaps('user_current', targetPassage);
      expect(overlaps).toHaveLength(0);
    });
  });

  describe('notifyFriendsOfNoteOverlap', () => {
    test('does not notify if note visibility is private', async () => {
      const privateNote: Note = {
        id: 'note_p1',
        userId: 'u1',
        user_id: 'u1',
        passage: {
          display: 'John 3:16',
          books: ['John'],
          segments: [
            {
              book: 'John',
              startChapter: 3,
              startVerse: 16,
              endChapter: 3,
              endVerse: 16,
            },
          ],
        },
        lightContent: 'God so loved',
        questionContent: '',
        arrowContent: '',
        content: 'God so loved',
        tags: [],
        visibility: 'private',
        createdAt: 100,
        updatedAt: 100,
        created_at: 100,
        updated_at: 100,
      };

      const count = await notifyFriendsOfNoteOverlap('u1', 'Author', privateNote);
      expect(count).toBe(0);
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    test('creates notifications for overlapping friends when visibility is friends', async () => {
      mockGetFriends.mockResolvedValueOnce([
        {
          friendshipId: 'f1',
          friendUid: 'friend_mark',
          friendProfile: {
            uid: 'friend_mark',
            username: 'mark_c',
            display_name: 'Mark Chen',
          },
          status: 'accepted',
        },
      ]);

      mockGetDocs.mockResolvedValueOnce({
        forEach: (cb: any) => {
          cb({
            id: 'mark_note_1',
            data: () => ({
              user_id: 'friend_mark',
              passage: {
                display: 'John 3:16–17',
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
              },
              visibility: 'friends',
            }),
          });
        },
      });

      const friendNote: Note = {
        id: 'new_note_1',
        userId: 'u1',
        user_id: 'u1',
        passage: {
          display: 'John 3:16',
          books: ['John'],
          segments: [
            {
              book: 'John',
              startChapter: 3,
              startVerse: 16,
              endChapter: 3,
              endVerse: 16,
            },
          ],
        },
        lightContent: 'John 3:16 note',
        questionContent: '',
        arrowContent: '',
        content: 'John 3:16 note',
        tags: [],
        visibility: 'friends',
        createdAt: 100,
        updatedAt: 100,
        created_at: 100,
        updated_at: 100,
      };

      const count = await notifyFriendsOfNoteOverlap('u1', 'Author Name', friendNote);
      expect(count).toBe(1);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          user_id: 'friend_mark',
          type: 'friend_note_exists',
          related_note_id: 'new_note_1',
          related_user_name: 'Author Name',
          read: false,
        })
      );
    });
  });
});
