import {
  extractVerseReferences,
  formatVerseReferenceTag,
  formatVerseRangeLabel,
  buildLinkedVerseMap,
  extractVerseRangeText,
  getLinkedSectionsForVerses,
} from '../../src/utils/verseLinkUtils';
import { noteDocumentToNote } from '../../src/types/note';

describe('verseLinkUtils', () => {
  describe('extractVerseReferences', () => {
    it('extracts single verse tags like [v. 5]', () => {
      const text = 'Here is a note with reference [v. 5] and some other text';
      const refs = extractVerseReferences(text);
      expect(refs).toEqual([{ startVerse: 5, endVerse: 5, raw: '[v. 5]' }]);
    });

    it('extracts multi-verse range tags like [v. 12-14] and [v. 3–7]', () => {
      const text = 'Check [v. 12-14] and also [v. 3–7] for context.';
      const refs = extractVerseReferences(text);
      expect(refs).toEqual([
        { startVerse: 12, endVerse: 14, raw: '[v. 12-14]' },
        { startVerse: 3, endVerse: 7, raw: '[v. 3–7]' },
      ]);
    });

    it('extracts canonical verse reference tags like [Matt 1:1] and [Mark 1:1-5]', () => {
      const text = 'Notice [Matt 1:1] and contrast with [Mark 1:1-5] as well as [1 Cor 13:4-7].';
      const refs = extractVerseReferences(text);
      expect(refs).toEqual([
        { raw: '[Matt 1:1]', book: 'Matthew', chapter: 1, startVerse: 1, endVerse: 1 },
        { raw: '[Mark 1:1-5]', book: 'Mark', chapter: 1, startVerse: 1, endVerse: 5 },
        { raw: '[1 Cor 13:4-7]', book: '1 Corinthians', chapter: 13, startVerse: 4, endVerse: 7 },
      ]);
    });

    it('returns empty array when no references exist', () => {
      expect(extractVerseReferences('')).toEqual([]);
      expect(extractVerseReferences('Plain reflection text.')).toEqual([]);
    });
  });

  describe('formatVerseReferenceTag', () => {
    it('formats single verse to [v. N] when no context provided', () => {
      expect(formatVerseReferenceTag([3])).toBe('[v. 3]');
    });

    it('formats consecutive or multi-selected verses to range [v. start-end] when no context provided', () => {
      expect(formatVerseReferenceTag([2, 3, 4])).toBe('[v. 2-4]');
      expect(formatVerseReferenceTag([5, 1])).toBe('[v. 1-5]');
    });

    it('formats canonical single verse with context using common abbreviation [Matt 1:1]', () => {
      expect(formatVerseReferenceTag([1], { book: 'Matthew', chapter: 1 })).toBe('[Matt 1:1]');
      expect(formatVerseReferenceTag([28], { book: 'Romans', chapter: 8 })).toBe('[Rom 8:28]');
    });

    it('formats canonical verse range with context [Mark 1:1-5]', () => {
      expect(formatVerseReferenceTag([1, 2, 3, 4, 5], { book: 'Mark', chapter: 1 })).toBe('[Mark 1:1-5]');
      expect(formatVerseReferenceTag([4, 7], { book: '1 Corinthians', chapter: 13 })).toBe('[1 Cor 13:4-7]');
    });

    it('returns empty string for empty array', () => {
      expect(formatVerseReferenceTag([])).toBe('');
    });
  });

  describe('formatVerseRangeLabel', () => {
    it('formats single verse as v. N when no context', () => {
      expect(formatVerseRangeLabel(4, 4)).toBe('v. 4');
    });

    it('formats range as v. S–E when no context', () => {
      expect(formatVerseRangeLabel(1, 3)).toBe('v. 1–3');
    });

    it('formats canonical single verse with context', () => {
      expect(formatVerseRangeLabel(1, 1, { book: 'Matthew', chapter: 1 })).toBe('Matt 1:1');
    });

    it('formats canonical range with context', () => {
      expect(formatVerseRangeLabel(1, 5, { book: 'Mark', chapter: 1 })).toBe('Mark 1:1–5');
    });
  });

  describe('buildLinkedVerseMap', () => {
    it('maps canonical string coordinates and disambiguates across books', () => {
      const sections = [
        {
          id: 'sec_matt',
          title: 'Matthew Note',
          content: 'Study [Matt 1:1]',
        },
        {
          id: 'sec_mark',
          title: 'Mark Note',
          content: 'Study [Mark 1:1]',
        },
      ];

      const map = buildLinkedVerseMap(sections);

      // Disambiguated canonical coordinates
      expect(map['Matthew:1:1']).toBeDefined();
      expect(map['Matthew:1:1'].primary.sectionId).toBe('sec_matt');

      expect(map['Mark:1:1']).toBeDefined();
      expect(map['Mark:1:1'].primary.sectionId).toBe('sec_mark');

      // They don't overwrite each other in canonical space
      expect(map['Matthew:1:1'].primary.sectionId).not.toBe(map['Mark:1:1'].primary.sectionId);
    });
    it('maps verses from both structured verseReferences and inline text tags', () => {
      const sections = [
        {
          id: 'light',
          title: 'Key Idea',
          content: 'Notice [v. 1-2] here',
          verseReferences: [{ startVerse: 5, endVerse: 6 }],
          color: '#E3A53D',
        },
        {
          id: 'arrow',
          title: 'Application',
          content: 'Living this out in [v. 10]',
          color: '#5C9E7A',
        },
      ];

      const map = buildLinkedVerseMap(sections);

      // Section structured refs: 5, 6
      expect(map[5]).toBeDefined();
      expect(map[5].primary.sectionId).toBe('light');
      expect(map[6]).toBeDefined();
      expect(map[6].primary.sectionId).toBe('light');

      // Section inline refs: 1, 2
      expect(map[1]).toBeDefined();
      expect(map[1].primary.sectionId).toBe('light');
      expect(map[2]).toBeDefined();
      expect(map[2].primary.sectionId).toBe('light');

      // Arrow inline ref: 10
      expect(map[10]).toBeDefined();
      expect(map[10].primary.sectionId).toBe('arrow');
      expect(map[10].primary.sectionTitle).toBe('Application');
    });

    it('collects multiple sections when a verse is referenced in more than one section', () => {
      const sections = [
        {
          id: 'light',
          title: 'Key Idea',
          content: 'Look at [v. 1-3]',
        },
        {
          id: 'question',
          title: 'Question',
          content: 'Why does [v. 1] say this?',
        },
      ];

      const map = buildLinkedVerseMap(sections);
      expect(map[1].allSections.length).toBe(2);
      expect(map[1].allSections.map((s) => s.sectionId)).toEqual(['light', 'question']);
    });
  });

  describe('getLinkedSectionsForVerses', () => {
    it('returns unique deduplicated sections for selected verses', () => {
      const sections = [
        {
          id: 'sec_1',
          title: 'Key Idea',
          content: 'See [v. 1-3]',
        },
        {
          id: 'sec_2',
          title: 'Question',
          content: 'What about [v. 1]?',
        },
      ];
      const map = buildLinkedVerseMap(sections);
      const linked = getLinkedSectionsForVerses([1, 2], map);
      expect(linked.length).toBe(2);
      expect(linked.map((l) => l.sectionId)).toEqual(['sec_1', 'sec_2']);
    });
  });

  describe('extractVerseRangeText', () => {
    const mockVerses = [
      { verseNumber: 1, text: 'First verse text' },
      { verseNumber: 2, text: 'Second verse text' },
      { verseNumber: 3, text: 'Third verse text' },
    ];

    it('extracts exact range text', () => {
      const text = extractVerseRangeText(mockVerses, 1, 2);
      expect(text).toContain('First verse text');
      expect(text).toContain('Second verse text');
      expect(text).not.toContain('Third verse text');
    });

    it('returns empty string if range does not match', () => {
      expect(extractVerseRangeText(mockVerses, 10, 12)).toBe('');
    });
  });

  describe('noteDocumentToNote', () => {
    it('preserves structured verseReferences within sections', () => {
      const rawData = {
        user_id: 'user_1',
        passage: 'John 3:16',
        sections: [
          {
            id: 'light',
            title: 'Key Idea',
            content: 'Great passage',
            verseReferences: [{ startVerse: 16, endVerse: 16 }],
          },
        ],
      };

      const parsed = noteDocumentToNote(rawData, 'note_1');
      expect(parsed.sections).toBeDefined();
      expect(parsed.sections?.[0].verseReferences).toEqual([{ startVerse: 16, endVerse: 16 }]);
    });
  });
});
