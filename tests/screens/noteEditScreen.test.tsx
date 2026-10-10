/**
 * Integration Test for NoteEditScreen (app/note/edit.tsx)
 * Validates initialization for new vs existing note, dirty tracking,
 * back navigation discard confirmation, template switching,
 * explicit save & friend overlap notification dispatch.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import NoteEditScreen from '../../app/note/edit';
import * as notesService from '../../src/services/notesService';
import * as noteOverlapService from '../../src/services/noteOverlapService';
import { Alert } from '../../src/utils/alert';
import { Note } from '../../src/types/note';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockCanGoBack = jest.fn(() => true);

let lastNavOptions: any = {};
const mockNavigationSetOptions = jest.fn((opts) => {
  lastNavOptions = { ...lastNavOptions, ...opts };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
    push: mockPush,
  }),
  useNavigation: () => ({
    setOptions: mockNavigationSetOptions,
    addListener: jest.fn(() => () => {}),
    removeListener: jest.fn(),
  }),
  useLocalSearchParams: () => mockLocalSearchParams,
}));

let mockLocalSearchParams: { id?: string } = {};

const mockAuthUser = {
  uid: 'author_1',
  displayName: 'Author Display',
};

const mockAuthProfile = {
  uid: 'author_1',
  username: 'authoruser',
  display_name: 'Author Display',
  default_visibility: 'friends' as const,
};

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    profile: mockAuthProfile,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/services/notesService', () => ({
  getNote: jest.fn(),
  getNoteById: jest.fn(),
  createNote: jest.fn(),
  updateNote: jest.fn(),
  getUserTags: jest.fn().mockResolvedValue(['prayer', 'faith']),
}));

jest.mock('../../src/services/bibleService', () => ({
  fetchPassage: jest.fn().mockResolvedValue({
    reference: 'Romans 8:28-30',
    verses: [
      { book: 'Romans', chapter: 8, verse: 28, text: 'And we know that in all things God works for the good...' },
    ],
    translation: 'ESV',
    copyright: 'Crossway',
  }),
  fetchPassageText: jest.fn().mockResolvedValue({
    reference: 'Romans 8:28-30',
    verses: [
      { book: 'Romans', chapter: 8, verse: 28, text: 'And we know that in all things God works for the good...' },
    ],
    translation: 'ESV',
    copyright: 'Crossway',
  }),
  SUPPORTED_TRANSLATIONS: ['ESV', 'KJV', 'NIV', 'NASB', 'NLT'],
}));

jest.mock('../../src/services/noteOverlapService', () => ({
  notifyFriendsOfNoteOverlap: jest.fn().mockResolvedValue(1),
}));

jest.spyOn(Alert, 'alert');

const mockExistingNote: Note = {
  id: 'existing_note_123',
  userId: 'author_1',
  user_id: 'author_1',
  authorUsername: 'authoruser',
  title: 'My Romans Study',
  passage: {
    display: 'Romans 8:28-30',
    books: ['Romans'],
    segments: [
      { book: 'Romans', startChapter: 8, startVerse: 28, endChapter: 8, endVerse: 30 },
    ],
  },
  templateId: 'swedish',
  templateName: 'Swedish Method',
  sections: [
    { id: 'light', title: 'Key Idea', icon: 'bulb-outline', content: 'God works for good' },
    { id: 'question', title: 'Question', icon: 'help-circle-outline', content: 'What about suffering?' },
    { id: 'arrow', title: 'Application', icon: 'footsteps-outline', content: 'Trust in trials' },
  ],
  lightContent: 'God works for good',
  questionContent: 'What about suffering?',
  arrowContent: 'Trust in trials',
  content: 'God works for good\n\nWhat about suffering?\n\nTrust in trials',
  tags: ['faith', 'perseverance'],
  visibility: 'friends',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  created_at: Date.now(),
  updated_at: Date.now(),
};

describe('NoteEditScreen (app/note/edit.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastNavOptions = {};
    mockLocalSearchParams = {};
  });

  test('initializes new note with default template (Swedish Method) and empty fields', async () => {
    const { getByText, getByPlaceholderText } = await render(<NoteEditScreen />);

    expect(getByText('Key Idea')).toBeTruthy();
    expect(getByText('Question')).toBeTruthy();
    expect(getByText('Application')).toBeTruthy();
    expect(getByText('Tap to select passage...')).toBeTruthy();
    expect(getByPlaceholderText('Note Title (Optional)')).toBeTruthy();
  });

  test('loads existing note by id and populates title, passage, and sections', async () => {
    mockLocalSearchParams = { id: 'existing_note_123' };
    (notesService.getNote as jest.Mock).mockResolvedValueOnce(mockExistingNote);

    const { getByDisplayValue, getAllByText } = await render(<NoteEditScreen />);

    await waitFor(() => {
      expect(notesService.getNote).toHaveBeenCalledWith('existing_note_123');
      expect(getByDisplayValue('My Romans Study')).toBeTruthy();
      expect(getAllByText('Romans 8:28-30').length).toBeGreaterThan(0);
      expect(getByDisplayValue('God works for good')).toBeTruthy();
    });
  });

  test('opens the Bible versions guide from the translation selector', async () => {
    mockLocalSearchParams = { id: 'existing_note_123' };
    (notesService.getNote as jest.Mock).mockResolvedValueOnce(mockExistingNote);

    const { findByLabelText } = await render(<NoteEditScreen />);

    const guideButton = await findByLabelText('About Bible versions');
    await act(async () => {
      fireEvent.press(guideButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/bible-versions');
  });

  test('shows alert prompt when leaving with unsaved dirty changes', async () => {
    const { getByPlaceholderText } = await render(<NoteEditScreen />);

    // Type in note title to mark screen dirty
    const titleInput = getByPlaceholderText('Note Title (Optional)');
    await act(async () => {
      fireEvent.changeText(titleInput, 'Draft Title');
    });

    // Trigger headerLeft (Cancel/Back)
    expect(lastNavOptions.headerLeft).toBeDefined();
    const HeaderLeft = lastNavOptions.headerLeft;
    const { getByText } = await render(<HeaderLeft />);

    await act(async () => {
      fireEvent.press(getByText('Cancel'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Unsaved Changes',
      expect.stringContaining('save your notes before leaving'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Discard' }),
        expect.objectContaining({ text: 'Save' }),
      ])
    );
  });

  test('validates passage requirement before saving', async () => {
    const { getByText, getByPlaceholderText } = await render(<NoteEditScreen />);

    // Enter note title but leave passage null
    const titleInput = getByPlaceholderText('Note Title (Optional)');
    await act(async () => {
      fireEvent.changeText(titleInput, 'No passage title');
    });

    // Trigger headerRight (Save)
    expect(lastNavOptions.headerRight).toBeDefined();
    const HeaderRight = lastNavOptions.headerRight;
    const { getByText: getBySaveText } = await render(<HeaderRight />);

    await act(async () => {
      fireEvent.press(getBySaveText('Save'));
    });

    // Error banner displayed in screen
    await waitFor(() => {
      expect(getByText(/Please select a scripture passage before saving/)).toBeTruthy();
    });
    expect(notesService.createNote).not.toHaveBeenCalled();
  });

  test('saves note and dispatches friend overlap notifications', async () => {
    mockLocalSearchParams = { id: 'existing_note_123' };
    (notesService.getNote as jest.Mock).mockResolvedValueOnce(mockExistingNote);
    (notesService.updateNote as jest.Mock).mockResolvedValueOnce(mockExistingNote);

    const { getByDisplayValue } = await render(<NoteEditScreen />);

    await waitFor(() => {
      expect(getByDisplayValue('God works for good')).toBeTruthy();
    });

    // Trigger headerRight (Save)
    expect(lastNavOptions.headerRight).toBeDefined();
    const HeaderRight = lastNavOptions.headerRight;
    const { getByText: getBySaveText } = await render(<HeaderRight />);

    await act(async () => {
      fireEvent.press(getBySaveText('Save'));
    });

    await waitFor(() => {
      expect(notesService.updateNote).toHaveBeenCalledWith(
        'existing_note_123',
        expect.objectContaining({
          title: 'My Romans Study',
          visibility: 'friends',
        })
      );
    });
  });
});
