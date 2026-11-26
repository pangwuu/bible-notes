import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import BibleBrowseScreen from '../../app/(tabs)/bible';

const mockPush = jest.fn();
let mockReaderProps: Record<string, any> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u1' },
    profile: {
      preferred_version_id: 59,
      settings: { preferred_translation: 'ESV' },
    },
  }),
}));

jest.mock('../../src/components/BibleReader', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: { preferredTranslation?: string; preferredVersionId?: number }) => {
      mockReaderProps = props;
      return React.createElement(
        Text,
        { testID: 'bible-reader' },
        `Reader ${props.preferredTranslation} ${props.preferredVersionId}`
      );
    },
  };
});

jest.mock('../../src/hooks/useReaderFontSize', () => ({
  useReaderFontSize: () => ({ readerFontSize: 16, setReaderFontSize: jest.fn() }),
}));

describe('BibleBrowseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('searches the book accordion, reads a chapter, and notes it', async () => {
    const screen = await render(
      <PaperProvider>
        <BibleBrowseScreen />
      </PaperProvider>
    );

    expect(screen.getByText('Read the Bible')).toBeTruthy();
    expect(screen.getByLabelText('Search books or passages')).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Search books or passages'), 'John');
    });

    expect(screen.queryByText('Genesis')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('John'));
    });

    await waitFor(() => {
      expect(screen.getByLabelText('John chapter 3')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('John chapter 3'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('bible-reader')).toBeTruthy();
      expect(screen.getByText('Reader ESV 59')).toBeTruthy();
      expect(screen.getByText('John 3')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Next chapter, John 4'));
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Back to books, John 4')).toBeTruthy();
      expect(screen.queryByLabelText('Back to books, John 3')).toBeNull();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Note this passage'));
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/note/edit',
      params: expect.objectContaining({
        book: 'John',
        chapter: '4',
        verseStart: '1',
      }),
    });
  });

  test('opens a one-chapter book and continues into the next book', async () => {
    const screen = await render(
      <PaperProvider>
        <BibleBrowseScreen />
      </PaperProvider>
    );

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Search books or passages'), 'Obadiah');
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Obadiah'));
    });

    await waitFor(() => {
      expect(screen.getByText('Obadiah 1')).toBeTruthy();
      expect(screen.getByLabelText('Next chapter, Jonah 1')).toBeTruthy();
      expect(screen.getByLabelText('Previous chapter, Amos 9')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Next chapter, Jonah 1'));
    });

    await waitFor(() => {
      expect(screen.getByText('Jonah 1')).toBeTruthy();
    });
  });

  test('docks the verse bar and opens a note with selected verses aimed at a section', async () => {
    const screen = await render(
      <PaperProvider>
        <BibleBrowseScreen />
      </PaperProvider>
    );

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Search books or passages'), 'Obadiah');
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Obadiah'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('bible-reader')).toBeTruthy();
    });

    expect(mockReaderProps.actionBarPlacement).toBe('docked');
    expect(mockReaderProps.sectionOptions.map((s: { id: string }) => s.id)).toEqual([
      'light',
      'question',
      'arrow',
    ]);

    await act(async () => {
      mockReaderProps.onAttachToSection([4, 3], 'question', { book: 'Obadiah', chapter: 1 });
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/note/edit',
      params: expect.objectContaining({
        book: 'Obadiah',
        chapter: '1',
        verseStart: '1',
        templateId: 'swedish',
        attachSection: 'question',
        attachVerses: '3,4',
      }),
    });
  });
});
