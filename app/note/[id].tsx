/**
 * Note Detail Screen
 * Displays complete Swedish Method note with Scripture reading card,
 * Letterboxd-style friend overlap badge, and author actions (edit/delete).
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from '../../src/components/TemplateIcon';
import Markdown from 'react-native-markdown-display';
import { colors, spacing, radii, typography, markdownStyles } from '../../src/constants/theme';
import * as notesService from '../../src/services/notesService';
import { Note, formatPassageDisplay, PassageReference, PassageSegment } from '../../src/types/note';
import { formatSegmentDisplay, createPassageReference } from '../../src/utils/passageParser';
import { useAuth } from '../../src/context/AuthContext';
import BibleReader from '../../src/components/BibleReader';
import FontSizeControls from '../../src/components/FontSizeControls';
import safeStorage from '../../src/utils/safeStorage';
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
  const [readerFontSize, setReaderFontSize] = useState<number>(16);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  const activeSegmentPassage = useMemo(() => {
    if (activeSegmentIndex === null || !note?.passage?.segments?.[activeSegmentIndex]) {
      return null;
    }
    return createPassageReference([note.passage.segments[activeSegmentIndex]]);
  }, [note?.passage, activeSegmentIndex]);

  useEffect(() => {
    let isMounted = true;
    safeStorage.getItem('bible_font_size').then((stored) => {
      if (isMounted && stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 26) {
          setReaderFontSize(parsed);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const loadNote = useCallback(async () => {
    try {
      const validId = notesService.parseNoteId(id);
      const fetched = await notesService.getNote(validId);
      if (fetched) {
        setNote(fetched);
        if (user?.uid) {
          findFriendNoteOverlaps(user.uid, fetched.passage)
            .then((items) => setOverlaps(items))
            .catch((err) => {
              console.warn('Failed to query friend note overlaps:', err);
            });
        }
      } else {
        setError('Note not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load note');
    } finally {
      setLoading(false);
    }
  }, [id, user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadNote();
    }, [loadNote])
  );

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
    navigation.setOptions({
      title: 'Note',
      headerRight: isAuthor
        ? () => (
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
          )
        : undefined,
    });
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

  const hasAnyReflection =
    note.sections && note.sections.length > 0
      ? note.sections.some((s) => Boolean(s.content?.trim()))
      : Boolean(note.lightContent?.trim()) ||
        Boolean(note.questionContent?.trim()) ||
        Boolean(note.arrowContent?.trim());

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Top Action Row: Visibility Badge (left) & Font Size Stepper (right) */}
      <View style={styles.topActionRow}>
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

        <FontSizeControls
          initialSize={readerFontSize}
          onSizeChange={setReaderFontSize}
        />
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

      {/* Interactive Table of Contents (Passage Segments) */}
      {note.passage?.segments && note.passage.segments.length > 0 && (
        <View style={styles.tocContainer}>
          <View style={styles.tocHeaderRow}>
            <Ionicons name="list-outline" size={14} color={colors.accent.keyIdea} />
            <Text style={styles.tocTitle}>Table of Contents</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tocList}>
            {note.passage.segments.length > 1 && (
              <Pressable
                onPress={() => setActiveSegmentIndex(null)}
                style={[
                  styles.tocPill,
                  activeSegmentIndex === null && styles.tocPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.tocPillText,
                    activeSegmentIndex === null && styles.tocPillTextActive,
                  ]}
                >
                  All Passages ({note.passage.segments.length})
                </Text>
              </Pressable>
            )}
            {note.passage.segments.map((seg, idx) => {
              const isActive = activeSegmentIndex === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => setActiveSegmentIndex(isActive ? null : idx)}
                  style={[
                    styles.tocPill,
                    isActive && styles.tocPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tocPillText,
                      isActive && styles.tocPillTextActive,
                    ]}
                  >
                    {formatSegmentDisplay(seg)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Live Scripture Reading Card with Multi-Translation Comparison */}
      <BibleReader
        passage={note.passage}
        activeSegment={activeSegmentPassage}
        fontSize={readerFontSize}
        preferredTranslation={profile?.settings?.preferred_translation || 'ESV'}
        customApiKey={profile?.settings?.custom_esv_api_key || profile?.custom_esv_api_key}
        initiallyCollapsed={false}
      />

      {/* Note Template Sections */}
      {note.sections && note.sections.length > 0 ? (
        note.sections.map((sec) => {
          if (!sec.content?.trim()) return null;
          const secColor =
            sec.color ||
            (sec.id === 'light'
              ? colors.accent.keyIdea
              : sec.id === 'question'
              ? colors.accent.question
              : sec.id === 'arrow'
              ? colors.accent.application
              : colors.accent.keyIdea);

          return (
            <View key={sec.id} style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <TemplateIcon
                  name={sec.icon || 'document-text-outline'}
                  size={15}
                  color={secColor}
                />
                <Text style={[styles.sectionLabel, { color: secColor }]}>
                  {sec.title}
                </Text>
              </View>
              <Markdown style={markdownStyles}>{sec.content.trim()}</Markdown>
            </View>
          );
        })
      ) : (
        <>
          {note.lightContent?.trim() ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="bulb-outline" size={15} color={colors.accent.keyIdea} />
                <Text style={[styles.sectionLabel, { color: colors.accent.keyIdea }]}>
                  Key Idea
                </Text>
              </View>
              <Markdown style={markdownStyles}>{note.lightContent.trim()}</Markdown>
            </View>
          ) : null}

          {note.questionContent?.trim() ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="help-circle-outline" size={15} color={colors.accent.question} />
                <Text style={[styles.sectionLabel, { color: colors.accent.question }]}>
                  Question
                </Text>
              </View>
              <Markdown style={markdownStyles}>{note.questionContent.trim()}</Markdown>
            </View>
          ) : null}

          {note.arrowContent?.trim() ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="footsteps-outline" size={15} color={colors.accent.application} />
                <Text style={[styles.sectionLabel, { color: colors.accent.application }]}>
                  Application
                </Text>
              </View>
              <Markdown style={markdownStyles}>{note.arrowContent.trim()}</Markdown>
            </View>
          ) : null}
        </>
      )}

      {/* Empty reflections fallback */}
      {!hasAnyReflection && (
        <View style={styles.emptyReflectionCard}>
          <Ionicons name="create-outline" size={24} color={colors.text.secondary} />
          <Text style={styles.emptyReflectionTitle}>No reflection written yet</Text>
          {isAuthor && (
            <Pressable
              onPress={() => router.push({ pathname: '/note/edit', params: { id: note?.id } })}
              style={styles.addReflectionBtn}
            >
              <Text style={styles.addReflectionBtnText}>Add Reflection</Text>
            </Pressable>
          )}
        </View>
      )}

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
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  emptyReflectionCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  emptyReflectionTitle: {
    color: colors.text.secondary,
    fontSize: typography.label.fontSize,
  },
  addReflectionBtn: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginTop: spacing.xs,
  },
  addReflectionBtnText: {
    color: colors.accent.keyIdea,
    fontSize: typography.label.fontSize,
    fontWeight: '600',
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
  tocContainer: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  tocHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  tocTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent.keyIdea,
  },
  tocList: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  tocPill: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tocPillActive: {
    backgroundColor: 'rgba(227, 165, 61, 0.15)',
    borderColor: colors.accent.keyIdea,
  },
  tocPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  tocPillTextActive: {
    color: colors.accent.keyIdea,
    fontWeight: '700',
  },
});
