import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  syncPushTokenForUser,
  resolveNotificationDeepLink,
} from '../services/pushNotificationService';
import type { NotificationType } from '../types/notification';

/**
 * Registers Expo push token after auth and routes taps on notification responses.
 */
export default function PushNotificationBootstrap() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const registeredUid = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!user?.uid) {
      registeredUid.current = null;
      return;
    }

    const pushEnabled = profile?.settings?.push_notifications_enabled !== false;
    if (!pushEnabled) return;
    if (registeredUid.current === user.uid) return;

    registeredUid.current = user.uid;
    syncPushTokenForUser(user.uid).catch(() => {});
  }, [user?.uid, profile?.settings?.push_notifications_enabled]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      const type =
        typeof data.type === 'string' ? (data.type as NotificationType) : 'friend_note_exists';
      const deepLink = resolveNotificationDeepLink({
        type,
        related_note_id:
          typeof data.related_note_id === 'string' ? data.related_note_id : undefined,
        related_user_id:
          typeof data.related_user_id === 'string' ? data.related_user_id : undefined,
      });

      if (deepLink.params) {
        router.push({ pathname: deepLink.pathname as any, params: deepLink.params });
      } else {
        router.push(deepLink.pathname as any);
      }
    });

    return () => sub.remove();
  }, [router]);

  return null;
}
