/**
 * Unit Test for useBibleReader Hook
 * Validates passage loading, translation switching, context-aware verse selection,
 * auto-expansion on verse highlight, and offline error states.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useBibleReader } from '../../src/components/bibleReader/useBibleReader';
import * as bibleService from '../../src/services/bibleService';
import safeStorage from '../../src/utils/safeStorage';
import { PassageReference } from '../../src/types/note';

jest.mock('../../src/services/bibleService', () => ({
  fetchPassageText: jest.fn(),
  formatPassageQuery: jest.fn((p) => p?.display || 'Romans 8:28'),
}));

const mockPassage: PassageReference = {
  display: 'Romans 8:28-30',
  books: ['Romans'],
  segments: [
    {
      book: 'Romans',
      startChapter: 8,
      startVerse: 28,
      endChapter: 8,
      endVerse: 30,
    },
  ],
};

const mockFetchResult: bibleService.PassageFetchResult = {
  verses: [
    { verseNumber: 28, text: 'And we know that in all things God works for the good...' },
    { verseNumber: 29, text: 'For those God foreknew he also predestined...' },
    { verseNumber: 30, text: 'And those he predestined, he also called...' },
  ],
  text: 'And we know that in all things...',
  translation: 'ESV',
  source: 'web',
  cached: false,
};

describe('useBibleReader Hook', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await safeStorage.clear();
    (bibleService.fetchPassageText as jest.Mock).mockResolvedValue(mockFetchResult);
  });

  test('loads passage text on mount with preferred translation', async () => {
    const { result } = await renderHook(() =>
      useBibleReader({
        passage: mockPassage,
        preferredTranslation: 'ESV',
      })
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.selectedTranslation).toBe('ESV');
    expect(result.current.passageResult).toEqual(mockFetchResult);
    expect(result.current.isOfflineEmpty).toBe(false);
  });

  test('sets isOfflineEmpty to true when fetch fails with error and no cached text', async () => {
    (bibleService.fetchPassageText as jest.Mock).mockResolvedValueOnce({
      verses: [],
      text: '',
      translation: 'ESV',
      source: 'web',
      cached: false,
      error: 'Network request failed',
    });

    const { result } = await renderHook(() =>
      useBibleReader({
        passage: mockPassage,
        preferredTranslation: 'ESV',
      })
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isOfflineEmpty).toBe(true);
  });

  test('toggles verse selection and clears selection on demand', async () => {
    const { result } = await renderHook(() =>
      useBibleReader({
        passage: mockPassage,
      })
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
      expect(result.current.loading).toBe(false);
    });

    // Select verse 28
    await act(async () => {
      result.current.handleToggleVerse(28, { book: 'Romans', chapter: 8 });
    });

    await waitFor(() => {
      expect(result.current.selectedVerses.has(28)).toBe(true);
      expect(result.current.sortedSelectedVerses).toEqual([28]);
    });

    // Select verse 29 (adds to range)
    await act(async () => {
      result.current.handleToggleVerse(29, { book: 'Romans', chapter: 8 });
    });

    await waitFor(() => {
      expect(result.current.selectedVerses.has(28)).toBe(true);
      expect(result.current.selectedVerses.has(29)).toBe(true);
      expect(result.current.sortedSelectedVerses).toEqual([28, 29]);
    });

    // Toggle verse 28 off
    await act(async () => {
      result.current.handleToggleVerse(28, { book: 'Romans', chapter: 8 });
    });

    await waitFor(() => {
      expect(result.current.selectedVerses.has(28)).toBe(false);
      expect(result.current.selectedVerses.has(29)).toBe(true);
    });

    // Clear all
    await act(async () => {
      result.current.clearSelectedVerses();
    });

    await waitFor(() => {
      expect(result.current.selectedVerses.size).toBe(0);
      expect(result.current.activeContext).toBeNull();
    });
  });

  test('resets verse selection when switching passage context (different chapter)', async () => {
    const { result } = await renderHook(() =>
      useBibleReader({
        passage: mockPassage,
      })
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
      expect(result.current.loading).toBe(false);
    });

    // Select verse in chapter 8
    await act(async () => {
      result.current.handleToggleVerse(28, { book: 'Romans', chapter: 8 });
    });

    await waitFor(() => {
      expect(result.current.selectedVerses.has(28)).toBe(true);
    });

    // User taps verse 1 in chapter 9 (different chapter)
    await act(async () => {
      result.current.handleToggleVerse(1, { book: 'Romans', chapter: 9 });
    });

    await waitFor(() => {
      // Verse 28 from chapter 8 should be cleared, only verse 1 selected
      expect(result.current.selectedVerses.has(28)).toBe(false);
      expect(result.current.selectedVerses.has(1)).toBe(true);
      expect(result.current.activeContext).toEqual({ book: 'Romans', chapter: 9 });
    });
  });

  test('switching translation clears active verse selection and reloads text', async () => {
    const { result } = await renderHook(() =>
      useBibleReader({
        passage: mockPassage,
        preferredTranslation: 'ESV',
      })
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.handleToggleVerse(28, { book: 'Romans', chapter: 8 });
    });

    await waitFor(() => {
      expect(result.current.selectedVerses.size).toBe(1);
    });

    // Switch to KJV
    await act(async () => {
      result.current.setSelectedTranslation('KJV');
    });

    await waitFor(() => {
      expect(result.current.selectedTranslation).toBe('KJV');
      expect(result.current.selectedVerses.size).toBe(0);
      expect(bibleService.fetchPassageText).toHaveBeenCalledWith(
        mockPassage,
        expect.objectContaining({ translation: 'KJV' })
      );
    });
  });

  test('auto-expands collapsed reader when targetHighlightedVerse prop is supplied', async () => {
    const { result, rerender } = await renderHook(
      (props: { targetHighlightedVerse?: any }) =>
        useBibleReader({
          passage: mockPassage,
          initiallyCollapsed: true,
          targetHighlightedVerse: props?.targetHighlightedVerse,
        }),
      {
        initialProps: { targetHighlightedVerse: undefined as any },
      }
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current.collapsed).toBe(true);

    // Rerender with highlighted verse
    await act(async () => {
      rerender({
        targetHighlightedVerse: { book: 'Romans', chapter: 8, verse: 28 },
      });
    });

    await waitFor(() => {
      expect(result.current.collapsed).toBe(false);
    });
  });
});
