import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text, Dialog, Portal, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing, radius } from '../../src/constants/theme';
import { UserProfile } from '../../src/types/user';
import { Note } from '../../src/types/note';
import { getUserProfile } from '../../src/services/authService';
import {
  getFriendshipStatus,
  getFriendNotes,
  unfriend,
} from '../../src/services/friendService';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const [unfriending, setUnfriending] = useState(false);

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    try {
      const [profile, relStatus, sharedNotes] = await Promise.all([
        getUserProfile(id),
        getFriendshipStatus(user.uid, id),
        getFriendNotes(id),
      ]);

      setFriendProfile(profile);
      setFriendshipId(relStatus.friendshipId || null);
      setIsFriend(relStatus.status === 'accepted');
      setNotes(sharedNotes);
    } catch (err) {
      console.error('Failed to load friend profile:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUnfriend = async () => {
    if (!friendshipId) return;
    setUnfriending(true);
    try {
      await unfriend(friendshipId);
      setShowUnfriendDialog(false);
      router.back();
    } catch (err) {
      console.error('Failed to unfriend user:', err);
      setUnfriending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accentSocial} size="large" />
      </View>
    );
  }

  const initial = (
    friendProfile?.display_name ||
    friendProfile?.username ||
    id ||
    'F'
  )[0].toUpperCase();

  const displayName = friendProfile?.display_name || friendProfile?.username || 'User';
  const username = friendProfile?.username || id;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.username}>@{username}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{isFriend ? 'Mutual Friend' : 'Not Connected'}</Text>
          </View>
        </View>

        {isFriend && friendshipId ? (
          <Pressable
            style={styles.unfriendButton}
            onPress={() => setShowUnfriendDialog(true)}
          >
            <Text style={styles.unfriendButtonText}>Unfriend</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.sectionHeader}>Shared Notes</Text>

      {notes.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No shared notes"
          subtitle={`${displayName} has not shared any notes yet.`}
        />
      ) : (
        notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
          />
        ))
      )}

      {/* Confirmation Dialog for Unfriend */}
      <Portal>
        <Dialog
          visible={showUnfriendDialog}
          onDismiss={() => setShowUnfriendDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Unfriend {displayName}?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Are you sure you want to remove {displayName} as a friend? You will no longer be able to view their shared notes.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor={colors.textSecondary}
              onPress={() => setShowUnfriendDialog(false)}
              disabled={unfriending}
            >
              Cancel
            </Button>
            <Button
              textColor={colors.accentDanger}
              onPress={handleUnfriend}
              loading={unfriending}
              disabled={unfriending}
            >
              Unfriend
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgSurfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: colors.accentSocial,
    fontSize: 24,
    fontWeight: '600',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  statusBadge: {
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  statusText: {
    fontSize: 12,
    color: colors.accentSocial,
  },
  unfriendButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurfaceRaised,
  },
  unfriendButtonText: {
    fontSize: 13,
    color: colors.accentDanger,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  dialog: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  dialogTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  dialogText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
