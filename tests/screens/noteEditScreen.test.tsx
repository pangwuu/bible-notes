/**
 * Integration Test for NoteEditScreen (app/note/edit.tsx)
 * Validates initialization for new vs existing note, dirty tracking,
 * back navigation discard confirmation, template switching,
 * explicit save & friend overlap notification dispatch.
 */

import React from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';
import renderer, { act as renderTree } from 'react-test-renderer';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import NoteEditScreen from '../../app/note/edit';
import * as notesService from '../../src/services/notesService';
import * as noteOverlapService from '../../src/services/noteOverlapService';
import { Alert } from '../../src/utils/alert';
import { Note } from '../../src/types/note';
import safeStorage from '../../src/utils/safeStorage';
import {
  saveDraft,
  loadDraft,
  listNewNoteDrafts,
  draftKeyForNote,
} from '../../src/services/noteDraftStore';

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

let mockLocalSearchParams: { id?: string; draft?: string } = {};

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
    return safeStorage.getAllKeys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('note_draft')).map((k) => safeStorage.removeItem(k)))
    );
  });

  test('insets the note scroll view and does not pad the iOS keyboard', async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    await renderTree(async () => {
      tree = renderer.create(<NoteEditScreen />);
    });

    const scrollViews = tree!.root.findAllByType(ScrollView);
    const bodyScrollView = scrollViews.find((sv) => sv.props.keyboardDismissMode === 'on-drag');
    expect(bodyScrollView).toBeTruthy();
    expect(bodyScrollView!.props.automaticallyAdjustKeyboardInsets).toBe(true);

    const noteAvoider = tree!.root.findAllByType(KeyboardAvoidingView).find((view) =>
      view.findAllByType(ScrollView).some((sv) => sv.props.automaticallyAdjustKeyboardInsets)
    );
    expect(noteAvoider).toBeTruthy();
    expect(noteAvoider!.props.behavior).toBeUndefined();
  });

  test('initializes new note with default template (Swedish Method) and empty fields', async () => {
    const { getByText, getByPlaceholderText } = await render(<NoteEditScreen />);

    expect(getByText('Key Idea')).toBeTruthy();
    expect(getByText('Question')).toBeTruthy();
    expect(getByText('Application')).toBeTruthy();
    expect(getByText('Choose a passage')).toBeTruthy();
    expect(getByPlaceholderText('Title (optional)')).toBeTruthy();
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

    const translationButton = await findByLabelText(/Change translation/);
    await act(async () => {
      fireEvent.press(translationButton);
    });
    const guideButton = await findByLabelText('About Bible versions');
    await act(async () => {
      fireEvent.press(guideButton);
    });

    expect(mockPush).toHaveBeenCalledWith('/bible-versions');
  });

  test('Done on a new note without a passage asks for one instead of losing the writing', async () => {
    const { getByPlaceholderText } = await render(<NoteEditScreen />);

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Title (optional)'), 'No passage title');
    });

    const HeaderLeft = lastNavOptions.headerLeft;
    const { getByText } = await render(<HeaderLeft />);
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Choose a passage to save',
      expect.stringContaining('kept on this device'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Choose passage' }),
        expect.objectContaining({ text: 'Keep as draft' }),
        expect.objectContaining({ text: 'Discard note' }),
      ])
    );
    expect(notesService.createNote).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('Done on an untouched new note just leaves', async () => {
    await render(<NoteEditScreen />);
    const HeaderLeft = lastNavOptions.headerLeft;
    const { getByText } = await render(<HeaderLeft />);
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });
    expect(notesService.createNote).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  test('Done syncs an edited existing note and leaves', async () => {
    mockLocalSearchParams = { id: 'existing_note_123' };
    (notesService.getNote as jest.Mock).mockResolvedValueOnce(mockExistingNote);
    (notesService.updateNote as jest.Mock).mockResolvedValue(mockExistingNote);

    const { getByDisplayValue } = await render(<NoteEditScreen />);
    await waitFor(() => expect(getByDisplayValue('My Romans Study')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(getByDisplayValue('My Romans Study'), 'Romans, revised');
    });

    const HeaderLeft = lastNavOptions.headerLeft;
    const { getByText } = await render(<HeaderLeft />);
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    await waitFor(() => {
      expect(notesService.updateNote).toHaveBeenCalledWith(
        'existing_note_123',
        expect.objectContaining({ title: 'Romans, revised', visibility: 'friends' })
      );
      expect(mockBack).toHaveBeenCalled();
    });
  });

  test('autosaves an existing note without pressing Done', async () => {
    mockLocalSearchParams = { id: 'existing_note_123' };
    (notesService.getNote as jest.Mock).mockResolvedValueOnce(mockExistingNote);
    (notesService.updateNote as jest.Mock).mockResolvedValue(mockExistingNote);

    const { getByDisplayValue } = await render(<NoteEditScreen />);
    await waitFor(() => expect(getByDisplayValue('God works for good')).toBeTruthy());

    await act(async () => {
      fireEvent.changeText(getByDisplayValue('God works for good'), 'God works all things for good');
    });

    await waitFor(
      () => {
        expect(notesService.updateNote).toHaveBeenCalledWith(
          'existing_note_123',
          expect.objectContaining({
            sections: expect.arrayContaining([
              expect.objectContaining({ id: 'light', content: 'God works all things for good' }),
            ]),
          })
        );
      },
      { timeout: 6000 }
    );
    expect(mockBack).not.toHaveBeenCalled();
  }, 10000);

  test('keeps a device draft of a new note while typing', async () => {
    const { getByPlaceholderText } = await render(<NoteEditScreen />);
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Title (optional)'), 'Half-written thought');
    });

    await waitFor(
      async () => {
        const drafts = await listNewNoteDrafts('author_1');
        expect(drafts[0]?.payload.title).toBe('Half-written thought');
      },
      { timeout: 3000 }
    );
    expect(notesService.createNote).not.toHaveBeenCalled();
  });

  test('offers to resume an unfinished new note', async () => {
    await saveDraft({
      key: 'note_draft:author_1:new:test1',
      payload: {
        title: 'Recovered title',
        passage: mockExistingNote.passage,
        templateId: 'swedish',
        sections: mockExistingNote.sections!,
        tags: [],
        visibility: 'friends',
      },
      savedAt: Date.now(),
    });

    const { findByText, getByText, getByDisplayValue } = await render(<NoteEditScreen />);
    expect(await findByText(/Unfinished note on Romans 8:28/)).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Resume'));
    });
    expect(getByDisplayValue('Recovered title')).toBeTruthy();
  });

  test('restores unsynced changes when reopening an existing note', async () => {
    mockLocalSearchParams = { id: 'existing_note_123' };
    (notesService.getNote as jest.Mock).mockResolvedValueOnce(mockExistingNote);
    (notesService.updateNote as jest.Mock).mockResolvedValue(mockExistingNote);
    await saveDraft({
      key: draftKeyForNote('author_1', 'existing_note_123'),
      noteId: 'existing_note_123',
      payload: {
        title: 'Edited offline',
        passage: mockExistingNote.passage,
        templateId: 'swedish',
        sections: mockExistingNote.sections!,
        tags: mockExistingNote.tags,
        visibility: 'friends',
      },
      savedAt: Date.now(),
      lastKnownServerAt: mockExistingNote.updated_at as number,
    });

    const { findByText, getByDisplayValue } = await render(<NoteEditScreen />);
    expect(await findByText(/Restored changes that had not synced/)).toBeTruthy();
    expect(getByDisplayValue('Edited offline')).toBeTruthy();
  });

  test('Done creates a new note once and notifies friends', async () => {
    await saveDraft({
      key: 'note_draft:author_1:new:create1',
      payload: {
        title: 'Fresh note',
        passage: mockExistingNote.passage,
        templateId: 'swedish',
        sections: mockExistingNote.sections!,
        tags: [],
        visibility: 'friends',
      },
      savedAt: Date.now(),
    });
    mockLocalSearchParams = { draft: 'note_draft:author_1:new:create1' } as any;
    (notesService.createNote as jest.Mock).mockResolvedValue({ ...mockExistingNote, id: 'created_1' });

    const { findByDisplayValue } = await render(<NoteEditScreen />);
    await findByDisplayValue('Fresh note');

    const HeaderLeft = lastNavOptions.headerLeft;
    const { getByText } = await render(<HeaderLeft />);
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    await waitFor(() => {
      expect(notesService.createNote).toHaveBeenCalledTimes(1);
      expect(noteOverlapService.notifyFriendsOfNoteOverlap).toHaveBeenCalledTimes(1);
      expect(mockBack).toHaveBeenCalled();
    });
    expect(await loadDraft('note_draft:author_1:new:create1')).toBeNull();
  });
});

describe('NoteEditScreen template switching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastNavOptions = {};
    mockLocalSearchParams = {};
  });

  test('switches immediately, keeps the writing, and offers Undo', async () => {
    const { getAllByPlaceholderText, getByLabelText, findByText, getByText, getByDisplayValue, queryByDisplayValue } =
      await render(<NoteEditScreen />);

    const firstSection = getAllByPlaceholderText(/./).find((el) => el.props.multiline)!;
    await act(async () => {
      fireEvent.changeText(firstSection, 'God is faithful');
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Select template SOAP Study'));
    });

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(await findByText(/Switched to SOAP Study/)).toBeTruthy();
    expect(getByDisplayValue('Key Idea:\nGod is faithful')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Undo'));
    });
    expect(getByDisplayValue('God is faithful')).toBeTruthy();
    expect(queryByDisplayValue('Key Idea:\nGod is faithful')).toBeNull();
  });
});
