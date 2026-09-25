/**
 * Notes Directory Browser Screen
 * By Book and By Tag views with Swedish symbol indicators and FAB.
 * Governed strictly by DESIGN.md.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Text, SegmentedButtons, Searchbar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../src/constants/theme';
import * as notesService from '../../src/services/notesService';
import { Note, formatPassageDisplay } from '../../src/types/note';
import { useAuth } from '../../src/context/AuthContext';
import NoteCard from '../../src/components/NoteCard';
import EmptyState from '../../src/components/EmptyState';
import AddNoteFAB from '../../src/components/AddNoteFAB';

export default function NotesBrowserScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'book' | 'tag'>('book');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const data = await notesService.getUserNotes(user.uid);
      setNotes(data);
    } catch {
      // Retain existing cached notes
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Re-fetch notes every time screen regains focus (e.g. after deleting or editing a note)
  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotes();
  }, [loadNotes]);

  // Filter notes by search and active tag
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const q = searchQuery.trim().toLowerCase();
      const passageText = (n.passage?.display || n.passage?.displayString || '').toLowerCase();
      const booksMatch = n.passage?.books?.some((b) => b.toLowerCase().includes(q));

      const matchesSearch =
        !q ||
        passageText.includes(q) ||
        booksMatch ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q));

      const matchesTag = !selectedTag || n.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [notes, searchQuery, selectedTag]);

  // Group notes by book
  const notesByBook = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of filteredNotes) {
      const noteBooks = n.passage?.books && n.passage.books.length > 0
        ? n.passage.books
        : n.passage?.segments && n.passage.segments.length > 0
        ? Array.from(new Set(n.passage.segments.map((s) => s.book)))
        : ['Other'];

      for (const b of noteBooks) {
        const existing = map.get(b) || [];
        existing.push(n);
        map.set(b, existing);
      }
    }
    return Array.from(map.entries()).sort(([bookA], [bookB]) => bookA.localeCompare(bookB));
  }, [filteredNotes]);

  // Tag frequency statistics
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes) {
      for (const t of n.tags) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  return (
    <View style={styles.screen}>
      {/* Search Input matching Friends search component */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by book, tag, or reflection..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          inputStyle={{ color: colors.textPrimary }}
          placeholderTextColor={colors.textSecondary}
          iconColor={colors.textSecondary}
        />
      </View>

      {/* View Mode Segment */}
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(val) => setViewMode(val as 'book' | 'tag')}
          buttons={[
            { value: 'book', label: 'By Book' },
            { value: 'tag', label: 'By Tag' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.keyIdea}
          />
        }
      >
        {viewMode === 'tag' && (
          <View style={styles.tagPillRow}>
            <Pressable
              onPress={() => setSelectedTag(null)}
              style={[
                styles.filterPill,
                selectedTag === null && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedTag === null && styles.filterPillTextActive,
                ]}
              >
                All ({notes.length})
              </Text>
            </Pressable>
            {tagCounts.map(([tag, count]) => (
              <Pressable
                key={tag}
                onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                style={[
                  styles.filterPill,
                  selectedTag === tag && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedTag === tag && styles.filterPillTextActive,
                  ]}
                >
                  #{tag} ({count})
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {filteredNotes.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No notes found"
            subtitle="Tap the button below to capture your first Swedish Method note."
            actionLabel="Create note"
            onAction={() => router.push('/note/edit')}
          />
        ) : viewMode === 'book' ? (
          notesByBook.map(([book, bookNotes]) => (
            <View key={book} style={styles.group}>
              <Text style={styles.groupHeader}>
                {book} ({bookNotes.length})
              </Text>
              {bookNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
                />
              ))}
            </View>
          ))
        ) : (
          filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
            />
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <AddNoteFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchBar: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  segmentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentedButtons: {
    backgroundColor: colors.bg.surface,
  },
  container: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  tagPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  filterPillActive: {
    backgroundColor: colors.accent.keyIdea,
    borderColor: colors.accent.keyIdea,
  },
  filterPillText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  filterPillTextActive: {
    color: colors.bg.base,
    fontWeight: '600',
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupHeader: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  noteItem: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  swedishIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorSymbol: {
    fontSize: 13,
  },
  itemSnippet: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 240,
  },
});
