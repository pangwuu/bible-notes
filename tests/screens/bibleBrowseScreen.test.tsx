import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import BibleBrowseScreen from '../../app/(tabs)/bible';

const mockPush = jest.fn();

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
    default: () => React.createElement(Text, { testID: 'bible-reader' }, 'Reader'),
  };
});

jest.mock('../../src/hooks/useReaderFontSize', () => ({
  useReaderFontSize: () => ({ readerFontSize: 16, setReaderFontSize: jest.fn() }),
}));

describe('BibleBrowseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('selects book and chapter then offers Note this navigation', async () => {
    const screen = await render(
      <PaperProvider>
        <BibleBrowseScreen />
      </PaperProvider>
    );

    expect(screen.getByText('Read Scripture')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Select John'));
    });

    await waitFor(() => {
      expect(screen.getByLabelText('John chapter 3')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('John chapter 3'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('bible-reader')).toBeTruthy();
      expect(screen.getByLabelText('Note this passage')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Note this passage'));
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/note/edit',
      params: expect.objectContaining({
        book: 'John',
        chapter: '3',
        verseStart: '1',
      }),
    });
  });
});
