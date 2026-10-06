/**
 * Component Integration Test for PassagePicker
 * Validates step progression (Book -> Chapter -> Verse), multi-segment tray management,
 * and final PassageSelection callback.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PassagePicker from '../../src/components/passagePicker/PassagePicker';

describe('PassagePicker Component Flow', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders book step view with OT and NT tabs when visible', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    expect(getByPlaceholderText(/Type book or passage/)).toBeTruthy();
    expect(getByText(/Old Testament/)).toBeTruthy();
    expect(getByText(/New Testament/)).toBeTruthy();
  });

  test('filters books when searching in search bar', async () => {
    const { getByPlaceholderText, getByText, queryByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    // Switch to NT
    await act(async () => {
      fireEvent.press(getByText(/New Testament/));
    });

    // Search "Rom"
    const searchInput = getByPlaceholderText(/Type book or passage/);
    await act(async () => {
      fireEvent.changeText(searchInput, 'Romans');
    });

    expect(getByText('Romans')).toBeTruthy();
    expect(queryByText('Matthew')).toBeNull();
  });

  test('selecting a book transitions picker step to chapter selection', async () => {
    const { getByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    // Switch to NT
    await act(async () => {
      fireEvent.press(getByText(/New Testament/));
    });

    // Select Romans
    await act(async () => {
      fireEvent.press(getByText('Romans'));
    });

    // Should now show Chapters for Romans (1 to 16)
    await waitFor(() => {
      expect(getByText('1')).toBeTruthy();
      expect(getByText('16')).toBeTruthy();
    });
  });

  test('selecting a chapter transitions to verse selection and selecting a verse enables Confirm', async () => {
    const { getByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    // NT -> Romans
    await act(async () => {
      fireEvent.press(getByText(/New Testament/));
    });

    await act(async () => {
      fireEvent.press(getByText('Romans'));
    });

    // Chapter 8
    await waitFor(() => {
      expect(getByText('8')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('8'));
    });

    // Should display verse action header with Entire chapter chip
    await waitFor(() => {
      expect(getByText(/Entire chapter/)).toBeTruthy();
    });

    // Select entire chapter
    await act(async () => {
      fireEvent.press(getByText(/Entire chapter/));
    });

    // Tap Confirm button
    const confirmButton = getByText('Confirm');
    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        book: 'Romans',
        startChapter: 8,
        display: expect.stringContaining('Romans 8'),
      })
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('invokes onClose when cancel or dismiss button is clicked', async () => {
    const { getByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const cancelButton = getByText('Cancel');
    await act(async () => {
      fireEvent.press(cancelButton);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});
