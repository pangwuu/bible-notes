/**
 * Notes Directory Browser Screen
 * By Book and By Tag views with Swedish symbol indicators and FAB.
 * Governed strictly by DESIGN.md.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { findCanonicalBook, CANONICAL_BOOKS } from '../../src/constants/bibleData';
import { NoteDraft, listNewNoteDrafts, clearDraft } from '../../src/services/noteDraftStore';
import { onNotesChanged } from '../../src/state/noteTrash';
import { Alert } from '../../src/utils/alert';

export default function NotesBrowserScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [drafts, setDrafts] = useState<NoteDraft[]>([]);
  const [viewMode, setViewMode] = useState<'book' | 'tag'>('book');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!user?.uid) return;
    listNewNoteDrafts(user.uid)
      .then((found) =>
        setDrafts((prev) =>
          prev.length === found.length && prev.every((d, i) => d.key === found[i].key && d.savedAt === found[i].savedAt)
            ? prev
            : found
        )
      )
      .catch(() => {});
    try {
      const data = await notesService.getUserNotes(user.uid);
      setNotes(data);
      setLoadError(false);
    } catch {
      // Keep whatever notes are already on screen; just tell the user the refresh failed.
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  // Re-fetch notes every time screen regains focus (e.g. after deleting or editing a note)
  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  useEffect(() => onNotesChanged(() => loadNotes()), [loadNotes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotes();
  }, [loadNotes]);

  // Filter notes by search and active tag
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const q = searchQuery.trim().toLowerCase();
      const titleMatch = Boolean(n.title && n.title.toLowerCase().includes(q));
      const passageText = (n.passage?.display || n.passage?.displayString || '').toLowerCase();
      const booksMatch = n.passage?.books?.some((b) => b.toLowerCase().includes(q));

      const matchesSearch =
        !q ||
        titleMatch ||
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

    const getBookIndex = (bookName: string): number => {
      const book = findCanonicalBook(bookName);
      if (!book) return 999;
      const idx = CANONICAL_BOOKS.findIndex((b) => b.name === book.name);
      return idx >= 0 ? idx : 999;
    };

    return Array.from(map.entries()).sort(([bookA], [bookB]) => {
      const idxA = getBookIndex(bookA);
      const idxB = getBookIndex(bookB);
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      return bookA.localeCompare(bookB);
    });
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
      <View style={styles.searchContainer} accessibilityRole="search">
        <Searchbar
          placeholder="Search by title, book, tag, or reflection..."
          accessibilityLabel="Search by title, book, tag, or reflection"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          spellCheck={false}
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
            { value: 'book', label: 'By book' },
            { value: 'tag', label: 'By tag' },
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
              accessibilityRole="button"
              accessibilityState={{ selected: selectedTag === null }}
              accessibilityLabel={`All (${notes.length})`}
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
                accessibilityRole="button"
                accessibilityState={{ selected: selectedTag === tag }}
                accessibilityLabel={`#${tag} (${count})`}
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

        {loadError && (
          <View style={styles.errorRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Ionicons name="cloud-offline-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.errorText}>
              Couldn't refresh your notes. Pull down to try again.
            </Text>
          </View>
        )}

        {drafts.map((draft) => {
          const draftLabel =
            draft.payload.title.trim() ||
            (draft.payload.passage ? formatPassageDisplay(draft.payload.passage) : 'No passage yet');
          return (
            <View key={draft.key} style={styles.draftCard}>
              <Ionicons name="create-outline" size={18} color={colors.accent.keyIdea} />
              <View style={styles.draftTextCol}>
                <Text style={styles.draftTitle}>Unfinished note</Text>
                <Text style={styles.draftMeta} numberOfLines={1}>
                  {draftLabel}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Discard unfinished note?',
                    'Everything you wrote in this unfinished note will be deleted.',
                    [
                      { text: 'Keep draft', style: 'cancel' },
                      {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                          clearDraft(draft.key);
                          setDrafts((prev) => prev.filter((d) => d.key !== draft.key));
                        },
                      },
                    ]
                  );
                }}
                style={styles.draftButton}
                accessibilityRole="button"
                accessibilityLabel={`Discard unfinished note: ${draftLabel}`}
              >
                <Text style={[styles.draftButtonText, styles.draftButtonMuted]}>Discard</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/note/edit', params: { draft: draft.key } })}
                style={styles.draftButton}
                accessibilityRole="button"
                accessibilityLabel={`Resume unfinished note: ${draftLabel}`}
              >
                <Text style={styles.draftButtonText}>Resume</Text>
              </Pressable>
            </View>
          );
        })}

        {loading && notes.length === 0 ? (
          <View accessibilityLabel="Loading notes" accessibilityRole="progressbar">
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={[styles.skeletonLine, styles.skeletonTitle]} />
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, styles.skeletonShort]} />
              </View>
            ))}
          </View>
        ) : filteredNotes.length === 0 ? (
          notes.length > 0 ? (
            <EmptyState
              icon="search-outline"
              title="No matching notes"
              subtitle="No notes match your search or selected tag filter."
              actionLabel="Clear filters"
              onAction={() => {
                setSearchQuery('');
                setSelectedTag(null);
              }}
            />
          ) : (
            <EmptyState
              icon="book-outline"
              title="No notes found"
              subtitle="Tap the button below to capture your first study note."
              actionLabel="Create note"
              onAction={() => router.push('/note/edit')}
            />
          )
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

        {!loading && (
          <Pressable
            onPress={() => router.push('/recently-deleted')}
            style={styles.recentlyDeletedLink}
            accessibilityRole="button"
            accessibilityLabel="Recently Deleted"
          >
            <Ionicons name="trash-outline" size={15} color={colors.text.secondary} />
            <Text style={styles.recentlyDeletedText}>Recently Deleted</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.text.secondary} />
          </Pressable>
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
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.keyIdea,
  },
  draftTextCol: {
    flex: 1,
    minWidth: 0,
  },
  draftTitle: {
    ...typography.label,
    color: colors.text.primary,
  },
  draftMeta: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  draftButton: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  draftButtonText: {
    ...typography.label,
    color: colors.accent.keyIdea,
    fontWeight: '600',
  },
  draftButtonMuted: {
    color: colors.text.secondary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.danger,
  },
  errorText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  skeletonCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.bg.surfaceRaised,
  },
  skeletonTitle: {
    width: '45%',
    height: 14,
  },
  skeletonShort: {
    width: '70%',
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
  recentlyDeletedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.bg.surface,
    alignSelf: 'center',
  },
  recentlyDeletedText: {
    ...typography.label,
    fontSize: 13,
    color: colors.text.secondary,
  },
});
