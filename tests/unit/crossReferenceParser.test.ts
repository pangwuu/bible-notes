import {
  parseReference,
  isInTab,
  extractCrossReferences,
  formatMarkdownCrossReferences,
} from '../../src/utils/crossReferenceParser';
import { PassageReference } from '../../src/types/note';

describe('crossReferenceParser', () => {
  describe('parseReference - Acceptable references', () => {
    it('accepts [Matt 1:1-3]', () => {
      const res = parseReference('[Matt 1:1-3]');
      expect(res.type).toBe('simple');
      expect(res.segments).toHaveLength(1);
      expect(res.segments[0]).toEqual({
        book: 'Matthew',
        chapter: 1,
        verses: [1, 2, 3],
        startVerse: 1,
        endVerse: 3,
      });
    });

    it('accepts [Matt 1:3]', () => {
      const res = parseReference('[Matt 1:3]');
      expect(res.type).toBe('simple');
      expect(res.segments[0]).toEqual({
        book: 'Matthew',
        chapter: 1,
        verses: [3],
        startVerse: 3,
        endVerse: 3,
      });
    });

    it('accepts [Song 1:4] (alias for Song of Solomon)', () => {
      const res = parseReference('[Song 1:4]');
      expect(res.type).toBe('simple');
      expect(res.segments[0].book).toBe('Song of Solomon');
      expect(res.segments[0].chapter).toBe(1);
      expect(res.segments[0].verses).toEqual([4]);
    });

    it('accepts [Matt 1:1-3, 5, 6-7, 13]', () => {
      const res = parseReference('[Matt 1:1-3, 5, 6-7, 13]');
      expect(res.type).toBe('simple');
      expect(res.segments[0].verses).toEqual([1, 2, 3, 5, 6, 7, 13]);
      expect(res.segments[0].startVerse).toBe(1);
      expect(res.segments[0].endVerse).toBe(13);
    });

    it('accepts single-chapter books with explicit chapter 1: [Philemon 1:13] and [Jude 1:1]', () => {
      const phil = parseReference('[Philemon 1:13]');
      expect(phil.type).toBe('simple');
      expect(phil.segments[0].book).toBe('Philemon');
      expect(phil.segments[0].chapter).toBe(1);
      expect(phil.segments[0].verses).toEqual([13]);

      const jude = parseReference('[Jude 1:1]');
      expect(jude.type).toBe('simple');
      expect(jude.segments[0].book).toBe('Jude');
      expect(jude.segments[0].chapter).toBe(1);
      expect(jude.segments[0].verses).toEqual([1]);
    });

    it('accepts degenerate ranges like [Luke 1:3-3]', () => {
      const res = parseReference('[Luke 1:3-3]');
      expect(res.type).toBe('simple');
      expect(res.segments[0].verses).toEqual([3]);
      expect(res.segments[0].startVerse).toBe(3);
      expect(res.segments[0].endVerse).toBe(3);
    });

    it('accepts en-dash in ranges like [Matt 1:1–3]', () => {
      const res = parseReference('[Matt 1:1–3]');
      expect(res.type).toBe('simple');
      expect(res.segments[0].verses).toEqual([1, 2, 3]);
    });

    it('accepts compound multi-book/multi-chapter lists: [Matt 1:1-3, 5, 6-7, 13; Luke 1:1-3]', () => {
      const res = parseReference('[Matt 1:1-3, 5, 6-7, 13; Luke 1:1-3]');
      expect(res.type).toBe('compound');
      expect(res.segments).toHaveLength(2);
      expect(res.segments[0].book).toBe('Matthew');
      expect(res.segments[0].verses).toEqual([1, 2, 3, 5, 6, 7, 13]);
      expect(res.segments[1].book).toBe('Luke');
      expect(res.segments[1].chapter).toBe(1);
      expect(res.segments[1].verses).toEqual([1, 2, 3]);
    });

    it('accepts same-book shorthand across chapters: [Matt 1:1; 2:3]', () => {
      const res = parseReference('[Matt 1:1; 2:3]');
      expect(res.type).toBe('compound');
      expect(res.segments).toHaveLength(2);
      expect(res.segments[0].book).toBe('Matthew');
      expect(res.segments[0].chapter).toBe(1);
      expect(res.segments[1].book).toBe('Matthew');
      expect(res.segments[1].chapter).toBe(2);
      expect(res.segments[1].verses).toEqual([3]);
    });

    it('accepts flexible spacing around commas and inside brackets: [Phil 3:13,   14-16, 17-17]', () => {
      const res = parseReference('[Phil 3:13,   14-16, 17-17]');
      expect(res.type).toBe('simple');
      expect(res.segments[0].book).toBe('Philippians');
      expect(res.segments[0].chapter).toBe(3);
      expect(res.segments[0].verses).toEqual([13, 14, 15, 16, 17]);
    });
  });

  describe('parseReference - Numbers and Boundaries edge cases', () => {
    it('validates exact boundary verse counts', () => {
      // Luke chapter 1 has 80 verses
      expect(parseReference('[Luke 1:80]').type).toBe('simple');
      expect(parseReference('[Luke 1:81]').type).toBe('invalid');

      // Matthew chapter 1 has 25 verses
      expect(parseReference('[Matt 1:25]').type).toBe('simple');
      expect(parseReference('[Matt 1:26]').type).toBe('invalid');

      // Jude has 25 verses
      expect(parseReference('[Jude 1:25]').type).toBe('simple');
      expect(parseReference('[Jude 1:26]').type).toBe('invalid');
    });

    it('rejects nonexistent chapters in books', () => {
      // Luke has 24 chapters
      expect(parseReference('[Luke 24:53]').type).toBe('simple');
      expect(parseReference('[Luke 25:1]').type).toBe('invalid');
      expect(parseReference('[Jude 2:13]').type).toBe('invalid');
    });

    it('rejects zero and negative values', () => {
      expect(parseReference('[Luke 1:0]').type).toBe('invalid');
      expect(parseReference('[Luke 0:1]').type).toBe('invalid');
      expect(parseReference('[Luke 1:0-3]').type).toBe('invalid');
      expect(parseReference('[Luke 1:-1000]').type).toBe('invalid');
    });

    it('rejects leading zeros', () => {
      expect(parseReference('[Luke 1:01]').type).toBe('invalid');
      expect(parseReference('[Luke 01:1]').type).toBe('invalid');
    });

    it('rejects non-integers, scientific notation, hex, signs, and non-numeric', () => {
      expect(parseReference('[Luke 1:3.5]').type).toBe('invalid');
      expect(parseReference('[Luke 1:+3]').type).toBe('invalid');
      expect(parseReference('[Luke 1:3e2]').type).toBe('invalid');
      expect(parseReference('[Luke 1:0x10]').type).toBe('invalid');
      expect(parseReference('[Luke 1:abc]').type).toBe('invalid');
      expect(parseReference('[Luke 1:10000]').type).toBe('invalid');
    });

    it('rejects full-width Unicode digits', () => {
      expect(parseReference('[Luke １:１]').type).toBe('invalid');
    });
  });

  describe('parseReference - Compound lists ordering & malformed syntax', () => {
    it('rejects reversed ranges', () => {
      expect(parseReference('[Luke 1:9-8]').type).toBe('invalid');
      expect(parseReference('[Matt 1:1-3, 7-5]').type).toBe('invalid');
    });

    it('rejects out-of-order parts', () => {
      expect(parseReference('[Matt 1:13, 5]').type).toBe('invalid');
    });

    it('rejects overlapping or duplicate parts', () => {
      expect(parseReference('[Matt 1:1-3, 2]').type).toBe('invalid');
      expect(parseReference('[Matt 1:1, 1]').type).toBe('invalid');
    });

    it('rejects malformed commas (trailing, leading, empty)', () => {
      expect(parseReference('[Matt 1:1,]').type).toBe('invalid');
      expect(parseReference('[Matt 1:1,,3]').type).toBe('invalid');
      expect(parseReference('[, Matt 1:1]').type).toBe('invalid');
    });

    it('rejects compound references when one part is invalid (all-or-nothing)', () => {
      expect(parseReference('[Matt 1:1-3, 99]').type).toBe('invalid');
      expect(parseReference('[Matt 1:1; Luke 99:1]').type).toBe('invalid');
    });
  });

  describe('parseReference - Book names and format strictness', () => {
    it('supports case insensitivity for book names', () => {
      expect(parseReference('[matt 1:1]').type).toBe('simple');
      expect(parseReference('[MATT 1:1]').type).toBe('simple');
      expect(parseReference('[MaTt 1:1]').type).toBe('simple');
    });

    it('supports aliases and numbered books', () => {
      expect(parseReference('[Song of Songs 1:4]').type).toBe('simple');
      expect(parseReference('[Song of Solomon 1:4]').type).toBe('simple');
      expect(parseReference('[Psalm 23:1]').type).toBe('simple');
      expect(parseReference('[Psalms 23:1]').type).toBe('simple');
      expect(parseReference('[1 Cor 13:4]').type).toBe('simple');
      expect(parseReference('[1Cor 13:4]').type).toBe('simple');
      expect(parseReference('[I Cor 13:4]').type).toBe('simple');
    });

    it('strictly requires chapter number: rejects [Philemon 13] and whole-book [Luke 16]', () => {
      expect(parseReference('[Philemon 13]').type).toBe('invalid');
      expect(parseReference('[Jude 13]').type).toBe('invalid');
      expect(parseReference('[Luke 16]').type).toBe('invalid');
    });

    it('rejects unknown books', () => {
      expect(parseReference('[Foo 1:1]').type).toBe('invalid');
    });

    it('rejects chapter-relative legacy tags like [v. 3]', () => {
      expect(parseReference('[v. 3]').type).toBe('invalid');
      expect(parseReference('[v. 1-3]').type).toBe('invalid');
    });
  });

  describe('parseReference - Whitespace, punctuation & dashes', () => {
    it('rejects alternative separators like period or European comma', () => {
      expect(parseReference('[Matt 1.1]').type).toBe('invalid');
      expect(parseReference('[Matt 1,1]').type).toBe('invalid');
    });

    it('rejects em-dash', () => {
      expect(parseReference('[Matt 1:1—3]').type).toBe('invalid');
    });
  });

  describe('Bracket parsing & extraction', () => {
    it('ignores non-scripture bracket text', () => {
      expect(parseReference('[sic]').type).toBe('invalid');
      expect(parseReference('[1, 2, 3]').type).toBe('invalid');
      expect(parseReference('[ ]').type).toBe('invalid');
      expect(parseReference('[x]').type).toBe('invalid');
      expect(parseReference('[^1]').type).toBe('invalid');
    });

    it('extracts valid references from markdown without hijacking markdown links or inline code', () => {
      const text = 'See [Matt 1:1-3] and also [Luke 1:10000] and `[Matt 1:5]` and [link](https://bible.com) and [Matt 2:1][Matt 2:2]';
      const extracted = extractCrossReferences(text);
      expect(extracted).toHaveLength(3);
      expect(extracted[0].raw).toBe('[Matt 1:1-3]');
      expect(extracted[1].raw).toBe('[Matt 2:1]');
      expect(extracted[2].raw).toBe('[Matt 2:2]');
    });

    it('ignores escaped brackets', () => {
      const text = 'Escaped \\[Matt 1:1\\] should not be parsed.';
      const extracted = extractCrossReferences(text);
      expect(extracted).toHaveLength(0);
    });

    it('handles long input without regex backtracking blowups', () => {
      const longList = '[Matt 1:' + Array.from({ length: 25 }, (_, i) => i + 1).join(', ') + ']';
      const res = parseReference(longList);
      expect(res.type).toBe('simple');
      expect(res.segments[0].verses).toHaveLength(25);
    });
  });

  describe('isInTab - BibleReader containment verification', () => {
    const mockTabPassage: PassageReference = {
      display: 'Matthew 1:1-10',
      displayString: 'Matthew 1:1-10',
      books: ['Matthew'],
      segments: [
        {
          book: 'Matthew',
          startChapter: 1,
          startVerse: 1,
          endChapter: 1,
          endVerse: 10,
        },
      ],
    };

    it('returns true when simple reference is fully inside tab passage', () => {
      const parsed = parseReference('[Matt 1:1-3]');
      expect(isInTab(parsed, mockTabPassage)).toBe(true);

      const parsedSingle = parseReference('[Matt 1:5]');
      expect(isInTab(parsedSingle, mockTabPassage)).toBe(true);

      const parsedDiscontinuous = parseReference('[Matt 1:1-3, 5, 7-9]');
      expect(isInTab(parsedDiscontinuous, mockTabPassage)).toBe(true);
    });

    it('returns false when reference is in a different book', () => {
      const parsed = parseReference('[Luke 1:1-3]');
      expect(isInTab(parsed, mockTabPassage)).toBe(false);
    });

    it('returns false when reference is in a different chapter', () => {
      const parsed = parseReference('[Matt 2:1]');
      expect(isInTab(parsed, mockTabPassage)).toBe(false);
    });

    it('returns false on partial overlap (all-or-nothing rule)', () => {
      // verses 5-15, but tab only has 1-10
      const parsed = parseReference('[Matt 1:5-15]');
      expect(isInTab(parsed, mockTabPassage)).toBe(false);

      const parsedWithOutlier = parseReference('[Matt 1:1-3, 12]');
      expect(isInTab(parsedWithOutlier, mockTabPassage)).toBe(false);
    });

    it('returns false for compound multi-chapter/multi-book references', () => {
      const compound = parseReference('[Matt 1:1-3; Luke 1:1-3]');
      expect(isInTab(compound, mockTabPassage)).toBe(false);

      const sameBookCompound = parseReference('[Matt 1:1; 2:3]');
      expect(isInTab(sameBookCompound, mockTabPassage)).toBe(false);
    });

    it('returns false if tab passage is null or undefined', () => {
      const parsed = parseReference('[Matt 1:1-3]');
      expect(isInTab(parsed, null)).toBe(false);
      expect(isInTab(parsed, undefined)).toBe(false);
    });
  });

  describe('formatMarkdownCrossReferences - 3 Rendering Cases', () => {
    const mockTabPassage: PassageReference = {
      display: 'Matthew 1:1-10',
      displayString: 'Matthew 1:1-10',
      books: ['Matthew'],
      segments: [
        {
          book: 'Matthew',
          startChapter: 1,
          startVerse: 1,
          endChapter: 1,
          endVerse: 10,
        },
      ],
    };

    it('Case 1 (Invalid): leaves invalid reference as plain text', () => {
      const input = 'Check out [Luke 1:10000] and [Luke 1:9-8] and [Philemon 13].';
      const output = formatMarkdownCrossReferences(input, mockTabPassage);
      expect(output).toBe('Check out [Luke 1:10000] and [Luke 1:9-8] and [Philemon 13].');
    });

    it('Case 2 (Valid, NOT in tab): formats cross ref tag with inTab=0', () => {
      const input = 'Compare with [Luke 1:1-3].';
      const output = formatMarkdownCrossReferences(input, mockTabPassage);
      expect(output).toContain('(verse:Luke:1:1-3?inTab=0)');
      expect(output).toContain('[Luke 1:1-3]');
    });

    it('Case 3 (Valid, IN tab): formats cross ref tag with inTab=1', () => {
      const input = 'Notice [Matt 1:1-3] in this chapter.';
      const output = formatMarkdownCrossReferences(input, mockTabPassage);
      expect(output).toContain('(verse:Matthew:1:1-3?inTab=1)');
      expect(output).toContain('[Matt 1:1-3]');
    });
  });
});
