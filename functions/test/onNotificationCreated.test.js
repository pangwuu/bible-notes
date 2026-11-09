const { _buildExpoPushContent } = require('../index');

describe('onNotificationCreated push content', () => {
  test('formats overlap notification', () => {
    expect(
      _buildExpoPushContent({
        type: 'friend_note_exists',
        related_user_name: 'Sarah',
        passage_summary: 'John 3:16',
      })
    ).toEqual({
      title: 'Shared passage',
      body: 'Sarah also noted John 3:16',
    });
  });

  test('formats friend request and accept', () => {
    expect(
      _buildExpoPushContent({
        type: 'friend_request',
        related_user_name: 'Barnabas',
      })
    ).toEqual({
      title: 'Friend request',
      body: 'Barnabas sent you a friend request',
    });

    expect(
      _buildExpoPushContent({
        type: 'friend_accept',
        related_user_name: 'Timothy',
      })
    ).toEqual({
      title: 'Friend request accepted',
      body: 'Timothy accepted your friend request',
    });
  });
});
