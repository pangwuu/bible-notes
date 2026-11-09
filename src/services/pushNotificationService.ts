/**
 * Expo push notification registration and message helpers.
 * Tokens are stored on the user profile for Cloud Functions delivery.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { getUserProfile, updateUserProfile } from './authService';
import type { NotificationDocument, NotificationType } from '../types/notification';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushDeepLink {
  pathname: string;
  params?: Record<string, string>;
}

export function buildPushContent(notification: Pick<
  NotificationDocument,
  'type' | 'related_user_name' | 'passage_summary'
>): { title: string; body: string } {
  const name = notification.related_user_name || 'A friend';
  switch (notification.type as NotificationType) {
    case 'friend_note_exists':
      return {
        title: 'Shared passage',
        body: notification.passage_summary
          ? `${name} also noted ${notification.passage_summary}`
          : `${name} noted an overlapping passage`,
      };
    case 'friend_request':
      return {
        title: 'Friend request',
        body: `${name} sent you a friend request`,
      };
    case 'friend_accept':
      return {
        title: 'Friend request accepted',
        body: `${name} accepted your friend request`,
      };
    default:
      return {
        title: 'Bible Notes',
        body: 'You have a new notification',
      };
  }
}

export function resolveNotificationDeepLink(
  notification: Partial<Pick<NotificationDocument, 'type' | 'related_note_id' | 'related_user_id'>> & {
    type?: NotificationType | string;
  }
): PushDeepLink {
  if (notification.type === 'friend_note_exists' && notification.related_note_id) {
    return {
      pathname: '/note/[id]',
      params: { id: notification.related_note_id },
    };
  }
  if (
    (notification.type === 'friend_request' || notification.type === 'friend_accept') &&
    notification.related_user_id
  ) {
    return {
      pathname: '/friend/[id]',
      params: { id: notification.related_user_id },
    };
  }
  return { pathname: '/notifications' };
}

function getExpoProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    undefined
  );
}

/**
 * Requests permissions and returns an Expo push token, or null when unavailable.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    console.warn('[Push] Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn(
      '[Push] Missing Expo projectId (eas.projectId). Skipping token registration.'
    );
    return null;
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenResult.data || null;
}

/**
 * Registers for push and persists the Expo token on the user profile.
 */
export async function syncPushTokenForUser(uid: string): Promise<string | null> {
  if (!uid) return null;
  try {
    const token = await registerForPushNotificationsAsync();
    if (!token) return null;

    const profile = await getUserProfile(uid);
    await updateUserProfile(uid, {
      expo_push_token: token,
      settings: {
        ...(profile?.settings || {}),
        push_notifications_enabled: true,
        expo_push_token: token,
      },
    });
    return token;
  } catch (err) {
    console.warn('[Push] Failed to sync push token:', err);
    return null;
  }
}

/**
 * Clears the stored Expo push token (e.g. when user disables push).
 */
export async function clearPushTokenForUser(uid: string): Promise<void> {
  if (!uid) return;
  const profile = await getUserProfile(uid);
  await updateUserProfile(uid, {
    expo_push_token: '',
    settings: {
      ...(profile?.settings || {}),
      push_notifications_enabled: false,
      expo_push_token: '',
    },
  });
}
