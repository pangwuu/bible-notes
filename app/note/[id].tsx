/**
 * Note Detail Screen
 * Displays complete Swedish Method note with Scripture reading card,
 * Letterboxd-style friend overlap badge, and author actions (edit/delete).
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../src/utils/alert';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from '../../src/components/TemplateIcon';
import Markdown from 'react-native-markdown-display';
import { colors, spacing, radii, typography, markdownStyles } from '../../src/constants/theme';
import { getSectionColor } from '../../src/constants/templates';
import * as notesService from '../../src/services/notesService';
import { Note, formatPassageDisplay, PassageReference, PassageSegment, TargetVerseHighlight } from '../../src/types/note';
import { formatSegmentDisplay, createPassageReference } from '../../src/utils/passageParser';
import { findCanonicalBook } from '../../src/constants/bibleData';
import { useAuth } from '../../src/context/AuthContext';
import BibleReader from '../../src/components/BibleReader';
import { findFriendNoteOverlaps, FriendOverlapItem, segmentsOverlap } from '../../src/services/noteOverlapService';
import VersePill from '../../src/components/VersePill';
import FriendActivityLoadingIndicator from '../../src/components/FriendActivityLoadingIndicator';
import { buildLinkedVerseMap } from '../../src/utils/verseLinkUtils';
import NoteCard from '../../src/components/NoteCard';
import { useReaderFontSize } from '../../src/hooks/useReaderFontSize';
import { useVersePreview } from '../../src/hooks/useVersePreview';
import { TOCSegmentBar } from '../../src/components/note/TOCSegmentBar';
import { formatMarkdownCrossReferences } from '../../src/utils/crossReferenceParser';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user, profile } = useAuth();

  const [note, setNote] = useState<Note | null>(null);
  const [overlaps, setOverlaps] = useState<FriendOverlapItem[]>([]);
  const [loadingOverlaps, setLoadingOverlaps] = useState<boolean>(false);
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const [showRelatedNotes, setShowRelatedNotes] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { readerFontSize, setReaderFontSize } = useReaderFontSize(16);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [targetHighlightedVerse, setTargetHighlightedVerse] = useState<TargetVerseHighlight | null>(null);
  const [showAllOverlaps, setShowAllOverlaps] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionsContainerTop = useRef<number>(0);
  const bibleReaderTop = useRef<number>(0);
  const tocTop = useRef<number>(0);
  const sectionLayoutMap = useRef<Record<string, number>>({});
  const verseLayoutMap = useRef<Record<string, number>>({});
  const [targetHighlightedSection, setTargetHighlightedSection] = useState<string | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousPassageKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const activeSegmentPassage = useMemo(() => {
    if (activeSegmentIndex === null || !note?.passage?.segments?.[activeSegmentIndex]) {
      return null;
    }
    return createPassageReference([note.passage.segments[activeSegmentIndex]]);
  }, [note?.passage, activeSegmentIndex]);

  const handleScrollToVerse = useCallback(
    (verseNum: number, context?: { book?: string; chapter?: number; verses?: number[] }) => {
      let targetCanon: string | undefined;
      if (context?.book && note?.passage?.segments && note.passage.segments.length > 0) {
        targetCanon = findCanonicalBook(context.book)?.name || context.book;
        const matchIdx = note.passage.segments.findIndex((seg) => {
          const segCanon = findCanonicalBook(seg.book)?.name || seg.book;
          if (segCanon !== targetCanon) return false;
          if (typeof context.chapter === 'number') {
            return context.chapter >= seg.startChapter && context.chapter <= seg.endChapter;
          }
          return true;
        });
        if (matchIdx >= 0) {
          setActiveSegmentIndex(matchIdx);
        }
      }

      const canonicalKey = targetCanon && typeof context?.chapter === 'number'
        ? `${targetCanon}:${context.chapter}:${verseNum}`
        : undefined;

      const verseRelY =
        (canonicalKey && verseLayoutMap.current[canonicalKey]) ??
        verseLayoutMap.current[String(verseNum)] ??
        0;

      const baseTop = bibleReaderTop.current > 0 ? bibleReaderTop.current : (tocTop.current > 0 ? tocTop.current : 0);
      const numVerseY = Number(verseRelY) || 0;
      const targetY = numVerseY > 0 ? Math.max(0, baseTop + numVerseY - 80) : (baseTop > 0 ? Math.max(0, baseTop - 16) : 0);
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      if (context?.book || context?.chapter || context?.verses) {
        setTargetHighlightedVerse({
          book: context.book,
          chapter: context.chapter,
          verses: context.verses || [verseNum],
        });
      } else {
        setTargetHighlightedVerse(verseNum);
      }
      highlightTimerRef.current = setTimeout(() => {
        setTargetHighlightedVerse(null);
      }, 10000);
    },
    [note?.passage?.segments]
  );

  const {
    openVersePreview: handleOpenVersePreview,
    renderVersePreviewModal,
  } = useVersePreview({
    passage: note?.passage,
    translation: profile?.settings?.preferred_translation || 'ESV',
    esvApiKey: profile?.settings?.custom_esv_api_key || profile?.custom_esv_api_key,
    onViewInContext: (data) =>
      handleScrollToVerse(data.startVerse, {
        book: data.book,
        chapter: data.chapter,
        verses: data.verses,
      }),
  });

  const loadNote = useCallback(async () => {
    try {
      const validId = notesService.parseNoteId(id);
      const fetched = await notesService.getNote(validId);
      if (fetched) {
        setNote(fetched);
        if (user?.uid) {
          const passageKey = fetched.passage ? formatPassageDisplay(fetched.passage) : '';
          const passageChanged = previousPassageKeyRef.current !== null && previousPassageKeyRef.current !== passageKey;
          previousPassageKeyRef.current = passageKey;

          if (passageChanged) {
            // Passage changed during edit: clear previous overlaps so new loader displays properly
            setOverlaps([]);
          }

          // 1. Friend overlaps (decoupled background fetch)
          if (profile?.settings?.enable_friends !== false) {
            setLoadingOverlaps(true);
            findFriendNoteOverlaps(user.uid, fetched.passage)
              .then((items) => setOverlaps(items))
              .catch((err) => {
                console.warn('Failed to query friend note overlaps:', err);
              })
              .finally(() => {
                setLoadingOverlaps(false);
              });
          } else {
            setLoadingOverlaps(false);
            setOverlaps([]);
          }

          // 2. User's own related notes (Point 3)
          notesService.getUserNotes(user.uid)
            .then((userNotes) => {
              const pSegs = fetched.passage?.segments || [];
              const related = userNotes.filter((n) => {
                if (n.id === fetched.id) return false;
                const otherSegs = n.passage?.segments || [];
                return pSegs.some((sA) => otherSegs.some((sB) => segmentsOverlap(sA, sB)));
              });
              setRelatedNotes(related);
            })
            .catch((err) => {
              console.warn('Failed to load user related notes:', err);
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

  const navigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/notes');
    }
  }, [router]);

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
            navigateBack();
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
      title: note?.title || 'Note',
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

  const normalizedSections = useMemo(() => {
    if (!note) return [];
    if (note.sections && note.sections.length > 0) {
      return note.sections;
    }
    return [
      { id: 'light', title: 'Key Idea', content: note.lightContent || '', icon: 'bulb-outline', color: colors.accent.keyIdea },
      { id: 'question', title: 'Question', content: note.questionContent || '', icon: 'help-circle-outline', color: colors.accent.question },
      { id: 'arrow', title: 'Application', content: note.arrowContent || '', icon: 'footsteps-outline', color: colors.accent.application },
    ];
  }, [note]);

  const linkedVerseMap = useMemo(() => {
    return buildLinkedVerseMap(normalizedSections);
  }, [normalizedSections]);

  const formatMarkdownWithVerseLinks = (rawText: string) => {
    return formatMarkdownCrossReferences(rawText, note?.passage);
  };

  const handleLinkPress = useCallback((url: string) => {
    if (url.startsWith('verse:')) {
      const fullPayload = url.replace('verse:', '');
      // Check query parameter ?inTab=1 or 0
      const [payload, queryStr] = fullPayload.split('?');
      const inTab = queryStr ? queryStr.includes('inTab=1') : true;

      // Compound Reference Handler: verse:/compound?refs=...
      if (payload.includes('compound') && queryStr) {
        const params = new URLSearchParams(queryStr);
        const refsParam = params.get('refs');
        if (refsParam) {
          const rawRefs = decodeURIComponent(refsParam);
          // Split by semicolon: e.g. "Matthew:1:1-3;Luke:3:10"
          const parsedSegments: Array<{
            book: string;
            chapter: number;
            verses: number[];
            startVerse: number;
            endVerse: number;
          }> = [];

          rawRefs.split(';').forEach((segStr) => {
            const parts = segStr.split(':');
            if (parts.length >= 3) {
              const book = parts[0];
              const chapter = parseInt(parts[1], 10);
              const spec = parts.slice(2).join(':');
              const versesList: number[] = [];
              spec.split(',').forEach((seg) => {
                const [sStr, eStr] = seg.split('-');
                const s = parseInt(sStr, 10);
                const e = eStr ? parseInt(eStr, 10) : s;
                if (!isNaN(s)) {
                  for (let v = s; v <= (isNaN(e) ? s : e); v++) versesList.push(v);
                }
              });
              if (versesList.length > 0) {
                parsedSegments.push({
                  book,
                  chapter,
                  verses: versesList,
                  startVerse: versesList[0],
                  endVerse: versesList[versesList.length - 1],
                });
              }
            }
          });

          if (parsedSegments.length > 0) {
            const first = parsedSegments[0];
            const title = parsedSegments
              .map((s) => `${s.book} ${s.chapter}:${s.startVerse === s.endVerse ? s.startVerse : `${s.startVerse}-${s.endVerse}`}`)
              .join('; ');

            handleOpenVersePreview(
              first.startVerse,
              first.endVerse,
              {
                book: first.book,
                chapter: first.chapter,
                verses: first.verses,
                segments: parsedSegments,
                customTitle: title,
              },
              false
            );
            return false;
          }
        }
      }

      // Strip leading slashes e.g. "verse:/Hebrews/5/12" => "Hebrews/5/12"
      const cleanPayload = payload.replace(/^\/+/, '');
      const isSlashDelimited = cleanPayload.includes('/');
      const parts = isSlashDelimited ? cleanPayload.split('/') : cleanPayload.split(':');

      if (parts.length >= 3) {
        // Canonical: "Book/Chapter/VerseSpec" or "Book:Chapter:VerseSpec"
        const book = decodeURIComponent(parts[0]);
        const chapter = parseInt(parts[1], 10);
        const spec = parts.slice(2).join(isSlashDelimited ? '/' : ':');
        // Parse spec into verse list
        const versesList: number[] = [];
        spec.split(',').forEach((seg) => {
          const [sStr, eStr] = seg.split('-');
          const s = parseInt(sStr, 10);
          const e = eStr ? parseInt(eStr, 10) : s;
          if (!isNaN(s)) {
            for (let v = s; v <= (isNaN(e) ? s : e); v++) versesList.push(v);
          }
        });
        if (versesList.length > 0) {
          const s = versesList[0];
          const e = versesList[versesList.length - 1];
          handleOpenVersePreview(
            s,
            e,
            { book, chapter: isNaN(chapter) ? undefined : chapter, verses: versesList },
            inTab
          );
          return false;
        }
      } else {
        // Legacy: "VerseSpec"
        const versesList: number[] = [];
        payload.split(',').forEach((seg) => {
          const [sStr, eStr] = seg.split('-');
          const s = parseInt(sStr, 10);
          const e = eStr ? parseInt(eStr, 10) : s;
          if (!isNaN(s)) {
            for (let v = s; v <= (isNaN(e) ? s : e); v++) versesList.push(v);
          }
        });
        if (versesList.length > 0) {
          const s = versesList[0];
          const e = versesList[versesList.length - 1];
          handleOpenVersePreview(s, e, { verses: versesList }, inTab);
          return false;
        }
      }
    }
    return true;
  }, [handleOpenVersePreview, note?.passage]);

  const markdownRulesCache = useRef<Record<string, any>>({});
  const getMarkdownRules = useCallback(
    (secColor: string) => {
      if (!markdownRulesCache.current[secColor]) {
        markdownRulesCache.current[secColor] = {
          link: (node: any, children: any, _parent: any, _styles: any) => {
            const href = node.attributes?.href || '';
            const isVerse = href.startsWith('verse:');
            return (
              <Text
                key={node.key}
                style={
                  isVerse
                    ? [styles.verseLinkBadge, { color: secColor }]
                    : [styles.link, { color: secColor }]
                }
                onPress={() => handleLinkPress(href)}
              >
                {isVerse && (
                  <Ionicons name="bookmark" size={12} color={secColor} />
                )}
                {isVerse ? ' ' : ''}
                {children}
              </Text>
            );
          },
        };
      }
      return markdownRulesCache.current[secColor];
    },
    [handleLinkPress]
  );

  if (loading) {
    return (
      <View style={[styles.screen, styles.loadingScreen]}>
        <View style={styles.loadingHeaderPlaceholder}>
          <View style={styles.loadingTitleBar} />
          <View style={styles.loadingSubtitleBar} />
        </View>
        <View style={styles.loadingCenterContent}>
          <ActivityIndicator size="small" color={colors.accent.keyIdea} />
          <Text style={styles.loadingText}>Loading note...</Text>
        </View>
      </View>
    );
  }

  if (error || !note) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errorText}>{error || 'Note not found'}</Text>
        <Pressable onPress={navigateBack} style={styles.backBtn}>
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
        Boolean(note.arrowContent?.trim()) ||
        Boolean(note.content?.trim());

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      {/* Prominent Note Title & Passage Subtitle Header with Visibility Pill (Always Rendered) */}
      <View style={styles.titleHeaderBox}>
        <View style={styles.titleHeaderTopRow}>
          <Text style={styles.noteTitleText} numberOfLines={2} ellipsizeMode="tail">
            {note.title || formatPassageDisplay(note.passage)}
          </Text>

          <View style={styles.metaGroupRow}>
            {!isAuthor && note.authorUsername ? (
              <Text style={styles.authorText}>By @{note.authorUsername}</Text>
            ) : null}
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
          </View>
        </View>

        {note.title ? (
          <Text style={styles.noteSubpassageText}>{formatPassageDisplay(note.passage)}</Text>
        ) : null}
      </View>

      {/* Letterboxd-style Overlap Badge Pill */}
      {profile?.settings?.enable_friends !== false && (
        <>
          {loadingOverlaps && overlaps.length === 0 && (
            <FriendActivityLoadingIndicator
              compact
              message="Checking for friend reflections..."
            />
          )}
          {!loadingOverlaps && overlaps.length === 0 && (
            <View style={styles.emptyOverlapsBadge}>
              <Ionicons name="people-outline" size={13} color={colors.text.secondary} />
              <Text style={styles.emptyOverlapsText}>No friend reflections yet</Text>
            </View>
          )}
          {overlaps.length > 0 && (
            <View style={styles.overlapSection}>
              {(showAllOverlaps ? overlaps : overlaps.slice(0, 3)).map((item) => {
                const friendName = item.friendProfile.display_name || item.friendProfile.username || 'Friend';
                const initial = friendName[0].toUpperCase();
                const passageSummary = formatPassageDisplay(item.note.passage);

                return (
                  <Pressable
                    key={item.note.id}
                    style={styles.overlapBadge}
                    onPress={() =>
                      router.push({
                        pathname: '/note/compare',
                        params: { mine: note.id, theirs: item.note.id },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Compare with ${friendName}'s note on ${passageSummary}`}
                  >
                    <View style={styles.overlapAvatar}>
                      <Text style={styles.overlapAvatarText}>{initial}</Text>
                    </View>
                    <Text style={styles.overlapText} numberOfLines={2} ellipsizeMode="tail">
                      {friendName} also noted {passageSummary}
                    </Text>
                  </Pressable>
                );
              })}
              {overlaps.length > 3 && (
                <Pressable
                  style={styles.overlapTogglePill}
                  onPress={() => setShowAllOverlaps((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showAllOverlaps
                      ? 'Show fewer friend notes'
                      : `Show all ${overlaps.length} friend notes`
                  }
                >
                  <Text style={styles.overlapToggleText}>
                    {showAllOverlaps ? 'Show less' : `+${overlaps.length - 3} more`}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}

      {/* Interactive Table of Contents (Passage Segments) */}
      {note.passage?.segments && note.passage.segments.length > 0 && (
        <TOCSegmentBar
          segments={note.passage.segments}
          activeSegmentIndex={activeSegmentIndex}
          onSelectSegment={setActiveSegmentIndex}
          onLayout={(y) => {
            tocTop.current = y;
          }}
        />
      )}

      {/* Live Scripture Reading Card with Multi-Translation Comparison */}
      <View
        onLayout={(e) => {
          bibleReaderTop.current = e.nativeEvent.layout.y;
        }}
      >
        <BibleReader
          passage={note.passage}
          activeSegment={activeSegmentPassage}
          fontSize={readerFontSize}
          onFontSizeChange={setReaderFontSize}
          preferredTranslation={profile?.preferred_version_id || profile?.settings?.preferred_version_id || profile?.settings?.preferred_translation || 'ESV'}
          initiallyCollapsed={false}
          linkedVerseMap={linkedVerseMap}
          onVerseLayout={(key, y) => {
            verseLayoutMap.current[key] = y;
          }}
          onJumpToSection={(sectionId) => {
            setTargetHighlightedSection(sectionId);
            setTimeout(() => {
              setTargetHighlightedSection(null);
            }, 2500);

            const secY = sectionLayoutMap.current[sectionId];
            if (typeof secY === 'number') {
              const targetY = sectionsContainerTop.current + secY;
              scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY - 16), animated: true });
            }
          }}
          targetHighlightedVerse={targetHighlightedVerse}
        />
      </View>

      {/* Note Template Sections */}
      <View
        onLayout={(e) => {
          sectionsContainerTop.current = e.nativeEvent.layout.y;
        }}
      >
        {note.sections && note.sections.length > 0 ? (
          note.sections.map((sec) => {
            if (!sec.content?.trim() && (!sec.verseReferences || sec.verseReferences.length === 0)) return null;
            const secColor = getSectionColor(sec.id, sec.color);

            return (
              <View
                key={sec.id}
                style={[
                  styles.section,
                  targetHighlightedSection === sec.id && styles.sectionHighlighted,
                ]}
                onLayout={(e) => {
                  sectionLayoutMap.current[sec.id] = e.nativeEvent.layout.y;
                }}
              >
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

              {/* Section Attached Verse Pills */}
              {sec.verseReferences && sec.verseReferences.length > 0 && (
                <View style={styles.pillBar}>
                  {sec.verseReferences.map((ref, rIdx) => (
                    <VersePill
                      key={rIdx}
                      startVerse={ref.startVerse}
                      endVerse={ref.endVerse}
                      book={ref.book}
                      chapter={ref.chapter}
                      verses={ref.verses}
                      color={secColor}
                      onPress={() => {
                        handleOpenVersePreview(ref.startVerse, ref.endVerse, { book: ref.book, chapter: ref.chapter, verses: ref.verses });
                      }}
                    />
                  ))}
                </View>
              )}

              {Boolean(sec.content?.trim()) && (
                <Markdown
                  style={markdownStyles}
                  rules={getMarkdownRules(secColor)}
                  onLinkPress={handleLinkPress}
                >
                  {formatMarkdownWithVerseLinks(sec.content.trim())}
                </Markdown>
              )}
            </View>
          );
        })
      ) : (
        <>
          {note.lightContent?.trim() ? (
            <View
              style={styles.section}
              onLayout={(e) => {
                sectionLayoutMap.current['light'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="bulb-outline" size={15} color={colors.accent.keyIdea} />
                <Text style={[styles.sectionLabel, { color: colors.accent.keyIdea }]}>
                  Key Idea
                </Text>
              </View>
              <Markdown
                style={markdownStyles}
                rules={getMarkdownRules(colors.accent.keyIdea)}
                onLinkPress={handleLinkPress}
              >
                {formatMarkdownWithVerseLinks(note.lightContent.trim())}
              </Markdown>
            </View>
          ) : null}

          {note.questionContent?.trim() ? (
            <View
              style={styles.section}
              onLayout={(e) => {
                sectionLayoutMap.current['question'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="help-circle-outline" size={15} color={colors.accent.question} />
                <Text style={[styles.sectionLabel, { color: colors.accent.question }]}>
                  Question
                </Text>
              </View>
              <Markdown
                style={markdownStyles}
                rules={getMarkdownRules(colors.accent.question)}
                onLinkPress={handleLinkPress}
              >
                {formatMarkdownWithVerseLinks(note.questionContent.trim())}
              </Markdown>
            </View>
          ) : null}

          {note.arrowContent?.trim() ? (
            <View
              style={styles.section}
              onLayout={(e) => {
                sectionLayoutMap.current['arrow'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="footsteps-outline" size={15} color={colors.accent.application} />
                <Text style={[styles.sectionLabel, { color: colors.accent.application }]}>
                  Application
                </Text>
              </View>
              <Markdown
                style={markdownStyles}
                rules={getMarkdownRules(colors.accent.application)}
                onLinkPress={handleLinkPress}
              >
                {formatMarkdownWithVerseLinks(note.arrowContent.trim())}
              </Markdown>
            </View>
          ) : null}

          {!note.lightContent?.trim() &&
          !note.questionContent?.trim() &&
          !note.arrowContent?.trim() &&
          note.content?.trim() ? (
            <View
              style={styles.section}
              onLayout={(e) => {
                sectionLayoutMap.current['content'] = e.nativeEvent.layout.y;
              }}
            >
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="document-text-outline" size={15} color={colors.accent.keyIdea} />
                <Text style={[styles.sectionLabel, { color: colors.accent.keyIdea }]}>
                  Reflection
                </Text>
              </View>
              <Markdown
                style={markdownStyles}
                rules={getMarkdownRules(colors.accent.keyIdea)}
                onLinkPress={handleLinkPress}
              >
                {formatMarkdownWithVerseLinks(note.content.trim())}
              </Markdown>
            </View>
          ) : null}
        </>
      )}
      </View>

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

      {/* Related Notes Drawer (Point 3) */}
      {relatedNotes.length > 0 && (
        <View style={styles.relatedNotesSection}>
          <Pressable
            style={styles.relatedNotesHeaderRow}
            onPress={() => setShowRelatedNotes(!showRelatedNotes)}
          >
            <View style={styles.relatedNotesTitleGroup}>
              <Ionicons name="book-outline" size={16} color={colors.accent.keyIdea} />
              <Text style={styles.relatedNotesTitle}>
                Your other notes on this passage ({relatedNotes.length})
              </Text>
            </View>
            <Ionicons
              name={showRelatedNotes ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.secondary}
            />
          </Pressable>

          {showRelatedNotes && (
            <View style={styles.relatedNotesList}>
              {relatedNotes.map((relNote) => (
                <NoteCard
                  key={relNote.id}
                  note={relNote}
                  onPress={() => router.push({ pathname: '/note/[id]', params: { id: relNote.id } })}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Verse Preview Bottom Sheet Modal */}
      {renderVersePreviewModal()}
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
  titleHeaderBox: {
    marginBottom: spacing.md,
  },
  titleHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  noteTitleText: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    lineHeight: 28,
  },
  metaGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexShrink: 0,
    marginTop: 2,
  },
  noteSubpassageText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent.keyIdea,
    lineHeight: 20,
    marginTop: 4,
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
  emptyOverlapsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  emptyOverlapsText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: colors.bg.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.accent.social,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  overlapTogglePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.accent.social,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  overlapToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent.social,
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
    flexShrink: 1,
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
  sectionHighlighted: {
    backgroundColor: 'rgba(227, 165, 61, 0.08)',
    borderRadius: radii.controls,
    padding: spacing.xs,
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
  pillBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  relatedNotesSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  relatedNotesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  relatedNotesTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  relatedNotesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  relatedNotesList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  loadingScreen: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  loadingHeaderPlaceholder: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  loadingTitleBar: {
    height: 22,
    width: '65%',
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.content,
  },
  loadingSubtitleBar: {
    height: 14,
    width: '40%',
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.content,
  },
  loadingCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  loadingText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  verseLinkBadge: {
    fontWeight: '600',
    fontSize: 15,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
