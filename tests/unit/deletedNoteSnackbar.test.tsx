import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import DeletedNoteSnackbar from '../../src/components/DeletedNoteSnackbar';
import { announceNoteDeleted, onNotesChanged } from '../../src/state/noteTrash';
import { restoreNote } from '../../src/services/notesService';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('../../src/services/notesService', () => ({
  restoreNote: jest.fn(),
}));

const renderBar = () =>
  render(
    <PaperProvider>
      <DeletedNoteSnackbar />
    </PaperProvider>
  );

describe('DeletedNoteSnackbar', () => {
  beforeEach(() => jest.clearAllMocks());

  test('shows after a delete and restores the note on Undo', async () => {
    (restoreNote as jest.Mock).mockResolvedValueOnce({ id: 'n1' });
    const changed = jest.fn();
    const stop = onNotesChanged(changed);
    const screen = await renderBar();

    await act(async () => {
      announceNoteDeleted({ id: 'n1', label: '"Romans 8"' });
    });
    expect(screen.getByText(/Deleted "Romans 8"/)).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Undo'));
    });

    expect(restoreNote).toHaveBeenCalledWith('n1');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Note restored.')).toBeTruthy();
    stop();
  });

  test('points to Recently Deleted when Undo fails', async () => {
    (restoreNote as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const screen = await renderBar();

    await act(async () => {
      announceNoteDeleted({ id: 'n2', label: 'note' });
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Undo'));
    });

    expect(screen.getByText(/still in Recently Deleted/)).toBeTruthy();
  });
});
