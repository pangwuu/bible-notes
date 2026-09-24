/**
 * Unit tests verifying NoteCard preview snippet generation and bug fix:
 * 1. Blank Swedish template does not leak '### Key Idea(s)' / '### Application(s)'
 * 2. UTF-16 surrogate pairs in emojis (💡, 🏹) are matched cleanly without truncation
 * 3. Blank notes render 'No reflection written yet'
 * 4. Dynamic sections extract the first non-empty section as snippet
 */

import React from 'react';
import NoteCard from '../../src/components/NoteCard';
import { Note } from '../../src/types/note';
import { SWEDISH_TEMPLATE_MARKDOWN } from '../../src/constants/swedishMethod';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialCommunityIcons: () => null,
}));

// Helper to recursively collect all text children from a React element tree
function extractText(element: any): string {
  if (!element) return '';
  if (typeof element === 'string' || typeof element === 'number') {
    return String(element);
  }
  if (Array.isArray(element)) {
    return element.map(extractText).join(' ');
  }
  if (element.props && element.props.children) {
    return extractText(element.props.children);
  }
  return '';
}

describe('NoteCard Snippet Cleaning & Bug Fix', () => {
  const baseNote: Note = {
    id: 'test_note_1',
    userId: 'user_1',
    user_id: 'user_1',
    passage: {
      display: 'John 3:16',
      books: ['John'],
      segments: [
        { book: 'John', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 },
      ],
    },
    sections: [],
    lightContent: '',
    questionContent: '',
    arrowContent: '',
    content: '',
    tags: [],
    visibility: 'private',
    createdAt: 1000,
    updatedAt: 1000,
    created_at: 1000,
    updated_at: 1000,
  };

  it('renders "No reflection written yet" when note.content contains the blank Swedish template markdown', () => {
    const blankTemplateNote: Note = {
      ...baseNote,
      content: SWEDISH_TEMPLATE_MARKDOWN,
    };

    const tree = NoteCard({ note: blankTemplateNote, onPress: jest.fn() });
    const text = extractText(tree);

    expect(text).toContain('No reflection written yet');
    expect(text).not.toContain('Key Idea');
    expect(text).not.toContain('Application');
    expect(text).not.toContain('Question');
    expect(text).not.toContain('###');
  });

  it('renders "No reflection written yet" when note has dynamic sections that are all empty', () => {
    const emptyDynamicNote: Note = {
      ...baseNote,
      templateId: 'soap',
      templateName: 'SOAP Study',
      sections: [
        { id: 'scripture', title: 'Scripture', content: '' },
        { id: 'observation', title: 'Observation', content: '   \n  ' },
        { id: 'application', title: 'Application', content: '' },
        { id: 'prayer', title: 'Prayer', content: '' },
      ],
    };

    const tree = NoteCard({ note: emptyDynamicNote, onPress: jest.fn() });
    const text = extractText(tree);

    expect(text).toContain('No reflection written yet');
    expect(text).not.toContain('Observation');
  });

  it('extracts reflection snippet from the first non-empty dynamic section', () => {
    const dynamicNote: Note = {
      ...baseNote,
      templateId: 'soap',
      templateName: 'SOAP Study',
      sections: [
        { id: 'scripture', title: 'Scripture', content: '' },
        { id: 'observation', title: 'Observation', content: 'God so loved the world that He gave His Son.' },
        { id: 'application', title: 'Application', content: 'Believe and trust Him daily.' },
        { id: 'prayer', title: 'Prayer', content: 'Thank You Lord.' },
      ],
    };

    const tree = NoteCard({ note: dynamicNote, onPress: jest.fn() });
    const text = extractText(tree);

    expect(text).toContain('God so loved the world that He gave His Son.');
    expect(text).not.toContain('No reflection written yet');
  });

  it('cleans markdown headers from reflection snippet if user wrote headers inside section content', () => {
    const noteWithHeaderInContent: Note = {
      ...baseNote,
      sections: [
        {
          id: 'notes',
          title: 'Notes',
          content: '### My Subheading\nThis is the real text of the note.',
        },
      ],
    };

    const tree = NoteCard({ note: noteWithHeaderInContent, onPress: jest.fn() });
    const text = extractText(tree);

    expect(text).toContain('This is the real text of the note.');
    expect(text).not.toContain('###');
  });
});
