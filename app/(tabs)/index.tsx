import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
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
import DashboardGreeting from '../../src/components/DashboardGreeting';
import AddNoteFAB from '../../src/components/AddNoteFAB';
import safeStorage from '../../src/utils/safeStorage';
import {
  getDashboardFriendActivity,
  selectRandomReflectionNote,
  DashboardFriendActivity,
} from '../../src/services/dashboardService';

export interface HiddenSectionsState {
  recentNotes: boolean;
  friendsActivity: boolean;
  rediscover: boolean;
}

const DASHBOARD_HIDDEN_SECTIONS_KEY = 'dashboard_hidden_sections';

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
  const [hiddenSections, setHiddenSections] = useState<HiddenSectionsState>({
    recentNotes: false,
    friendsActivity: false,
    rediscover: false,
  });

  useEffect(() => {
    safeStorage.getItem(DASHBOARD_HIDDEN_SECTIONS_KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setHiddenSections((prev) => ({ ...prev, ...parsed }));
        } catch {
          // ignore parse error
        }
      }
    });
  }, []);

  const toggleSection = useCallback((section: keyof HiddenSectionsState) => {
    setHiddenSections((prev) => {
      const next = { ...prev, [section]: !prev[section] };
      safeStorage.setItem(DASHBOARD_HIDDEN_SECTIONS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

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
        {/* CLAUDE-STYLE GREETING */}
        <DashboardGreeting />

        {/* SECTION 1: RECENT NOTES */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Recent Notes</Text>
          <Pressable
            style={styles.hideButton}
            onPress={() => toggleSection('recentNotes')}
            accessibilityRole="button"
            accessibilityLabel={hiddenSections.recentNotes ? 'Show Recent Notes' : 'Hide Recent Notes'}
            hitSlop={8}
          >
            <Ionicons
              name={hiddenSections.recentNotes ? 'eye-outline' : 'eye-off-outline'}
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.hideButtonText}>
              {hiddenSections.recentNotes ? 'Show' : 'Hide'}
            </Text>
          </Pressable>
        </View>

        {!hiddenSections.recentNotes && (
          recentNotes.length === 0 ? (
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
          )
        )}

        {/* SECTION 2: FRIENDS' ACTIVITY */}
        <View style={styles.sectionDivider} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Friends' Activity</Text>
          <Pressable
            style={styles.hideButton}
            onPress={() => toggleSection('friendsActivity')}
            accessibilityRole="button"
            accessibilityLabel={hiddenSections.friendsActivity ? "Show Friends' Activity" : "Hide Friends' Activity"}
            hitSlop={8}
          >
            <Ionicons
              name={hiddenSections.friendsActivity ? 'eye-outline' : 'eye-off-outline'}
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.hideButtonText}>
              {hiddenSections.friendsActivity ? 'Show' : 'Hide'}
            </Text>
          </Pressable>
        </View>

        {!hiddenSections.friendsActivity && (
          !hasFriendNotes ? (
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
          )
        )}

        {/* SECTION 3: REDISCOVER A REFLECTION */}
        {randomNote ? (
          <>
            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Rediscover a Reflection</Text>
              <Pressable
                style={styles.hideButton}
                onPress={() => toggleSection('rediscover')}
                accessibilityRole="button"
                accessibilityLabel={hiddenSections.rediscover ? "Show Rediscover a Reflection" : "Hide Rediscover a Reflection"}
                hitSlop={8}
              >
                <Ionicons
                  name={hiddenSections.rediscover ? 'eye-outline' : 'eye-off-outline'}
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.hideButtonText}>
                  {hiddenSections.rediscover ? 'Show' : 'Hide'}
                </Text>
              </Pressable>
            </View>
            {!hiddenSections.rediscover && (
              <RandomReflectionCard
                note={randomNote}
                onPress={() =>
                  router.push({ pathname: '/note/[id]', params: { id: randomNote.id } })
                }
                onShuffle={handleShuffleRandomNote}
              />
            )}
          </>
        ) : null}
      </ScrollView>

      <AddNoteFAB />
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
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.control,
    backgroundColor: colors.bgSurfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  hideButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
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
});
