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
});
