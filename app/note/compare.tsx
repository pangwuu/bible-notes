/**
 * Side-by-side / stacked comparison of your note vs a friend's overlapping note.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { colors, spacing, radii, typography, markdownStyles } from '../../src/constants/theme';
import * as notesService from '../../src/services/notesService';
import { Note, formatPassageDisplay } from '../../src/types/note';
import { alignSectionsForCompare, getComparableSections } from '../../src/utils/noteCompare';

export default function NoteCompareScreen() {
  const { mine, theirs } = useLocalSearchParams<{ mine?: string; theirs?: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const sideBySide = width >= 720;

  const [myNote, setMyNote] = useState<Note | null>(null);
  const [friendNote, setFriendNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Compare notes' });
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const mineId = notesService.parseNoteId(mine);
      const theirsId = notesService.parseNoteId(theirs);
      if (!mineId || !theirsId) {
        setError('Missing notes to compare.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [a, b] = await Promise.all([
          notesService.getNote(mineId),
          notesService.getNote(theirsId),
        ]);
        if (cancelled) return;
        if (!a || !b) {
          setError('One or both notes could not be loaded.');
          setMyNote(a);
          setFriendNote(b);
        } else {
          setMyNote(a);
          setFriendNote(b);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load notes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mine, theirs]);

  const friendLabel = useMemo(() => {
    if (!friendNote) return 'Friend';
    return (
      friendNote.authorDisplayName ||
      friendNote.author_display_name ||
      (friendNote.authorUsername ? `@${friendNote.authorUsername}` : null) ||
      (friendNote.author_username ? `@${friendNote.author_username}` : null) ||
      'Friend'
    );
  }, [friendNote]);

  const rows = useMemo(
    () =>
      alignSectionsForCompare(
        getComparableSections(myNote),
        getComparableSections(friendNote)
      ),
    [myNote, friendNote]
  );

  const openNote = useCallback(
    (id?: string) => {
      if (!id) return;
      router.push({ pathname: '/note/[id]', params: { id } });
    },
    [router]
  );

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent.keyIdea} />
        <Text style={styles.loadingText}>Loading comparison...</Text>
      </View>
    );
  }

  if (error && (!myNote || !friendNote)) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.passageLabel}>
        {formatPassageDisplay(myNote?.passage || friendNote?.passage!)}
      </Text>
      <Text style={styles.subtitle}>
        Your reflection beside {friendLabel}&apos;s shared note on the overlapping passage.
      </Text>

      <View style={[styles.columnHeaders, sideBySide && styles.columnHeadersRow]}>
        <Pressable
          style={[styles.columnHeader, sideBySide && styles.columnHalf]}
          onPress={() => openNote(myNote?.id)}
          accessibilityLabel="Open your note"
        >
          <Ionicons name="person" size={14} color={colors.accent.keyIdea} />
          <Text style={styles.columnHeaderText}>You</Text>
        </Pressable>
        <Pressable
          style={[styles.columnHeader, sideBySide && styles.columnHalf]}
          onPress={() => openNote(friendNote?.id)}
          accessibilityLabel={`Open ${friendLabel}'s note`}
        >
          <Ionicons name="people" size={14} color={colors.accent.question} />
          <Text style={styles.columnHeaderText}>{friendLabel}</Text>
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <Text style={styles.emptyText}>No reflection content to compare yet.</Text>
      ) : (
        rows.map((row, idx) => (
          <View key={`${row.title}-${idx}`} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>{row.title}</Text>
            <View style={[styles.pairRow, sideBySide && styles.pairRowSideBySide]}>
              <View style={[styles.panel, sideBySide && styles.columnHalf]}>
                {row.mine?.content ? (
                  <Markdown style={markdownStyles}>{row.mine.content}</Markdown>
                ) : (
                  <Text style={styles.missingText}>No content</Text>
                )}
              </View>
              <View
                style={[
                  styles.panel,
                  styles.panelFriend,
                  sideBySide && styles.columnHalf,
                ]}
              >
                {row.theirs?.content ? (
                  <Markdown style={markdownStyles}>{row.theirs.content}</Markdown>
                ) : (
                  <Text style={styles.missingText}>No content</Text>
                )}
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.accent.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  backBtnText: {
    color: colors.accent.keyIdea,
    fontWeight: '600',
  },
  passageLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  columnHeaders: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  columnHeadersRow: {
    flexDirection: 'row',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  columnHeaderText: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  columnHalf: {
    flex: 1,
  },
  sectionBlock: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.label.fontSize,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'none',
  },
  pairRow: {
    gap: spacing.sm,
  },
  pairRowSideBySide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  panel: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing.sm,
    minHeight: 64,
  },
  panelFriend: {
    borderColor: colors.accent.question + '55',
  },
  missingText: {
    color: colors.text.secondary,
    fontStyle: 'italic',
    fontSize: 13,
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
