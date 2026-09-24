import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import * as notesService from '../../src/services/notesService';
import { Note } from '../../src/types/note';
import NoteCard from '../../src/components/NoteCard';
import EmptyState from '../../src/components/EmptyState';
import { FriendNoteCard } from '../../src/components/FriendNoteCard';
import { RandomReflectionCard } from '../../src/components/RandomReflectionCard';
import {
  getDashboardFriendActivity,
  selectRandomReflectionNote,
  DashboardFriendActivity,
} from '../../src/services/dashboardService';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [allUserNotes, setAllUserNotes] = useState<Note[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [friendActivity, setFriendActivity] = useState<DashboardFriendActivity>({
    intersectingNotes: [],
    otherFriendNotes: [],
    hasFriends: false,
  });
  const [randomNote, setRandomNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadDashboardData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      // 1. Fetch user notes
      const notes = await notesService.getUserNotes(user.uid);
      setAllUserNotes(notes);
      const topRecent = notes.slice(0, 5);
      setRecentNotes(topRecent);

      // 2. Select a random note (preferring notes not in the top 5 recent notes)
      const recentIds = new Set(topRecent.map((n) => n.id));
      setRandomNote((prev) => selectRandomReflectionNote(notes, recentIds, prev?.id));

      // 3. Fetch friend activity & intersection data
      const socialActivity = await getDashboardFriendActivity(user.uid, notes);
      setFriendActivity(socialActivity);
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  // Re-fetch notes every time screen regains focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleShuffleRandomNote = useCallback(() => {
    const recentIds = new Set(recentNotes.map((n) => n.id));
    const nextRandom = selectRandomReflectionNote(
      allUserNotes,
      recentIds,
      randomNote?.id
    );
    if (nextRandom) {
      setRandomNote(nextRandom);
    }
  }, [allUserNotes, recentNotes, randomNote?.id]);

  const hasFriendNotes =
    friendActivity.intersectingNotes.length > 0 ||
    friendActivity.otherFriendNotes.length > 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accentKeyIdea}
          />
        }
      >
        {/* SECTION 1: RECENT NOTES */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Recent Notes</Text>
        </View>

        {recentNotes.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No notes yet"
            subtitle="Capture reflections on Scripture using the Swedish Method."
            actionLabel="Start a note"
            onAction={() => router.push('/note/edit')}
          />
        ) : (
          recentNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
            />
          ))
        )}

        {/* SECTION 2: FRIENDS' ACTIVITY */}
        <View style={styles.sectionDivider} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Friends' Activity</Text>
        </View>

        {!hasFriendNotes ? (
          <View style={styles.friendEmptyCard}>
            <Ionicons name="people-outline" size={24} color={colors.accentSocial} />
            <View style={styles.friendEmptyMeta}>
              <Text style={styles.friendEmptyTitle}>
                {friendActivity.hasFriends ? 'No shared notes yet' : 'Connect with friends'}
              </Text>
              <Text style={styles.friendEmptySubtitle}>
                {friendActivity.hasFriends
                  ? 'Notes shared by your friends will appear here.'
                  : 'Add friends to discover mutual passage reflections and shared study insights.'}
              </Text>
            </View>
            <Pressable
              style={styles.findFriendsButton}
              onPress={() => router.push('/(tabs)/friends')}
              accessibilityRole="button"
              accessibilityLabel="Find Friends"
            >
              <Text style={styles.findFriendsButtonText}>
                {friendActivity.hasFriends ? 'Friends' : 'Find Friends'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Pinned Shared Passages (Intersecting Notes) */}
            {friendActivity.intersectingNotes.length > 0 ? (
              <View style={styles.subSectionContainer}>
                <View style={styles.subSectionHeader}>
                  <Ionicons name="people-outline" size={15} color={colors.accentSocial} />
                  <Text style={styles.subSectionTitle}>Shared Passages</Text>
                </View>
                {friendActivity.intersectingNotes.map((item) => (
                  <FriendNoteCard
                    key={`intersecting-${item.note.id}`}
                    item={item}
                    onPress={() =>
                      router.push({ pathname: '/note/[id]', params: { id: item.note.id } })
                    }
                  />
                ))}
              </View>
            ) : null}

            {/* Other Friend Updates */}
            {friendActivity.otherFriendNotes.length > 0 ? (
              <View style={styles.subSectionContainer}>
                {friendActivity.intersectingNotes.length > 0 ? (
                  <View style={styles.subSectionHeader}>
                    <Ionicons name="newspaper-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.subSectionTitleSecondary}>Recent Updates</Text>
                  </View>
                ) : null}
                {friendActivity.otherFriendNotes.map((item) => (
                  <FriendNoteCard
                    key={`other-${item.note.id}`}
                    item={item}
                    onPress={() =>
                      router.push({ pathname: '/note/[id]', params: { id: item.note.id } })
                    }
                  />
                ))}
              </View>
            ) : null}
          </>
        )}

        {/* SECTION 3: REDISCOVER A REFLECTION */}
        {randomNote ? (
          <>
            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Rediscover a Reflection</Text>
            </View>
            <RandomReflectionCard
              note={randomNote}
              onPress={() =>
                router.push({ pathname: '/note/[id]', params: { id: randomNote.id } })
              }
              onShuffle={handleShuffleRandomNote}
            />
          </>
        ) : null}
      </ScrollView>

      <FAB
        icon="plus"
        color={colors.bgBase}
        style={styles.fab}
        onPress={() => router.push('/note/edit')}
        accessibilityLabel="Create note"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.borderHairline,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  subSectionContainer: {
    marginBottom: spacing.sm,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs + 2,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentSocial,
  },
  subSectionTitleSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  friendEmptyCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  friendEmptyMeta: {
    flex: 1,
  },
  friendEmptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  friendEmptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  findFriendsButton: {
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  findFriendsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentSocial,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.accentKeyIdea,
    borderRadius: 28,
  },
});
