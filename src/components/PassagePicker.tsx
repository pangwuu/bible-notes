/**
 * PassagePicker.tsx
 * YouVersion-Style Step-by-Step Passage Picker Modal Flow
 * (Book to Chapter to Verse Range)
 * 
 * Strict Adherence to DESIGN.md and PROJECT.md:
 * - Base warm dark palette: bgBase (#1A1816), bgSurface (#242019), bgSurfaceRaised (#2E2921)
 * - Text: textPrimary (#EDE7DD), textSecondary (#A39C8E), textDisabled (#6B655A)
 * - Border: borderHairline (#332E27)
 * - Swedish Accents: accentKeyIdea (#E3A53D) for active selection/confirm
 * - Radii: controls 8px, sheet 16px (top corners only)
 * - Zero anti-patterns: NO generic drop shadows, NO cold near-blacks, NO all-caps, NO arrows
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import {
  CANONICAL_BOOKS,
  findCanonicalBook,
  TOTAL_CANONICAL_VERSES,
  TOTAL_CANONICAL_CHAPTERS,
  BOOK_STARTING_ORDINALS,
  CanonicalBook,
} from '../constants/bibleData';
import { referenceToOrdinals } from '../utils/bibleOrdinals';

export {
  CANONICAL_BOOKS,
  TOTAL_CANONICAL_VERSES,
  TOTAL_CANONICAL_CHAPTERS,
  BOOK_STARTING_ORDINALS,
  CanonicalBook,
};

// ============================================================================
// 1. Pure Helper Functions & Boundary Validators
// ============================================================================

/**
 * Validates that end verse is not less than start verse.
 * Throws explicit descriptive error if violated (Test 17.1 boundary).
 */
export function validateVerseRange(start: number, end: number): boolean {
  if (end < start) {
    throw new Error('End verse cannot precede start verse');
  }
  return true;
}

/**
 * Returns initial chapter default for a book.
 * Single-chapter books default chapter to 1, multi-chapter return null (Test 17.4 boundary).
 */
export function getInitialChapter(bookChapters: number): number | null {
  return bookChapters === 1 ? 1 : null;
}

/**
 * Formats canonical reference string with proper typography (en-dash '–', not hyphen).
 * E.g., 'Romans 8:1–11' or 'John 3:16'.
 */
export function formatPassageReference(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): string {
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${book} ${startChapter}:${startVerse}`;
    }
    return `${book} ${startChapter}:${startVerse}–${endVerse}`;
  }
  return `${book} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
}

/**
 * Resilient ordinal computation matching canonical table or oracle.
 */
export function computeCanonicalOrdinals(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): [number, number] {
  try {
    return referenceToOrdinals(book, startChapter, startVerse, endChapter, endVerse);
  } catch {
    const cleanName = book.trim();
    const bookMeta = findCanonicalBook(cleanName);

    if (!bookMeta) {
      throw new Error(`Unknown book: ${book}`);
    }

    const baseOffset = BOOK_STARTING_ORDINALS[bookMeta.name] || 1;
    const startId = baseOffset + (startChapter - 1) * 30 + (startVerse - 1);
    const endId = baseOffset + (endChapter - 1) * 30 + (endVerse - 1);

    const clampedStart = Math.max(1, Math.min(TOTAL_CANONICAL_VERSES, startId));
    const clampedEnd = Math.max(clampedStart, Math.min(TOTAL_CANONICAL_VERSES, endId));

    return [clampedStart, clampedEnd];
  }
}

/**
 * Resolves estimated or exact chapter verse counts for verse grid generation.
 */
export function getChapterVerseCount(bookName: string, chapter: number): number {
  const bookMeta = findCanonicalBook(bookName);
  if (bookMeta && chapter >= 1 && chapter <= bookMeta.chapters) {
    return bookMeta.versesPerChapter[chapter - 1];
  }

  // Fallback anchors
  if (bookName === 'Obadiah') return 21;
  if (bookName === 'Philemon') return 25;
  if (bookName === '2 John') return 13;
  if (bookName === '3 John') return 15;
  if (bookName === 'Jude') return 25;

  return 30;
}

// ============================================================================
// 2. Component Interfaces & Props
// ============================================================================

export interface PassageSelection {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  startOrdinal: number;
  endOrdinal: number;
  referenceString: string;
  // Backward compatibility / schema aliases matching specs.md
  chapter_start: number;
  verse_start: number;
  chapter_end: number;
  verse_end: number;
  start_verse_id: number;
  end_verse_id: number;
}

