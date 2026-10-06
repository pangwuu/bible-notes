/**
 * Integration Test for Note Detail Screen Edge Cases, Missing Notes & Authorization Bounds
 * Covers Area 3 of the Failure Modes Test Plan:
 * - app/note/[id].tsx:
 *   - Remote 404 / Note not found: renders error UI and Go Back button
 *   - Network failure on initial load: renders error message
 *   - Non-author authorization: hides Edit and Delete header action icons
 *   - Delete failure handling: displays Alert.alert error when delete fails without navigating back
 *   - Delete success flow: prompts Alert.alert confirmation, deletes note, and navigates back
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import NoteDetailScreen from '../../app/note/[id]';
import * as notesService from '../../src/services/notesService';
import { useAuth } from '../../src/context/AuthContext';
import { Alert } from '../../src/utils/alert';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);
const mockSetOptions = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'test_note_id' }),
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    push: mockPush,
    canGoBack: mockCanGoBack,
  }),
  useNavigation: () => ({
    setOptions: mockSetOptions,
  }),
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(cb, []);
  },
}));

jest.mock('../../src/services/notesService', () => ({
  parseNoteId: jest.fn((id?: string) => id || 'test_note_id'),
  getNote: jest.fn(),
  getUserNotes: jest.fn().mockResolvedValue([]),
  deleteNote: jest.fn(),
}));

jest.mock('../../src/services/noteOverlapService', () => ({
  findFriendNoteOverlaps: jest.fn().mockResolvedValue([]),
  segmentsOverlap: jest.fn().mockReturnValue(false),
}));

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/components/BibleReader', () => () => null);
jest.mock('../../src/components/FriendActivityLoadingIndicator', () => () => null);
jest.mock('../../src/components/NoteCard', () => () => null);
jest.mock('../../src/components/note/TOCSegmentBar', () => ({
  TOCSegmentBar: () => null,
  default: () => null,
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    Ionicons: (props: any) => React.createElement(RN.Text, { testID: `ionicon-${props.name}`, ...props }),
  };
});

jest.spyOn(Alert, 'alert');

describe('Area 3: Note Detail Screen 404 & Authorization Bounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetOptions.mockClear();
  });

  test('renders "Note not found" error state and Go Back button when getNote returns null', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'user_123' },
      profile: { settings: { enable_friends: false } },
    });
    (notesService.getNote as jest.Mock).mockResolvedValueOnce(null);

    const { getByText, queryByText } = render(
      <PaperProvider>
        <NoteDetailScreen />
      </PaperProvider>
    );

    await waitFor(() => {
      expect(getByText('Note not found')).toBeTruthy();
    });

    expect(queryByText('Loading note...')).toBeNull();

    const goBackBtn = getByText('Go Back');
    fireEvent.press(goBackBtn);

    expect(mockBack).toHaveBeenCalled();
  });

  test('renders error message when getNote throws network rejection', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'user_123' },
      profile: { settings: { enable_friends: false } },
    });
    (notesService.getNote as jest.Mock).mockRejectedValueOnce(
      new Error('Firestore network timeout')
    );

    const { getByText } = render(
      <PaperProvider>
        <NoteDetailScreen />
      </PaperProvider>
    );

    await waitFor(() => {
      expect(getByText('Firestore network timeout')).toBeTruthy();
    });
  });

  test('hides Edit and Delete header actions when current user is not the note author', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'other_user_456' }, // Note authored by 'author_user_123'
      profile: { settings: { enable_friends: false } },
    });

    const mockNote = {
      id: 'test_note_id',
      userId: 'author_user_123',
      user_id: 'author_user_123',
      title: 'Apostolic Fellowship',
      passage: {
        display: 'Acts 2:42',
        books: ['Acts'],
        segments: [{ book: 'Acts', startChapter: 2, startVerse: 42, endChapter: 2, endVerse: 42 }],
      },
      sections: [
        { id: 'light', title: 'Key Idea', content: 'Devoted to apostles teaching', color: '#D4AF37' },
      ],
      tags: ['church', 'koinonia'],
      visibility: 'friends' as const,
      createdAt: 1000,
      updatedAt: 1000,
    };

    (notesService.getNote as jest.Mock).mockResolvedValueOnce(mockNote);

    render(
      <PaperProvider>
        <NoteDetailScreen />
      </PaperProvider>
    );

    await waitFor(() => {
      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Apostolic Fellowship',
          headerRight: undefined, // Non-author must NOT have headerRight actions
        })
      );
    });
  });

  test('renders Edit and Delete actions when user is the author and triggers delete error Alert if deleteNote rejects', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'author_user_123' },
      profile: { settings: { enable_friends: false } },
    });

    const mockNote = {
      id: 'test_note_id',
      userId: 'author_user_123',
      user_id: 'author_user_123',
      title: 'Author Private Note',
      passage: {
        display: 'Romans 1:1',
        books: ['Romans'],
        segments: [{ book: 'Romans', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 1 }],
      },
      sections: [],
      tags: [],
      visibility: 'private' as const,
      createdAt: 1000,
      updatedAt: 1000,
    };

    (notesService.getNote as jest.Mock).mockResolvedValueOnce(mockNote);

    render(
      <PaperProvider>
        <NoteDetailScreen />
      </PaperProvider>
    );

    await waitFor(() => {
      expect(mockSetOptions).toHaveBeenCalled();
    });

    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
    expect(lastCall.title).toBe('Author Private Note');
    expect(lastCall.headerRight).toBeDefined();

    // Render header actions component
    const HeaderActions = lastCall.headerRight;
    const { getByTestId } = render(<HeaderActions />);

    const trashBtn = getByTestId('ionicon-trash-outline');
    expect(trashBtn).toBeTruthy();

    // Simulate clicking trash
    fireEvent.press(trashBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Note',
      'Are you sure you want to permanently delete this note?',
      expect.any(Array)
    );

    // Extract Delete action button from Alert options
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const alertButtons = alertCalls[alertCalls.length - 1][2];
    const deleteOption = alertButtons.find((btn: any) => btn.text === 'Delete');
    expect(deleteOption).toBeDefined();

    // Simulate delete rejection
    (notesService.deleteNote as jest.Mock).mockRejectedValueOnce(
      new Error('Cloud Firestore delete failed')
    );

    await act(async () => {
      await deleteOption.onPress();
    });

    // Verify Error alert displayed and navigation back NOT triggered
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to delete note.');
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('successfully deletes note and navigates back on confirmed deletion', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'author_user_123' },
      profile: { settings: { enable_friends: false } },
    });

    const mockNote = {
      id: 'test_note_id',
      userId: 'author_user_123',
      user_id: 'author_user_123',
      title: 'Successful Delete Note',
      passage: {
        display: 'Romans 1:1',
        books: ['Romans'],
        segments: [{ book: 'Romans', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 1 }],
      },
      sections: [],
      tags: [],
      visibility: 'private' as const,
      createdAt: 1000,
      updatedAt: 1000,
    };

    (notesService.getNote as jest.Mock).mockResolvedValueOnce(mockNote);
    (notesService.deleteNote as jest.Mock).mockResolvedValueOnce(undefined);

    render(
      <PaperProvider>
        <NoteDetailScreen />
      </PaperProvider>
    );

    await waitFor(() => {
      expect(mockSetOptions).toHaveBeenCalled();
    });

    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
    const HeaderActions = lastCall.headerRight;
    const { getByTestId } = render(<HeaderActions />);

    fireEvent.press(getByTestId('ionicon-trash-outline'));

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const alertButtons = alertCalls[alertCalls.length - 1][2];
    const deleteOption = alertButtons.find((btn: any) => btn.text === 'Delete');

    await act(async () => {
      await deleteOption.onPress();
    });

    expect(notesService.deleteNote).toHaveBeenCalledWith('test_note_id');
    expect(mockBack).toHaveBeenCalled();
  });
});
