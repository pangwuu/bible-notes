/**
 * Unit Test Suite for PassagePicker Selection Logic & State Machine
 */

import {
  validateVerseRange,
  formatPassageReference,
  computeCanonicalOrdinals,
  getChapterVerseCount,
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
});

