import React, { useReducer, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { spacing } from '../../constants/theme';
import {
  CANONICAL_BOOKS,
  findCanonicalBook,
  CanonicalBook,
} from '../../constants/bibleData';
import { PassageSegment } from '../../types/note';
import {
  formatSegmentDisplay,
  formatCompoundDisplay,
  buildSegment,
  createPassageReference,
} from '../../utils/passageParser';
import {
  PassagePickerProps,
  PassageSelection,
  PickerStep,
} from './passagePickerTypes';
import {
  passagePickerReducer,
  initialPickerState,
} from './passagePickerReducer';
import { getChapterVerseCount } from './passagePickerUtils';
import { styles } from './styles';
import { Breadcrumbs } from './Breadcrumbs';
import { BookStepView } from './BookStepView';
import { ChapterGridStepView } from './ChapterGridStepView';
import { VerseGridStepView } from './VerseGridStepView';
import { SegmentTray } from './SegmentTray';

export default function PassagePicker({
  visible,
  onClose,
  onDismiss,
  initialPassage,
  onSelect,
}: PassagePickerProps) {
  const [state, dispatch] = useReducer(passagePickerReducer, initialPickerState);

  const handleDismiss = useCallback(() => {
    if (onClose) onClose();
    else if (onDismiss) onDismiss();
  }, [onClose, onDismiss]);

  // Dynamic tile size calculation for perfect 5-column square grid
  const { width: windowWidth } = useWindowDimensions();
  const squareTileSize = useMemo(() => {
    const availableWidth = windowWidth - spacing.md * 2 - spacing.sm * 4;
    return Math.max(48, Math.floor(availableWidth / 5));
  }, [windowWidth]);

  // Sync state whenever modal opens or initialPassage changes
  useEffect(() => {
    if (visible) {
      dispatch({
        type: 'SYNC_INITIAL',
        payload: { visible, initialPassage },
      });
    }
  }, [visible, initialPassage]);

  // Current book metadata
  const currentBookMeta = useMemo(() => {
    return state.selectedBook
      ? findCanonicalBook(state.selectedBook) || CANONICAL_BOOKS[44]
      : CANONICAL_BOOKS[44];
  }, [state.selectedBook]);

  const startChapterVerses = useMemo(() => {
    if (!state.selectedBook || !state.selectedChapter) return 30;
    return getChapterVerseCount(state.selectedBook, state.selectedChapter);
  }, [state.selectedBook, state.selectedChapter]);

  const endChapterVerses = useMemo(() => {
    if (!state.selectedBook) return 30;
    const targetEndCh = state.selectedChapterEnd ?? state.selectedChapter ?? 1;
    return getChapterVerseCount(state.selectedBook, targetEndCh);
  }, [state.selectedBook, state.selectedChapter, state.selectedChapterEnd]);

  // Filtered books for Step 1
  const filteredBooks = useMemo(() => {
    return CANONICAL_BOOKS.filter((b) => {
      const matchesTab = b.testament === state.testamentTab;
      if (state.searchQuery.trim().length === 0) {
        return matchesTab;
      }
      return b.name.toLowerCase().includes(state.searchQuery.trim().toLowerCase());
    });
  }, [state.testamentTab, state.searchQuery]);

  // Current active draft segment
  const activeDraftSegment = useMemo((): PassageSegment | null => {
    if (!state.selectedBook || state.selectedChapter === null || state.selectedVerseStart === null) {
      return null;
    }
    const endCh = state.selectedChapterEnd ?? state.selectedChapter;
    const endV = state.selectedVerseEnd ?? state.selectedVerseStart;
    return buildSegment(
      state.selectedBook,
      state.selectedChapter,
      state.selectedVerseStart,
      endCh,
      endV
    );
  }, [
    state.selectedBook,
    state.selectedChapter,
    state.selectedVerseStart,
    state.selectedChapterEnd,
    state.selectedVerseEnd,
  ]);

  const canConfirm = useMemo(() => {
    return state.segments.length > 0 || activeDraftSegment !== null;
  }, [state.segments, activeDraftSegment]);

  const handleConfirm = useCallback(() => {
    let finalSegments: PassageSegment[] = [];

    if (state.segments.length > 0) {
      if (activeDraftSegment) {
        const alreadyInList = state.segments.some(
          (s) =>
            s.book === activeDraftSegment.book &&
            s.startChapter === activeDraftSegment.startChapter &&
            s.endChapter === activeDraftSegment.endChapter &&
            s.startVerse === activeDraftSegment.startVerse &&
            s.endVerse === activeDraftSegment.endVerse
        );
        finalSegments = alreadyInList ? [...state.segments] : [...state.segments, activeDraftSegment];
      } else {
        finalSegments = [...state.segments];
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
    state.segments,
    activeDraftSegment,
    onSelect,
    handleDismiss,
  ]);

  const currentSummary = useMemo(() => {
    if (state.segments.length > 0) {
      if (activeDraftSegment) {
        const alreadyInList = state.segments.some(
          (s) =>
            s.book === activeDraftSegment.book &&
            s.startChapter === activeDraftSegment.startChapter &&
            s.endChapter === activeDraftSegment.endChapter &&
            s.startVerse === activeDraftSegment.startVerse &&
            s.endVerse === activeDraftSegment.endVerse
        );
        const all = alreadyInList ? state.segments : [...state.segments, activeDraftSegment];
        return formatCompoundDisplay(all);
      }
      return formatCompoundDisplay(state.segments);
    }
    if (activeDraftSegment) {
      return formatSegmentDisplay(activeDraftSegment);
    }
    return state.selectedBook
      ? state.selectedChapter
        ? `${state.selectedBook} ${state.selectedChapter}`
        : state.selectedBook
      : 'No passage selected';
  }, [state.segments, activeDraftSegment, state.selectedBook, state.selectedChapter]);

  const handleBackStep = useCallback(() => {
    if (state.step === 'book') {
      handleDismiss();
    } else {
      dispatch({ type: 'STEP_BACK' });
    }
  }, [state.step, handleDismiss]);

  const handleSetStep = useCallback((step: PickerStep) => {
    dispatch({ type: 'SET_STEP', payload: { step } });
  }, []);

  const handleSelectBook = useCallback((book: CanonicalBook) => {
    dispatch({ type: 'SELECT_BOOK', payload: { book } });
  }, []);

  const handleSelectStartChapter = useCallback((chapter: number) => {
    dispatch({ type: 'SELECT_START_CHAPTER', payload: { chapter } });
  }, []);

  const handleSelectStartVerse = useCallback((verse: number) => {
    dispatch({ type: 'SELECT_START_VERSE', payload: { verse } });
  }, []);

  const handleSelectEndChapter = useCallback((chapter: number) => {
    dispatch({ type: 'SELECT_END_CHAPTER', payload: { chapter } });
  }, []);

  const handleSelectEndVerse = useCallback((verse: number) => {
    dispatch({ type: 'SELECT_END_VERSE', payload: { verse } });
  }, []);

  const handleSelectEntireChapter = useCallback(() => {
    dispatch({
      type: 'SELECT_ENTIRE_CHAPTER',
      payload: { totalVerses: startChapterVerses },
    });
  }, [startChapterVerses]);

  const handleAddCurrentSegment = useCallback(() => {
    if (!activeDraftSegment) return;
    dispatch({
      type: 'ADD_SEGMENT',
      payload: { segment: activeDraftSegment },
    });
  }, [activeDraftSegment]);

  const handleRemoveSegment = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_SEGMENT', payload: { index } });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const handleSetTestament = useCallback((testament: 'OT' | 'NT') => {
    dispatch({ type: 'SET_TESTAMENT', payload: { testament } });
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: { query } });
  }, []);

  const handleClearSearch = useCallback(() => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: { query: '' } });
  }, []);

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
                    {state.step === 'book' ? 'Cancel' : '‹ Back'}
                  </Text>
                </Pressable>

                <Text style={styles.navBarTitle}>
                  {state.step === 'book'
                    ? 'Select Book'
                    : state.step === 'start_chapter'
                    ? `${state.selectedBook}: Start Chapter`
                    : state.step === 'start_verse'
                    ? `${state.selectedBook} ${state.selectedChapter}: Start Verse`
                    : state.step === 'end_chapter'
                    ? `${state.selectedBook}: End Chapter`
                    : `${state.selectedBook} ${state.selectedChapterEnd ?? state.selectedChapter}: End Verse`}
                </Text>

                <Pressable onPress={handleReset} style={styles.navBarButton}>
                  <Text style={styles.navBarResetText}>Reset</Text>
                </Pressable>
              </View>

              <Breadcrumbs
                step={state.step}
                selectedBook={state.selectedBook}
                selectedChapter={state.selectedChapter}
                selectedChapterEnd={state.selectedChapterEnd}
                selectedVerseStart={state.selectedVerseStart}
                selectedVerseEnd={state.selectedVerseEnd}
                onSetStep={handleSetStep}
              />

              <View style={styles.divider} />

              <View style={styles.bodyContainer}>
                {state.step === 'book' && (
                  <BookStepView
                    testamentTab={state.testamentTab}
                    searchQuery={state.searchQuery}
                    selectedBook={state.selectedBook}
                    filteredBooks={filteredBooks}
                    onSetTestament={handleSetTestament}
                    onSearchChange={handleSearchChange}
                    onClearSearch={handleClearSearch}
                    onSelectBook={handleSelectBook}
                  />
                )}

                {state.step === 'start_chapter' && (
                  <ChapterGridStepView
                    mode="start"
                    selectedBook={state.selectedBook}
                    totalChapters={currentBookMeta.chapters}
                    selectedChapter={state.selectedChapter}
                    selectedChapterEnd={state.selectedChapterEnd}
                    squareTileSize={squareTileSize}
                    onSelectChapter={handleSelectStartChapter}
                  />
                )}

                {state.step === 'start_verse' && (
                  <VerseGridStepView
                    mode="start"
                    selectedBook={state.selectedBook}
                    selectedChapter={state.selectedChapter}
                    selectedChapterEnd={state.selectedChapterEnd}
                    totalVerses={startChapterVerses}
                    totalBookChapters={currentBookMeta.chapters}
                    selectedVerseStart={state.selectedVerseStart}
                    selectedVerseEnd={state.selectedVerseEnd}
                    squareTileSize={squareTileSize}
                    onSelectVerse={handleSelectStartVerse}
                    onSelectEntireChapter={handleSelectEntireChapter}
                  />
                )}

                {state.step === 'end_chapter' && (
                  <ChapterGridStepView
                    mode="end"
                    selectedBook={state.selectedBook}
                    totalChapters={currentBookMeta.chapters}
                    selectedChapter={state.selectedChapter}
                    selectedChapterEnd={state.selectedChapterEnd}
                    squareTileSize={squareTileSize}
                    onSelectChapter={handleSelectEndChapter}
                    onSelectSameChapter={handleSelectEndChapter}
                  />
                )}

                {state.step === 'end_verse' && (
                  <VerseGridStepView
                    mode="end"
                    selectedBook={state.selectedBook}
                    selectedChapter={state.selectedChapter}
                    selectedChapterEnd={state.selectedChapterEnd}
                    totalVerses={endChapterVerses}
                    totalBookChapters={currentBookMeta.chapters}
                    selectedVerseStart={state.selectedVerseStart}
                    selectedVerseEnd={state.selectedVerseEnd}
                    squareTileSize={squareTileSize}
                    onSelectVerse={handleSelectEndVerse}
                    onSpanMultipleChapters={() => handleSetStep('end_chapter')}
                  />
                )}
              </View>

              <View style={styles.footerContainer}>
                <SegmentTray
                  segments={state.segments}
                  onRemoveSegment={handleRemoveSegment}
                />

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
