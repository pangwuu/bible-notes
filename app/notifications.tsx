import React, { useLayoutEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/constants/theme';

interface NotificationItem {
  id: string;
  type: 'friend_note_exists' | 'friend_request' | 'friend_accept';
  actorName: string;
  passage?: string;
  timeAgo: string;
  read: boolean;
}

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'friend_note_exists',
    actorName: 'Sarah Smith',
    passage: 'John 3:16',
    timeAgo: '2h ago',
    read: false,
  },
  {
    id: '2',
    type: 'friend_accept',
    actorName: 'Mark Chen',
    timeAgo: '1d ago',
    read: true,
  },
];

export default function NotificationsModal() {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Notifications',
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      ),
    });
  }, [navigation, router]);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Pressable
      style={[styles.row, !item.read && styles.unreadRow]}
      onPress={() => {
        if (item.passage) {
          router.push({ pathname: '/note/[id]', params: { id: 'sample-1' } });
        }
      }}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.actorName[0]}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.message}>
          <Text style={styles.actor}>{item.actorName}</Text>{' '}
          {item.type === 'friend_note_exists'
            ? `also noted ${item.passage}`
            : 'accepted your friend request'}
        </Text>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={mockNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  closeButton: {
    padding: 6,
  },
  list: {
    padding: spacing.md,
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
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
