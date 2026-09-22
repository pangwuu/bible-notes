import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface HeaderNotificationBellProps {
  unreadCount?: number;
}

export default function HeaderNotificationBell({ unreadCount = 1 }: HeaderNotificationBellProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      style={styles.container}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={`Notifications, ${unreadCount} unread`}
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
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
    backgroundColor: colors.accentSocial, // #B4789E dusty plum
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
