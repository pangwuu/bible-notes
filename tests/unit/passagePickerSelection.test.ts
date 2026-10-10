/**
 * Unit Test Suite for PassagePicker Selection Logic & State Machine
 */

import {
  validateVerseRange,
  formatPassageReference,
  computeCanonicalOrdinals,
  getChapterVerseCount,
  passagePickerReducer,
  initialPickerState,
  findCanonicalBook,
} from '../../src/components/PassagePicker';

describe('PassagePicker Selection Logic & State Machine', () => {
  describe('validateVerseRange', () => {
    test('succeeds when start is equal to end (single verse)', () => {
      expect(validateVerseRange(14, 14)).toBe(true);
    });

    test('succeeds when start is less than end (valid range)', () => {
      expect(validateVerseRange(1, 10)).toBe(true);
      expect(validateVerseRange(14, 28)).toBe(true);
    });

    test('throws when end is strictly less than start', () => {
      expect(() => validateVerseRange(15, 10)).toThrow('End verse cannot precede start verse');
    });
  });

  describe('Two-Tap Range Selection State Machine Simulation', () => {
    // Model the exact state transition function from PassagePicker
    interface SelectionState {
      start: number;
      end: number;
      anchor: number | null;
    }

    const selectVerse = (state: SelectionState, verseNum: number): SelectionState => {
      if (state.anchor === null) {
        // First tap: start new selection anchored at verseNum
        return {
          start: verseNum,
          end: verseNum,
          anchor: verseNum,
        };
      } else {
        // Second tap: complete range with anchor
        const anchor = state.anchor;
        if (verseNum === anchor) {
          return { start: verseNum, end: verseNum, anchor: null };
        } else if (verseNum > anchor) {
          return { start: anchor, end: verseNum, anchor: null };
        } else {
          return { start: verseNum, end: anchor, anchor: null };
        }
      }
    };

    test('first tap on verse 14 selects single verse 14 and anchors', () => {
      const initial: SelectionState = { start: 1, end: 11, anchor: null };
      const s1 = selectVerse(initial, 14);

      expect(s1.start).toBe(14);
      expect(s1.end).toBe(14);
      expect(s1.anchor).toBe(14);
    });

    test('second tap on verse 18 expands range to 14–18 and completes anchor', () => {
      const stateWithAnchor: SelectionState = { start: 14, end: 14, anchor: 14 };
      const s2 = selectVerse(stateWithAnchor, 18);

      expect(s2.start).toBe(14);
      expect(s2.end).toBe(18);
      expect(s2.anchor).toBeNull();
    });

    test('second tap on verse 10 expands backwards to 10–14 and completes anchor', () => {
      const stateWithAnchor: SelectionState = { start: 14, end: 14, anchor: 14 };
      const s2 = selectVerse(stateWithAnchor, 10);

      expect(s2.start).toBe(10);
      expect(s2.end).toBe(14);
      expect(s2.anchor).toBeNull();
    });

    test('second tap on same verse 14 collapses to single verse 14 and completes anchor', () => {
      const stateWithAnchor: SelectionState = { start: 14, end: 14, anchor: 14 };
      const s2 = selectVerse(stateWithAnchor, 14);

      expect(s2.start).toBe(14);
      expect(s2.end).toBe(14);
      expect(s2.anchor).toBeNull();
    });

    test('third tap after range completion starts a fresh single-verse selection', () => {
      const completedRange: SelectionState = { start: 14, end: 18, anchor: null };
      const s3 = selectVerse(completedRange, 28);

      expect(s3.start).toBe(28);
      expect(s3.end).toBe(28);
      expect(s3.anchor).toBe(28);
    });
  });

  describe('formatPassageReference', () => {
    test('formats single verse reference without dash', () => {
      expect(formatPassageReference('Romans', 8, 28, 8, 28)).toBe('Romans 8:28');
      expect(formatPassageReference('John', 3, 16, 3, 16)).toBe('John 3:16');
    });

    test('formats intra-chapter range using en-dash (–)', () => {
      const ref = formatPassageReference('Romans', 8, 28, 8, 30);
      expect(ref).toBe('Romans 8:28–30');
      expect(ref).toContain('–'); // Unicode en-dash
      expect(ref).not.toContain('-'); // Not hyphen
    });
  });

  describe('Two-Tap Cross-Chapter Range State Machine Simulation', () => {
    interface ChapterSelectionState {
      startChapter: number;
      endChapter: number;
      anchor: number | null;
    }

    const selectChapter = (state: ChapterSelectionState, chapterNum: number): ChapterSelectionState => {
      if (state.anchor === null) {
        return {
          startChapter: chapterNum,
          endChapter: chapterNum,
          anchor: chapterNum,
        };
      } else {
        const start = Math.min(state.anchor, chapterNum);
        const end = Math.max(state.anchor, chapterNum);
        return {
          startChapter: start,
          endChapter: end,
          anchor: null,
        };
      }
    };

    test('first tap on chapter 1 sets anchor and selects chapter 1', () => {
      const initial: ChapterSelectionState = { startChapter: 8, endChapter: 8, anchor: null };
      const s1 = selectChapter(initial, 1);
      expect(s1.startChapter).toBe(1);
      expect(s1.endChapter).toBe(1);
      expect(s1.anchor).toBe(1);
    });

    test('second tap on chapter 2 forms range 1 to 2 and clears anchor', () => {
      const s1: ChapterSelectionState = { startChapter: 1, endChapter: 1, anchor: 1 };
      const s2 = selectChapter(s1, 2);
      expect(s2.startChapter).toBe(1);
      expect(s2.endChapter).toBe(2);
      expect(s2.anchor).toBeNull();
    });

    test('second tap backwards on lower chapter 1 from anchor 3 forms range 1 to 3', () => {
      const s1: ChapterSelectionState = { startChapter: 3, endChapter: 3, anchor: 3 };
      const s2 = selectChapter(s1, 1);
      expect(s2.startChapter).toBe(1);
      expect(s2.endChapter).toBe(3);
      expect(s2.anchor).toBeNull();
    });
  });

  describe('computeCanonicalOrdinals & verse counts', () => {
    test('computes valid ordinal range for Romans 8:14–18', () => {
      const [startOrd, endOrd] = computeCanonicalOrdinals('Romans', 8, 14, 8, 18);
      expect(startOrd).toBeGreaterThan(0);
      expect(endOrd).toBeGreaterThan(startOrd);
      expect(endOrd - startOrd).toBe(4); // 18 - 14 = 4 difference
    });

    test('gets correct verse counts for canonical chapters', () => {
      expect(getChapterVerseCount('Romans', 8)).toBe(39);
      expect(getChapterVerseCount('John', 3)).toBe(36);
      expect(getChapterVerseCount('Genesis', 1)).toBe(31);
    });
  });

  describe('Streamlined Single-Chapter Flow & Clean Slate Selection', () => {
    interface PickerFlowState {
      step: 'book' | 'start_chapter' | 'start_verse' | 'end_chapter' | 'end_verse';
      book: string | null;
      startChapter: number | null;
      endChapter: number | null;
      startVerse: number | null;
      endVerse: number | null;
    }

    const initCleanPicker = (): PickerFlowState => ({
      step: 'book',
      book: null,
      startChapter: null,
      endChapter: null,
      startVerse: null,
      endVerse: null,
    });

    const selectBook = (state: PickerFlowState, book: string, chapters: number): PickerFlowState => ({
      ...state,
      book,
      startChapter: chapters === 1 ? 1 : null,
      endChapter: chapters === 1 ? 1 : null,
      startVerse: null,
      endVerse: null,
      step: chapters === 1 ? 'start_verse' : 'start_chapter',
    });

    const selectStartChapter = (state: PickerFlowState, ch: number): PickerFlowState => ({
      ...state,
      startChapter: ch,
      endChapter: ch,
      startVerse: null,
      endVerse: null,
      step: 'start_verse',
    });

    const selectStartVerse = (state: PickerFlowState, v: number): PickerFlowState => ({
      ...state,
      startVerse: v,
      endVerse: v,
      step: 'end_verse', // Streamlined fast-path: advances directly to end_verse
    });

    test('initial state has null selections and cannot confirm', () => {
      const state = initCleanPicker();
      expect(state.book).toBeNull();
      expect(state.startChapter).toBeNull();
      expect(state.startVerse).toBeNull();
      const canConfirm = state.book !== null && state.startChapter !== null && state.startVerse !== null;
      expect(canConfirm).toBe(false);
    });

    test('streamlined single-chapter flow: Book -> Start Ch -> Start Verse -> End Verse', () => {
      let state = initCleanPicker();
      state = selectBook(state, 'Romans', 16);
      expect(state.step).toBe('start_chapter');
      expect(state.book).toBe('Romans');

      state = selectStartChapter(state, 8);
      expect(state.step).toBe('start_verse');
      expect(state.startChapter).toBe(8);
      expect(state.endChapter).toBe(8);

      state = selectStartVerse(state, 1);
      expect(state.step).toBe('end_verse');
      expect(state.startVerse).toBe(1);
      expect(state.endVerse).toBe(1);
      expect(state.endChapter).toBe(8);

      const canConfirm = state.book !== null && state.startChapter !== null && state.startVerse !== null;
      expect(canConfirm).toBe(true);
    });

    test('multi-chapter opt-in: clicking span multiple chapters switches step to end_chapter', () => {
      let state = initCleanPicker();
      state = selectBook(state, 'Romans', 16);
      state = selectStartChapter(state, 8);
      state = selectStartVerse(state, 28);
      expect(state.step).toBe('end_verse');

      // User clicks "Span multiple chapters ›"
      state = { ...state, step: 'end_chapter' };
      expect(state.step).toBe('end_chapter');

      // User selects end chapter 9
      state = { ...state, endChapter: 9, endVerse: 33, step: 'end_verse' };
      expect(state.endChapter).toBe(9);
      expect(state.step).toBe('end_verse');
    });
  });

  describe('passagePickerReducer Formal State Reducer', () => {
    test('handles clean-slate initialization and SYNC_INITIAL', () => {
      let state = passagePickerReducer(initialPickerState, {
        type: 'SYNC_INITIAL',
        payload: { visible: true },
      });
      expect(state.step).toBe('book');
      expect(state.selectedBook).toBeNull();
      expect(state.selectedChapter).toBeNull();
      expect(state.selectedVerseStart).toBeNull();
      expect(state.segments).toEqual([]);

      // Test with initialPassage with segments
      state = passagePickerReducer(state, {
        type: 'SYNC_INITIAL',
        payload: {
          visible: true,
          initialPassage: {
            segments: [
              { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 11 },
            ],
          },
        },
      });
      expect(state.segments).toEqual([
        { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 11 },
      ]);
      expect(state.selectedBook).toBeNull();
      expect(state.selectedChapter).toBeNull();
      expect(state.selectedVerseStart).toBeNull();
      expect(state.editingIndex).toBeNull();
      expect(state.step).toBe('book');
    });

    test('selecting multi-chapter book advances to start_chapter', () => {
      const romans = findCanonicalBook('Romans')!;
      const state = passagePickerReducer(initialPickerState, {
        type: 'SELECT_BOOK',
        payload: { book: romans },
      });
      expect(state.selectedBook).toBe('Romans');
      expect(state.selectedChapter).toBeNull();
      expect(state.step).toBe('start_chapter');
    });

    test('selecting single-chapter book (e.g. Jude) auto-selects chapter 1 and advances to start_verse', () => {
      const jude = findCanonicalBook('Jude')!;
      const state = passagePickerReducer(initialPickerState, {
        type: 'SELECT_BOOK',
        payload: { book: jude },
      });
      expect(state.selectedBook).toBe('Jude');
      expect(state.selectedChapter).toBe(1);
      expect(state.selectedChapterEnd).toBe(1);
      expect(state.step).toBe('start_verse');
    });

    test('step sequence: book -> chapter -> start_verse -> end_verse', () => {
      const romans = findCanonicalBook('Romans')!;
      let state = passagePickerReducer(initialPickerState, {
        type: 'SELECT_BOOK',
        payload: { book: romans },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_START_CHAPTER',
        payload: { chapter: 8 },
      });
      expect(state.step).toBe('start_verse');
      expect(state.selectedChapter).toBe(8);
      expect(state.selectedChapterEnd).toBe(8);

      state = passagePickerReducer(state, {
        type: 'SELECT_START_VERSE',
        payload: { verse: 14 },
      });
      expect(state.step).toBe('end_verse');
      expect(state.selectedVerseStart).toBe(14);
      expect(state.selectedVerseEnd).toBe(14);

      // Select end verse expands range
      state = passagePickerReducer(state, {
        type: 'SELECT_END_VERSE',
        payload: { verse: 18 },
      });
      expect(state.selectedVerseStart).toBe(14);
      expect(state.selectedVerseEnd).toBe(18);

      // In same chapter, selecting end verse earlier than start verse is clamped
      state = passagePickerReducer(state, {
        type: 'SELECT_END_VERSE',
        payload: { verse: 10 },
      });
      expect(state.selectedVerseEnd).toBe(14);
    });

    test('SELECT_ENTIRE_CHAPTER selects entire chapter verse range', () => {
      const romans = findCanonicalBook('Romans')!;
      let state = passagePickerReducer(initialPickerState, {
        type: 'SELECT_BOOK',
        payload: { book: romans },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_START_CHAPTER',
        payload: { chapter: 8 },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_ENTIRE_CHAPTER',
        payload: { totalVerses: 39 },
      });
      expect(state.step).toBe('end_verse');
      expect(state.selectedVerseStart).toBe(1);
      expect(state.selectedVerseEnd).toBe(39);
    });

    test('cross-chapter selection via SELECT_END_CHAPTER', () => {
      const romans = findCanonicalBook('Romans')!;
      let state = passagePickerReducer(initialPickerState, {
        type: 'SELECT_BOOK',
        payload: { book: romans },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_START_CHAPTER',
        payload: { chapter: 8 },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_START_VERSE',
        payload: { verse: 31 },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_END_CHAPTER',
        payload: { chapter: 9 },
      });
      expect(state.step).toBe('end_verse');
      expect(state.selectedChapter).toBe(8);
      expect(state.selectedChapterEnd).toBe(9);
      expect(state.selectedVerseEnd).toBe(33); // Romans 9 has 33 verses

      state = passagePickerReducer(state, {
        type: 'SELECT_END_VERSE',
        payload: { verse: 5 },
      });
      expect(state.selectedVerseEnd).toBe(5);
    });

    test('STEP_BACK traverses up the selection hierarchy properly', () => {
      const romans = findCanonicalBook('Romans')!;
      let state = passagePickerReducer(initialPickerState, {
        type: 'SELECT_BOOK',
        payload: { book: romans },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_START_CHAPTER',
        payload: { chapter: 8 },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_START_VERSE',
        payload: { verse: 1 },
      });
      expect(state.step).toBe('end_verse');

      // Step back from end_verse (same chapter) -> start_verse
      state = passagePickerReducer(state, { type: 'STEP_BACK' });
      expect(state.step).toBe('start_verse');

      // Step back from start_verse (multi chapter) -> start_chapter
      state = passagePickerReducer(state, { type: 'STEP_BACK' });
      expect(state.step).toBe('start_chapter');

      // Step back from start_chapter -> book
      state = passagePickerReducer(state, { type: 'STEP_BACK' });
      expect(state.step).toBe('book');

      // For single chapter book (Jude)
      const jude = findCanonicalBook('Jude')!;
      state = passagePickerReducer(initialPickerState, {
        type: 'SELECT_BOOK',
        payload: { book: jude },
      });
      expect(state.step).toBe('start_verse');
      state = passagePickerReducer(state, { type: 'STEP_BACK' });
      expect(state.step).toBe('book');
    });

    test('ADD_SEGMENT stages compound segment and resets current selection', () => {
      const segment = {
        book: 'Romans',
        startChapter: 8,
        startVerse: 1,
        endChapter: 8,
        endVerse: 11,
      };
      let state = passagePickerReducer(initialPickerState, {
        type: 'ADD_SEGMENT',
        payload: { segment },
      });
      expect(state.segments.length).toBe(1);
      expect(state.segments[0]).toEqual(segment);
      expect(state.step).toBe('book');
      expect(state.selectedBook).toBeNull();
      expect(state.selectedChapter).toBeNull();
      expect(state.searchQuery).toBe('');

      // Remove segment
      state = passagePickerReducer(state, {
        type: 'REMOVE_SEGMENT',
        payload: { index: 0 },
      });
      expect(state.segments.length).toBe(0);
    });

    test('SET_SEARCH_QUERY parses smart reference string into selections', () => {
      const state = passagePickerReducer(initialPickerState, {
        type: 'SET_SEARCH_QUERY',
        payload: { query: 'John 3:16' },
      });
      expect(state.selectedBook).toBe('John');
      expect(state.selectedChapter).toBe(3);
      expect(state.selectedVerseStart).toBe(16);
      expect(state.selectedVerseEnd).toBe(16);
    });

    test('SET_SEARCH_QUERY auto-stages prior manual selection and preserves existing segments', () => {
      // Simulate user manually selected Romans 8:1-11
      const stateWithManual: typeof initialPickerState = {
        ...initialPickerState,
        selectedBook: 'Romans',
        selectedChapter: 8,
        selectedChapterEnd: 8,
        selectedVerseStart: 1,
        selectedVerseEnd: 11,
        searchQuery: '',
        segments: [],
      };

      // User starts typing "1 Cor 13" in search
      const s1 = passagePickerReducer(stateWithManual, {
        type: 'SET_SEARCH_QUERY',
        payload: { query: '1 Cor 13' },
      });

      // Prior manual selection should be auto-staged into segments
      expect(s1.segments.length).toBe(1);
      expect(s1.segments[0]).toEqual({
        book: 'Romans',
        startChapter: 8,
        endChapter: 8,
        startVerse: 1,
        endVerse: 11,
      });

      // Active draft should be the newly typed passage
      expect(s1.selectedBook).toBe('1 Corinthians');
      expect(s1.selectedChapter).toBe(13);
      expect(s1.searchQuery).toBe('1 Cor 13');

      // Continuing to type in the same search session should update draft without duplicating segments
      const s2 = passagePickerReducer(s1, {
        type: 'SET_SEARCH_QUERY',
        payload: { query: '1 Cor 13:4-8' },
      });
      expect(s2.segments.length).toBe(1);
      expect(s2.selectedBook).toBe('1 Corinthians');
      expect(s2.selectedVerseStart).toBe(4);
      expect(s2.selectedVerseEnd).toBe(8);
    });

    test('SELECT_RANGE_VERSE two-tap builds a range in either direction, then starts over', () => {
      const romans = findCanonicalBook('Romans')!;
      let state = passagePickerReducer(initialPickerState, {
        type: 'SELECT_BOOK',
        payload: { book: romans },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_START_CHAPTER',
        payload: { chapter: 8 },
      });

      state = passagePickerReducer(state, {
        type: 'SELECT_RANGE_VERSE',
        payload: { verse: 14 },
      });
      expect(state.verseAnchor).toBe(14);
      expect(state.selectedVerseStart).toBe(14);
      expect(state.selectedVerseEnd).toBe(14);

      state = passagePickerReducer(state, {
        type: 'SELECT_RANGE_VERSE',
        payload: { verse: 10 },
      });
      expect(state.verseAnchor).toBeNull();
      expect(state.selectedVerseStart).toBe(10);
      expect(state.selectedVerseEnd).toBe(14);

      state = passagePickerReducer(state, {
        type: 'SELECT_RANGE_VERSE',
        payload: { verse: 28 },
      });
      expect(state.verseAnchor).toBe(28);
      expect(state.selectedVerseStart).toBe(28);
      expect(state.selectedVerseEnd).toBe(28);
    });

    test('SELECT_START_CHAPTER keeps a finished range when a different chapter is opened', () => {
      const withDraft: typeof initialPickerState = {
        ...initialPickerState,
        selectedBook: 'Romans',
        selectedChapter: 8,
        selectedChapterEnd: 8,
        selectedVerseStart: 1,
        selectedVerseEnd: 11,
        step: 'end_verse',
      };

      const state = passagePickerReducer(withDraft, {
        type: 'SELECT_START_CHAPTER',
        payload: { chapter: 9 },
      });

      expect(state.segments).toEqual([
        { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 11 },
      ]);
      expect(state.selectedChapter).toBe(9);
      expect(state.selectedVerseStart).toBeNull();
      expect(state.step).toBe('start_verse');
    });

    test('tapping the open book collapses its chapter grid', () => {
      const romans = findCanonicalBook('Romans')!;
      let state = passagePickerReducer(initialPickerState, {
        type: 'SELECT_BOOK',
        payload: { book: romans },
      });
      expect(state.expandedBook).toBe('Romans');
      expect(state.step).toBe('start_chapter');

      state = passagePickerReducer(state, {
        type: 'SELECT_BOOK',
        payload: { book: romans },
      });
      expect(state.expandedBook).toBeNull();
      expect(state.step).toBe('book');
      expect(state.selectedBook).toBe('Romans');
    });

    test('SELECT_BOOK keeps a finished draft when a different book is opened', () => {
      const john = findCanonicalBook('John')!;
      const withDraft: typeof initialPickerState = {
        ...initialPickerState,
        selectedBook: 'Romans',
        selectedChapter: 8,
        selectedChapterEnd: 8,
        selectedVerseStart: 1,
        selectedVerseEnd: 11,
        step: 'end_verse',
      };

      const state = passagePickerReducer(withDraft, {
        type: 'SELECT_BOOK',
        payload: { book: john },
      });

      expect(state.segments).toEqual([
        { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 11 },
      ]);
      expect(state.selectedBook).toBe('John');
      expect(state.selectedVerseStart).toBeNull();
      expect(state.step).toBe('start_chapter');
    });

    test('MOVE_SEGMENT reorders passages and follows an in-progress edit', () => {
      let state: typeof initialPickerState = {
        ...initialPickerState,
        segments: [
          { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 11 },
          { book: 'John', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 },
        ],
        editingIndex: 1,
      };

      state = passagePickerReducer(state, {
        type: 'MOVE_SEGMENT',
        payload: { index: 1, direction: 'up' },
      });

      expect(state.segments.map((segment) => segment.book)).toEqual(['John', 'Romans']);
      expect(state.editingIndex).toBe(0);

      state = passagePickerReducer(state, {
        type: 'MOVE_SEGMENT',
        payload: { index: 0, direction: 'up' },
      });
      expect(state.segments.map((segment) => segment.book)).toEqual(['John', 'Romans']);
    });

    test('START_EDIT loads a passage and SAVE_EDIT replaces it', () => {
      let state: typeof initialPickerState = {
        ...initialPickerState,
        segments: [
          { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 39 },
        ],
      };

      state = passagePickerReducer(state, {
        type: 'START_EDIT',
        payload: { index: 0 },
      });
      expect(state.editingIndex).toBe(0);
      expect(state.step).toBe('end_verse');
      expect(state.selectedBook).toBe('Romans');
      expect(state.selectedVerseStart).toBe(1);

      state = passagePickerReducer(state, {
        type: 'SELECT_RANGE_VERSE',
        payload: { verse: 14 },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_RANGE_VERSE',
        payload: { verse: 18 },
      });
      state = passagePickerReducer(state, { type: 'SAVE_EDIT' });

      expect(state.editingIndex).toBeNull();
      expect(state.segments).toEqual([
        { book: 'Romans', startChapter: 8, startVerse: 14, endChapter: 8, endVerse: 18 },
      ]);
      expect(state.selectedBook).toBeNull();
      expect(state.step).toBe('book');
    });

    test('CANCEL_EDIT drops the draft and leaves committed passages in place', () => {
      let state: typeof initialPickerState = {
        ...initialPickerState,
        segments: [
          { book: 'John', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 },
        ],
      };
      state = passagePickerReducer(state, {
        type: 'START_EDIT',
        payload: { index: 0 },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_RANGE_VERSE',
        payload: { verse: 16 },
      });
      state = passagePickerReducer(state, {
        type: 'SELECT_RANGE_VERSE',
        payload: { verse: 18 },
      });
      state = passagePickerReducer(state, { type: 'CANCEL_EDIT' });

      expect(state.segments).toEqual([
        { book: 'John', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 },
      ]);
      expect(state.editingIndex).toBeNull();
      expect(state.selectedBook).toBeNull();
    });
  });
});

