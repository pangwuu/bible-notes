const mockBatch = {
  set: jest.fn(),
  commit: jest.fn().mockResolvedValue(true),
};

const mockFirestore = {
  collection: jest.fn(),
  batch: jest.fn(() => mockBatch),
};

const mockServerTimestamp = jest.fn(() => 'MOCK_TIMESTAMP');

jest.mock('firebase-admin', () => ({
  apps: ['[DEFAULT]'],
  initializeApp: jest.fn(),
  firestore: Object.assign(jest.fn(() => mockFirestore), {
    FieldValue: {
      serverTimestamp: mockServerTimestamp,
    },
  }),
}));

const { onNoteCreated } = require('../index');

describe('Cloud Functions: onNoteCreated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatch.commit.mockResolvedValue(true);
    mockFirestore.batch.mockReturnValue(mockBatch);
  });

  test('ignores private notes without querying friendships or notes', async () => {
    const mockSnap = {
      data: () => ({
        visibility: 'private',
        book: 'Romans',
        start_verse_id: 28145,
        end_verse_id: 28147,
        user_id: 'user_1',
      }),
    };

    await onNoteCreated.run({
      data: mockSnap,
      params: { noteId: 'note_123' },
    });

    expect(mockFirestore.collection).not.toHaveBeenCalled();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  test('exits early when essential fields (book, start_verse_id, user_id) are missing', async () => {
    const mockSnap = {
      data: () => ({
        visibility: 'friends',
        user_id: 'user_1',
      }),
    };

    await onNoteCreated.run({
      data: mockSnap,
      params: { noteId: 'note_123' },
    });

    expect(mockFirestore.collection).not.toHaveBeenCalled();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  test('does not dispatch notifications if author has no accepted friends', async () => {
    const mockSnap = {
      data: () => ({
        visibility: 'friends',
        book: 'Romans',
        start_verse_id: 28145,
        end_verse_id: 28147,
        user_id: 'user_1',
        chapter_start: 8,
        verse_start: 28,
      }),
    };

    mockFirestore.collection.mockImplementation((col) => {
      if (col === 'friendships') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({ empty: true, forEach: () => {} }),
        };
      }
      return {};
    });

    await onNoteCreated.run({
      data: mockSnap,
      params: { noteId: 'note_123' },
    });

    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  test('dispatches notification when friend has an overlapping note', async () => {
    const mockSnap = {
      data: () => ({
        visibility: 'friends',
        book: 'Romans',
        start_verse_id: 28145,
        end_verse_id: 28147,
        user_id: 'author_1',
        author_display_name: 'Author Person',
        chapter_start: 8,
        verse_start: 28,
      }),
    };

    const mockNotifRef = { id: 'new_notif_999' };

    mockFirestore.collection.mockImplementation((col) => {
      if (col === 'friendships') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            forEach: (cb) => {
              cb({
                data: () => ({
                  user_ids: ['author_1', 'friend_2'],
                  status: 'accepted',
                }),
              });
            },
          }),
        };
      }
      if (col === 'users') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ display_name: 'Author Person' }),
            }),
          })),
        };
      }
      if (col === 'notes') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            forEach: (cb) => {
              // Friend's note overlaps: 28143 to 28146 (Romans 8:26-29)
              cb({
                data: () => ({
                  user_id: 'friend_2',
                  book: 'Romans',
                  start_verse_id: 28143,
                  end_verse_id: 28146,
                  visibility: 'friends',
                }),
              });
            },
          }),
        };
      }
      if (col === 'notifications') {
        return {
          doc: jest.fn(() => mockNotifRef),
        };
      }
      return {};
    });

    await onNoteCreated.run({
      data: mockSnap,
      params: { noteId: 'note_123' },
    });

    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    expect(mockBatch.set).toHaveBeenCalledWith(
      mockNotifRef,
      expect.objectContaining({
        id: 'new_notif_999',
        user_id: 'friend_2',
        type: 'friend_note_exists',
        related_note_id: 'note_123',
        related_user_id: 'author_1',
        related_user_name: 'Author Person',
        passage_summary: 'Romans 8:28',
        read: false,
      })
    );
  });

  test('does not dispatch notification when friend note is disjoint in ordinals', async () => {
    const mockSnap = {
      data: () => ({
        visibility: 'friends',
        book: 'Romans',
        start_verse_id: 28145,
        end_verse_id: 28147,
        user_id: 'author_1',
        chapter_start: 8,
        verse_start: 28,
      }),
    };

    mockFirestore.collection.mockImplementation((col) => {
      if (col === 'friendships') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            forEach: (cb) => {
              cb({
                data: () => ({
                  user_ids: ['author_1', 'friend_3'],
                  status: 'accepted',
                }),
              });
            },
          }),
        };
      }
      if (col === 'users') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false }),
          })),
        };
      }
      if (col === 'notes') {
        return {
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            empty: false,
            forEach: (cb) => {
              // Disjoint: Romans 12:1-2 (28210 - 28211)
              cb({
                data: () => ({
                  user_id: 'friend_3',
                  book: 'Romans',
                  start_verse_id: 28210,
                  end_verse_id: 28211,
                  visibility: 'friends',
                }),
              });
            },
          }),
        };
      }
      return {};
    });

    await onNoteCreated.run({
      data: mockSnap,
      params: { noteId: 'note_123' },
    });

    expect(mockBatch.commit).not.toHaveBeenCalled();
    expect(mockBatch.set).not.toHaveBeenCalled();
  });
});
