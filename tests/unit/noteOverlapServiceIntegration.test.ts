/**
 * Unit Test for Note Overlap Service (findFriendNoteOverlaps & notifyFriendsOfNoteOverlap)
 * Validates Firestore friend queries, passage segment intersection filtering,
 * and idempotent notification creation.
 */

import {
  findFriendNoteOverlaps,
  notifyFriendsOfNoteOverlap,
} from '../../src/services/noteOverlapService';
import * as friendService from '../../src/services/friendService';
import * as notificationService from '../../src/services/notificationService';
import { Note, PassageReference } from '../../src/types/note';
import { UserProfile } from '../../src/types/user';

const mockGetDocs = jest.fn();
const mockQuery = jest.fn();
const mockCollection = jest.fn();
const mockWhere = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
}));

jest.mock('../../src/services/firebase', () => ({
  db: {},
}));

jest.mock('../../src/services/friendService', () => ({
  getFriends: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
  createNotification: jest.fn(),
}));

const mockFriendProfile: UserProfile = {
  id: 'friend_1',
  uid: 'friend_1',
  email: 'friend@test.com',
  display_name: 'Friend One',
  full_name: 'Friend One',
  username: 'friendone',
  default_visibility: 'friends',
  created_at: Date.now(),
  updated_at: Date.now(),
};

const mockPassage: PassageReference = {
  display: 'Romans 8:28-30',
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

const mockFriendNoteDoc = {
  id: 'friend_note_99',
  data: () => ({
    user_id: 'friend_1',
    book: 'Romans',
    chapter_start: 8,
    verse_start: 26,
    chapter_end: 8,
    verse_end: 29,
    passage: {
      display: 'Romans 8:26-29',
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
    content: 'Intercession note',
    tags: ['prayer'],
    visibility: 'friends',
    created_at: 1000,
    updated_at: 1000,
  }),
};

describe('Note Overlap Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findFriendNoteOverlaps', () => {
    test('returns empty array when currentUid or passage is missing', async () => {
      const res1 = await findFriendNoteOverlaps('', mockPassage);
      expect(res1).toEqual([]);

      const res2 = await findFriendNoteOverlaps('user_1', null as any);
      expect(res2).toEqual([]);
    });

    test('returns empty array if user has zero friends', async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValueOnce([]);

      const res = await findFriendNoteOverlaps('user_1', mockPassage);
      expect(res).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    test('returns overlapping friend notes matching passage segment bounds', async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValueOnce([
        {
          friendshipId: 'u1_f1',
          friendUid: 'friend_1',
          friendProfile: mockFriendProfile,
          createdAt: Date.now(),
        },
      ]);

      mockGetDocs.mockResolvedValueOnce([mockFriendNoteDoc]);

      const res = await findFriendNoteOverlaps('user_1', mockPassage);

      expect(res).toHaveLength(1);
      expect(res[0].friendProfile.uid).toBe('friend_1');
      expect(res[0].note.id).toBe('friend_note_99');
      expect(res[0].overlapSegments).toHaveLength(1);
      expect(res[0].overlapSegments[0].book).toBe('Romans');
    });

    test('filters out friend notes that do not overlap in verse numbers', async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValueOnce([
        {
          friendshipId: 'u1_f1',
          friendUid: 'friend_1',
          friendProfile: mockFriendProfile,
          createdAt: Date.now(),
        },
      ]);

      const disjointFriendNoteDoc = {
        id: 'friend_note_disjoint',
        data: () => ({
          user_id: 'friend_1',
          book: 'Romans',
          chapter_start: 12,
          verse_start: 1,
          chapter_end: 12,
          verse_end: 2,
          passage: {
            display: 'Romans 12:1-2',
            books: ['Romans'],
            segments: [
              {
                book: 'Romans',
                startChapter: 12,
                startVerse: 1,
                endChapter: 12,
                endVerse: 2,
              },
            ],
          },
          content: 'Disjoint note',
          tags: ['service'],
          visibility: 'friends',
        }),
      };

      mockGetDocs.mockResolvedValueOnce([disjointFriendNoteDoc]);

      const res = await findFriendNoteOverlaps('user_1', mockPassage);
      expect(res).toHaveLength(0);
    });
  });

  describe('notifyFriendsOfNoteOverlap', () => {
    const authorNote: Note = {
      id: 'author_note_1',
      userId: 'author_uid',
      user_id: 'author_uid',
      passage: mockPassage,
      lightContent: '',
      questionContent: '',
      arrowContent: '',
      content: 'Author note content',
      tags: ['faith'],
      visibility: 'friends',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    test('skips notification if note visibility is private', async () => {
      const privateNote = { ...authorNote, visibility: 'private' as const };
      const count = await notifyFriendsOfNoteOverlap('author_uid', 'Author', privateNote);
      expect(count).toBe(0);
      expect(friendService.getFriends).not.toHaveBeenCalled();
    });

    test('creates notification when overlap is detected and no prior notification exists', async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValueOnce([
        {
          friendshipId: 'auth_f1',
          friendUid: 'friend_1',
          friendProfile: mockFriendProfile,
          createdAt: Date.now(),
        },
      ]);

      // Query for friend notes returns overlap
      mockGetDocs
        .mockResolvedValueOnce([mockFriendNoteDoc]) // for findFriendNoteOverlaps
        .mockResolvedValueOnce({ empty: true }); // for idempotency check in notifications

      (notificationService.createNotification as jest.Mock).mockResolvedValueOnce('new_notif_1');

      const count = await notifyFriendsOfNoteOverlap('author_uid', 'Author Name', authorNote);

      expect(count).toBe(1);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'friend_1',
          type: 'friend_note_exists',
          related_note_id: 'author_note_1',
          related_user_id: 'author_uid',
          related_user_name: 'Author Name',
          read: false,
        })
      );
    });

    test('idempotency: skips creating duplicate notification if one already exists for this note', async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValueOnce([
        {
          friendshipId: 'auth_f1',
          friendUid: 'friend_1',
          friendProfile: mockFriendProfile,
          createdAt: Date.now(),
        },
      ]);

      mockGetDocs
        .mockResolvedValueOnce([mockFriendNoteDoc]) // friend notes query
        .mockResolvedValueOnce({ empty: false }); // existing notification found!

      const count = await notifyFriendsOfNoteOverlap('author_uid', 'Author Name', authorNote);

      expect(count).toBe(0);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });
});
