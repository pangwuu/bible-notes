import { alignSectionsForCompare, getComparableSections } from '../../src/utils/noteCompare';
import type { Note } from '../../src/types/note';

const baseNote = {
  id: 'n1',
  userId: 'u1',
  user_id: 'u1',
  passage: {
    display: 'John 3:16',
    books: ['John'],
    segments: [
      { book: 'John', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 },
    ],
  },
  lightContent: '',
  questionContent: '',
  arrowContent: '',
  content: '',
  tags: [],
  visibility: 'friends' as const,
  createdAt: 1,
  updatedAt: 1,
  created_at: 1,
  updated_at: 1,
};

describe('noteCompare utils', () => {
  test('getComparableSections prefers dynamic sections', () => {
    const note = {
      ...baseNote,
      sections: [
        { id: 'a', title: 'Key Idea', content: ' Insight ' },
        { id: 'b', title: 'Question', content: '' },
      ],
    } as Note;

    const sections = getComparableSections(note);
    expect(sections).toHaveLength(2);
    expect(sections[0].content).toBe('Insight');
  });

  test('getComparableSections falls back to Swedish fields', () => {
    const note = {
      ...baseNote,
      lightContent: 'Light',
      questionContent: 'Q',
      arrowContent: 'A',
      sections: [],
    } as Note;

    const sections = getComparableSections(note);
    expect(sections.map((s) => s.title)).toEqual(['Key Idea', 'Question', 'Application']);
  });

  test('alignSectionsForCompare pairs matching titles and keeps unmatched', () => {
    const rows = alignSectionsForCompare(
      [
        { id: '1', title: 'Key Idea', content: 'Mine' },
        { id: '2', title: 'Application', content: 'Do this' },
      ],
      [
        { id: 'a', title: 'Key Idea', content: 'Theirs' },
        { id: 'b', title: 'Question', content: 'Why?' },
      ]
    );

    expect(rows).toEqual([
      {
        title: 'Key Idea',
        mine: { id: '1', title: 'Key Idea', content: 'Mine' },
        theirs: { id: 'a', title: 'Key Idea', content: 'Theirs' },
      },
      {
        title: 'Application',
        mine: { id: '2', title: 'Application', content: 'Do this' },
      },
      {
        title: 'Question',
        theirs: { id: 'b', title: 'Question', content: 'Why?' },
      },
    ]);
  });
});
