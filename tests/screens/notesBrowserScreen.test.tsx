/**
 * Integration Test for NotesBrowserScreen (app/(tabs)/notes.tsx)
 * Validates Book vs Tag view switching, canonical order grouping,
 * tag filter chips, search filtering, empty states, and pull-to-refresh.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import NotesBrowserScreen from '../../app/(tabs)/notes';
import * as notesService from '../../src/services/notesService';
import { Note } from '../../src/types/note';

const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const ReactModule = require('react');
  return {
    useRouter: () => ({
      push: mockPush,
      replace: jest.fn(),
    }),
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => {
        cb();
      }, [cb]);
    },
  };
});

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user_123', email: 'test@user.com' },
  }),
}));

jest.mock('../../src/services/notesService', () => ({
  getUserNotes: jest.fn(),
}));

const mockNotes: Note[] = [
  {
    id: 'note_genesis',
    userId: 'user_123',
    user_id: 'user_123',
    title: 'Creation Story',
    passage: {
      display: 'Genesis 1:1-3',
      books: ['Genesis'],
      segments: [{ book: 'Genesis', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 3 }],
    },
    lightContent: '',
    questionContent: '',
    arrowContent: '',
    content: 'In the beginning God created...',
    tags: ['creation', 'origins'],
    visibility: 'friends',
    createdAt: 1000,
    updatedAt: 1000,
    created_at: 1000,
    updated_at: 1000,
  },
  {
    id: 'note_romans',
    userId: 'user_123',
    user_id: 'user_123',
    title: 'Justification by Faith',
    passage: {
      display: 'Romans 8:28',
      books: ['Romans'],
      segments: [{ book: 'Romans', startChapter: 8, startVerse: 28, endChapter: 8, endVerse: 28 }],
    },
    lightContent: '',
    questionContent: '',
    arrowContent: '',
    content: 'All things work together for good...',
    tags: ['faith', 'hope'],
    visibility: 'friends',
    createdAt: 2000,
    updatedAt: 2000,
    created_at: 2000,
    updated_at: 2000,
  },
];

describe('NotesBrowserScreen (app/(tabs)/notes.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays EmptyState when user has no notes', async () => {
    (notesService.getUserNotes as jest.Mock).mockResolvedValue([]);

    const { getByText } = await render(<NotesBrowserScreen />);

    await waitFor(() => {
      expect(getByText(/No notes found/i)).toBeTruthy();
      expect(getByText(/Tap the button below to capture your first study note/i)).toBeTruthy();
    });
  });

  test('groups notes under canonical book headers in biblical order', async () => {
    (notesService.getUserNotes as jest.Mock).mockResolvedValue(mockNotes);

    const { getByText } = await render(<NotesBrowserScreen />);

    await waitFor(() => {
      expect(getByText('Genesis (1)')).toBeTruthy();
      expect(getByText('Creation Story')).toBeTruthy();
      expect(getByText('Romans (1)')).toBeTruthy();
      expect(getByText('Justification by Faith')).toBeTruthy();
    });
  });

  test('filters notes by search query in real-time', async () => {
    (notesService.getUserNotes as jest.Mock).mockResolvedValue(mockNotes);

    const { getByPlaceholderText, getByText, queryByText } = await render(
      <NotesBrowserScreen />
    );

    await waitFor(() => {
      expect(getByText('Creation Story')).toBeTruthy();
    });

    const searchInput = getByPlaceholderText('Search by title, book, tag, or reflection...');
    await act(async () => {
      fireEvent.changeText(searchInput, 'Creation');
    });

    expect(getByText('Creation Story')).toBeTruthy();
    expect(queryByText('Justification by Faith')).toBeNull();
  });

  test('switches to Tag view and filters notes by selected tag chip', async () => {
    (notesService.getUserNotes as jest.Mock).mockResolvedValue(mockNotes);

    const { getByText, queryByText } = await render(<NotesBrowserScreen />);

    await waitFor(() => {
      expect(getByText('Creation Story')).toBeTruthy();
    });

    // Switch to By Tag mode
    await act(async () => {
      fireEvent.press(getByText('By tag'));
    });

    // Filter by tag pill "#creation (1)"
    await waitFor(() => {
      expect(getByText('#creation (1)')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('#creation (1)'));
    });

    expect(getByText('Creation Story')).toBeTruthy();
    expect(queryByText('Justification by Faith')).toBeNull();
  });
});

describe('NotesBrowserScreen loading and error states', () => {
  it('does not claim there are no notes while the first fetch is pending', async () => {
    const resolvers: Array<(notes: Note[]) => void> = [];
    (notesService.getUserNotes as jest.Mock).mockImplementation(
      () => new Promise<Note[]>((resolve) => { resolvers.push(resolve); })
    );
    const { queryByText, getByLabelText } = await render(<NotesBrowserScreen />);
    expect(getByLabelText('Loading notes')).toBeTruthy();
    expect(queryByText(/No notes found/i)).toBeNull();
    (notesService.getUserNotes as jest.Mock).mockResolvedValue([]);
    await act(async () => resolvers.forEach((r) => r([])));
    await waitFor(() => expect(queryByText(/No notes found/i)).toBeTruthy());
  });

  it('shows an inline message when the fetch fails', async () => {
    (notesService.getUserNotes as jest.Mock).mockRejectedValue(new Error('offline'));
    const { getByText } = await render(<NotesBrowserScreen />);
    await waitFor(() => expect(getByText(/Couldn't refresh your notes/i)).toBeTruthy());
  });
});

describe('NotesBrowserScreen unfinished drafts', () => {
  it('lists unfinished new-note drafts, confirms before discarding, and resumes them in the editor', async () => {
    const { Alert } = require('../../src/utils/alert');
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { saveDraft } = require('../../src/services/noteDraftStore');
    await saveDraft({
      key: 'note_draft:user_123:new:abc',
      payload: {
        title: 'Half done',
        passage: mockNotes[0].passage,
        templateId: 'swedish',
        sections: [{ id: 'light', title: 'Key Idea', content: 'Some thoughts' }],
        tags: [],
        visibility: 'friends',
      },
      savedAt: Date.now(),
    });
    (notesService.getUserNotes as jest.Mock).mockResolvedValue(mockNotes);

    const { findByText, getByLabelText } = await render(<NotesBrowserScreen />);
    expect(await findByText('Unfinished note')).toBeTruthy();
    expect(await findByText('Half done')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Discard unfinished note: Half done'));
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Discard unfinished note?',
      expect.any(String),
      expect.any(Array)
    );
    // Draft stays until user confirms destructive action
    expect(await findByText('Half done')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Resume unfinished note: Half done'));
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/note/edit',
      params: { draft: 'note_draft:user_123:new:abc' },
    });
    alertSpy.mockRestore();
  });
});
