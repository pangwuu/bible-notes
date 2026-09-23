import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { subscribeToUnreadCount } from '../services/notificationService';

interface HeaderNotificationBellProps {
  unreadCount?: number;
}

export default function HeaderNotificationBell({ unreadCount }: HeaderNotificationBellProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [liveUnreadCount, setLiveUnreadCount] = useState<number>(unreadCount ?? 0);

  useEffect(() => {
    // If explicit unreadCount prop provided (e.g. testing), respect it
    if (unreadCount !== undefined) {
      setLiveUnreadCount(unreadCount);
      return;
    }

    if (!user?.uid) {
      setLiveUnreadCount(0);
      return;
    }

    const unsubscribe = subscribeToUnreadCount(user.uid, (count) => {
      setLiveUnreadCount(count);
    });

    return () => unsubscribe();
  }, [user?.uid, unreadCount]);

  const countToDisplay = liveUnreadCount;

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      style={styles.container}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={`Notifications, ${countToDisplay} unread`}
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
      {countToDisplay > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {countToDisplay > 99 ? '99+' : countToDisplay}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingRight: 16,
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentSocial,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.bgBase,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
