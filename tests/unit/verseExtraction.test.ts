import {
  extractVerseReferences,
  syncSectionVerseReferencesFromContent,
  stripVerseTags,
  parseVerseNumbersList,
} from '../../src/utils/verseLinkUtils';
import { NoteSectionValue, PassageReference } from '../../src/types/note';

describe('Verse Cross-Reference Tag Extraction & Section Synchronization', () => {
  describe('extractVerseReferences', () => {
    it('extracts single verse legacy tag: [v. 3]', () => {
      const text = 'Here is a thought [v. 3] about patience.';
      const refs = extractVerseReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        raw: '[v. 3]',
        startVerse: 3,
        endVerse: 3,
      });
    });

    it('extracts verse range legacy tags: [v. 3-5] and en-dash [v. 7–9]', () => {
      const text = 'Range with hyphen [v. 3-5] and en-dash [v. 7–9].';
      const refs = extractVerseReferences(text);
      expect(refs).toHaveLength(2);
      expect(refs[0]).toEqual({
        raw: '[v. 3-5]',
        startVerse: 3,
        endVerse: 5,
      });
      expect(refs[1]).toEqual({
        raw: '[v. 7–9]',
        startVerse: 7,
        endVerse: 9,
      });
    });

    it('extracts non-contiguous compound verse tags: [v. 1-3, 10]', () => {
      const text = 'Key points in [v. 1-3, 10].';
      const refs = extractVerseReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0]).toEqual({
        raw: '[v. 1-3, 10]',
        startVerse: 1,
        endVerse: 10,
        verses: [1, 2, 3, 10],
      });
    });

    it('extracts canonical references: [Rom 8:28] and [1 Cor 13:4-7]', () => {
      const text = 'Paul says in [Rom 8:28] and love in [1 Cor 13:4-7].';
      const refs = extractVerseReferences(text);
      expect(refs).toHaveLength(2);
      expect(refs[0]).toEqual({
        raw: '[Rom 8:28]',
        book: 'Romans',
        chapter: 8,
        startVerse: 28,
        endVerse: 28,
      });
      expect(refs[1]).toEqual({
        raw: '[1 Cor 13:4-7]',
        book: '1 Corinthians',
        chapter: 13,
        startVerse: 4,
        endVerse: 7,
      });
    });

    it('extracts anchor link tags when copy-pasted: [⚓ Rom 8:28](verse:Romans+8:28)', () => {
      const text = 'Copied from another reflection: [⚓ Rom 8:28](verse:Romans+8:28)';
      const refs = extractVerseReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0].book).toBe('Romans');
      expect(refs[0].chapter).toBe(8);
      expect(refs[0].startVerse).toBe(28);
      expect(refs[0].endVerse).toBe(28);
    });

    it('handles text with no references gracefully', () => {
      expect(extractVerseReferences('')).toEqual([]);
      expect(extractVerseReferences('Just ordinary reflection text with no brackets.')).toEqual([]);
      expect(extractVerseReferences('Invalid [brackets] that do not match scripture.')).toEqual([]);
    });
  });

  describe('syncSectionVerseReferencesFromContent', () => {
    const mockPassage: PassageReference = {
      display: 'John 3:1-16',
      displayString: 'John 3:1-16',
      books: ['John'],
      segments: [
        {
          book: 'John',
          startChapter: 3,
          startVerse: 1,
          endChapter: 3,
          endVerse: 16,
        },
      ],
    };

    it('syncs local verse tags using the note passage default book and chapter', () => {
      const sections: NoteSectionValue[] = [
        {
          id: 'sec1',
          title: 'Lightbulb',
          content: 'I noticed this truth in [v. 16] and also [v. 3-5].',
          verseReferences: [],
        },
      ];

      const synced = syncSectionVerseReferencesFromContent(sections, mockPassage);
      expect(synced[0].verseReferences).toHaveLength(2);
      expect(synced[0].verseReferences?.[0]).toEqual({
        book: 'John',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
      });
      expect(synced[0].verseReferences?.[1]).toEqual({
        book: 'John',
        chapter: 3,
        startVerse: 3,
        endVerse: 5,
      });
      // Guarantee no undefined properties exist
      expect(Object.prototype.hasOwnProperty.call(synced[0].verseReferences?.[0], 'verses')).toBe(false);
    });

    it('preserves canonical book and chapter from explicit tags regardless of note passage', () => {
      const sections: NoteSectionValue[] = [
        {
          id: 'sec2',
          title: 'Cross',
          content: 'This links directly to [Romans 8:28].',
          verseReferences: [],
        },
      ];

      const synced = syncSectionVerseReferencesFromContent(sections, mockPassage);
      expect(synced[0].verseReferences).toHaveLength(1);
      expect(synced[0].verseReferences?.[0]).toEqual({
        book: 'Romans',
        chapter: 8,
        startVerse: 28,
        endVerse: 28,
      });
    });

    it('deduplicates duplicate verse tags in the same section', () => {
      const sections: NoteSectionValue[] = [
        {
          id: 'sec3',
          title: 'Arrow',
          content: 'First mention [v. 16], second mention [v. 16].',
          verseReferences: [],
        },
      ];

      const synced = syncSectionVerseReferencesFromContent(sections, mockPassage);
      expect(synced[0].verseReferences).toHaveLength(1);
      expect(synced[0].verseReferences?.[0].startVerse).toBe(16);
    });

    it('clears verseReferences if content no longer contains any verse tags', () => {
      const sections: NoteSectionValue[] = [
        {
          id: 'sec4',
          title: 'Prayer',
          content: 'Deleted the reference from before.',
          verseReferences: [
            {
              book: 'John',
              chapter: 3,
              startVerse: 16,
              endVerse: 16,
            },
          ],
        },
      ];

      const synced = syncSectionVerseReferencesFromContent(sections, mockPassage);
      expect(synced[0].verseReferences).toEqual([]);
    });
  });

  describe('stripVerseTags', () => {
    it('removes tags and leaves surrounding clean prose', () => {
      const text = 'Here is the truth [v. 3] and [Rom 8:28] for today.';
      const stripped = stripVerseTags(text);
      expect(stripped).toBe('Here is the truth  and  for today.');
    });
  });

  describe('parseVerseNumbersList', () => {
    it('parses mixed ranges and discrete numbers into a sorted unique list', () => {
      expect(parseVerseNumbersList('1-3, 5, 8–10')).toEqual([1, 2, 3, 5, 8, 9, 10]);
      expect(parseVerseNumbersList('')).toEqual([]);
    });
  });
});
