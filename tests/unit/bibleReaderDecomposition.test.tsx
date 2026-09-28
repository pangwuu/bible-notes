/**
 * Unit tests for decomposed BibleReader sub-components
 */

import React from 'react';
import { BibleReaderHeader } from '../../src/components/bibleReader/BibleReaderHeader';
import { TranslationSelector } from '../../src/components/bibleReader/TranslationSelector';
import { VerseItem } from '../../src/components/bibleReader/VerseItem';
import { VerseActionBar } from '../../src/components/bibleReader/VerseActionBar';
import { SUPPORTED_TRANSLATIONS } from '../../src/services/bibleService';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

function extractNormalizedText(element: any): string {
  function walk(node: any): string {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map(walk).join('');
    }
    if (node.props && node.props.children) {
      return walk(node.props.children);
    }
    return '';
  }
  return walk(element).replace(/\s+/g, ' ').trim();
}

describe('BibleReader Decomposed Sub-Components', () => {
  describe('BibleReaderHeader', () => {
    it('renders passage display and triggers collapse toggle onPress', () => {
      const onToggleCollapse = jest.fn();
      const element = (
        <BibleReaderHeader
          passageDisplay="Romans 12:1-2"
          collapsed={false}
          onToggleCollapse={onToggleCollapse}
        />
      );

      const tree = (BibleReaderHeader as any)(element.props);
      const text = extractNormalizedText(tree);
      expect(text).toContain('Romans 12:1-2');

      expect(typeof tree.props.onPress).toBe('function');
      tree.props.onPress();
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });
  });

  describe('TranslationSelector', () => {
    it('renders all supported translation pills and handles selection', () => {
      const onSelect = jest.fn();
      const element = (
        <TranslationSelector
          selectedTranslation="ESV"
          onSelectTranslation={onSelect}
        />
      );

      const tree = (TranslationSelector as any)(element.props);
      const text = extractNormalizedText(tree);

      for (const t of SUPPORTED_TRANSLATIONS) {
        expect(text).toContain(t.shortName);
      }

      const pills = tree.props.children;
      expect(pills.length).toBe(SUPPORTED_TRANSLATIONS.length);
      pills[1].props.onPress();
      expect(onSelect).toHaveBeenCalledWith(SUPPORTED_TRANSLATIONS[1].id);
    });
  });

  describe('VerseItem', () => {
    it('is wrapped in React.memo', () => {
      expect((VerseItem as any).$$typeof).toBe(Symbol.for('react.memo'));
    });

    it('renders heading, verse number, and content, and fires onToggle', () => {
      const onToggle = jest.fn();
      const ComponentToTest = (VerseItem as any).type || VerseItem;
      const element = (
        <ComponentToTest
          verse={{ verseNumber: 1, text: 'I appeal to you therefore, brothers', heading: 'A Living Sacrifice' }}
          isSelected={false}
          isTargetHighlighted={false}
          showVerseNumbers={true}
          fontSize={16}
          onToggle={onToggle}
        />
      );

      const tree = ComponentToTest(element.props);
      const text = extractNormalizedText(tree);
      expect(text).toContain('A Living Sacrifice');
      expect(text).toContain('1');
      expect(text).toContain('I appeal to you therefore, brothers');

      expect(typeof tree.props.onPress).toBe('function');
      tree.props.onPress();
      expect(onToggle).toHaveBeenCalledWith(1);
    });

    it('renders linked asterisk indicator when linkedSection is present', () => {
      const ComponentToTest = (VerseItem as any).type || VerseItem;
      const element = (
        <ComponentToTest
          verse={{ verseNumber: 5, text: 'So we, though many, are one body' }}
          isSelected={false}
          isTargetHighlighted={false}
          linkedSection={{ sectionId: 'keyIdea', sectionTitle: 'Key Idea', sectionColor: '#E3A53D' }}
          showVerseNumbers={true}
          fontSize={16}
          onToggle={jest.fn()}
        />
      );

      const tree = ComponentToTest(element.props);
      const text = extractNormalizedText(tree);
      expect(text).toContain('5*');
    });
  });

  describe('VerseActionBar', () => {
    it('returns null when sortedSelectedVerses is empty', () => {
      const element = (
        <VerseActionBar
          sortedSelectedVerses={[]}
          linkedSectionsToJump={[]}
          availableSections={[]}
          onClearSelection={jest.fn()}
          onShareSelected={jest.fn()}
        />
      );

      const tree = (VerseActionBar as any)(element.props);
      expect(tree).toBeNull();
    });

    it('renders selected range and controls when verses are selected', () => {
      const onClear = jest.fn();
      const onShare = jest.fn();
      const onJump = jest.fn();
      const onAttach = jest.fn();

      const element = (
        <VerseActionBar
          sortedSelectedVerses={[1, 2, 3]}
          linkedSectionsToJump={[
            { sectionId: 'keyIdea', sectionTitle: 'Key Idea', sectionColor: '#E3A53D' },
          ]}
          availableSections={[
            { id: 'keyIdea', title: 'Key Idea' },
          ]}
          targetPassage={{
            display: 'Romans 12:1–3',
            books: ['Romans'],
            segments: [{ book: 'Romans', startChapter: 12, startVerse: 1, endChapter: 12, endVerse: 3 }],
          }}
          onClearSelection={onClear}
          onShareSelected={onShare}
          onJumpToSection={onJump}
          onAttachToSection={onAttach}
        />
      );

      const tree = (VerseActionBar as any)(element.props);
      const text = extractNormalizedText(tree);
      expect(text).toContain('v. 1–3 selected');
      expect(text).toContain('Share');
      expect(text).toContain('Jump to Key Idea');
      expect(text).toContain('Note in:');
      expect(text).toContain('Key Idea');
    });
  });
});
