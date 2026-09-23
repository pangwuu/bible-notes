/**
 * Note Detail Screen
 * Displays complete Swedish Method note with Scripture reading card,
 * Letterboxd-style friend overlap badge, and author actions (edit/delete).
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../src/constants/theme';
import * as notesService from '../../src/services/notesService';
import { Note, formatPassageDisplay } from '../../src/types/note';
import { useAuth } from '../../src/context/AuthContext';
import BibleReader from '../../src/components/BibleReader';
import { findFriendNoteOverlaps, FriendOverlapItem } from '../../src/services/noteOverlapService';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user, profile } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [overlaps, setOverlaps] = useState<FriendOverlapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const validId = notesService.parseNoteId(id);
        const fetched = await notesService.getNote(validId);
        if (isMounted) {
          if (fetched) {
            setNote(fetched);
            // Fetch friend overlaps if user is logged in
            if (user?.uid) {
              findFriendNoteOverlaps(user.uid, fetched.passage)
                .then((items) => {
                  if (isMounted) setOverlaps(items);
                })
                .catch((err) => {
                  console.warn('Failed to query friend note overlaps:', err);
                });
            }
          } else {
            setError('Note not found');
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load note');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  const handleDelete = () => {
    if (!note) return;
    Alert.alert('Delete Note', 'Are you sure you want to permanently delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await notesService.deleteNote(note.id);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete note.');
          }
        },
      },
    ]);
  };

  const isAuthor = !!(user?.uid && note?.user_id === user.uid);

  useLayoutEffect(() => {
    if (isAuthor) {
      navigation.setOptions({
        headerRight: () => (
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push({ pathname: '/note/edit', params: { id: note?.id } })}
              style={styles.headerButton}
              hitSlop={8}
            >
              <Ionicons name="pencil" size={20} color={colors.accent.keyIdea} />
            </Pressable>
            <Pressable onPress={handleDelete} style={styles.headerButton} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.accent.danger} />
            </Pressable>
          </View>
        ),
      });
    }
  }, [navigation, isAuthor, note, router]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent.keyIdea} />
      </View>
    );
  }

  if (error || !note) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errorText}>{error || 'Note not found'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Passage Display Title */}
      <Text style={styles.passageTitle}>{formatPassageDisplay(note.passage)}</Text>

      {/* Metadata Pill */}
      <View style={styles.metaRow}>
        <View style={styles.visBadge}>
          <Ionicons
            name={note.visibility === 'friends' ? 'people' : 'lock-closed'}
            size={12}
            color={colors.text.secondary}
          />
          <Text style={styles.visBadgeText}>
            {note.visibility === 'friends' ? 'Friends' : 'Private'}
          </Text>
        </View>

        {!isAuthor && note.authorUsername && (
          <Text style={styles.authorText}>By @{note.authorUsername}</Text>
        )}
      </View>

      {/* Letterboxd-style Overlap Badge Pill */}
      {overlaps.length > 0 && (
        <View style={styles.overlapSection}>
          {overlaps.map((item) => {
            const friendName = item.friendProfile.display_name || item.friendProfile.username || 'Friend';
            const initial = friendName[0].toUpperCase();
            const passageSummary = formatPassageDisplay(item.note.passage);

            return (
              <Pressable
                key={item.note.id}
                style={styles.overlapBadge}
                onPress={() => router.push({ pathname: '/note/[id]', params: { id: item.note.id } })}
              >
                <View style={styles.overlapAvatar}>
                  <Text style={styles.overlapAvatarText}>{initial}</Text>
                </View>
                <Text style={styles.overlapText}>
                  {friendName} also noted {passageSummary}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Live Scripture Reading Card with Multi-Translation Comparison */}
      <BibleReader
        passage={note.passage}
        preferredTranslation={profile?.settings?.preferred_translation || 'ESV'}
        customApiKey={profile?.settings?.custom_esv_api_key || profile?.custom_esv_api_key}
        initiallyCollapsed={false}
      />

      {/* Swedish Method Sections */}
      {note.lightContent ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="bulb-outline" size={15} color={colors.accent.keyIdea} />
            <Text style={[styles.sectionLabel, { color: colors.accent.keyIdea }]}>
              Key Idea
            </Text>
          </View>
          <Text style={styles.bodyText}>{note.lightContent}</Text>
        </View>
      ) : null}

      {note.questionContent ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="help-circle-outline" size={15} color={colors.accent.question} />
            <Text style={[styles.sectionLabel, { color: colors.accent.question }]}>
              Question
            </Text>
          </View>
          <Text style={styles.bodyText}>{note.questionContent}</Text>
        </View>
      ) : null}

      {note.arrowContent ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="navigate-outline" size={15} color={colors.accent.application} />
            <Text style={[styles.sectionLabel, { color: colors.accent.application }]}>
              Application
            </Text>
          </View>
          <Text style={styles.bodyText}>{note.arrowContent}</Text>
        </View>
      ) : null}

      {/* Tag Chips */}
      {note.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {note.tags.map((t) => (
            <View key={t} style={styles.tagChip}>
              <Text style={styles.tagText}>#{t}</Text>
            </View>
          ))}
        </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    padding: 6,
  },
  passageTitle: {
    fontSize: typography.display.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  visBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  visBadgeText: {
    color: colors.text.secondary,
    fontSize: 11,
  },
  authorText: {
    color: colors.text.secondary,
    fontSize: typography.caption.fontSize,
  },
  overlapSection: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.accent.social,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  overlapAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlapAvatarText: {
    color: colors.accent.social,
    fontSize: 11,
    fontWeight: '600',
  },
  overlapText: {
    color: colors.text.primary,
    fontSize: 13,
  },
  scriptureCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  scriptureText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  bodyText: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagChip: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  tagText: {
    color: colors.text.secondary,
    fontSize: typography.caption.fontSize,
  },
  errorText: {
    color: colors.accent.danger,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  backBtn: {
    backgroundColor: colors.bg.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.controls,
  },
  backBtnText: {
    color: colors.text.primary,
  },
});
