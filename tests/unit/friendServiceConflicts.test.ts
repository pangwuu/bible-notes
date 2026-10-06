/**
 * Unit Tests for FriendService Conflict & Race Condition Resilience (Area 4)
 * Covers:
 * - Simultaneous / concurrent friend request handling:
 *   - Current user already sent request -> throws 'Friend request already sent'
 *   - Target user already sent request -> auto-accepts and returns friendshipId
 *   - Already friends -> throws 'You are already friends with this user'
 * - Firestore error handling:
 *   - Permission-denied error handled gracefully on doc read, falling back to setDoc
 *   - Non-permission-denied errors (e.g. Quota exceeded, network drop) rethrown
 * - Boundary validations:
 *   - Empty friendship ID on acceptFriendRequest, declineFriendRequest, unfriend
 *   - Self-friending in buildFriendshipDocId
 *   - Missing UIDs in buildFriendshipDocId
 *   - Missing UIDs in getFriends, getPendingRequests, getFriendNotes
 *   - Missing userDoc on getPendingRequests (falls back to placeholder profile)
 *   - Non-existent doc or error in getFriendshipStatus
 */

import {
  buildFriendshipDocId,
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

describe('Area 4: Friend Service Conflicts & Error Recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildFriendshipDocId edge cases', () => {
    test('throws when user IDs are identical (self-friending bound)', () => {
      expect(() => buildFriendshipDocId('user_alpha', 'user_alpha')).toThrow(
        'Cannot create a friendship with oneself'
      );
    });

    test('throws when either user ID is empty or undefined', () => {
      expect(() => buildFriendshipDocId('', 'user_beta')).toThrow(
        'Both user IDs are required to build friendship doc ID'
      );
      expect(() => buildFriendshipDocId('user_alpha', '')).toThrow(
        'Both user IDs are required to build friendship doc ID'
      );
      expect(() => buildFriendshipDocId(undefined as any, 'user_beta')).toThrow(
        'Both user IDs are required to build friendship doc ID'
      );
      expect(() => buildFriendshipDocId('user_alpha', undefined as any)).toThrow(
        'Both user IDs are required to build friendship doc ID'
      );
    });
  });

  describe('sendFriendRequest state machine conflicts', () => {
    test('throws when users are already accepted friends', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'accepted', requested_by: 'user_1' }),
      });

      await expect(sendFriendRequest('user_1', 'user_2')).rejects.toThrow(
        'You are already friends with this user'
      );
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    test('throws when current user already has an outgoing pending request', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'pending', requested_by: 'current_user' }),
      });

      await expect(sendFriendRequest('current_user', 'target_user')).rejects.toThrow(
        'Friend request already sent'
      );
      expect(mockSetDoc).not.toHaveBeenCalled();
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    test('auto-accepts reciprocal pending request sent by target user', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ status: 'pending', requested_by: 'target_user' }),
      });

      const resultDocId = await sendFriendRequest('current_user', 'target_user');

      expect(resultDocId).toBe(buildFriendshipDocId('current_user', 'target_user'));
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'accepted',
        })
      );
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    test('catches permission-denied error from getDoc and proceeds to create new pending friendship', async () => {
      mockGetDoc.mockRejectedValueOnce({ code: 'permission-denied' });

      const docId = await sendFriendRequest('user_a', 'user_b');

      expect(docId).toBe('user_a_user_b');
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'user_a_user_b',
          status: 'pending',
          requested_by: 'user_a',
        })
      );
    });

    test('rethrows unexpected non-permission-denied errors from getDoc', async () => {
      const dbError = new Error('Database connection failed');
      mockGetDoc.mockRejectedValueOnce(dbError);

      await expect(sendFriendRequest('user_a', 'user_b')).rejects.toThrow(
        'Database connection failed'
      );
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  describe('acceptFriendRequest, declineFriendRequest, unfriend bounds', () => {
    test('acceptFriendRequest throws when friendshipId is empty', async () => {
      await expect(acceptFriendRequest('')).rejects.toThrow('Friendship ID is required');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    test('declineFriendRequest throws when friendshipId is empty', async () => {
      await expect(declineFriendRequest('')).rejects.toThrow('Friendship ID is required');
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    test('unfriend throws when friendshipId is empty', async () => {
      await expect(unfriend('')).rejects.toThrow('Friendship ID is required');
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });
  });

  describe('null / empty argument resilience across query functions', () => {
    test('getFriends returns empty array when currentUid is empty', async () => {
      const friends = await getFriends('');
      expect(friends).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    test('getPendingRequests returns empty lists when currentUid is empty', async () => {
      const res = await getPendingRequests('');
      expect(res).toEqual({ incoming: [], outgoing: [] });
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    test('getFriendNotes returns empty array when friendUid is empty', async () => {
      const notes = await getFriendNotes('');
      expect(notes).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    test('getPendingRequests provides fallback Unknown User profile if user document does not exist', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'u1_u999',
            data: () => ({
              user_ids: ['u1', 'u999'],
              status: 'pending',
              requested_by: 'u999',
            }),
          },
        ],
      });

      // Target user document not found
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const { incoming } = await getPendingRequests('u1');

      expect(incoming).toHaveLength(1);
      expect(incoming[0].friendUid).toBe('u999');
      expect(incoming[0].friendProfile.display_name).toBe('Unknown User');
      expect(incoming[0].friendProfile.username).toBe('user');
    });

    test('getFriendshipStatus returns status none when getDoc rejects', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Network error'));

      const status = await getFriendshipStatus('u1', 'u2');
      expect(status).toEqual({ status: 'none' });
    });
  });
});
