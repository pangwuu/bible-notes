/**
 * Standalone Bible browse tab — read a chapter, then jump into a new note.
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../src/constants/theme';
import { CANONICAL_BOOKS } from '../../src/constants/bibleData';
import { getChapterVerseCount } from '../../src/utils/bibleOrdinals';
import { createPassageReference } from '../../src/utils/passageParser';
import BibleReader from '../../src/components/BibleReader';
import { useAuth } from '../../src/context/AuthContext';
import { useReaderFontSize } from '../../src/hooks/useReaderFontSize';

type BrowseStep = 'book' | 'chapter' | 'read';

export default function BibleBrowseScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { readerFontSize, setReaderFontSize } = useReaderFontSize(16);

  const [step, setStep] = useState<BrowseStep>('book');
  const [bookName, setBookName] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');

  const books = useMemo(() => {
    if (testamentFilter === 'ALL') return CANONICAL_BOOKS;
    return CANONICAL_BOOKS.filter((b) => b.testament === testamentFilter);
  }, [testamentFilter]);

  const selectedBook = useMemo(
    () => CANONICAL_BOOKS.find((b) => b.name === bookName) || null,
    [bookName]
  );

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

  return (
    <View style={styles.screen}>
      {step !== 'read' ? (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.heading}>Read Scripture</Text>
          <Text style={styles.subheading}>
            Choose a book and chapter, then capture a study note when something stands out.
          </Text>

          {step === 'book' && (
            <>
              <View style={styles.filterRow}>
                {(['ALL', 'OT', 'NT'] as const).map((key) => (
                  <Button
                    key={key}
                    mode={testamentFilter === key ? 'contained' : 'outlined'}
                    buttonColor={testamentFilter === key ? colors.accentKeyIdea : undefined}
                    textColor={testamentFilter === key ? colors.bgBase : colors.textPrimary}
                    style={styles.filterChip}
                    labelStyle={styles.filterLabel}
                    onPress={() => setTestamentFilter(key)}
                  >
                    {key === 'ALL' ? 'All' : key === 'OT' ? 'Old Testament' : 'New Testament'}
                  </Button>
                ))}
              </View>
              <View style={styles.bookGrid}>
                {books.map((book) => (
                  <Pressable
                    key={book.name}
                    style={styles.bookChip}
                    onPress={() => {
                      setBookName(book.name);
                      setChapter(null);
                      setStep('chapter');
                    }}
                    accessibilityLabel={`Select ${book.name}`}
                  >
                    <Text style={styles.bookChipText}>{book.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {step === 'chapter' && selectedBook && (
            <>
              <Pressable
                style={styles.backRow}
                onPress={() => setStep('book')}
                accessibilityLabel="Back to books"
              >
                <Ionicons name="chevron-back" size={18} color={colors.accentKeyIdea} />
                <Text style={styles.backText}>{selectedBook.name}</Text>
              </Pressable>
              <View style={styles.chapterGrid}>
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                  <Pressable
                    key={ch}
                    style={styles.chapterChip}
                    onPress={() => {
                      setChapter(ch);
                      setStep('read');
                    }}
                    accessibilityLabel={`${selectedBook.name} chapter ${ch}`}
                  >
                    <Text style={styles.chapterChipText}>{ch}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.readPane}>
          <View style={styles.readHeader}>
            <Pressable
              style={styles.backRow}
              onPress={() => setStep('chapter')}
              accessibilityLabel="Back to chapters"
            >
              <Ionicons name="chevron-back" size={18} color={colors.accentKeyIdea} />
              <Text style={styles.backText}>
                {bookName} {chapter}
              </Text>
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
            <ScrollView contentContainerStyle={styles.readerContainer}>
              <BibleReader
                passage={passage}
                fontSize={readerFontSize}
                onFontSizeChange={setReaderFontSize}
                preferredTranslation={
                  profile?.preferred_version_id ||
                  profile?.settings?.preferred_version_id ||
                  profile?.settings?.preferred_translation ||
                  'ESV'
                }
                initiallyCollapsed={false}
              />
            </ScrollView>
          ) : null}
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
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    borderRadius: radius.control,
  },
  filterLabel: {
    fontSize: 12,
    marginVertical: 2,
    marginHorizontal: 6,
  },
  bookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  bookChip: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    minWidth: '30%',
    flexGrow: 1,
  },
  bookChipText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  backText: {
    color: colors.accentKeyIdea,
    fontWeight: '600',
    fontSize: 15,
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chapterChip: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterChipText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.body.fontFamily,
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
  readerContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
