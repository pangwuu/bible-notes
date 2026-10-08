/**
 * Unit tests for pericope section heading rendering in ScriptureView / BibleReader
 * Example focus: Luke 12 (v13 "The Parable of the Rich Fool", v22 "Do Not Be Anxious" / "Do Not Worry")
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ScriptureView } from '../../src/components/bibleReader/ScriptureView';
import { VerseSegment, PassageFetchResult } from '../../src/services/bibleService';
import { PassageReference } from '../../src/types/note';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

function extractAllText(testRenderer: renderer.ReactTestRenderer): string {
  const json = testRenderer.toJSON();
  function walk(node: any): string {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map(walk).join(' ');
    }
    if (node.children) {
      return walk(node.children);
    }
    return '';
  }
  return walk(json).replace(/\s+/g, ' ').trim();
}

describe('ScriptureView Pericope Headings Rendering (Luke 12 Example)', () => {
  const mockLuke12VersesEsv: VerseSegment[] = [
    {
      verseNumber: 13,
      text: 'Someone in the crowd said to him, "Teacher, tell my brother to divide the inheritance with me."',
      heading: 'The Parable of the Rich Fool',
    },
    {
      verseNumber: 14,
      text: 'But he said to him, "Man, who made me a judge or arbitrator over you?"',
    },
    {
      verseNumber: 15,
      text: 'And he said to them, "Take care, and be on your guard against all covetousness..."',
    },
    {
      verseNumber: 22,
      text: 'And he said to his disciples, "Therefore I tell you, do not be anxious about your life..."',
      heading: 'Do Not Be Anxious',
    },
    {
      verseNumber: 23,
      text: 'For life is more than food, and the body more than clothing.',
    },
  ];

  const mockLuke12VersesBsb: VerseSegment[] = [
    {
      verseNumber: 13,
      text: 'Then someone in the crowd said to Him, "Teacher, tell my brother to divide the inheritance with me."',
      heading: 'The Parable of the Rich Fool',
    },
    {
      verseNumber: 14,
      text: 'Jesus replied, "Man, who appointed Me a judge or an arbiter over you?"',
    },
    {
      verseNumber: 22,
      text: 'Then Jesus said to His disciples, "Therefore I tell you, do not worry about your life..."',
      heading: 'Do Not Worry',
    },
    {
      verseNumber: 23,
      text: 'For life is more than food, and the body more than clothes.',
    },
  ];

  const mockLuke12VersesKjv: VerseSegment[] = [
    {
      verseNumber: 13,
      text: 'And one of the company said unto him, Master, speak to my brother, that he divide the inheritance with me.',
    },
    {
      verseNumber: 14,
      text: 'And he said unto him, Man, who made me a judge or a divider over you?',
    },
    {
      verseNumber: 22,
      text: 'And he said unto his disciples, Therefore I say unto you, Take no thought for your life...',
    },
    {
      verseNumber: 23,
      text: 'The life is more than meat, and the body is more than raiment.',
    },
  ];

  const defaultTargetPassage: PassageReference = {
    display: 'Luke 12:13–23',
    books: ['Luke'],
    segments: [{ book: 'Luke', startChapter: 12, startVerse: 13, endChapter: 12, endVerse: 23 }],
  };

  it('renders ESV Luke 12 pericope subheadings as distinct block elements above their respective verses', () => {
    const onToggleMock = jest.fn();
    const passageResult: PassageFetchResult = {
      verses: mockLuke12VersesEsv,
      text: '',
      translation: 'ESV',
      source: 'esv',
      cached: false,
    };

    let testRenderer!: renderer.ReactTestRenderer;
    act(() => {
      testRenderer = renderer.create(
        <ScriptureView
          loading={false}
          isOfflineEmpty={false}
          passageResult={passageResult}
          selectedTranslation="ESV"
          targetPassage={defaultTargetPassage}
          fontSize={16}
          showVerseNumbers={true}
          selectedVerses={new Set()}
          onToggleVerse={onToggleMock}
          onRetry={jest.fn()}
        />
      );
    });

    const fullText = extractAllText(testRenderer);

    // Assert both headings appear in full text output
    expect(fullText).toContain('The Parable of the Rich Fool');
    expect(fullText).toContain('Do Not Be Anxious');
    expect(fullText).toContain('Someone in the crowd said to him');
    expect(fullText).toContain('do not be anxious about your life');

    // Find all heading elements by testID
    const headingNodes = testRenderer.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('pericope-heading-')
    );
    expect(headingNodes.length).toBe(2);
    expect(headingNodes[0].props.children).toBe('The Parable of the Rich Fool');
    expect(headingNodes[1].props.children).toBe('Do Not Be Anxious');
  });

  it('isolates touch targets: pressing heading does NOT toggle verse, pressing verse DOES toggle verse', () => {
    const onToggleMock = jest.fn();
    const passageResult: PassageFetchResult = {
      verses: mockLuke12VersesEsv,
      text: '',
      translation: 'ESV',
      source: 'esv',
      cached: false,
    };

    let testRenderer!: renderer.ReactTestRenderer;
    act(() => {
      testRenderer = renderer.create(
        <ScriptureView
          loading={false}
          isOfflineEmpty={false}
          passageResult={passageResult}
          selectedTranslation="ESV"
          targetPassage={defaultTargetPassage}
          fontSize={16}
          showVerseNumbers={true}
          selectedVerses={new Set()}
          onToggleVerse={onToggleMock}
          onRetry={jest.fn()}
        />
      );
    });

    // Heading node should NOT have onPress attached
    const headingNodes = testRenderer.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('pericope-heading-')
    );
    expect(headingNodes.length).toBe(2);
    expect(headingNodes[0].props.onPress).toBeUndefined();

    // Find VerseItem nodes with verse prop
    const verseNodes = testRenderer.root.findAll((node) => Boolean(node.props.verse));
    expect(verseNodes.length).toBe(5);

    // Toggle verse 13
    verseNodes[0].props.onToggle(13);
    expect(onToggleMock).toHaveBeenCalledWith(13, { book: 'Luke', chapter: 12 });
  });

  it('isolates selection styling: selecting verse 13 does not apply selected styling to heading', () => {
    const onToggleMock = jest.fn();
    const passageResult: PassageFetchResult = {
      verses: mockLuke12VersesEsv,
      text: '',
      translation: 'ESV',
      source: 'esv',
      cached: false,
    };

    let testRenderer!: renderer.ReactTestRenderer;
    act(() => {
      testRenderer = renderer.create(
        <ScriptureView
          loading={false}
          isOfflineEmpty={false}
          passageResult={passageResult}
          selectedTranslation="ESV"
          targetPassage={defaultTargetPassage}
          fontSize={16}
          showVerseNumbers={true}
          selectedVerses={new Set([13])}
          onToggleVerse={onToggleMock}
          onRetry={jest.fn()}
        />
      );
    });

    // Heading style should NOT have selected background or underline
    const headingNodes = testRenderer.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('pericope-heading-')
    );
    const headingStyle = headingNodes[0].props.style;
    const flatStyle = Array.isArray(headingStyle)
      ? Object.assign({}, ...headingStyle.filter(Boolean))
      : headingStyle;

    expect(flatStyle.textDecorationLine).toBeUndefined();
    expect(flatStyle.backgroundColor).toBeUndefined();

    // VerseItem for verse 13 should have isSelected = true
    const verseNodes = testRenderer.root.findAll((node) => Boolean(node.props.verse));
    expect(verseNodes[0].props.isSelected).toBe(true);
    expect(verseNodes[1].props.isSelected).toBe(false);
  });

  it('renders KJV without pericope headings seamlessly without empty blocks or errors', () => {
    const onToggleMock = jest.fn();
    const passageResult: PassageFetchResult = {
      verses: mockLuke12VersesKjv,
      text: '',
      translation: 'KJV',
      source: 'firestore',
      cached: false,
    };

    let testRenderer!: renderer.ReactTestRenderer;
    act(() => {
      testRenderer = renderer.create(
        <ScriptureView
          loading={false}
          isOfflineEmpty={false}
          passageResult={passageResult}
          selectedTranslation="KJV"
          targetPassage={defaultTargetPassage}
          fontSize={16}
          showVerseNumbers={true}
          selectedVerses={new Set()}
          onToggleVerse={onToggleMock}
          onRetry={jest.fn()}
        />
      );
    });

    const fullText = extractAllText(testRenderer);

    expect(fullText).toContain('And one of the company said unto him');
    expect(fullText).not.toContain('The Parable of the Rich Fool');
    expect(fullText).not.toContain('Do Not Be Anxious');
    expect(fullText).not.toContain('Do Not Worry');

    const headingNodes = testRenderer.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('pericope-heading-')
    );
    expect(headingNodes.length).toBe(0);
  });

  it('renders BSB pericope variation correctly (Luke 12:22 "Do Not Worry")', () => {
    const onToggleMock = jest.fn();
    const passageResult: PassageFetchResult = {
      verses: mockLuke12VersesBsb,
      text: '',
      translation: 'BSB',
      source: 'firestore',
      cached: false,
    };

    let testRenderer!: renderer.ReactTestRenderer;
    act(() => {
      testRenderer = renderer.create(
        <ScriptureView
          loading={false}
          isOfflineEmpty={false}
          passageResult={passageResult}
          selectedTranslation="BSB"
          targetPassage={defaultTargetPassage}
          fontSize={16}
          showVerseNumbers={true}
          selectedVerses={new Set()}
          onToggleVerse={onToggleMock}
          onRetry={jest.fn()}
        />
      );
    });

    const headingNodes = testRenderer.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('pericope-heading-')
    );

    expect(headingNodes.length).toBe(2);
    expect(headingNodes[0].props.children).toBe('The Parable of the Rich Fool');
    expect(headingNodes[1].props.children).toBe('Do Not Worry');
  });

  it('renders multi-section passage with headings cleanly across sections', () => {
    const onToggleMock = jest.fn();
    const passageResult: PassageFetchResult = {
      verses: [],
      sections: [
        {
          title: 'Luke 12:13–15',
          text: '',
          segment: { book: 'Luke', startChapter: 12, startVerse: 13, endChapter: 12, endVerse: 15 },
          verses: mockLuke12VersesEsv.slice(0, 3),
        },
        {
          title: 'Luke 12:22–23',
          text: '',
          segment: { book: 'Luke', startChapter: 12, startVerse: 22, endChapter: 12, endVerse: 23 },
          verses: mockLuke12VersesEsv.slice(3),
        },
      ],
      text: '',
      translation: 'ESV',
      source: 'esv',
      cached: false,
    };

    const multiTargetPassage: PassageReference = {
      display: 'Luke 12:13–15, 22–23',
      books: ['Luke'],
      segments: [
        { book: 'Luke', startChapter: 12, startVerse: 13, endChapter: 12, endVerse: 15 },
        { book: 'Luke', startChapter: 12, startVerse: 22, endChapter: 12, endVerse: 23 },
      ],
    };

    let testRenderer!: renderer.ReactTestRenderer;
    act(() => {
      testRenderer = renderer.create(
        <ScriptureView
          loading={false}
          isOfflineEmpty={false}
          passageResult={passageResult}
          selectedTranslation="ESV"
          targetPassage={multiTargetPassage}
          fontSize={16}
          showVerseNumbers={true}
          selectedVerses={new Set()}
          onToggleVerse={onToggleMock}
          onRetry={jest.fn()}
        />
      );
    });

    const fullText = extractAllText(testRenderer);

    expect(fullText).toContain('Luke 12:13–15');
    expect(fullText).toContain('The Parable of the Rich Fool');
    expect(fullText).toContain('Luke 12:22–23');
    expect(fullText).toContain('Do Not Be Anxious');

    const headingNodes = testRenderer.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('pericope-heading-')
    );
    expect(headingNodes.length).toBe(2);
  });
});
