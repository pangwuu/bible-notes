import {
  checkNoteIntersection,
  getDashboardFriendActivity,
  selectRandomReflectionNote,
  FriendActivityItem,
} from '../../src/services/dashboardService';
import { Note } from '../../src/types/note';
import * as friendService from '../../src/services/friendService';
import safeStorage from '../../src/utils/safeStorage';

jest.mock('../../src/services/friendService');
jest.mock('../../src/utils/safeStorage');

describe('dashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createTestNote = (overrides: Partial<Note>): Note => ({
    id: 'test_note_id',
    userId: 'user_me',
    user_id: 'user_me',
    authorUsername: 'me',
    authorDisplayName: 'Me',
    author_username: 'me',
    author_display_name: 'Me',
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
    lightContent: '',
    questionContent: '',
    arrowContent: '',
    content: 'Test content',
    tags: [],
    visibility: 'friends',
    createdAt: 1000,
    updatedAt: 1000,
    created_at: 1000,
    updated_at: 1000,
    ...overrides,
  });

  const mockUserNotes: Note[] = [
    createTestNote({
      id: 'user_note_1',
      passage: {
        display: 'John 3:16-18',
        books: ['John'],
        segments: [
          {
            book: 'John',
            startChapter: 3,
            startVerse: 16,
            endChapter: 3,
            endVerse: 18,
          },
        ],
      },
      content: '### 💡 Key Idea\nGod loves the world',
      tags: ['love', 'salvation'],
      visibility: 'friends',
    }),
    createTestNote({
      id: 'user_note_2',
      passage: {
        display: 'Romans 8:28',
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
      },
      content: '### 🏹 Application\nTrust God in trials',
      tags: ['faith'],
      visibility: 'private',
    }),
  ];

  describe('checkNoteIntersection', () => {
    test('returns isIntersecting: true when passages overlap in book and verse range', () => {
      const friendNote = createTestNote({
        id: 'fn_1',
        userId: 'friend_1',
        user_id: 'friend_1',
        passage: {
          display: 'John 3:1-17',
          books: ['John'],
          segments: [
            {
              book: 'John',
              startChapter: 3,
              startVerse: 1,
              endChapter: 3,
              endVerse: 17,
            },
          ],
        },
      });

      const result = checkNoteIntersection(friendNote, mockUserNotes);
      expect(result.isIntersecting).toBe(true);
      expect(result.overlappingPassageSummary).toBe('John 3:16-18');
    });

    test('returns isIntersecting: false when passages are in different books', () => {
      const friendNote = createTestNote({
        id: 'fn_2',
        userId: 'friend_1',
        user_id: 'friend_1',
        passage: {
          display: 'Genesis 1:1',
          books: ['Genesis'],
          segments: [
            {
              book: 'Genesis',
              startChapter: 1,
              startVerse: 1,
              endChapter: 1,
              endVerse: 1,
            },
          ],
        },
      });

      const result = checkNoteIntersection(friendNote, mockUserNotes);
      expect(result.isIntersecting).toBe(false);
    });

    test('returns isIntersecting: false when in same book but disjoint verse spans', () => {
      const friendNote = createTestNote({
        id: 'fn_3',
        userId: 'friend_1',
        user_id: 'friend_1',
        passage: {
          display: 'John 1:1-5',
          books: ['John'],
          segments: [
            {
              book: 'John',
              startChapter: 1,
              startVerse: 1,
              endChapter: 1,
              endVerse: 5,
            },
          ],
        },
      });

      const result = checkNoteIntersection(friendNote, mockUserNotes);
      expect(result.isIntersecting).toBe(false);
    });

    test('accurately distinguishes Matthew 6:24-34 from Matthew 24:24-25:4, Matthew 6:33-34, and Matthew 1:1', () => {
      const myMatthewNote = createTestNote({
        id: 'my_matthew_note',
        passage: {
          display: 'Matthew 6:24–34',
          books: ['Matthew'],
          segments: [
            {
              book: 'Matthew',
              startChapter: 6,
              startVerse: 24,
              endChapter: 6,
              endVerse: 34,
            },
          ],
        },
      });

      // 1. Matthew 24:24-25:4 -> Should NOT overlap
      const friendNoteCh24 = createTestNote({
        id: 'friend_ch24',
        passage: {
          display: 'Matthew 24:24–25:4',
          books: ['Matthew'],
          segments: [
            {
              book: 'Matthew',
              startChapter: 24,
              startVerse: 24,
              endChapter: 25,
              endVerse: 4,
            },
          ],
        },
      });
      expect(checkNoteIntersection(friendNoteCh24, [myMatthewNote]).isIntersecting).toBe(false);

      // 2. Matthew 6:33-34 -> SHOULD overlap
      const friendNoteCh6Sub = createTestNote({
        id: 'friend_ch6_sub',
        passage: {
          display: 'Matthew 6:33–34, 2 Corinthians 2:1–10',
          books: ['Matthew', '2 Corinthians'],
          segments: [
            {
              book: 'Matthew',
              startChapter: 6,
              startVerse: 33,
              endChapter: 6,
              endVerse: 34,
            },
            {
              book: '2 Corinthians',
              startChapter: 2,
              startVerse: 1,
              endChapter: 2,
              endVerse: 10,
            },
          ],
        },
      });
      expect(checkNoteIntersection(friendNoteCh6Sub, [myMatthewNote]).isIntersecting).toBe(true);

      // 3. Matthew 1:1 -> Should NOT overlap
      const friendNoteCh1 = createTestNote({
        id: 'friend_ch1',
        passage: {
          display: 'Matthew 1:1',
          books: ['Matthew'],
          segments: [
            {
              book: 'Matthew',
              startChapter: 1,
              startVerse: 1,
              endChapter: 1,
              endVerse: 1,
            },
          ],
        },
      });
      expect(checkNoteIntersection(friendNoteCh1, [myMatthewNote]).isIntersecting).toBe(false);
    });
  });

  describe('getDashboardFriendActivity', () => {
    test('returns empty when currentUid is empty', async () => {
      const res = await getDashboardFriendActivity('', []);
      expect(res.hasFriends).toBe(false);
      expect(res.intersectingNotes).toEqual([]);
      expect(res.otherFriendNotes).toEqual([]);
    });

    test('correctly segments intersecting and non-intersecting friend notes', async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValue([
        {
          friendUid: 'friend_1',
          friendProfile: { uid: 'friend_1', username: 'sarah', display_name: 'Sarah' },
        },
      ]);

      const friendSharedNotes: Note[] = [
        createTestNote({
          id: 'fn_intersect',
          userId: 'friend_1',
          user_id: 'friend_1',
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
          content: 'Mutual note',
          updated_at: 3000,
        }),
        createTestNote({
          id: 'fn_other',
          userId: 'friend_1',
          user_id: 'friend_1',
          passage: {
            display: 'Psalm 23:1',
            books: ['Psalms'],
            segments: [
              {
                book: 'Psalms',
                startChapter: 23,
                startVerse: 1,
                endChapter: 23,
                endVerse: 1,
              },
            ],
          },
          content: 'The Lord is my shepherd',
          updated_at: 2500,
        }),
      ];

      (friendService.getFriendNotes as jest.Mock).mockResolvedValue(friendSharedNotes);

      const res = await getDashboardFriendActivity('user_me', mockUserNotes);

      expect(res.hasFriends).toBe(true);
      expect(res.intersectingNotes.length).toBe(1);
      expect(res.intersectingNotes[0].note.id).toBe('fn_intersect');
      expect(res.intersectingNotes[0].isIntersecting).toBe(true);

      expect(res.otherFriendNotes.length).toBe(1);
      expect(res.otherFriendNotes[0].note.id).toBe('fn_other');
      expect(res.otherFriendNotes[0].isIntersecting).toBe(false);

      expect(safeStorage.setItem).toHaveBeenCalled();
    });

    test('falls back to cached data when service throws error', async () => {
      (friendService.getFriends as jest.Mock).mockRejectedValue(new Error('Network offline'));

      const cachedData = {
        intersectingNotes: [],
        otherFriendNotes: [
          {
            note: { id: 'cached_note' },
            author: { display_name: 'Cached Friend' },
            isIntersecting: false,
          },
        ],
        hasFriends: true,
      };

      (safeStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const res = await getDashboardFriendActivity('user_me', mockUserNotes);
      expect(res.hasFriends).toBe(true);
      expect(res.otherFriendNotes[0].note.id).toBe('cached_note');
    });
  });

  describe('selectRandomReflectionNote', () => {
    test('returns null when notes list is empty', () => {
      expect(selectRandomReflectionNote([])).toBeNull();
    });

    test('prefers notes not in excluded recent IDs', () => {
      const notes: Note[] = [
        createTestNote({ id: 'recent_1' }),
        createTestNote({ id: 'recent_2' }),
        createTestNote({ id: 'archive_1' }),
      ];

      const exclude = new Set(['recent_1', 'recent_2']);
      const selected = selectRandomReflectionNote(notes, exclude);
      expect(selected?.id).toBe('archive_1');
    });

    test('falls back to picking from any note not equal to currentNoteId when all are in recent', () => {
      const notes: Note[] = [createTestNote({ id: 'note_1' }), createTestNote({ id: 'note_2' })];

      const exclude = new Set(['note_1', 'note_2']);
      const selected = selectRandomReflectionNote(notes, exclude, 'note_1');
      expect(selected?.id).toBe('note_2');
    });

    test('returns the only available note if collection has size 1', () => {
      const notes: Note[] = [createTestNote({ id: 'only_note' })];
      const exclude = new Set(['only_note']);
      const selected = selectRandomReflectionNote(notes, exclude, 'only_note');
      expect(selected?.id).toBe('only_note');
    });
  });
});
