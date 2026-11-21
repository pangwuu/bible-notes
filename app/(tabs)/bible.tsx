/**
 * Bible tab — the YouVersion book accordion, then a chapter reader
 * that can step to the next or previous chapter, including across books.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../src/constants/theme';
import { CANONICAL_BOOKS, CanonicalBook } from '../../src/constants/bibleData';
import { getChapterVerseCount } from '../../src/utils/bibleOrdinals';
import { adjacentChapter } from '../../src/utils/bibleNavigation';
import { createPassageReference, parsePassageReferenceString } from '../../src/utils/passageParser';
import BibleReader from '../../src/components/BibleReader';
import { BookAccordionView } from '../../src/components/passagePicker/BookAccordionView';
import {
  bookMatchesQuery,
  computeSquareTileSize,
} from '../../src/components/passagePicker/passagePickerUtils';
import { useAuth } from '../../src/context/AuthContext';
import { useReaderFontSize } from '../../src/hooks/useReaderFontSize';
import { BibleTranslation } from '../../src/types/user';

function translationFromProfile(profile: ReturnType<typeof useAuth>['profile']): BibleTranslation {
  const candidates = [
    profile?.settings?.preferred_translation,
    profile?.preferred_translation,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return 'ESV';
}

function versionIdFromProfile(profile: ReturnType<typeof useAuth>['profile']): number | undefined {
  const candidates = [profile?.preferred_version_id, profile?.settings?.preferred_version_id];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

export default function BibleBrowseScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { readerFontSize, setReaderFontSize } = useReaderFontSize(16);
  const { width: windowWidth } = useWindowDimensions();

  const [reading, setReading] = useState(false);
  const [bookName, setBookName] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const tileSize = useMemo(() => computeSquareTileSize(windowWidth), [windowWidth]);

  const books = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    const bookQuery = rawQuery.replace(/\s+\d+.*$/, '').trim();
    const query = bookQuery.length > 0 ? bookQuery : rawQuery;
    if (!query) return CANONICAL_BOOKS;
    return CANONICAL_BOOKS.filter((book) => bookMatchesQuery(book, query));
  }, [searchQuery]);

  const passage = useMemo(() => {
    if (!bookName || !chapter) return null;
    const endVerse = getChapterVerseCount(bookName, chapter) || 1;
    return createPassageReference([
      {
        book: bookName,
        startChapter: chapter,
        startVerse: 1,
        endChapter: chapter,
        endVerse,
      },
    ]);
  }, [bookName, chapter]);

  const previous = useMemo(
    () => (bookName && chapter ? adjacentChapter(bookName, chapter, 'previous') : null),
    [bookName, chapter]
  );
  const next = useMemo(
    () => (bookName && chapter ? adjacentChapter(bookName, chapter, 'next') : null),
    [bookName, chapter]
  );

  const openChapter = useCallback((book: string, nextChapter: number) => {
    setBookName(book);
    setChapter(nextChapter);
    setExpandedBook(book);
    setReading(true);
  }, []);

  const moveChapter = useCallback((direction: 'previous' | 'next') => {
    if (!bookName || !chapter) return;
    const stop = adjacentChapter(bookName, chapter, direction);
    if (!stop) return;
    openChapter(stop.book, stop.chapter);
  }, [bookName, chapter, openChapter]);

  const moveRef = useRef(moveChapter);
  moveRef.current = moveChapter;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 28 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -48) moveRef.current('next');
        else if (gesture.dx >= 48) moveRef.current('previous');
      },
    })
  ).current;

  useEffect(() => {
    if (!reading) return;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [reading, bookName, chapter]);

  const handleToggleBook = useCallback((book: CanonicalBook) => {
    if (book.chapters === 1) {
      openChapter(book.name, 1);
      return;
    }
    setExpandedBook((current) => (current === book.name ? null : book.name));
  }, [openChapter]);

  const handleSubmitSearch = useCallback(() => {
    const segments = parsePassageReferenceString(searchQuery);
    const first = segments[0];
    if (!first?.book || !first.startChapter) return;
    openChapter(first.book, first.startChapter);
  }, [openChapter, searchQuery]);

  const handleNoteThis = () => {
    if (!bookName || !chapter) return;
    router.push({
      pathname: '/note/edit',
      params: {
        book: bookName,
        chapter: String(chapter),
        verseStart: '1',
        verseEnd: String(getChapterVerseCount(bookName, chapter) || 1),
      },
    });
  };

  const returnToPicker = () => {
    setExpandedBook(bookName);
    setReading(false);
  };

  const referenceLabel = bookName && chapter ? `${bookName} ${chapter}` : '';

  return (
    <View style={styles.screen}>
      {!reading ? (
        <View style={styles.pickerPane}>
          <View style={styles.intro}>
            <Text style={styles.heading}>Read the Bible</Text>
            <Text style={styles.subheading}>
              Choose a passage, then capture your thoughts when something stands out.
            </Text>
          </View>
          <BookAccordionView
            books={books}
            expandedBook={expandedBook}
            highlightedChapter={bookName === expandedBook ? chapter : null}
            searchQuery={searchQuery}
            suggestionLabel={null}
            tileSize={tileSize}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
            onSubmitSearch={handleSubmitSearch}
            onToggleBook={handleToggleBook}
            onSelectChapter={(nextChapter) => {
              if (!expandedBook) return;
              openChapter(expandedBook, nextChapter);
            }}
          />
        </View>
      ) : (
        <View style={styles.readPane} {...panResponder.panHandlers}>
          <View style={styles.readHeader}>
            <Pressable
              style={styles.backRow}
              onPress={returnToPicker}
              accessibilityLabel={`Back to books, ${referenceLabel}`}
            >
              <Ionicons name="chevron-back" size={18} color={colors.accentKeyIdea} />
              <Text style={styles.backText}>{referenceLabel}</Text>
            </Pressable>
            <Button
              mode="contained"
              buttonColor={colors.accentKeyIdea}
              textColor={colors.bgBase}
              compact
              onPress={handleNoteThis}
              accessibilityLabel="Note this passage"
              icon="pencil"
            >
              Note this
            </Button>
          </View>
          {passage ? (
            <ScrollView
              ref={scrollRef}
              style={styles.readerScroll}
              contentContainerStyle={styles.readerContainer}
            >
              <BibleReader
                passage={passage}
                fontSize={readerFontSize}
                onFontSizeChange={setReaderFontSize}
                preferredTranslation={translationFromProfile(profile)}
                preferredVersionId={versionIdFromProfile(profile)}
                initiallyCollapsed={false}
              />
            </ScrollView>
          ) : null}
          <View style={styles.chapterNav}>
            <Pressable
              style={styles.chapterNavButton}
              onPress={() => moveChapter('previous')}
              disabled={!previous}
              accessibilityRole="button"
              accessibilityState={{ disabled: !previous }}
              accessibilityLabel={
                previous
                  ? `Previous chapter, ${previous.book} ${previous.chapter}`
                  : 'Previous chapter'
              }
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={previous ? colors.accentKeyIdea : colors.textDisabled}
              />
              <Text
                style={[styles.chapterNavText, !previous && styles.chapterNavTextDisabled]}
                numberOfLines={1}
              >
                {previous ? `${previous.book} ${previous.chapter}` : 'Start'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.chapterNavButton, styles.chapterNavButtonNext]}
              onPress={() => moveChapter('next')}
              disabled={!next}
              accessibilityRole="button"
              accessibilityState={{ disabled: !next }}
              accessibilityLabel={
                next ? `Next chapter, ${next.book} ${next.chapter}` : 'Next chapter'
              }
            >
              <Text
                style={[styles.chapterNavText, styles.chapterNavTextNext, !next && styles.chapterNavTextDisabled]}
                numberOfLines={1}
              >
                {next ? `${next.book} ${next.chapter}` : 'End'}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={next ? colors.accentKeyIdea : colors.textDisabled}
              />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  pickerPane: {
    flex: 1,
  },
  intro: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  readPane: {
    flex: 1,
  },
  readHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: spacing.sm,
  },
  backText: {
    color: colors.accentKeyIdea,
    fontWeight: '600',
    fontSize: 15,
  },
  readerScroll: {
    flex: 1,
  },
  readerContainer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  chapterNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderHairline,
    backgroundColor: colors.bgSurface,
  },
  chapterNavButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
  },
  chapterNavButtonNext: {
    justifyContent: 'flex-end',
  },
  chapterNavText: {
    color: colors.accentKeyIdea,
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
  },
  chapterNavTextNext: {
    textAlign: 'right',
  },
  chapterNavTextDisabled: {
    color: colors.textDisabled,
  },
});
