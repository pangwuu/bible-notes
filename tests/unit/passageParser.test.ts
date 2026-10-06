import {
  parsePassageReferenceString,
  formatCompoundDisplay,
  createPassageReference,
  splitSegmentByChapters,
} from '../../src/utils/passageParser';

describe('passageParser', () => {
  describe('Single passage parsing', () => {
    it('parses single verse (John 3:16)', () => {
      const segments = parsePassageReferenceString('John 3:16');
      expect(segments).toHaveLength(1);
      expect(segments[0]).toMatchObject({
        book: 'John',
        startChapter: 3,
        startVerse: 16,
        endChapter: 3,
        endVerse: 16,
      });
    });

    it('parses verse range within a chapter (Romans 8:1-11)', () => {
      const segments = parsePassageReferenceString('Romans 8:1–11');
      expect(segments).toHaveLength(1);
      expect(segments[0]).toMatchObject({
        book: 'Romans',
        startChapter: 8,
        startVerse: 1,
        endChapter: 8,
        endVerse: 11,
      });
    });
  });

  describe('Cross-chapter parsing', () => {
    it('decomposes cross-chapter verse range (Romans 7:21-8:4) into individual chapter segments', () => {
      const segments = parsePassageReferenceString('Romans 7:21-8:4');
      expect(segments).toHaveLength(2);
      expect(segments[0]).toMatchObject({
        book: 'Romans',
        startChapter: 7,
        startVerse: 21,
        endChapter: 7,
        endVerse: 25,
      });
      expect(segments[1]).toMatchObject({
        book: 'Romans',
        startChapter: 8,
        startVerse: 1,
        endChapter: 8,
        endVerse: 4,
      });
      expect(formatCompoundDisplay(segments)).toBe('Romans 7:21–25, Romans 8:1–4');
    });

    it('decomposes whole chapter range (Hebrews 5-6) into individual chapters', () => {
      const segments = parsePassageReferenceString('Hebrews 5-6');
      expect(segments).toHaveLength(2);
      expect(segments[0]).toMatchObject({
        book: 'Hebrews',
        startChapter: 5,
        startVerse: 1,
        endChapter: 5,
        endVerse: 14,
      });
      expect(segments[1]).toMatchObject({
        book: 'Hebrews',
        startChapter: 6,
        startVerse: 1,
        endChapter: 6,
        endVerse: 20,
      });
      expect(formatCompoundDisplay(segments)).toBe('Hebrews 5, Hebrews 6');
    });

    it('decomposes whole chapter range (1 John 1-2)', () => {
      const segments = parsePassageReferenceString('1 John 1-2');
      expect(segments).toHaveLength(2);
      expect(segments[0]).toMatchObject({
        book: '1 John',
        startChapter: 1,
        startVerse: 1,
        endChapter: 1,
        endVerse: 10, // 1 John ch 1 has 10 verses
      });
      expect(segments[1]).toMatchObject({
        book: '1 John',
        startChapter: 2,
        startVerse: 1,
        endChapter: 2,
        endVerse: 29, // 1 John ch 2 has 29 verses
      });
      expect(formatCompoundDisplay(segments)).toBe('1 John 1, 1 John 2');
    });

    it('parses single whole chapter (1 John 1)', () => {
      const segments = parsePassageReferenceString('1 John 1');
      expect(segments).toHaveLength(1);
      expect(segments[0]).toMatchObject({
        book: '1 John',
        startChapter: 1,
        startVerse: 1,
        endChapter: 1,
        endVerse: 10, // 1 John ch 1 has 10 verses
      });
      expect(formatCompoundDisplay(segments)).toBe('1 John 1');
    });

    it('decomposes span across 3+ chapters (Genesis 1-3)', () => {
      const segments = parsePassageReferenceString('Genesis 1-3');
      expect(segments).toHaveLength(3);
      expect(segments[0]).toMatchObject({ book: 'Genesis', startChapter: 1, endChapter: 1, startVerse: 1, endVerse: 31 });
      expect(segments[1]).toMatchObject({ book: 'Genesis', startChapter: 2, endChapter: 2, startVerse: 1, endVerse: 25 });
      expect(segments[2]).toMatchObject({ book: 'Genesis', startChapter: 3, endChapter: 3, startVerse: 1, endVerse: 24 });
      expect(formatCompoundDisplay(segments)).toBe('Genesis 1, Genesis 2, Genesis 3');
    });
  });

  describe('Compound / split passages', () => {
    it('parses split chapters within same book (Genesis 1:1-3, 3:2-6)', () => {
      const segments = parsePassageReferenceString('Genesis 1:1-3, 3:2-6');
      expect(segments).toHaveLength(2);
      expect(segments[0]).toMatchObject({
        book: 'Genesis',
        startChapter: 1,
        startVerse: 1,
        endChapter: 1,
        endVerse: 3,
      });
      expect(segments[1]).toMatchObject({
        book: 'Genesis',
        startChapter: 3,
        startVerse: 2,
        endChapter: 3,
        endVerse: 6,
      });
      expect(formatCompoundDisplay(segments)).toBe('Genesis 1:1–3, 3:2–6');
    });

    it('parses multi-book compound passages (Ephesians 2:10-13, Romans 8:28)', () => {
      const segments = parsePassageReferenceString('Ephesians 2:10-13, Romans 8:28');
      expect(segments).toHaveLength(2);
      expect(segments[0]).toMatchObject({
        book: 'Ephesians',
        startChapter: 2,
        startVerse: 10,
        endChapter: 2,
        endVerse: 13,
      });
      expect(segments[1]).toMatchObject({
        book: 'Romans',
        startChapter: 8,
        startVerse: 28,
        endChapter: 8,
        endVerse: 28,
      });
      expect(formatCompoundDisplay(segments)).toBe('Ephesians 2:10–13, Romans 8:28');
    });

    it('creates complete PassageReference with books and segments', () => {
      const segments = parsePassageReferenceString('Genesis 1:1-3, 3:2-6');
      const passageRef = createPassageReference(segments);
      expect(passageRef.books).toEqual(['Genesis']);
      expect(passageRef.segments).toHaveLength(2);
      expect(passageRef.display).toBe('Genesis 1:1–3, 3:2–6');
    });

    it('parses and formats split verses within the same chapter (Matthew 1:1, 3)', () => {
      const segments = parsePassageReferenceString('Matthew 1:1, 3');
      expect(segments).toHaveLength(2);
      expect(segments[0]).toMatchObject({
        book: 'Matthew',
        startChapter: 1,
        startVerse: 1,
        endChapter: 1,
        endVerse: 1,
      });
      expect(segments[1]).toMatchObject({
        book: 'Matthew',
        startChapter: 1,
        startVerse: 3,
        endChapter: 1,
        endVerse: 3,
      });
      expect(formatCompoundDisplay(segments)).toBe('Matthew 1:1, 3');
    });
  });

  describe('buildSegment defensive clamping', () => {
    it('defensively clamps chapters and verses out of range', () => {
      const { buildSegment } = require('../../src/utils/passageParser');
      // Jude has 1 chapter, 25 verses
      const seg = buildSegment('Jude', 0, 0, 99, 999);
      expect(seg.book).toBe('Jude');
      expect(seg.startChapter).toBe(1);
      expect(seg.startVerse).toBe(1);
      expect(seg.endChapter).toBe(1);
      expect(seg.endVerse).toBe(25);
    });
  });

  describe('splitSegmentByChapters', () => {
    it('returns single-chapter segment as-is', () => {
      const seg = { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 11 };
      const res = splitSegmentByChapters(seg);
      expect(res).toHaveLength(1);
      expect(res[0]).toEqual(seg);
    });

    it('splits cross-chapter verse segment (Hebrews 5:11-6:12)', () => {
      const seg = { book: 'Hebrews', startChapter: 5, startVerse: 11, endChapter: 6, endVerse: 12 };
      const res = splitSegmentByChapters(seg);
      expect(res).toHaveLength(2);
      expect(res[0]).toEqual({
        book: 'Hebrews',
        startChapter: 5,
        startVerse: 11,
        endChapter: 5,
        endVerse: 14, // Hebrews 5 has 14 verses
      });
      expect(res[1]).toEqual({
        book: 'Hebrews',
        startChapter: 6,
        startVerse: 1,
        endChapter: 6,
        endVerse: 12,
      });
    });

    it('splits 3-chapter span (Genesis 1:26-3:5)', () => {
      const seg = { book: 'Genesis', startChapter: 1, startVerse: 26, endChapter: 3, endVerse: 5 };
      const res = splitSegmentByChapters(seg);
      expect(res).toHaveLength(3);
      expect(res[0]).toEqual({ book: 'Genesis', startChapter: 1, startVerse: 26, endChapter: 1, endVerse: 31 });
      expect(res[1]).toEqual({ book: 'Genesis', startChapter: 2, startVerse: 1, endChapter: 2, endVerse: 25 });
      expect(res[2]).toEqual({ book: 'Genesis', startChapter: 3, startVerse: 1, endChapter: 3, endVerse: 5 });
    });

    it('decomposes cross-chapter segments in createPassageReference', () => {
      const seg = { book: 'Hebrews', startChapter: 5, startVerse: 1, endChapter: 6, endVerse: 20 };
      const passageRef = createPassageReference([seg]);
      expect(passageRef.segments).toHaveLength(2);
      expect(passageRef.segments[0]).toMatchObject({ book: 'Hebrews', startChapter: 5, startVerse: 1, endChapter: 5, endVerse: 14 });
      expect(passageRef.segments[1]).toMatchObject({ book: 'Hebrews', startChapter: 6, startVerse: 1, endChapter: 6, endVerse: 20 });
      expect(passageRef.display).toBe('Hebrews 5, Hebrews 6');
    });
  });
});
