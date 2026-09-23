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
});
