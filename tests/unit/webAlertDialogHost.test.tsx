import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import WebAlertDialogHost from '../../src/components/WebAlertDialogHost';
import { Alert } from '../../src/utils/alert';

describe('WebAlertDialogHost & web Alert.alert', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    (Platform as any).OS = 'web';
  });

  afterEach(() => {
    (Platform as any).OS = originalOS;
  });

  test('renders all 3 options on web and invokes the third destructive button', async () => {
    const onChoose = jest.fn();
    const onKeep = jest.fn();
    const onDiscard = jest.fn();

    const screen = await render(
      <PaperProvider>
        <WebAlertDialogHost />
      </PaperProvider>
    );

    await act(async () => {
      Alert.alert('Choose a passage to save', 'A note needs a passage before it can be saved.', [
        { text: 'Choose passage', onPress: onChoose },
        { text: 'Keep as draft', style: 'cancel', onPress: onKeep },
        { text: 'Discard note', style: 'destructive', onPress: onDiscard },
      ]);
    });

    expect(screen.getByText('Choose a passage to save')).toBeTruthy();
    expect(screen.getByLabelText('Choose passage')).toBeTruthy();
    expect(screen.getByLabelText('Keep as draft')).toBeTruthy();
    expect(screen.getByLabelText('Discard note')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Discard note'));

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
    expect(onKeep).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Choose a passage to save')).toBeNull();
    });
  });

  test('queues back-to-back alerts and invokes cancel button on Escape when window is present', async () => {
    const prevWindow = (global as any).window;
    const listeners: Record<string, Array<(e: any) => void>> = {};
    (global as any).window = {
      ...prevWindow,
      addEventListener: jest.fn((event: string, cb: (e: any) => void) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      }),
      removeEventListener: jest.fn((event: string, cb: (e: any) => void) => {
        listeners[event] = (listeners[event] || []).filter((fn) => fn !== cb);
      }),
    };

    const onFirstOk = jest.fn();
    const onSecondCancel = jest.fn();
    const onSecondDelete = jest.fn();

    const screen = await render(
      <PaperProvider>
        <WebAlertDialogHost />
      </PaperProvider>
    );

    await act(async () => {
      Alert.alert('First notice', 'Saved locally', [{ text: 'Got it', onPress: onFirstOk }]);
      Alert.alert('Delete forever?', 'Cannot be undone.', [
        { text: 'Cancel', style: 'cancel', onPress: onSecondCancel },
        { text: 'Delete forever', style: 'destructive', onPress: onSecondDelete },
      ]);
    });

    expect(screen.getByText('First notice')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Got it'));

    expect(onFirstOk).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Delete forever?')).toBeTruthy();

    await act(async () => {
      for (const handler of listeners.keydown || []) {
        handler({ key: 'Escape', preventDefault: jest.fn() });
      }
    });

    expect(onSecondCancel).toHaveBeenCalledTimes(1);
    expect(onSecondDelete).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Delete forever?')).toBeNull();
    });

    (global as any).window = prevWindow;
  });

  test('falls back to window.confirm when no WebAlertDialogHost is mounted', () => {
    const prevWindow = (global as any).window;
    const mockConfirm = jest.fn(() => false);
    (global as any).window = { confirm: mockConfirm, alert: jest.fn() };

    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    Alert.alert('Fallback prompt', 'Are you sure?', [
      { text: 'No', style: 'cancel', onPress: onCancel },
      { text: 'Yes', onPress: onConfirm },
    ]);

    expect(mockConfirm).toHaveBeenCalledWith('Fallback prompt\n\nAre you sure?');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    (global as any).window = prevWindow;
  });
});
