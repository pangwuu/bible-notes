/**
 * Component Integration Test for PassagePicker
 * Validates the YouVersion-style book accordion, two-tap verse ranges,
 * and adding, reordering, editing, and deleting multiple passages.
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

  test('renders a searchable book list grouped by testament', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    expect(getByPlaceholderText(/Search books or type a reference/)).toBeTruthy();
    expect(getByText('Old Testament')).toBeTruthy();
    expect(getByText('New Testament')).toBeTruthy();
    expect(getByText('Genesis')).toBeTruthy();
    expect(getByText('Romans')).toBeTruthy();
  });

  test('filters books when searching in search bar', async () => {
    const { getByPlaceholderText, getByText, queryByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = getByPlaceholderText(/Search books or type a reference/);
    await act(async () => {
      fireEvent.changeText(searchInput, 'Romans');
    });

    expect(getByText('Romans')).toBeTruthy();
    expect(queryByText('Matthew')).toBeNull();
    expect(queryByText('Genesis')).toBeNull();
  });

  test('selecting a book opens its chapters inline', async () => {
    const { getByText, queryByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Romans'));
    });

    await waitFor(() => {
      expect(getByText('1')).toBeTruthy();
      expect(getByText('16')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Romans'));
    });

    await waitFor(() => {
      expect(queryByText('16')).toBeNull();
    });
  });

  test('selecting a chapter opens verses, and Done commits the range', async () => {
    const { getByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Romans'));
    });

    await waitFor(() => {
      expect(getByText('8')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('8'));
    });

    await waitFor(() => {
      expect(getByText('Entire chapter')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Entire chapter'));
    });

    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        book: 'Romans',
        startChapter: 8,
        startVerse: 1,
        endVerse: 39,
        display: expect.stringContaining('Romans 8'),
      })
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('two taps choose a verse range, including a backward second tap', async () => {
    const { getByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Romans'));
    });
    await act(async () => {
      fireEvent.press(getByText('8'));
    });
    await act(async () => {
      fireEvent.press(getByText('14'));
    });
    await act(async () => {
      fireEvent.press(getByText('10'));
    });
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        book: 'Romans',
        startChapter: 8,
        startVerse: 10,
        endVerse: 14,
      })
    );
  });

  test('adds, reorders, edits, and deletes multiple passages', async () => {
    const { getByText, getByLabelText, queryByLabelText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Romans'));
    });
    await act(async () => {
      fireEvent.press(getByText('8'));
    });
    await act(async () => {
      fireEvent.press(getByText('Entire chapter'));
    });
    await act(async () => {
      fireEvent.press(getByText('Add passage'));
    });

    expect(getByText('Romans 8')).toBeTruthy();
    expect(getByText('1 passage')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('John'));
    });
    await act(async () => {
      fireEvent.press(getByText('3'));
    });
    await act(async () => {
      fireEvent.press(getByText('Entire chapter'));
    });
    await act(async () => {
      fireEvent.press(getByText('Add passage'));
    });

    expect(getByText('2 passages')).toBeTruthy();
    expect(getByLabelText('Move John 3 up')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Move John 3 up'));
    });

    await act(async () => {
      fireEvent.press(getByLabelText('Edit Romans 8'));
    });
    await act(async () => {
      fireEvent.press(getByText('14'));
    });
    await act(async () => {
      fireEvent.press(getByText('18'));
    });
    await act(async () => {
      fireEvent.press(getByText('Save passage'));
    });

    expect(getByText('Romans 8:14–18')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Delete John 3'));
    });

    expect(queryByLabelText('Delete John 3')).toBeNull();
    expect(getByText('1 passage')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        book: 'Romans',
        startChapter: 8,
        startVerse: 14,
        endVerse: 18,
        segments: [
          expect.objectContaining({
            book: 'Romans',
            startChapter: 8,
            startVerse: 14,
            endVerse: 18,
          }),
        ],
      })
    );
  });

  test('loads existing passages for reorder without duplicating them', async () => {
    const { getByText, getByLabelText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        initialPassage={{
          segments: [
            { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 11 },
            { book: 'John', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 },
          ],
        }}
      />
    );

    expect(getByText('Romans 8:1–11')).toBeTruthy();
    expect(getByText('John 3:16')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Move John 3:16 up'));
    });
    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    const selection = mockOnSelect.mock.calls[0][0];
    expect(selection.segments).toEqual([
      { book: 'John', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 },
      { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 11 },
    ]);
    expect(selection.display).toContain('John 3:16');
    expect(selection.display).toContain('Romans 8:1');
  });

  test('searching hebrews then using the book and chapter grids keeps the filter', async () => {
    const { getByPlaceholderText, getByText, queryByText, getByDisplayValue, getByLabelText } =
      await render(
        <PassagePicker
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

    const searchInput = getByPlaceholderText(/Search books or type a reference/);
    await act(async () => {
      fireEvent.changeText(searchInput, 'hebrews');
    });

    expect(getByText('Hebrews')).toBeTruthy();
    expect(queryByText('Genesis')).toBeNull();
    expect(queryByText('Old Testament')).toBeNull();

    await act(async () => {
      fireEvent.press(getByText('Hebrews'));
    });

    expect(getByDisplayValue('hebrews')).toBeTruthy();
    expect(queryByText('Genesis')).toBeNull();
    expect(queryByText('Romans')).toBeNull();
    expect(getByLabelText('Hebrews chapter 1')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Hebrews chapter 1'));
    });

    expect(getByText('Entire chapter')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Back'));
    });

    expect(getByDisplayValue('hebrews')).toBeTruthy();
    expect(queryByText('Genesis')).toBeNull();
    expect(getByText('Hebrews')).toBeTruthy();
    expect(getByLabelText('Hebrews chapter 11')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText('Clear search'));
    });

    expect(getByText('Genesis')).toBeTruthy();
    expect(getByText('Hebrews')).toBeTruthy();
  });

  test('a typed reference can be confirmed without opening the grids', async () => {
    const { getByPlaceholderText, getByText, getAllByText, getByLabelText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText(/Search books or type a reference/),
        'John 3:16'
      );
    });

    expect(getAllByText('John 3:16').length).toBeGreaterThan(0);
    expect(getByText('Current selection')).toBeTruthy();
    expect(getByLabelText('Add John 3:16')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Done'));
    });

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        book: 'John',
        startChapter: 3,
        startVerse: 16,
        endVerse: 16,
      })
    );
  });

  test('a single-chapter book opens verses directly', async () => {
    const { getByText, queryByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Jude'));
    });

    expect(getByText('Entire chapter')).toBeTruthy();
    expect(queryByText('Another chapter')).toBeNull();
    expect(getByText('Back')).toBeTruthy();
  });

  test('invokes onClose when cancel is pressed', async () => {
    const { getByText } = await render(
      <PassagePicker
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Cancel'));
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});
