import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { NotificationDocument } from '../src/types/notification';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotifications,
} from '../src/services/notificationService';
import { EmptyState } from '../src/components/EmptyState';

function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return 'recently';
  const millis = timestamp.toMillis ? timestamp.toMillis() : typeof timestamp === 'number' ? timestamp : Date.now();
  const diffSec = Math.floor((Date.now() - millis) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(millis).toLocaleDateString();
}

export default function NotificationsModal() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Set header options
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Notifications',
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      ),
      headerRight: () => (
        notifications.some((n) => !n.read) ? (
          <Pressable onPress={handleMarkAllRead} style={styles.markAllButton} hitSlop={8}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : null
      ),
    });
  }, [navigation, router, notifications]);

  // Real-time subscription to notifications
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToNotifications(
      user.uid,
      (list) => {
        setNotifications(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const onRefresh = useCallback(async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      const fresh = await getNotifications(user.uid);
      setNotifications(fresh);
    } catch (err) {
      console.warn('Failed to refresh notifications:', err);
    } finally {
      setRefreshing(false);
    }
  }, [user?.uid]);

  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  const handleNotificationPress = async (item: NotificationDocument) => {
    if (!item.read) {
      markNotificationAsRead(item.id).catch(() => {});
    }

    if (item.type === 'friend_note_exists' && item.related_note_id) {
      router.push({ pathname: '/note/[id]', params: { id: item.related_note_id } });
    } else if (item.related_user_id) {
      router.push({ pathname: '/friend/[id]', params: { id: item.related_user_id } });
    }
  };

  const renderItem = ({ item }: { item: NotificationDocument }) => {
    const initial = (item.related_user_name || 'F')[0].toUpperCase();
    const timeAgo = formatTimeAgo(item.created_at);

    let messageText = 'sent you a message';
    if (item.type === 'friend_note_exists') {
      messageText = `also noted ${item.passage_summary || 'this passage'}`;
    } else if (item.type === 'friend_accept') {
      messageText = 'accepted your friend request';
    } else if (item.type === 'friend_request') {
      messageText = 'sent you a friend request';
    }

    return (
      <Pressable
        style={[styles.row, !item.read && styles.unreadRow]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.message}>
            <Text style={styles.actor}>{item.related_user_name}</Text>{' '}
            {messageText}
          </Text>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentSocial} size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textSecondary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="No notifications yet"
              subtitle="When your friends study the same passages or send friend requests, you'll see them here."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 6,
  },
  markAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  markAllText: {
    color: colors.accentSocial,
    fontSize: 13,
    fontWeight: '500',
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHairline,
  },
  unreadRow: {
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.control,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgSurfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: colors.accentSocial,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  actor: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  message: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentSocial,
    marginLeft: spacing.xs,
  },
});
