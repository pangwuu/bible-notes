import { parsePassageReferenceString, formatCompoundDisplay, createPassageReference } from '../../src/utils/passageParser';

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
    it('parses cross-chapter verse range (Romans 7:21-8:4)', () => {
      const segments = parsePassageReferenceString('Romans 7:21-8:4');
      expect(segments).toHaveLength(1);
      expect(segments[0]).toMatchObject({
        book: 'Romans',
        startChapter: 7,
        startVerse: 21,
        endChapter: 8,
        endVerse: 4,
      });
    });

    it('parses whole chapter range (1 John 1-2)', () => {
      const segments = parsePassageReferenceString('1 John 1-2');
      expect(segments).toHaveLength(1);
      expect(segments[0]).toMatchObject({
        book: '1 John',
        startChapter: 1,
        startVerse: 1,
        endChapter: 2,
        endVerse: 29, // 1 John ch 2 has 29 verses
      });
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
  });

  describe('buildSegment defensive clamping', () => {
    it('defensively clamps out-of-bounds verse [1, 66] on chapters with fewer verses (e.g. Romans 8:39)', () => {
      const { buildSegment } = require('../../src/utils/passageParser');
      // Romans 8 has 39 verses. Attempting [1, 66] should not throw and should clamp endVerse to 39.
      expect(() => {
        const seg = buildSegment('Romans', 8, 1, 8, 66);
        expect(seg.book).toBe('Romans');
        expect(seg.startChapter).toBe(8);
        expect(seg.startVerse).toBe(1);
        expect(seg.endChapter).toBe(8);
        expect(seg.endVerse).toBe(39);
      }).not.toThrow();
    });

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
});