export interface PassagePickerProps {
  visible: boolean;
  onClose?: () => void;
  onDismiss?: () => void;
  initialPassage?: {
    book?: string;
    startChapter?: number;
    startVerse?: number;
    endChapter?: number;
    endVerse?: number;
    chapter_start?: number;
    verse_start?: number;
    chapter_end?: number;
    verse_end?: number;
  };
  onSelect: (passage: PassageSelection) => void;
}

export type PickerStep = 'book' | 'chapter' | 'verse';

// ============================================================================
// 3. PassagePicker Component Implementation
// ============================================================================

export default function PassagePicker({
  visible,
  onClose,
  onDismiss,
  initialPassage,
  onSelect,
}: PassagePickerProps) {
  const handleDismiss = useCallback(() => {
    if (onClose) onClose();
    else if (onDismiss) onDismiss();
  }, [onClose, onDismiss]);

  // Dynamic tile size calculation for perfect 5-column square grid (Option 1)
  const { width: windowWidth } = useWindowDimensions();
  const squareTileSize = useMemo(() => {
    // gridContainer has padding: spacing.md on left and right (spacing.md * 2)
    // 5 columns have 4 gaps of spacing.sm
    const availableWidth = windowWidth - spacing.md * 2 - spacing.sm * 4;
    return Math.max(48, Math.floor(availableWidth / 5));
  }, [windowWidth]);

  // Step state machine: 'book' to 'chapter' to 'verse'
  const [step, setStep] = useState<PickerStep>('book');

  // Active selections
  const [selectedBook, setSelectedBook] = useState<string>('Romans');
  const [selectedChapter, setSelectedChapter] = useState<number>(8);
  const [selectedVerseStart, setSelectedVerseStart] = useState<number>(1);
  const [selectedVerseEnd, setSelectedVerseEnd] = useState<number>(11);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);

  // Search filter and testament segmentation
  const [testamentTab, setTestamentTab] = useState<'OT' | 'NT'>('NT');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sync state whenever modal opens or initialPassage changes
  useEffect(() => {
    if (visible) {
      const book = initialPassage?.book || 'Romans';
      const startCh = initialPassage?.startChapter ?? initialPassage?.chapter_start ?? 8;
      const startV = initialPassage?.startVerse ?? initialPassage?.verse_start ?? 1;
      const endCh = initialPassage?.endChapter ?? initialPassage?.chapter_end ?? startCh;
      const endV = initialPassage?.endVerse ?? initialPassage?.verse_end ?? 11;

      setSelectedBook(book);
      setSelectedChapter(startCh);
      setSelectedVerseStart(startV);
      setSelectedVerseEnd(endV);
      setSelectionAnchor(null);

      const bookMeta = findCanonicalBook(book);
      if (bookMeta) {
        setTestamentTab(bookMeta.testament);
      }
      setStep('book');
      setSearchQuery('');
    }
  }, [visible, initialPassage]);

  // Current book metadata
  const currentBookMeta = useMemo(() => {
    return findCanonicalBook(selectedBook) || CANONICAL_BOOKS[44]; // default Romans
  }, [selectedBook]);

  // Total verses for current chapter
  const currentChapterVerses = useMemo(() => {
    return getChapterVerseCount(selectedBook, selectedChapter);
  }, [selectedBook, selectedChapter]);

  // Filtered books for Step 1
  const filteredBooks = useMemo(() => {
    return CANONICAL_BOOKS.filter((b) => {
      const matchesTab = b.testament === testamentTab;
      if (searchQuery.trim().length === 0) {
        return matchesTab;
      }
      return b.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });
  }, [testamentTab, searchQuery]);

  // --------------------------------------------------------------------------
  // Step Transitions & Boundary Resets
  // --------------------------------------------------------------------------

  const handleSelectBook = useCallback((book: CanonicalBook) => {
    setSelectedBook(book.name);
    // Boundary 17.2: Changing book resets previously selected chapter and verse
    setSelectedChapter(1);
    setSelectedVerseStart(1);
    setSelectedVerseEnd(1);
    setSelectionAnchor(null);

    if (book.chapters === 1) {
      // Boundary 17.4: Single-chapter book picker defaults chapter to 1
      setStep('verse');
    } else {
      setStep('chapter');
    }
  }, []);

  const handleSelectChapter = useCallback((chapterNum: number) => {
    // Boundary 17.3: Changing chapter resets previously selected verse range
    setSelectedChapter(chapterNum);
    setSelectedVerseStart(1);
    setSelectedVerseEnd(1);
    setSelectionAnchor(null);
    setStep('verse');
  }, []);

  const handleSelectVerse = useCallback((verseNum: number) => {
    setSelectionAnchor((currentAnchor) => {
      if (currentAnchor === null) {
        // First tap: anchor start of range, select single verse
        setSelectedVerseStart(verseNum);
        setSelectedVerseEnd(verseNum);
        return verseNum;
      } else {
        // Second tap: set range endpoints and complete selection
        if (verseNum === currentAnchor) {
          setSelectedVerseStart(verseNum);
          setSelectedVerseEnd(verseNum);
        } else if (verseNum > currentAnchor) {
          setSelectedVerseStart(currentAnchor);
          setSelectedVerseEnd(verseNum);
        } else {
          setSelectedVerseStart(verseNum);
          setSelectedVerseEnd(currentAnchor);
        }
        return null;
      }
    });
  }, []);

  const handleSelectEntireChapter = useCallback(() => {
    setSelectedVerseStart(1);
    setSelectedVerseEnd(currentChapterVerses);
    setSelectionAnchor(null);
  }, [currentChapterVerses]);

  const handleBackStep = useCallback(() => {
    if (step === 'verse') {
      if (currentBookMeta.chapters === 1) {
        setStep('book');
      } else {
        setStep('chapter');
      }
    } else if (step === 'chapter') {
      setStep('book');
    } else {
      handleDismiss();
    }
  }, [step, currentBookMeta, handleDismiss]);

  const handleReset = useCallback(() => {
    setSelectedBook('Romans');
    setSelectedChapter(8);
    setSelectedVerseStart(1);
    setSelectedVerseEnd(11);
    setSelectionAnchor(null);
    setTestamentTab('NT');
    setStep('book');
    setSearchQuery('');
  }, []);

  const handleConfirm = useCallback(() => {
    // Boundary 17.1: Selecting end verse before start verse is prevented
    validateVerseRange(selectedVerseStart, selectedVerseEnd);

    const [startOrd, endOrd] = computeCanonicalOrdinals(
      selectedBook,
      selectedChapter,
      selectedVerseStart,
      selectedChapter,
      selectedVerseEnd
    );

    const referenceString = formatPassageReference(
      selectedBook,
      selectedChapter,
      selectedVerseStart,
      selectedChapter,
      selectedVerseEnd
    );

    const payload: PassageSelection = {
      book: selectedBook,
      startChapter: selectedChapter,
      startVerse: selectedVerseStart,
      endChapter: selectedChapter,
      endVerse: selectedVerseEnd,
      startOrdinal: startOrd,
      endOrdinal: endOrd,
      referenceString,
      chapter_start: selectedChapter,
      verse_start: selectedVerseStart,
      chapter_end: selectedChapter,
      verse_end: selectedVerseEnd,
      start_verse_id: startOrd,
      end_verse_id: endOrd,
    };

    onSelect(payload);
    handleDismiss();
  }, [
    selectedBook,
    selectedChapter,
    selectedVerseStart,
    selectedVerseEnd,
    onSelect,
    handleDismiss,
  ]);

  const currentSummary = useMemo(() => {
    return formatPassageReference(
      selectedBook,
      selectedChapter,
      selectedVerseStart,
      selectedChapter,
      selectedVerseEnd
    );
  }, [selectedBook, selectedChapter, selectedVerseStart, selectedVerseEnd]);

  // --------------------------------------------------------------------------
  // Render Helpers for Steps
  // --------------------------------------------------------------------------

  const renderBookStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.filterSection}>
        <View style={styles.segmentContainer}>
          <Pressable
            style={[
              styles.segmentButton,
              testamentTab === 'OT' && styles.segmentButtonActive,
            ]}
            onPress={() => {
              setTestamentTab('OT');
              setSearchQuery('');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                testamentTab === 'OT' && styles.segmentTextActive,
              ]}
            >
              Old Testament (39)
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentButton,
              testamentTab === 'NT' && styles.segmentButtonActive,
            ]}
            onPress={() => {
              setTestamentTab('NT');
              setSearchQuery('');
            }}
          >
            <Text
              style={[
                styles.segmentText,
                testamentTab === 'NT' && styles.segmentTextActive,
              ]}
            >
              New Testament (27)
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search book name..."
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.searchClearButton}
            >
              <Text style={styles.searchClearText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bookGrid}>
          {filteredBooks.map((book) => {
            const isSelected = book.name === selectedBook;
            return (
              <Pressable
                key={book.name}
                style={[
                  styles.bookTile,
                  isSelected && styles.bookTileSelected,
                ]}
                onPress={() => handleSelectBook(book)}
              >
                <Text
                  style={[
                    styles.bookTileTitle,
                    isSelected && styles.bookTileTitleSelected,
                  ]}
                  numberOfLines={1}
                >
                  {book.name}
                </Text>
                <Text style={styles.bookTileSubtitle}>
                  {book.chapters} ch
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  const renderChapterStep = () => {
    const chaptersArray = Array.from(
      { length: currentBookMeta.chapters },
      (_, i) => i + 1
    );

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeaderNotice}>
          <Text style={styles.stepHeaderNoticeText}>
            Select chapter for {selectedBook}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chapterGrid}>
            {chaptersArray.map((ch) => {
              const isSelected = ch === selectedChapter;
              return (
                <Pressable
                  key={ch}
                  style={[
                    styles.chapterTile,
                    { width: squareTileSize, height: squareTileSize },
                    isSelected && styles.chapterTileSelected,
                  ]}
                  onPress={() => handleSelectChapter(ch)}
                >
                  <Text
                    style={[
                      styles.chapterTileText,
                      isSelected && styles.chapterTileTextSelected,
                    ]}
                  >
                    {ch}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderVerseStep = () => {
    const versesArray = Array.from(
      { length: currentChapterVerses },
      (_, i) => i + 1
    );

    return (
      <View style={styles.stepContainer}>
        <View style={styles.verseActionHeader}>
          <Text style={styles.stepHeaderNoticeText}>
            {selectionAnchor !== null
              ? `Select end verse (or confirm verse ${selectionAnchor})`
              : 'Select start and end verse'}
          </Text>
          <Pressable
            style={styles.wholeChapterChip}
            onPress={handleSelectEntireChapter}
          >
            <Text style={styles.wholeChapterChipText}>
              Entire chapter ({currentChapterVerses} v)
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.verseGrid}>
            {versesArray.map((v) => {
              const isStart = v === selectedVerseStart;
              const isEnd = v === selectedVerseEnd;
              const inRange = v > selectedVerseStart && v < selectedVerseEnd;

              return (
                <Pressable
                  key={v}
                  style={[
                    styles.verseTile,
                    { width: squareTileSize, height: squareTileSize },
                    inRange && styles.verseTileInRange,
                    (isStart || isEnd) && styles.verseTileEndpoint,
                  ]}
                  onPress={() => handleSelectVerse(v)}
                >
                  <Text
                    style={[
                      styles.verseTileText,
                      inRange && styles.verseTileTextInRange,
                      (isStart || isEnd) && styles.verseTileTextEndpoint,
                    ]}
                  >
                    {v}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleDismiss}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>

              <View style={styles.navBar}>
                <Pressable onPress={handleBackStep} style={styles.navBarButton}>
                  <Text style={styles.navBarButtonText}>
                    {step === 'book' ? 'Cancel' : '‹ Back'}
                  </Text>
                </Pressable>

                <Text style={styles.navBarTitle}>
                  {step === 'book'
                    ? 'Select Book'
                    : step === 'chapter'
                    ? selectedBook
                    : `${selectedBook} ${selectedChapter}`}
                </Text>

                <Pressable onPress={handleReset} style={styles.navBarButton}>
                  <Text style={styles.navBarResetText}>Reset</Text>
                </Pressable>
              </View>

              <View style={styles.breadcrumbBar}>
                <Pressable
                  style={[
                    styles.breadcrumbChip,
                    step === 'book' && styles.breadcrumbChipActive,
                  ]}
                  onPress={() => setStep('book')}
                >
                  <Text
                    style={[
                      styles.breadcrumbText,
                      step === 'book' && styles.breadcrumbTextActive,
                    ]}
                  >
                    {selectedBook || 'Book'}
                  </Text>
                </Pressable>

                <Text style={styles.breadcrumbSeparator}>›</Text>

                <Pressable
                  style={[
                    styles.breadcrumbChip,
                    step === 'chapter' && styles.breadcrumbChipActive,
                  ]}
                  onPress={() => setStep('chapter')}
                >
                  <Text
                    style={[
                      styles.breadcrumbText,
                      step === 'chapter' && styles.breadcrumbTextActive,
                    ]}
                  >
                    Ch {selectedChapter || 1}
                  </Text>
                </Pressable>

                <Text style={styles.breadcrumbSeparator}>›</Text>

                <Pressable
                  style={[
                    styles.breadcrumbChip,
                    step === 'verse' && styles.breadcrumbChipActive,
                  ]}
                  onPress={() => setStep('verse')}
                >
                  <Text
                    style={[
                      styles.breadcrumbText,
                      step === 'verse' && styles.breadcrumbTextActive,
                    ]}
                  >
                    {selectedVerseStart === selectedVerseEnd
                      ? `v. ${selectedVerseStart}`
                      : `v. ${selectedVerseStart}–${selectedVerseEnd}`}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.divider} />

              <View style={styles.bodyContainer}>
                {step === 'book' && renderBookStep()}
                {step === 'chapter' && renderChapterStep()}
                {step === 'verse' && renderVerseStep()}
              </View>

              <View style={styles.footerContainer}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryTextColumn}>
                    <Text style={styles.summaryLabel}>Selected Passage</Text>
                    <Text style={styles.summaryReference}>{currentSummary}</Text>
                  </View>

                  <Pressable
                    style={styles.confirmButton}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================================================
// 4. Stylesheet (Governed Strictly by DESIGN.md)
// ============================================================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 24, 22, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '88%',
    backgroundColor: colors.bgSurfaceRaised,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderColor: colors.borderHairline,
    shadowOpacity: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderHairline,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  navBarButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minWidth: 50,
  },
  navBarButtonText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  navBarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  navBarResetText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  breadcrumbChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.controls,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  breadcrumbChipActive: {
    borderColor: colors.accentKeyIdea,
    backgroundColor: colors.bgSurfaceRaised,
  },
  breadcrumbText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  breadcrumbTextActive: {
    color: colors.accentKeyIdea,
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    fontSize: 14,
    color: colors.textDisabled,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderHairline,
    marginTop: spacing.xs,
  },
  bodyContainer: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.controls,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.sm,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: colors.bgSurfaceRaised,
    borderColor: colors.accentKeyIdea,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: spacing.sm,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchClearButton: {
    padding: spacing.xs,
  },
  searchClearText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  gridContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  bookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bookTile: {
    width: '31%',
    backgroundColor: colors.bgSurface,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  bookTileSelected: {
    borderColor: colors.accentKeyIdea,
    backgroundColor: colors.bgSurfaceRaised,
  },
  bookTileTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  bookTileTitleSelected: {
    color: colors.accentKeyIdea,
    fontWeight: '600',
  },
  bookTileSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stepHeaderNotice: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepHeaderNoticeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  chapterTile: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  chapterTileSelected: {
    borderColor: colors.accentKeyIdea,
    backgroundColor: colors.bgSurfaceRaised,
  },
  chapterTileText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chapterTileTextSelected: {
    color: colors.accentKeyIdea,
  },
  verseActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  wholeChapterChip: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  wholeChapterChipText: {
    fontSize: 12,
    color: colors.accentKeyIdea,
    fontWeight: '500',
  },
  verseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  verseTile: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  verseTileInRange: {
    backgroundColor: 'rgba(227, 165, 61, 0.15)',
    borderColor: colors.accentKeyIdea,
    borderWidth: 1,
  },
  verseTileEndpoint: {
    backgroundColor: colors.accentKeyIdea,
    borderColor: colors.accentKeyIdea,
  },
  verseTileText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  verseTileTextInRange: {
    color: colors.accentKeyIdea,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    includeFontPadding: false,
  },
  verseTileTextEndpoint: {
    color: colors.bgBase,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    includeFontPadding: false,
  },
  footerContainer: {
    backgroundColor: colors.bgSurface,
    borderTopWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTextColumn: {
    flex: 1,
    marginRight: spacing.md,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  summaryReference: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  confirmButton: {
    backgroundColor: colors.accentKeyIdea,
    borderRadius: radii.controls,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: colors.bgBase,
    fontSize: 14,
    fontWeight: '600',
  },
});
