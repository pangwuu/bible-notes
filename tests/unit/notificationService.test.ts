/**
 * Unit Tests for NotificationService (Stage 7)
 */

import {
  createNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../../src/services/notificationService';

const mockGetDocs = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockDoc = jest.fn((...args: any[]) => ({ id: args[2] || 'mock_notif_id', path: `${args[1]}/${args[2]}` }));
const mockCollection = jest.fn((...args: any[]) => ({ path: args[1] }));
const mockQuery = jest.fn((...args: any[]) => ({ args }));
const mockWhere = jest.fn((...args: any[]) => ({ field: args[0], op: args[1], val: args[2] }));
const mockOrderBy = jest.fn((...args: any[]) => ({ orderBy: args[0] }));
const mockLimit = jest.fn((...args: any[]) => ({ limit: args[0] }));
const mockWriteBatchCommit = jest.fn();
const mockWriteBatch = jest.fn(() => ({
  update: jest.fn(),
  commit: mockWriteBatchCommit,
}));

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  limit: (...args: any[]) => mockLimit(...args),
  writeBatch: () => mockWriteBatch(),
  onSnapshot: jest.fn(),
  serverTimestamp: () => 123456789,
}));

jest.mock('../../src/services/firebase', () => ({
  db: {},
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    test('creates notification document with read: false', async () => {
      const id = await createNotification({
        user_id: 'recipient_uid',
        type: 'friend_note_exists',
        related_user_id: 'sender_uid',
        related_user_name: 'Sender Name',
        passage_summary: 'Romans 8:28',
        read: false,
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          user_id: 'recipient_uid',
          type: 'friend_note_exists',
          read: false,
        })
      );
      expect(typeof id).toBe('string');
    });
  });

  describe('getNotifications', () => {
    test('returns notifications list', async () => {
      mockGetDocs.mockResolvedValueOnce({
        forEach: (cb: any) => {
          cb({
            id: 'notif_1',
            data: () => ({
              user_id: 'u1',
              type: 'friend_note_exists',
              related_user_name: 'Sarah',
              read: false,
              created_at: 100,
            }),
          });
        },
      });

      const list = await getNotifications('u1');
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('notif_1');
      expect(list[0].related_user_name).toBe('Sarah');
    });
  });

  describe('markNotificationAsRead and deleteNotification', () => {
    test('markNotificationAsRead updates read to true', async () => {
      await markNotificationAsRead('notif_123');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ read: true })
      );
    });

    test('deleteNotification deletes doc from notifications collection', async () => {
      await deleteNotification('notif_123');
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });
});
