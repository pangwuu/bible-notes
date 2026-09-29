import React from 'react';
import VersePill from '../../src/components/VersePill';
import VersePreviewModal from '../../src/components/VersePreviewModal';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Recursive text extractor for React element trees
function extractText(element: any): string {
  if (!element) return '';
  if (typeof element === 'string' || typeof element === 'number') {
    return String(element);
  }
  if (Array.isArray(element)) {
    return element.map(extractText).join(' ');
  }
  if (element.props && element.props.children) {
    return extractText(element.props.children);
  }
  return '';
}

describe('VersePill Component', () => {
  it('renders single and ranged verse pill element correctly', () => {
    const singleElement = <VersePill startVerse={5} endVerse={5} color="#E3A53D" onPress={jest.fn()} />;
    const singleTree = (VersePill as any)(singleElement.props);
    const textSingle = extractText(singleTree);
    expect(textSingle).toContain('v. 5');

    const rangeElement = <VersePill startVerse={1} endVerse={3} color="#E3A53D" onPress={jest.fn()} />;
    const rangeTree = (VersePill as any)(rangeElement.props);
    const textRange = extractText(rangeTree);
    expect(textRange).toContain('v. 1–3');

    const canonicalElement = <VersePill startVerse={1} endVerse={1} book="Matthew" chapter={1} color="#E3A53D" onPress={jest.fn()} />;
    const canonicalTree = (VersePill as any)(canonicalElement.props);
    const textCanonical = extractText(canonicalTree);
    expect(textCanonical).toContain('Matt 1:1');
    const outOfRangeElement = <VersePill startVerse={21} endVerse={21} book="Mark" chapter={21} color="#E3A53D" onPress={jest.fn()} />;
    const outOfRangeTree = (VersePill as any)(outOfRangeElement.props);
    const textOutOfRange = extractText(outOfRangeTree);
    expect(textOutOfRange).toContain('Mark 21:21');
  });

  it('triggers onPress when clicked', () => {
    const onPressMock = jest.fn();
    const element = <VersePill startVerse={2} endVerse={4} onPress={onPressMock} />;
    const tree = (VersePill as any)(element.props);
    // tree is View -> children[0] is Pressable with onPress
    const mainPressable = tree.props.children[0];
    expect(mainPressable.props.onPress).toBe(onPressMock);
    mainPressable.props.onPress();
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('renders remove button and triggers onRemove', () => {
    const onRemoveMock = jest.fn();
    const element = <VersePill startVerse={2} endVerse={4} onPress={jest.fn()} onRemove={onRemoveMock} />;
    const tree = (VersePill as any)(element.props);
    // tree is View -> children[1] is onRemove Pressable
    const removeBtn = tree.props.children[1];
    expect(removeBtn).toBeDefined();
    expect(removeBtn.props.onPress).toBe(onRemoveMock);
    removeBtn.props.onPress();
    expect(onRemoveMock).toHaveBeenCalledTimes(1);
  });
});

describe('VersePreviewModal Component', () => {
  it('renders verse preview text and handles view in context callback', () => {
    const onViewInContextMock = jest.fn();
    const onCloseMock = jest.fn();

    const element = (
      <VersePreviewModal
        visible={true}
        passageRef="Romans 12:1–2"
        startVerse={1}
        endVerse={2}
        verseText="I appeal to you therefore, brothers..."
        translation="ESV"
        onClose={onCloseMock}
        onViewInContext={onViewInContextMock}
      />
    );

    const tree = (VersePreviewModal as any)(element.props);
    const allText = extractText(tree);

    expect(allText).toContain('Romans 12:1–2');
    expect(allText).toContain('v. 1–2');
    expect(allText).toContain('I appeal to you therefore, brothers...');
    expect(allText).toContain('View in Passage');
  });

  it('renders canonical book/chapter and compound verses in header', () => {
    const element = (
      <VersePreviewModal
        visible={true}
        passageRef="Matthew 1:1-10, Mark 1:1-10"
        startVerse={1}
        endVerse={10}
        book="Matthew"
        chapter={1}
        verses={[1, 2, 3, 10]}
        verseText="1. The book of the genealogy... 10. and Hezekiah the father of Manasseh..."
        translation="ESV"
        onClose={jest.fn()}
      />
    );

    const tree = (VersePreviewModal as any)(element.props);
    const allText = extractText(tree);

    expect(allText).toContain('Matt 1:1–3, 10');
    expect(allText).not.toContain('Matthew 1:1-10, Mark 1:1-10 (v. 1-10)');
    expect(allText).toContain('1. The book of the genealogy... 10. and Hezekiah the father of Manasseh...');
  });

  it('renders loading indicator and message when loading is true', () => {
    const element = (
      <VersePreviewModal
        visible={true}
        passageRef="Romans 12:1–2"
        startVerse={1}
        endVerse={2}
        verseText=""
        loading={true}
        translation="ESV"
        onClose={jest.fn()}
      />
    );

    const tree = (VersePreviewModal as any)(element.props);
    const allText = extractText(tree);

    expect(allText).toContain('Loading Scripture text...');
  });

  it('triggers onClose when backdrop overlay is pressed', () => {
    const onCloseMock = jest.fn();
    const element = (
      <VersePreviewModal
        visible={true}
        passageRef="Romans 12:1–2"
        startVerse={1}
        endVerse={2}
        verseText="Some text"
        onClose={onCloseMock}
      />
    );

    const tree = (VersePreviewModal as any)(element.props);
    // In Modal, children is View (modalRoot), which contains [Pressable (backdrop), View (sheetContainer)]
    const modalRoot = tree.props.children;
    const backdrop = modalRoot.props.children[0];
    expect(backdrop.props.accessibilityLabel).toBe('Dismiss verse preview');
    backdrop.props.onPress();
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('resolves correct book context for secondary passage segments via secIdx', () => {
    const { ScriptureView } = require('../../src/components/bibleReader/ScriptureView');
    const onToggleMock = jest.fn();

    const targetPassage = {
      display: 'Matthew 1:1-3, Mark 1:1-3',
      segments: [
        { book: 'Matthew', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 3 },
        { book: 'Mark', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 3 },
      ],
    };

    const passageResult = {
      verses: [
        { verseNumber: 1, text: 'Matt v1' },
        { verseNumber: 2, text: 'Matt v2' },
        { verseNumber: 1, text: 'Mark v1' },
        { verseNumber: 2, text: 'Mark v2' },
      ],
      text: 'Combined text',
      sections: [
        {
          title: 'Matthew 1:1–3',
          verses: [{ verseNumber: 2, text: 'Matt v2' }],
          text: 'Matt v2',
          // no segment property on section to test fallback via secIdx
        },
        {
          title: 'Mark 1:1–3',
          verses: [{ verseNumber: 2, text: 'Mark v2' }],
          text: 'Mark v2',
          // no segment property on section to test fallback via secIdx
        },
      ],
      translation: 'ESV' as const,
      source: 'cache' as const,
      cached: true,
    };

    const element = (
      <ScriptureView
        loading={false}
        isOfflineEmpty={false}
        passageResult={passageResult}
        selectedTranslation="ESV"
        targetPassage={targetPassage as any}
        fontSize={16}
        showVerseNumbers={true}
        selectedVerses={new Set()}
        onToggleVerse={onToggleMock}
        onRetry={jest.fn()}
      />
    );

    const tree = (ScriptureView as any)(element.props);
    expect(tree).toBeDefined();

    // Verify sections render
    const contentWrapper = tree;
    const scriptureContainer = contentWrapper.props.children[0];
    const sectionsRendered = scriptureContainer.props.children;
    expect(sectionsRendered.length).toBe(2);

    // Section 1 (Mark) should render verse 2 with Mark context
    const markSection = sectionsRendered[1];
    const verseParagraph = markSection.props.children[1];
    const markVerseItem = verseParagraph.props.children[0];

    // Toggle verse in Mark section
    markVerseItem.props.onToggle(2);
    expect(onToggleMock).toHaveBeenCalledWith(2, { book: 'Mark', chapter: 1 });
  });
});


