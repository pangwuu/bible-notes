import React, { useState, useCallback } from 'react';
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

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchRecent = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const notes = await notesService.getUserNotes(user.uid);
      setRecentNotes(notes.slice(0, 5));
    } catch {
      // Retain existing state if fetch fails
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  // Re-fetch notes every time screen regains focus (e.g. after deleting or editing a note)
  useFocusEffect(
    useCallback(() => {
      fetchRecent();
    }, [fetchRecent])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecent();
  }, [fetchRecent]);

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
        <View style={styles.quickJumpCard}>
          <Text style={styles.quickJumpTitle}>Quick Passage Jump</Text>
          <Pressable
            style={styles.quickJumpButton}
            onPress={() => router.push('/note/edit')}
            accessibilityRole="button"
            accessibilityLabel="Jump to passage"
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <Text style={styles.quickJumpPlaceholder}>Jump to book, chapter, verse...</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionHeading}>Recent Notes</Text>

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
  },
  quickJumpCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.lg,
  },
  quickJumpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  quickJumpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    gap: spacing.sm,
  },
  quickJumpPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noteCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.sm,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  passageRef: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noteSnippet: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.accentKeyIdea,
    borderRadius: 28,
  },
});
