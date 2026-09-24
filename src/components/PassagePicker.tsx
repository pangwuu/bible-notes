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
import { PassageSegment, PassageReference } from '../types/note';
import {
  parsePassageReferenceString,
  formatSegmentDisplay,
  formatCompoundDisplay,
  buildSegment,
  createPassageReference,
} from '../utils/passageParser';

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
 * Validates that end verse is not less than start verse when within the same chapter.
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
  display: string;
  displayString: string;
  books: string[];
  segments: PassageSegment[];
  // Convenience properties referencing first segment
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

export interface PassagePickerProps {
  visible: boolean;
  onClose?: () => void;
  onDismiss?: () => void;
  initialPassage?: PassageReference | {
    book?: string;
    startChapter?: number;
    startVerse?: number;
    endChapter?: number;
    endVerse?: number;
    segments?: PassageSegment[];
  };
  onSelect: (passage: PassageSelection) => void;
}

export type PickerStep = 'book' | 'start_chapter' | 'start_verse' | 'end_chapter' | 'end_verse';

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

  // Multi-segment state for compound passages
  const [segments, setSegments] = useState<PassageSegment[]>([]);

  // Active single-segment selections (nullable for clean-slate initial state)
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedChapterEnd, setSelectedChapterEnd] = useState<number | null>(null);
  const [chapterAnchor, setChapterAnchor] = useState<number | null>(null);
  const [selectedVerseStart, setSelectedVerseStart] = useState<number | null>(null);
  const [selectedVerseEnd, setSelectedVerseEnd] = useState<number | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);

  // Search filter and testament segmentation
  const [testamentTab, setTestamentTab] = useState<'OT' | 'NT'>('NT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [smartParseError, setSmartParseError] = useState<string | null>(null);

  // Sync state whenever modal opens or initialPassage changes
  useEffect(() => {
    if (visible) {
      const initPassage = initialPassage as any;
      if (initPassage?.segments && Array.isArray(initPassage.segments) && initPassage.segments.length > 0) {
        setSegments(initPassage.segments);
        const first = initPassage.segments[0];
        setSelectedBook(first.book);
        setSelectedChapter(first.startChapter);
        setSelectedChapterEnd(first.endChapter);
        setSelectedVerseStart(first.startVerse);
        setSelectedVerseEnd(first.endVerse);
        const bookMeta = findCanonicalBook(first.book);
        if (bookMeta) setTestamentTab(bookMeta.testament);
      } else if (initPassage?.book) {
        const book = initPassage.book;
        const bookMeta = findCanonicalBook(book) || CANONICAL_BOOKS[44];
        const safeStartCh = Math.max(1, Math.min(initPassage?.startChapter ?? initPassage?.chapter_start ?? 1, bookMeta.chapters));
        const safeEndCh = Math.max(safeStartCh, Math.min(initPassage?.endChapter ?? initPassage?.chapter_end ?? safeStartCh, bookMeta.chapters));
        const maxStartV = bookMeta.versesPerChapter[safeStartCh - 1];
        const maxEndV = bookMeta.versesPerChapter[safeEndCh - 1];
        const safeStartV = initPassage?.startVerse ?? initPassage?.verse_start ? Math.max(1, Math.min(initPassage?.startVerse ?? initPassage?.verse_start, maxStartV)) : null;
        const rawEndV = initPassage?.endVerse ?? initPassage?.verse_end;
        const safeEndV = rawEndV ? Math.max(safeStartCh === safeEndCh ? (safeStartV ?? 1) : 1, Math.min(rawEndV, maxEndV)) : safeStartV;

        setSelectedBook(bookMeta.name);
        setSelectedChapter(safeStartCh);
        setSelectedChapterEnd(safeEndCh);
        setSelectedVerseStart(safeStartV);
        setSelectedVerseEnd(safeEndV);
        setSegments([]);
        setTestamentTab(bookMeta.testament);
      } else {
        // Clean slate: no verse or chapter preselected
        setSelectedBook(null);
        setSelectedChapter(null);
        setSelectedChapterEnd(null);
        setSelectedVerseStart(null);
        setSelectedVerseEnd(null);
        setSegments([]);
        setTestamentTab('NT');
      }

      setSelectionAnchor(null);
      setChapterAnchor(null);
      setStep('book');
      setSearchQuery('');
      setSmartParseError(null);
    }
  }, [visible, initialPassage]);

  // Current book metadata
  const currentBookMeta = useMemo(() => {
    return selectedBook ? findCanonicalBook(selectedBook) || CANONICAL_BOOKS[44] : CANONICAL_BOOKS[44];
  }, [selectedBook]);

  const startChapterVerses = useMemo(() => {
    if (!selectedBook || !selectedChapter) return 30;
    return getChapterVerseCount(selectedBook, selectedChapter);
  }, [selectedBook, selectedChapter]);

  const endChapterVerses = useMemo(() => {
    if (!selectedBook) return 30;
    const targetEndCh = selectedChapterEnd ?? selectedChapter ?? 1;
    return getChapterVerseCount(selectedBook, targetEndCh);
  }, [selectedBook, selectedChapter, selectedChapterEnd]);

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

  // Current active draft segment (only valid when book, start chapter and start verse are chosen)
  const activeDraftSegment = useMemo((): PassageSegment | null => {
    if (!selectedBook || selectedChapter === null || selectedVerseStart === null) {
      return null;
    }
    const endCh = selectedChapterEnd ?? selectedChapter;
    const endV = selectedVerseEnd ?? selectedVerseStart;
    return buildSegment(
      selectedBook,
      selectedChapter,
      selectedVerseStart,
      endCh,
      endV
    );
  }, [selectedBook, selectedChapter, selectedVerseStart, selectedChapterEnd, selectedVerseEnd]);

  // --------------------------------------------------------------------------
  // Smart Direct Text Parsing
  // --------------------------------------------------------------------------
  const handleSmartParseInput = useCallback((raw: string) => {
    setSearchQuery(raw);
    setSmartParseError(null);

    const parsed = parsePassageReferenceString(raw);
    if (parsed.length > 0) {
      setSegments(parsed);
      const first = parsed[0];
      setSelectedBook(first.book);
      setSelectedChapter(first.startChapter);
      setSelectedChapterEnd(first.endChapter);
      setSelectedVerseStart(first.startVerse);
      setSelectedVerseEnd(first.endVerse);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Step Transitions & Boundary Resets
  // --------------------------------------------------------------------------

  const handleSelectBook = useCallback((book: CanonicalBook) => {
    setSelectedBook(book.name);
    setSelectedChapter(book.chapters === 1 ? 1 : null);
    setSelectedChapterEnd(book.chapters === 1 ? 1 : null);
    setSelectedVerseStart(null);
    setSelectedVerseEnd(null);

    if (book.chapters === 1) {
      setStep('start_verse');
    } else {
      setStep('start_chapter');
    }
  }, []);

  const handleSelectStartChapter = useCallback((ch: number) => {
    setSelectedChapter(ch);
    setSelectedChapterEnd(ch);
    setSelectedVerseStart(null);
    setSelectedVerseEnd(null);
    setStep('start_verse');
  }, []);

  const handleSelectStartVerse = useCallback((v: number) => {
    setSelectedVerseStart(v);
    setSelectedVerseEnd(v);
    // Standard fast path: advance directly to end_verse (same chapter)
    setStep('end_verse');
  }, []);

  const handleSelectEndChapter = useCallback((ch: number) => {
    if (selectedChapter === null) return;
    const safeEndCh = Math.max(selectedChapter, ch);
    setSelectedChapterEnd(safeEndCh);
    const maxV = selectedBook ? getChapterVerseCount(selectedBook, safeEndCh) : 30;
    const safeEndV = safeEndCh === selectedChapter ? Math.max(selectedVerseStart ?? 1, selectedVerseEnd ?? 1) : maxV;
    setSelectedVerseEnd(safeEndV);
    setStep('end_verse');
  }, [selectedBook, selectedChapter, selectedVerseStart, selectedVerseEnd]);

  const handleSelectEndVerse = useCallback((v: number) => {
    if (selectedVerseStart === null) {
      setSelectedVerseStart(v);
      setSelectedVerseEnd(v);
      return;
    }
    if (selectedChapter === selectedChapterEnd) {
      const safeV = Math.max(selectedVerseStart, v);
      setSelectedVerseEnd(safeV);
    } else {
      setSelectedVerseEnd(v);
    }
  }, [selectedChapter, selectedChapterEnd, selectedVerseStart]);

  const handleSelectEntireChapter = useCallback(() => {
    if (selectedChapter === null) return;
    setSelectedChapterEnd(selectedChapter);
    setSelectedVerseStart(1);
    setSelectedVerseEnd(startChapterVerses);
    setStep('end_verse');
  }, [selectedChapter, startChapterVerses]);

  // Multi-Segment (Compound) Segment Actions
  const handleAddCurrentSegment = useCallback(() => {
    if (!activeDraftSegment) return;
    setSegments((prev) => [...prev, activeDraftSegment]);
    // Reset picker step to book for next segment addition
    setSelectedBook(null);
    setSelectedChapter(null);
    setSelectedChapterEnd(null);
    setSelectedVerseStart(null);
    setSelectedVerseEnd(null);
    setStep('book');
  }, [activeDraftSegment]);

  const handleRemoveSegment = useCallback((index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleBackStep = useCallback(() => {
    if (step === 'end_verse') {
      // If user came from end_chapter (multi-chapter selection)
      if (selectedChapter !== selectedChapterEnd) {
        setStep('end_chapter');
      } else {
        setStep('start_verse');
      }
    } else if (step === 'end_chapter') {
      setStep('end_verse');
    } else if (step === 'start_verse') {
      if (currentBookMeta.chapters === 1) {
        setStep('book');
      } else {
        setStep('start_chapter');
      }
    } else if (step === 'start_chapter') {
      setStep('book');
    } else {
      handleDismiss();
    }
  }, [step, selectedChapter, selectedChapterEnd, currentBookMeta.chapters, handleDismiss]);

  const handleReset = useCallback(() => {
    setSelectedBook(null);
    setSelectedChapter(null);
    setSelectedChapterEnd(null);
    setSelectedVerseStart(null);
    setSelectedVerseEnd(null);
    setSegments([]);
    setTestamentTab('NT');
    setStep('book');
    setSearchQuery('');
    setSmartParseError(null);
  }, []);

  const canConfirm = useMemo(() => {
    return segments.length > 0 || activeDraftSegment !== null;
  }, [segments, activeDraftSegment]);

  const handleConfirm = useCallback(() => {
    let finalSegments: PassageSegment[] = [];

    if (segments.length > 0) {
      if (activeDraftSegment) {
        const alreadyInList = segments.some(
          (s) =>
            s.book === activeDraftSegment.book &&
            s.startChapter === activeDraftSegment.startChapter &&
            s.endChapter === activeDraftSegment.endChapter &&
            s.startVerse === activeDraftSegment.startVerse &&
            s.endVerse === activeDraftSegment.endVerse
        );
        finalSegments = alreadyInList ? [...segments] : [...segments, activeDraftSegment];
      } else {
        finalSegments = [...segments];
      }
    } else if (activeDraftSegment) {
      finalSegments = [activeDraftSegment];
    } else {
      return;
    }

    const passageRef = createPassageReference(finalSegments);

    const payload: PassageSelection = {
      display: passageRef.display,
      displayString: passageRef.display,
      books: passageRef.books,
      segments: passageRef.segments,
      book: passageRef.segments[0].book,
      startChapter: passageRef.segments[0].startChapter,
      startVerse: passageRef.segments[0].startVerse,
      endChapter: passageRef.segments[passageRef.segments.length - 1].endChapter,
      endVerse: passageRef.segments[passageRef.segments.length - 1].endVerse,
    };

    onSelect(payload);
    handleDismiss();
  }, [
    segments,
    activeDraftSegment,
    onSelect,
    handleDismiss,
  ]);

  const currentSummary = useMemo(() => {
    if (segments.length > 0) {
      if (activeDraftSegment) {
        const alreadyInList = segments.some(
          (s) =>
            s.book === activeDraftSegment.book &&
            s.startChapter === activeDraftSegment.startChapter &&
            s.endChapter === activeDraftSegment.endChapter &&
            s.startVerse === activeDraftSegment.startVerse &&
            s.endVerse === activeDraftSegment.endVerse
        );
        const all = alreadyInList ? segments : [...segments, activeDraftSegment];
        return formatCompoundDisplay(all);
      }
      return formatCompoundDisplay(segments);
    }
    if (activeDraftSegment) {
      return formatSegmentDisplay(activeDraftSegment);
    }
    return selectedBook
      ? selectedChapter
        ? `${selectedBook} ${selectedChapter}`
        : selectedBook
      : 'No passage selected';
  }, [segments, activeDraftSegment, selectedBook, selectedChapter]);

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
            onChangeText={handleSmartParseInput}
            placeholder="Type book or passage (e.g. Gen 1:1-3, Rom 8)..."
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            autoCapitalize="sentences"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setSmartParseError(null);
              }}
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

  const renderStartChapterStep = () => {
    const chaptersArray = Array.from(
      { length: currentBookMeta.chapters },
      (_, i) => i + 1
    );

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeaderNotice}>
          <Text style={styles.stepHeaderNoticeText}>
            Select start chapter for {selectedBook}
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
                  onPress={() => handleSelectStartChapter(ch)}
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

  const renderStartVerseStep = () => {
    const versesArray = Array.from(
      { length: startChapterVerses },
      (_, i) => i + 1
    );

    return (
      <View style={styles.stepContainer}>
        <View style={styles.verseActionHeader}>
          <Text style={styles.stepHeaderNoticeText}>
            Select start verse for {selectedBook} {selectedChapter}
          </Text>
          <Pressable
            style={styles.wholeChapterChip}
            onPress={handleSelectEntireChapter}
          >
            <Text style={styles.wholeChapterChipText}>
              Entire chapter ({startChapterVerses} v)
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.verseGrid}>
            {versesArray.map((v) => {
              const isSelected = v === selectedVerseStart;
              return (
                <Pressable
                  key={v}
                  style={[
                    styles.verseTile,
                    { width: squareTileSize, height: squareTileSize },
                    isSelected && styles.verseTileEndpoint,
                  ]}
                  onPress={() => handleSelectStartVerse(v)}
                >
                  <Text
                    style={[
                      styles.verseTileText,
                      isSelected && styles.verseTileTextEndpoint,
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

  const renderEndChapterStep = () => {
    const startCh = selectedChapter ?? 1;
    const endCh = selectedChapterEnd ?? startCh;
    const chaptersArray = Array.from(
      { length: currentBookMeta.chapters },
      (_, i) => i + 1
    );

    return (
      <View style={styles.stepContainer}>
        <View style={styles.verseActionHeader}>
          <Text style={styles.stepHeaderNoticeText}>
            Select end chapter (starts at ch. {startCh})
          </Text>
          <Pressable
            style={styles.wholeChapterChip}
            onPress={() => handleSelectEndChapter(startCh)}
          >
            <Text style={styles.wholeChapterChipText}>
              Same chapter ({startCh})
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chapterGrid}>
            {chaptersArray.map((ch) => {
              const isDisabled = ch < startCh;
              const isSelected = ch === endCh;
              const inRange = ch >= startCh && ch <= endCh;

              return (
                <Pressable
                  key={ch}
                  disabled={isDisabled}
                  style={[
                    styles.chapterTile,
                    { width: squareTileSize, height: squareTileSize },
                    isDisabled && { opacity: 0.3 },
                    inRange && styles.chapterTileInRange,
                    isSelected && styles.chapterTileSelected,
                  ]}
                  onPress={() => handleSelectEndChapter(ch)}
                >
                  <Text
                    style={[
                      styles.chapterTileText,
                      inRange && styles.chapterTileTextInRange,
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

  const renderEndVerseStep = () => {
    const versesArray = Array.from(
      { length: endChapterVerses },
      (_, i) => i + 1
    );

    const startV = selectedVerseStart ?? 1;
    const endV = selectedVerseEnd ?? startV;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.verseActionHeader}>
          <Text style={styles.stepHeaderNoticeText}>
            Select end verse for {selectedBook} {selectedChapterEnd ?? selectedChapter}
          </Text>
          {currentBookMeta.chapters > 1 && (
            <Pressable
              style={styles.wholeChapterChip}
              onPress={() => setStep('end_chapter')}
            >
              <Text style={styles.wholeChapterChipText}>
                Span multiple chapters ›
              </Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.verseGrid}>
            {versesArray.map((v) => {
              const isSameChapter = (selectedChapter ?? 1) === (selectedChapterEnd ?? selectedChapter ?? 1);
              const isDisabled = isSameChapter && selectedVerseStart !== null && v < selectedVerseStart;
              const isSelected = selectedVerseEnd !== null ? v === selectedVerseEnd : v === selectedVerseStart;
              const inRange = isSameChapter && selectedVerseStart !== null && selectedVerseEnd !== null && v > selectedVerseStart && v < selectedVerseEnd;

              return (
                <Pressable
                  key={v}
                  disabled={isDisabled}
                  style={[
                    styles.verseTile,
                    { width: squareTileSize, height: squareTileSize },
                    isDisabled && { opacity: 0.3 },
                    inRange && styles.verseTileInRange,
                    isSelected && styles.verseTileEndpoint,
                  ]}
                  onPress={() => handleSelectEndVerse(v)}
                >
                  <Text
                    style={[
                      styles.verseTileText,
                      inRange && styles.verseTileTextInRange,
                      isSelected && styles.verseTileTextEndpoint,
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
                    : step === 'start_chapter'
                    ? `${selectedBook}: Start Chapter`
                    : step === 'start_verse'
                    ? `${selectedBook} ${selectedChapter}: Start Verse`
                    : step === 'end_chapter'
                    ? `${selectedBook}: End Chapter`
                    : `${selectedBook} ${selectedChapterEnd ?? selectedChapter}: End Verse`}
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
                    (step === 'start_chapter' || step === 'end_chapter') && styles.breadcrumbChipActive,
                  ]}
                  onPress={() => {
                    if (selectedBook) setStep('start_chapter');
                  }}
                >
                  <Text
                    style={[
                      styles.breadcrumbText,
                      (step === 'start_chapter' || step === 'end_chapter') && styles.breadcrumbTextActive,
                    ]}
                  >
                    {selectedChapter === null
                      ? 'Chapter'
                      : selectedChapter === selectedChapterEnd
                      ? `Ch ${selectedChapter}`
                      : `Ch ${selectedChapter}–${selectedChapterEnd ?? selectedChapter}`}
                  </Text>
                </Pressable>

                <Text style={styles.breadcrumbSeparator}>›</Text>

                <Pressable
                  style={[
                    styles.breadcrumbChip,
                    (step === 'start_verse' || step === 'end_verse') && styles.breadcrumbChipActive,
                  ]}
                  onPress={() => {
                    if (selectedBook && selectedChapter !== null) setStep('start_verse');
                  }}
                >
                  <Text
                    style={[
                      styles.breadcrumbText,
                      (step === 'start_verse' || step === 'end_verse') && styles.breadcrumbTextActive,
                    ]}
                  >
                    {selectedVerseStart === null
                      ? 'Verse'
                      : selectedChapter === selectedChapterEnd && selectedVerseStart === selectedVerseEnd
                      ? `v. ${selectedVerseStart}`
                      : selectedChapter === selectedChapterEnd
                      ? `v. ${selectedVerseStart}–${selectedVerseEnd ?? selectedVerseStart}`
                      : `${selectedChapter}:${selectedVerseStart}–${selectedChapterEnd ?? selectedChapter}:${selectedVerseEnd ?? selectedVerseStart}`}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.divider} />

              <View style={styles.bodyContainer}>
                {step === 'book' && renderBookStep()}
                {step === 'start_chapter' && renderStartChapterStep()}
                {step === 'start_verse' && renderStartVerseStep()}
                {step === 'end_chapter' && renderEndChapterStep()}
                {step === 'end_verse' && renderEndVerseStep()}
              </View>

              <View style={styles.footerContainer}>
                {/* Compound Segment Chips */}
                {segments.length > 0 && (
                  <View style={styles.stagedSegmentsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stagedSegmentsList}>
                      {segments.map((seg, idx) => (
                        <View key={idx} style={styles.stagedSegmentChip}>
                          <Text style={styles.stagedSegmentText}>
                            {formatSegmentDisplay(seg)}
                          </Text>
                          <Pressable
                            hitSlop={6}
                            onPress={() => handleRemoveSegment(idx)}
                            style={styles.removeSegmentButton}
                          >
                            <Text style={styles.removeSegmentIcon}>✕</Text>
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <View style={styles.summaryTextColumn}>
                    <Text style={styles.summaryLabel}>Selected Passage</Text>
                    <Text style={styles.summaryReference} numberOfLines={2}>
                      {currentSummary}
                    </Text>
                  </View>

                  <View style={styles.actionButtonGroup}>
                    <Pressable
                      style={[
                        styles.addSegmentButton,
                        !activeDraftSegment && { opacity: 0.4 },
                      ]}
                      disabled={!activeDraftSegment}
                      onPress={handleAddCurrentSegment}
                    >
                      <Text style={styles.addSegmentButtonText}>+ Add</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.confirmButton,
                        !canConfirm && { opacity: 0.4 },
                      ]}
                      disabled={!canConfirm}
                      onPress={handleConfirm}
                    >
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </Pressable>
                  </View>
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
  stagedSegmentsContainer: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.xs,
  },
  stagedSegmentsList: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  stagedSegmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
  },
  stagedSegmentText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  removeSegmentButton: {
    padding: 2,
  },
  removeSegmentIcon: {
    fontSize: 11,
    color: colors.textDisabled,
    fontWeight: '700',
  },
  chapterTileInRange: {
    backgroundColor: 'rgba(227, 165, 61, 0.15)',
    borderColor: colors.accentKeyIdea,
  },
  chapterTileTextInRange: {
    color: colors.accentKeyIdea,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addSegmentButton: {
    backgroundColor: colors.bgSurfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    borderRadius: radii.controls,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSegmentButtonText: {
    color: colors.accentKeyIdea,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: colors.accentKeyIdea,
    borderRadius: radii.controls,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: colors.bgBase,
    fontSize: 14,
    fontWeight: '600',
  },
});

