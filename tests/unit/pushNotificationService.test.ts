import {
  buildPushContent,
  resolveNotificationDeepLink,
} from '../../src/services/pushNotificationService';

describe('pushNotificationService helpers', () => {
  test('buildPushContent for friend_note_exists includes passage', () => {
    expect(
      buildPushContent({
        type: 'friend_note_exists',
        related_user_name: 'Sarah',
        passage_summary: 'John 3:16',
      })
    ).toEqual({
      title: 'Shared passage',
      body: 'Sarah also noted John 3:16',
    });
  });

  test('buildPushContent for friend_request and friend_accept', () => {
    expect(
      buildPushContent({
        type: 'friend_request',
        related_user_name: 'Barnabas',
      })
    ).toEqual({
      title: 'Friend request',
      body: 'Barnabas sent you a friend request',
    });

    expect(
      buildPushContent({
        type: 'friend_accept',
        related_user_name: 'Timothy',
      })
    ).toEqual({
      title: 'Friend request accepted',
      body: 'Timothy accepted your friend request',
    });
  });

  test('resolveNotificationDeepLink routes to note, friend, or notifications', () => {
    expect(
      resolveNotificationDeepLink({
        type: 'friend_note_exists',
        related_note_id: 'note_1',
        related_user_id: 'u2',
      })
    ).toEqual({ pathname: '/note/[id]', params: { id: 'note_1' } });

    expect(
      resolveNotificationDeepLink({
        type: 'friend_request',
        related_user_id: 'u2',
      })
    ).toEqual({ pathname: '/friend/[id]', params: { id: 'u2' } });

    expect(
      resolveNotificationDeepLink({
        type: 'friend_note_exists',
      })
    ).toEqual({ pathname: '/notifications' });
  });
});
