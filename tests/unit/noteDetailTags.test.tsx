import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import NoteViewScreen from '../../app/note/[id]';
import * as notesService from '../../src/services/notesService';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/constants/theme';
import Markdown from 'react-native-markdown-display';

jest.mock('../../src/services/notesService');
jest.mock('../../src/context/AuthContext');
jest.mock('../../src/services/friendService', () => ({
  findFriendNoteOverlaps: jest.fn().mockResolvedValue([]),
  segmentsOverlap: jest.fn().mockReturnValue(false),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'note-test-color' }),
  useRouter: () => ({ canGoBack: () => true, back: jest.fn(), replace: jest.fn(), push: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn() }),
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(cb, []);
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    Ionicons: ({ name, color, size, style, testID }: any) =>
      React.createElement(RN.Text, { testID: testID || 'ionic-icon', name, color, size, style }),
    MaterialCommunityIcons: () => null,
  };
});
jest.mock('../../src/components/bibleReader/BibleReader', () => () => null);
const mockOpenVersePreview = jest.fn();
jest.mock('../../src/hooks/useVersePreview', () => ({
  useVersePreview: () => ({
    openVersePreview: mockOpenVersePreview,
    renderVersePreviewModal: () => null,
  }),
}));

describe('NoteViewScreen inline verse tag color adaptation', () => {
  const mockNote = {
    id: 'note-test-color',
    userId: 'user-1',
    title: 'Colors Test',
    passage: { books: ['John'], segments: [], display: 'John 3:16' },
    tags: ['salvation'],
    sections: [
      {
        id: 'question',
        title: 'Question',
        color: '#5B93C4',
        content: 'Why does [Rom 8:28] mention God so loved?',
      },
      {
        id: 'arrow',
        title: 'Application',
        color: '#7BA05B',
        content: 'Apply [Rom 8:28] to daily life.',
      },
    ],
    created_at: 1000,
    updated_at: 2000,
  };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: 'user-1' },
      profile: { settings: { enable_friends: true } },
    });
    (notesService.parseNoteId as jest.Mock).mockReturnValue('note-test-color');
    (notesService.getNote as jest.Mock).mockResolvedValue(mockNote);
    (notesService.getUserNotes as jest.Mock).mockResolvedValue([]);
  });

  it('adapts inline verse tag bookmark icon and text color to each section specific color', async () => {
    let component: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      component = renderer.create(<NoteViewScreen />);
    });
    // Wait for async loadNote and chained promises to resolve
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    });

    const root = component!.root;
    const bookmarkIcons = root
      .findAllByType(Text)
      .filter((node) => node.props.testID === 'ionic-icon' && node.props.name === 'bookmark');
    expect(bookmarkIcons.length).toBe(2);

    // Section 1 (Question): bookmark icon color is #5B93C4
    expect(bookmarkIcons[0].props.color).toBe('#5B93C4');
    expect(bookmarkIcons[0].props.color).not.toBe(colors.accent.keyIdea);

    // Section 2 (Application): bookmark icon color is #7BA05B
    expect(bookmarkIcons[1].props.color).toBe('#7BA05B');
    expect(bookmarkIcons[1].props.color).not.toBe(colors.accent.keyIdea);

    // Verify verse link text style
    const verseTexts = root.findAllByType(Text).filter((t) => t.props.children === 'Rom 8:28');
    expect(verseTexts.length).toBe(2);

    // Find the enclosing verse link badge Text elements
    const isColored = (style: any, targetColor: string) => {
      const flattened = Array.isArray(style) ? style.flat(Infinity) : [style];
      return flattened.some((s) => s && s.color === targetColor);
    };

    const linkBadges = root.findAllByType(Text).filter((t) => isColored(t.props.style, '#5B93C4'));
    expect(linkBadges.length).toBeGreaterThan(0);
    const appLinkBadges = root.findAllByType(Text).filter((t) => isColored(t.props.style, '#7BA05B'));
    expect(appLinkBadges.length).toBeGreaterThan(0);
  });

  it('correctly handles clicking [Heb 5:12] without chapter/verse transposition', async () => {
    const noteWithHebrews = {
      ...mockNote,
      sections: [
        {
          id: 'light',
          title: 'Key Idea',
          color: '#D4AF37',
          content: 'Consider [Heb 5:12] closely.',
        },
      ],
    };
    (notesService.getNote as jest.Mock).mockResolvedValue(noteWithHebrews);

    let component: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      component = renderer.create(<NoteViewScreen />);
    });
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    });

    const root = component!.root;
    const linkBadge = root.findAllByType(Text).find((t) => {
      if (!t.props.onPress) return false;
      const textChildren = t.findAllByType(Text);
      return textChildren.some((c) => c.props.children === 'Heb 5:12');
    });

    expect(linkBadge).toBeDefined();
    act(() => {
      linkBadge!.props.onPress();
    });

    expect(mockOpenVersePreview).toHaveBeenCalledWith(
      12,
      12,
      { book: 'Hebrews', chapter: 5, verses: [12] },
      false
    );
  });

  it('correctly handles clicking compound cross reference [Matt 1:1-3, Luke 3:10]', async () => {
    const noteWithCompound = {
      ...mockNote,
      sections: [
        {
          id: 'light',
          title: 'Key Idea',
          color: '#D4AF37',
          content: 'Compare [Matt 1:1-3, Luke 3:10] side by side.',
        },
      ],
    };
    (notesService.getNote as jest.Mock).mockResolvedValue(noteWithCompound);

    let component: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      component = renderer.create(<NoteViewScreen />);
    });
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    });

    const root = component!.root;
    const linkBadge = root.findAllByType(Text).find((t) => {
      if (!t.props.onPress) return false;
      const textChildren = t.findAllByType(Text);
      return textChildren.some((c) => c.props.children === 'Matt 1:1-3, Luke 3:10');
    });

    expect(linkBadge).toBeDefined();
    act(() => {
      linkBadge!.props.onPress();
    });

    expect(mockOpenVersePreview).toHaveBeenCalledWith(
      1,
      3,
      expect.objectContaining({
        book: 'Matthew',
        chapter: 1,
        verses: [1, 2, 3],
        customTitle: 'Matthew 1:1-3; Luke 3:10',
        segments: [
          { book: 'Matthew', chapter: 1, startVerse: 1, endVerse: 3, verses: [1, 2, 3] },
          { book: 'Luke', chapter: 3, startVerse: 10, endVerse: 10, verses: [10] },
        ],
      }),
      false
    );
  });
});
