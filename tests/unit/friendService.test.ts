/**
 * Unit Tests for FriendService (Stage 6 Friends Social Layer & Shared Notes)
 */

import {
  buildFriendshipDocId,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  unfriend,
  getFriends,
  getPendingRequests,
  getFriendNotes,
  getFriendshipStatus,
} from '../../src/services/friendService';

// Mock Firebase dependencies
const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockDoc = jest.fn((...args: any[]) => ({ id: args[2] || 'generated_doc_id', path: `${args[1]}/${args[2]}` }));
const mockCollection = jest.fn((...args: any[]) => ({ path: args[1] }));
const mockQuery = jest.fn((...args: any[]) => ({ args }));
const mockWhere = jest.fn((...args: any[]) => ({ field: args[0], op: args[1], val: args[2] }));
const mockLimit = jest.fn((...args: any[]) => ({ limit: args[0] }));
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
  serverTimestamp: () => mockServerTimestamp(),
}));

jest.mock('../../src/services/firebase', () => ({
  db: {},
}));

describe('FriendService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildFriendshipDocId', () => {
    test('produces deterministic lexicographical order regardless of argument order', () => {
      expect(buildFriendshipDocId('user_alpha', 'user_beta')).toBe('user_alpha_user_beta');
      expect(buildFriendshipDocId('user_beta', 'user_alpha')).toBe('user_alpha_user_beta');
      expect(buildFriendshipDocId('abc', 'xyz')).toBe('abc_xyz');
      expect(buildFriendshipDocId('xyz', 'abc')).toBe('abc_xyz');
    });

    test('throws error when user IDs are equal or missing', () => {
      expect(() => buildFriendshipDocId('user1', 'user1')).toThrow('Cannot create a friendship with oneself');
      expect(() => buildFriendshipDocId('', 'user2')).toThrow('Both user IDs are required');
      expect(() => buildFriendshipDocId('user1', '')).toThrow('Both user IDs are required');
    });
  });

  describe('searchUsers with N-grams', () => {
    test('returns empty array if search query length is less than 3 characters', async () => {
      const results = await searchUsers('ab', 'current_user');
      expect(results).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    test('queries using array-contains on search_tokens and excludes current user', async () => {
      const mockDocs = [
        {
          id: 'user_target',
          data: () => ({
            username: 'david_king',
            display_name: 'David King',
            email: 'david@example.com',
          }),
        },
        {
          id: 'current_user',
          data: () => ({
            username: 'curr_user',
            display_name: 'Current User',
            email: 'current@example.com',
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (cb: any) => mockDocs.forEach(cb),
        size: 2,
      });

      const results = await searchUsers('dav', 'current_user');

      expect(mockWhere).toHaveBeenCalledWith('search_tokens', 'array-contains', 'dav');
      expect(results).toHaveLength(1);
      expect(results[0].uid).toBe('user_target');
      expect(results[0].username).toBe('david_king');
    });
  });

  describe('sendFriendRequest', () => {
    test('creates a pending friendship document with sorted user_ids', async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      const docId = await sendFriendRequest('user_b', 'user_a');

      expect(docId).toBe('user_a_user_b');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'user_a_user_b',
          user_ids: ['user_a', 'user_b'],
          status: 'pending',
          requested_by: 'user_b',
        })
      );
    });

    test('throws error if friendship already exists with status accepted', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'accepted', requested_by: 'user_a' }),
      });

      await expect(sendFriendRequest('user_a', 'user_b')).rejects.toThrow(
        'You are already friends with this user'
      );
    });

    test('throws error if pending request was already sent by current user', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'pending', requested_by: 'user_a' }),
      });

      await expect(sendFriendRequest('user_a', 'user_b')).rejects.toThrow(
        'Friend request already sent'
      );
    });

    test('auto-accepts if opposite user already sent a pending request', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'pending', requested_by: 'user_b' }),
      });

      const docId = await sendFriendRequest('user_a', 'user_b');
      expect(docId).toBe('user_a_user_b');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'accepted',
        })
      );
    });

    test('proceeds to setDoc when getDoc throws permission-denied on non-existent friendship', async () => {
      mockGetDoc.mockRejectedValueOnce({ code: 'permission-denied' });

      const docId = await sendFriendRequest('user_x', 'user_y');
      expect(docId).toBe('user_x_user_y');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'user_x_user_y',
          status: 'pending',
          requested_by: 'user_x',
        })
      );
    });

    test('rethrows non-permission-denied unexpected errors from getDoc', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Quota exceeded'));

      await expect(sendFriendRequest('user_x', 'user_y')).rejects.toThrow('Quota exceeded');
    });
  });

  describe('acceptFriendRequest, declineFriendRequest, unfriend', () => {
    test('acceptFriendRequest updates status to accepted', async () => {
      await acceptFriendRequest('user_a_user_b');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'accepted',
        })
      );
    });

    test('declineFriendRequest deletes friendship document', async () => {
      await declineFriendRequest('user_a_user_b');
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    test('unfriend deletes friendship document', async () => {
      await unfriend('user_a_user_b');
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('getFriends and getPendingRequests', () => {
    test('getFriends queries accepted friendships and loads user profiles', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'user_1_user_2',
            data: () => ({
              user_ids: ['user_1', 'user_2'],
              status: 'accepted',
              requested_by: 'user_1',
              created_at: 100,
            }),
          },
        ],
      });

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'user_2',
        data: () => ({
          username: 'jonathan',
          display_name: 'Jonathan',
        }),
      });

      const friends = await getFriends('user_1');

      expect(friends).toHaveLength(1);
      expect(friends[0].friendUid).toBe('user_2');
      expect(friends[0].friendProfile.display_name).toBe('Jonathan');
      expect(friends[0].status).toBe('accepted');
    });

    test('getPendingRequests differentiates incoming vs outgoing requests', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'u1_u2',
            data: () => ({
              user_ids: ['u1', 'u2'],
              status: 'pending',
              requested_by: 'u2',
            }),
          },
          {
            id: 'u1_u3',
            data: () => ({
              user_ids: ['u1', 'u3'],
              status: 'pending',
              requested_by: 'u1',
            }),
          },
        ],
      });

      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'u2',
          data: () => ({ username: 'user_two', display_name: 'User Two' }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'u3',
          data: () => ({ username: 'user_three', display_name: 'User Three' }),
        });

      const { incoming, outgoing } = await getPendingRequests('u1');

      expect(incoming).toHaveLength(1);
      expect(incoming[0].friendUid).toBe('u2');
      expect(incoming[0].isIncoming).toBe(true);

      expect(outgoing).toHaveLength(1);
      expect(outgoing[0].friendUid).toBe('u3');
      expect(outgoing[0].isIncoming).toBe(false);
    });
  });

  describe('getFriendNotes', () => {
    test('queries notes where user_id == friendUid and visibility == friends', async () => {
      const mockNotes = [
        {
          id: 'note_123',
          data: () => ({
            book: 'Genesis',
            chapter_start: 1,
            verse_start: 1,
            content: 'In the beginning',
            visibility: 'friends',
            user_id: 'friend_uid',
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (cb: any) => mockNotes.forEach(cb),
      });

      const notes = await getFriendNotes('friend_uid');

      expect(mockWhere).toHaveBeenCalledWith('user_id', '==', 'friend_uid');
      expect(mockWhere).toHaveBeenCalledWith('visibility', '==', 'friends');
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('note_123');
    });
  });

  describe('getFriendshipStatus', () => {
    test('returns status accepted when doc exists', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'u1_u2',
        data: () => ({ status: 'accepted', requested_by: 'u1' }),
      });

      const res = await getFriendshipStatus('u1', 'u2');
      expect(res.status).toBe('accepted');
      expect(res.friendshipId).toBe('u1_u2');
    });

    test('returns status none when doc does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const res = await getFriendshipStatus('u1', 'u2');
      expect(res.status).toBe('none');
    });
  });
});
