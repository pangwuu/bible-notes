import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import RecentlyDeletedScreen from '../../app/recently-deleted';
import * as notesService from '../../src/services/notesService';
import { Alert } from '../../src/utils/alert';

const mockSetOptions = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ setOptions: mockSetOptions }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('../../src/utils/alert', () => ({ Alert: { alert: jest.fn() } }));

jest.mock('../../src/services/notesService', () => ({
  TRASH_RETENTION_DAYS: 30,
  getDeletedNotes: jest.fn(),
  restoreNote: jest.fn(),
  permanentlyDeleteNote: jest.fn(),
}));

const day = 24 * 60 * 60 * 1000;
const deleted = [
  {
    id: 'n1',
    title: 'Hope in waiting',
    passage: { display: 'Romans 8:18-25' },
    tags: [],
    deletedAt: Date.now() - 3 * day,
  },
];

describe('RecentlyDeletedScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lists deleted notes with days left, restores, and confirms before deleting forever', async () => {
    (notesService.getDeletedNotes as jest.Mock).mockResolvedValue(deleted);
    (notesService.restoreNote as jest.Mock).mockResolvedValue({ id: 'n1' });

    const screen = await render(
      <PaperProvider>
        <RecentlyDeletedScreen />
      </PaperProvider>
    );

    expect(await screen.findByText('Hope in waiting')).toBeTruthy();
    expect(screen.getByText('Deleted 3 days ago, 27 days left')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Delete Hope in waiting forever'));
    expect(Alert.alert).toHaveBeenCalledWith('Delete forever?', expect.any(String), expect.any(Array));
    expect(notesService.permanentlyDeleteNote).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Restore Hope in waiting'));
    });
    expect(notesService.restoreNote).toHaveBeenCalledWith('n1');
    await waitFor(() => expect(screen.queryByText('Hope in waiting')).toBeNull());
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});
