import { formatNoteAsMarkdown, getNoteShareTitle } from '../../src/utils/noteExport';

describe('noteExport', () => {
  const basePassage = {
    display: 'John 3:16',
    books: ['John'],
    segments: [
      {
        book: 'John',
        startChapter: 3,
        startVerse: 16,
        endChapter: 3,
        endVerse: 16,
      },
    ],
  };

  test('formatNoteAsMarkdown includes title, passage, template, tags, and sections', () => {
    const md = formatNoteAsMarkdown({
      title: 'Love of God',
      passage: basePassage,
      templateName: 'Swedish Method',
      tags: ['gospel', 'love'],
      sections: [
        { id: 'light', title: 'Key Idea', content: 'God loves the world.' },
        { id: 'question', title: 'Question', content: 'How do I live this out?' },
        { id: 'arrow', title: 'Application', content: 'Share this hope today.' },
      ],
    });

    expect(md).toContain('# Love of God');
    expect(md).toContain('**Passage:** John 3:16');
    expect(md).toContain('**Template:** Swedish Method');
    expect(md).toContain('**Tags:** #gospel #love');
    expect(md).toContain('## Key Idea');
    expect(md).toContain('God loves the world.');
    expect(md).toContain('## Question');
    expect(md).toContain('## Application');
  });

  test('formatNoteAsMarkdown falls back to passage as heading when title is missing', () => {
    const md = formatNoteAsMarkdown({
      passage: basePassage,
      sections: [{ id: 'light', title: 'Key Idea', content: 'Insight' }],
    });

    expect(md.startsWith('# John 3:16')).toBe(true);
    expect(md).not.toContain('**Passage:**');
  });

  test('formatNoteAsMarkdown uses legacy Swedish fields when sections are empty', () => {
    const md = formatNoteAsMarkdown({
      title: 'Legacy Note',
      passage: basePassage,
      lightContent: 'Key idea text',
      questionContent: 'Question text',
      arrowContent: 'Application text',
      sections: [],
    });

    expect(md).toContain('## Key Idea');
    expect(md).toContain('Key idea text');
    expect(md).toContain('## Question');
    expect(md).toContain('## Application');
  });

  test('formatNoteAsMarkdown falls back to raw content body', () => {
    const md = formatNoteAsMarkdown({
      title: 'Freeform',
      content: 'Just a freeform markdown body.',
      sections: [],
    });

    expect(md).toContain('## Note');
    expect(md).toContain('Just a freeform markdown body.');
  });

  test('getNoteShareTitle prefers title, then passage, then default', () => {
    expect(getNoteShareTitle({ title: 'My Title', passage: basePassage })).toBe('My Title');
    expect(getNoteShareTitle({ passage: basePassage })).toBe('John 3:16');
    expect(getNoteShareTitle({})).toBe('Bible Note');
  });
});
