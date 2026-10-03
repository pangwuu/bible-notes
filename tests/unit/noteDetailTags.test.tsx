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
jest.mock('../../src/hooks/useVersePreview', () => ({
  useVersePreview: () => ({
    openVersePreview: jest.fn(),
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
        content: 'Why does [v. 16] mention God so loved?',
      },
      {
        id: 'arrow',
        title: 'Application',
        color: '#7BA05B',
        content: 'Apply [v. 16] to daily life.',
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
    const verseTexts = root.findAllByType(Text).filter((t) => t.props.children === 'v. 16');
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
});
