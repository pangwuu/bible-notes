import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ScriptureView } from '../../src/components/bibleReader/ScriptureView';
import { fetchPassageText, buildBibleCacheKey } from '../../src/services/bibleService';
import { createPassageReference } from '../../src/utils/passageParser';
import safeStorage from '../../src/utils/safeStorage';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('Multi-Chapter Passage Reader & Verse Selection', () => {
  beforeEach(async () => {
    await safeStorage.clear();
  });

  test('createPassageReference decomposes cross-chapter spans into separate chapter segments', () => {
    const rawSegment = {
      book: 'Hebrews',
      startChapter: 5,
      startVerse: 1,
      endChapter: 6,
      endVerse: 20,
    };
    const passageRef = createPassageReference([rawSegment]);

    expect(passageRef.segments).toHaveLength(2);
    expect(passageRef.segments[0]).toMatchObject({
      book: 'Hebrews',
      startChapter: 5,
      endChapter: 5,
      startVerse: 1,
      endVerse: 14,
    });
    expect(passageRef.segments[1]).toMatchObject({
      book: 'Hebrews',
      startChapter: 6,
      endChapter: 6,
      startVerse: 1,
      endVerse: 20,
    });
    expect(passageRef.display).toBe('Hebrews 5, Hebrews 6');
  });

  test('ScriptureView isolates verse selection by chapter and prevents collision on verse 1', () => {
    const mockOnToggleVerse = jest.fn();
    const passage = createPassageReference([
      { book: 'Hebrews', startChapter: 5, startVerse: 1, endChapter: 6, endVerse: 20 },
    ]);

    const mockPassageResult = {
      verses: [
        { verseNumber: 1, text: 'Hebrews 5:1 text' },
        { verseNumber: 1, text: 'Hebrews 6:1 text' },
      ],
      text: 'Hebrews 5:1 text\n\nHebrews 6:1 text',
      sections: [
        {
          title: 'Hebrews 5',
          segment: passage.segments[0],
          verses: [{ verseNumber: 1, text: 'Hebrews 5:1 text' }],
          text: 'Hebrews 5:1 text',
        },
        {
          title: 'Hebrews 6',
          segment: passage.segments[1],
          verses: [{ verseNumber: 1, text: 'Hebrews 6:1 text' }],
          text: 'Hebrews 6:1 text',
        },
      ],
      translation: 'ESV' as const,
      source: 'web' as const,
      cached: false,
    };

    let testRenderer: renderer.ReactTestRenderer;
    act(() => {
      testRenderer = renderer.create(
        <ScriptureView
          loading={false}
          isOfflineEmpty={false}
          passageResult={mockPassageResult}
          selectedTranslation="ESV"
          targetPassage={passage}
          fontSize={16}
          showVerseNumbers={true}
          selectedVerses={new Set([1])}
          activeContext={{ book: 'Hebrews', chapter: 5 }}
          onToggleVerse={mockOnToggleVerse}
          onRetry={jest.fn()}
        />
      );
    });

    const root = testRenderer!.root;

    // Find all VerseItem components rendered in the tree
    const verseItems = root.findAll((node) => (node.type as any)?.name === 'VerseItem' || node.props?.verse);
    expect(verseItems.length).toBe(2);

    // Verse 1 of chapter 5 should be selected because activeContext is chapter 5
    expect(verseItems[0].props.isSelected).toBe(true);
    // Verse 1 of chapter 6 must NOT be selected because activeContext is chapter 5
    expect(verseItems[1].props.isSelected).toBe(false);

    // Simulate tapping Verse 1 in Chapter 6
    act(() => {
      verseItems[1].props.onToggle(1);
    });

    // Verify context passed to onToggleVerse is chapter 6
    expect(mockOnToggleVerse).toHaveBeenCalledWith(1, { book: 'Hebrews', chapter: 6 });

    // Now re-render with activeContext set to chapter 6
    act(() => {
      testRenderer.update(
        <ScriptureView
          loading={false}
          isOfflineEmpty={false}
          passageResult={mockPassageResult}
          selectedTranslation="ESV"
          targetPassage={passage}
          fontSize={16}
          showVerseNumbers={true}
          selectedVerses={new Set([1])}
          activeContext={{ book: 'Hebrews', chapter: 6 }}
          onToggleVerse={mockOnToggleVerse}
          onRetry={jest.fn()}
        />
      );
    });

    const updatedVerseItems = testRenderer!.root.findAll((node) => (node.type as any)?.name === 'VerseItem' || node.props?.verse);
    // Verse 1 of chapter 5 should NOT be selected now
    expect(updatedVerseItems[0].props.isSelected).toBe(false);
    // Verse 1 of chapter 6 should be selected
    expect(updatedVerseItems[1].props.isSelected).toBe(true);
  });

  test('fetchPassageText automatically splits single cross-chapter segment into multi-segment sections', async () => {
    // Prime cache with mock responses for each decomposed segment
    const heb5Key = buildBibleCacheKey(59, 'HEB.5.1-14');
    const heb6Key = buildBibleCacheKey(59, 'HEB.6.1-20');
    await safeStorage.setItem(
      heb5Key,
      JSON.stringify({
        verses: [{ verseNumber: 1, text: 'For every high priest' }],
        text: 'For every high priest',
        translation: 'ESV',
        source: 'cache',
      })
    );
    await safeStorage.setItem(
      heb6Key,
      JSON.stringify({
        verses: [{ verseNumber: 1, text: 'Therefore let us leave' }],
        text: 'Therefore let us leave',
        translation: 'ESV',
        source: 'cache',
      })
    );

    // Legacy un-split input with startChapter 5 and endChapter 6
    const legacyPassage = {
      display: 'Hebrews 5-6',
      books: ['Hebrews'],
      segments: [
        {
          book: 'Hebrews',
          startChapter: 5,
          startVerse: 1,
          endChapter: 6,
          endVerse: 20,
        },
      ],
    };

    const result = await fetchPassageText(legacyPassage, { translation: 'ESV' });

    expect(result.sections).toBeDefined();
    expect(result.sections).toHaveLength(2);
    expect(result.sections![0].title).toBe('Hebrews 5');
    expect(result.sections![0].segment?.startChapter).toBe(5);
    expect(result.sections![1].title).toBe('Hebrews 6');
    expect(result.sections![1].segment?.startChapter).toBe(6);
  });
});
