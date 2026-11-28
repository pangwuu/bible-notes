import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import RecentlyDeletedScreen from '../../app/recently-deleted';
import * as notesService from '../../src/services/notesService';
import { Alert } from '../../src/utils/alert';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

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

    await fireEvent.press(screen.getByLabelText('Delete Hope in waiting forever'));
    expect(Alert.alert).toHaveBeenCalledWith('Delete forever?', expect.any(String), expect.any(Array));
    expect(notesService.permanentlyDeleteNote).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Restore Hope in waiting'));
    expect(notesService.restoreNote).toHaveBeenCalledWith('n1');
    await waitFor(() => expect(screen.queryByText('Hope in waiting')).toBeNull());
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  test('clamps future deletedAt timestamps from clock skew to today and full retention', async () => {
    (notesService.getDeletedNotes as jest.Mock).mockResolvedValue([
      {
        id: 'n_future',
        title: 'Clock skew note',
        passage: { display: 'Psalm 23:1' },
        tags: [],
        deletedAt: Date.now() + 60 * 60 * 1000,
      },
    ]);

    const screen = await render(
      <PaperProvider>
        <RecentlyDeletedScreen />
      </PaperProvider>
    );

    expect(await screen.findByText('Clock skew note')).toBeTruthy();
    expect(screen.getByText('Deleted today, 30 days left')).toBeTruthy();
  });

  test('attaches loading state to Delete forever rather than Restore during permanent deletion', async () => {
    let resolveDelete!: () => void;
    (notesService.getDeletedNotes as jest.Mock).mockResolvedValue(deleted);
    (notesService.permanentlyDeleteNote as jest.Mock).mockImplementation(
      () =>
        new Promise<void>((res) => {
          resolveDelete = res;
        })
    );
    (Alert.alert as jest.Mock).mockImplementation((_title, _msg, buttons) => {
      const destructive = buttons?.find((b: any) => b.style === 'destructive');
      destructive?.onPress?.();
    });

    const screen = await render(
      <PaperProvider>
        <RecentlyDeletedScreen />
      </PaperProvider>
    );

    expect(await screen.findByText('Hope in waiting')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Delete Hope in waiting forever'));

    expect(notesService.permanentlyDeleteNote).toHaveBeenCalledWith('n1');
    // Restore button must be disabled, NOT showing a spinner while Delete forever runs
    const restoreBtn = screen.getByLabelText('Restore Hope in waiting');
    expect(restoreBtn.props.accessibilityState?.disabled).toBe(true);

    await act(async () => {
      resolveDelete();
    });
    await waitFor(() => expect(screen.queryByText('Hope in waiting')).toBeNull());
  });
});
