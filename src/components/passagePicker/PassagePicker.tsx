import React, { useReducer, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { CANONICAL_BOOKS, findCanonicalBook, CanonicalBook } from '../../constants/bibleData';
import {
  formatSegmentDisplay,
  createPassageReference,
  parsePassageReferenceString,
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
import {
  getChapterVerseCount,
  bookMatchesQuery,
  draftFromSelection,
  assemblePassageSegments,
  computeSquareTileSize,
} from './passagePickerUtils';
import { styles } from './styles';
import { BookAccordionView } from './BookAccordionView';
import { VerseRangeView } from './VerseRangeView';
import { PassageList } from './PassageList';

function isVerseStep(step: PickerStep): boolean {
  return step === 'start_verse' || step === 'end_verse' || step === 'end_chapter';
}

/**
 * Multi-passage picker modeled on YouVersion's Bible chapter picker:
 * search, then a canonical book list whose chapters open inline.
 * Verse ranges are chosen on the next screen with two taps.
 * Committed passages can be reordered, edited, or deleted before Done.
 */
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

  const { width: windowWidth } = useWindowDimensions();
  const squareTileSize = useMemo(
    () => computeSquareTileSize(windowWidth),
    [windowWidth]
  );

  useEffect(() => {
    if (visible) {
      dispatch({
        type: 'SYNC_INITIAL',
        payload: { visible, initialPassage },
      });
    }
  }, [visible, initialPassage]);

  const currentBookMeta = useMemo(() => {
    return state.selectedBook ? findCanonicalBook(state.selectedBook) ?? null : null;
  }, [state.selectedBook]);

  const activeDraft = useMemo(
    () => draftFromSelection(state),
    [
      state.selectedBook,
      state.selectedChapter,
      state.selectedChapterEnd,
      state.selectedVerseStart,
      state.selectedVerseEnd,
    ]
  );

  const filteredBooks = useMemo(() => {
    const rawQuery = state.searchQuery.trim().toLowerCase();
    const bookQuery = rawQuery.replace(/\s+\d+.*$/, '').trim();
    const query = bookQuery.length > 0 ? bookQuery : rawQuery;
    if (!query) return CANONICAL_BOOKS;
    return CANONICAL_BOOKS.filter((book) => bookMatchesQuery(book, query));
  }, [state.searchQuery]);

  const onVersePanel = isVerseStep(state.step);
  const sameChapter =
    state.selectedChapter !== null &&
    (state.selectedChapterEnd ?? state.selectedChapter) === state.selectedChapter;
  const endChapter = state.selectedChapterEnd ?? state.selectedChapter ?? 1;
  const startChapterVerses =
    state.selectedBook && state.selectedChapter
      ? getChapterVerseCount(state.selectedBook, state.selectedChapter)
      : 30;
  const endChapterVerses =
    state.selectedBook
      ? getChapterVerseCount(state.selectedBook, endChapter)
      : 30;

  const canConfirm = state.segments.length > 0 || activeDraft !== null;
  const liveLabel = activeDraft ? formatSegmentDisplay(activeDraft) : null;

  const title = useMemo(() => {
    if (!onVersePanel) {
      return state.editingIndex !== null ? 'Edit passage' : 'Choose a passage';
    }
    if (state.step === 'end_chapter') return 'End chapter';
    if (!state.selectedBook || state.selectedChapter === null) return 'Verses';
    if (state.selectedChapterEnd && state.selectedChapterEnd !== state.selectedChapter) {
      return `${state.selectedBook} ${state.selectedChapter}–${state.selectedChapterEnd}`;
    }
    return `${state.selectedBook} ${state.selectedChapter}`;
  }, [
    onVersePanel,
    state.editingIndex,
    state.step,
    state.selectedBook,
    state.selectedChapter,
    state.selectedChapterEnd,
  ]);

  const handleBackStep = useCallback(() => {
    if (state.step === 'end_chapter') {
      dispatch({ type: 'SET_STEP', payload: { step: 'end_verse' } });
      return;
    }
    if (onVersePanel) {
      const chapters = currentBookMeta?.chapters ?? 1;
      if (chapters === 1) {
        dispatch({ type: 'SET_STEP', payload: { step: 'book', expandedBook: null } });
      } else {
        dispatch({
          type: 'SET_STEP',
          payload: { step: 'start_chapter', expandedBook: state.selectedBook },
        });
      }
      return;
    }
    handleDismiss();
  }, [state.step, state.selectedBook, onVersePanel, currentBookMeta, handleDismiss]);

  const handleToggleBook = useCallback((book: CanonicalBook) => {
    dispatch({ type: 'SELECT_BOOK', payload: { book } });
  }, []);

  const handleSelectChapter = useCallback((chapter: number) => {
    dispatch({ type: 'SELECT_START_CHAPTER', payload: { chapter } });
  }, []);

  const handleSelectVerse = useCallback(
    (verse: number) => {
      if (!sameChapter) {
        dispatch({ type: 'SELECT_END_VERSE', payload: { verse } });
        return;
      }
      dispatch({ type: 'SELECT_RANGE_VERSE', payload: { verse } });
    },
    [sameChapter]
  );

  const handleSelectEndChapter = useCallback((chapter: number) => {
    dispatch({ type: 'SELECT_END_CHAPTER', payload: { chapter } });
  }, []);

  const handleEntireChapter = useCallback(() => {
    dispatch({
      type: 'SELECT_ENTIRE_CHAPTER',
      payload: { totalVerses: startChapterVerses },
    });
  }, [startChapterVerses]);

  const handleAddOrSave = useCallback(() => {
    if (state.editingIndex !== null) {
      dispatch({ type: 'SAVE_EDIT' });
      return;
    }
    if (!activeDraft) return;
    dispatch({ type: 'ADD_SEGMENTS', payload: { segments: [activeDraft] } });
  }, [state.editingIndex, activeDraft]);

  const handleEdit = useCallback((index: number) => {
    dispatch({ type: 'START_EDIT', payload: { index } });
  }, []);

  const handleDelete = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_SEGMENT', payload: { index } });
  }, []);

  const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_SEGMENT', payload: { index, direction } });
  }, []);

  const handleConfirm = useCallback(() => {
    const finalSegments = assemblePassageSegments(
      state.segments,
      activeDraft,
      state.editingIndex
    );
    if (finalSegments.length === 0) return;

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
  }, [state.segments, state.editingIndex, activeDraft, onSelect, handleDismiss]);

  const handleSearchChange = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: { query } });
  }, []);

  const handleClearSearch = useCallback(() => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: { query: '' } });
  }, []);

  const handleSubmitSearch = useCallback(() => {
    const parsed = parsePassageReferenceString(state.searchQuery);
    if (parsed.length > 0) {
      dispatch({ type: 'SET_STEP', payload: { step: 'end_verse' } });
      return;
    }
    if (filteredBooks.length === 1) {
      dispatch({ type: 'SELECT_BOOK', payload: { book: filteredBooks[0] } });
    }
  }, [state.searchQuery, filteredBooks]);

  const handleCancelEdit = useCallback(() => {
    dispatch({ type: 'CANCEL_EDIT' });
  }, []);

  const leftLabel = onVersePanel ? 'Back' : 'Cancel';
  const passageCountLabel =
    state.segments.length === 1 ? '1 passage' : `${state.segments.length} passages`;

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
                <Pressable
                  onPress={handleBackStep}
                  style={styles.navBarButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.navBarButtonText}>{leftLabel}</Text>
                </Pressable>

                <Text style={styles.navBarTitle} numberOfLines={1}>
                  {title}
                </Text>

                {state.editingIndex !== null ? (
                  <Pressable
                    onPress={handleCancelEdit}
                    style={[styles.navBarButton, styles.navBarButtonWide]}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel edit"
                  >
                    <Text style={[styles.navBarButtonText, styles.navBarButtonTextRight]}>
                      Cancel edit
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.navBarButton} />
                )}
              </View>

              <View style={styles.divider} />

              <View style={styles.bodyContainer}>
                {onVersePanel && state.selectedBook && state.selectedChapter !== null ? (
                  <VerseRangeView
                    mode={state.step === 'end_chapter' ? 'end-chapter' : 'verses'}
                    bookName={state.selectedBook}
                    startChapter={state.selectedChapter}
                    endChapter={endChapter}
                    startVerse={state.selectedVerseStart}
                    endVerse={state.selectedVerseEnd}
                    verseAnchor={state.verseAnchor}
                    totalVerses={sameChapter ? startChapterVerses : endChapterVerses}
                    totalChapters={currentBookMeta?.chapters ?? 1}
                    tileSize={squareTileSize}
                    onSelectVerse={handleSelectVerse}
                    onSelectEndChapter={handleSelectEndChapter}
                    onEntireChapter={
                      state.step !== 'end_chapter' && sameChapter ? handleEntireChapter : undefined
                    }
                    onAnotherChapter={
                      state.step !== 'end_chapter' && (currentBookMeta?.chapters ?? 1) > 1
                        ? () => dispatch({ type: 'SET_STEP', payload: { step: 'end_chapter' } })
                        : undefined
                    }
                    onStayInChapter={
                      state.step === 'end_chapter'
                        ? () => handleSelectEndChapter(state.selectedChapter as number)
                        : undefined
                    }
                  />
                ) : (
                  <BookAccordionView
                    books={filteredBooks}
                    expandedBook={state.expandedBook}
                    highlightedChapter={
                      state.expandedBook === state.selectedBook ? state.selectedChapter : null
                    }
                    searchQuery={state.searchQuery}
                    suggestionLabel={
                      state.searchQuery.trim().length > 0 && activeDraft && state.editingIndex === null
                        ? liveLabel
                        : null
                    }
                    tileSize={squareTileSize}
                    onSearchChange={handleSearchChange}
                    onClearSearch={handleClearSearch}
                    onSubmitSearch={handleSubmitSearch}
                    onAddSuggestion={handleAddOrSave}
                    onToggleBook={handleToggleBook}
                    onSelectChapter={handleSelectChapter}
                  />
                )}
              </View>

              <View style={styles.footerContainer}>
                {state.segments.length > 0 && (
                  <>
                    <Text style={styles.passagesHeading}>{passageCountLabel}</Text>
                    <PassageList
                      segments={state.segments}
                      editingIndex={state.editingIndex}
                      liveLabel={liveLabel}
                      onMove={handleMove}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </>
                )}

                {activeDraft && state.editingIndex === null && (
                  <View style={styles.draftBlock}>
                    <Text style={styles.summaryLabel}>Current selection</Text>
                    <Text style={styles.draftReference} numberOfLines={2}>
                      {liveLabel}
                    </Text>
                  </View>
                )}

                {!activeDraft && state.segments.length === 0 && (
                  <Text style={styles.hintText}>
                    Search or tap a book. Chapters open underneath, then tap two verses to set a range.
                  </Text>
                )}

                <View style={styles.actionButtonGroup}>
                  <Pressable
                    style={[
                      styles.addSegmentButton,
                      !activeDraft && styles.buttonDisabled,
                    ]}
                    disabled={!activeDraft}
                    onPress={handleAddOrSave}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !activeDraft }}
                  >
                    <Text style={styles.addSegmentButtonText}>
                      {state.editingIndex !== null ? 'Save passage' : 'Add passage'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.confirmButton, !canConfirm && styles.buttonDisabled]}
                    disabled={!canConfirm}
                    onPress={handleConfirm}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canConfirm }}
                  >
                    <Text style={styles.confirmButtonText}>Done</Text>
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
