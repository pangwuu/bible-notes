/**
 * Unit Tests for Friends Activity & Note Overlap Limits:
 * 1. Dashboard: Cap "Shared Passages" and "Recent Updates" to 3 items with Show all / Show less toggle
 * 2. Note Details: Always show Reference header block above friend overlap pills
 * 3. Note Details: Cap friend overlap pills to 3 with inline +N more / Show less toggle
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, Pressable } from 'react-native';
import DashboardScreen from '../../app/(tabs)/index';
import NoteDetailScreen from '../../app/note/[id]';
import { Note } from '../../src/types/note';
import { DashboardFriendActivity, FriendActivityItem } from '../../src/services/dashboardService';
import { FriendOverlapItem } from '../../src/services/noteOverlapService';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialCommunityIcons: () => null,
}));

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, any> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
  useNavigation: () => ({
    setOptions: jest.fn(),
  }),
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(() => {
      cb();
    }, [cb]);
  },
}));

// Mock AuthContext
let mockUser: any = { uid: 'user_1', displayName: 'Johnny' };
let mockProfile: any = { username: 'johnny', display_name: 'Johnny' };

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
  }),
}));

// Mock safeStorage
jest.mock('../../src/utils/safeStorage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

// Mock services for Dashboard
let mockUserNotes: Note[] = [];
let mockFriendActivity: DashboardFriendActivity = {
  intersectingNotes: [],
  otherFriendNotes: [],
  hasFriends: true,
};

jest.mock('../../src/services/notesService', () => ({
  parseNoteId: jest.fn((id: string) => id || 'note_1'),
  getUserNotes: jest.fn(async () => mockUserNotes),
  getNote: jest.fn(async (id: string) => mockSingleNote),
  deleteNote: jest.fn(async () => {}),
}));

jest.mock('../../src/services/dashboardService', () => ({
  getDashboardFriendActivity: jest.fn(async () => mockFriendActivity),
  selectRandomReflectionNote: jest.fn(() => null),
}));

// Mock services for Note Detail
let mockSingleNote: Note | null = null;
let mockOverlaps: FriendOverlapItem[] = [];

jest.mock('../../src/services/noteOverlapService', () => ({
  findFriendNoteOverlaps: jest.fn(async () => mockOverlaps),
  segmentsOverlap: jest.fn(() => false),
}));

jest.mock('../../src/services/bibleService', () => ({
  fetchPassageText: jest.fn(async () => ({ verses: [], text: '', source: 'cache', cached: true })),
  SUPPORTED_TRANSLATIONS: [{ id: 'ESV', shortName: 'ESV', fullName: 'English Standard Version' }],
}));

// Mock sub-components in NoteDetailScreen to keep render tree lightweight
jest.mock('../../src/components/BibleReader', () => 'BibleReader');
jest.mock('../../src/components/FontSizeControls', () => 'FontSizeControls');
jest.mock('../../src/components/VersePreviewModal', () => 'VersePreviewModal');
jest.mock('react-native-markdown-display', () => 'Markdown');

function createSampleNote(id: string, title?: string, book = 'Romans', startVerse = 1): Note {
  return {
    id,
    userId: 'u1',
    user_id: 'u1',
    title,
    passage: {
      display: `${book} 1:${startVerse}`,
      books: [book],
      segments: [{ book, startChapter: 1, startVerse, endChapter: 1, endVerse: startVerse }],
    },
    sections: [{ id: 'light', title: 'Key Idea', content: 'Sample text' }],
    lightContent: 'Sample text',
    questionContent: '',
    arrowContent: '',
    content: 'Sample text',
    tags: ['sample'],
    visibility: 'friends',
    createdAt: 1000,
    updatedAt: 1000,
    created_at: 1000,
    updated_at: 1000,
  };
}

function createSampleFriendActivityItem(id: string, username: string, isIntersecting: boolean): FriendActivityItem {
  return {
    note: createSampleNote(id, `Note ${id}`),
    author: {
      id: `author_${username}`,
      uid: `author_${username}`,
      username,
      display_name: username.toUpperCase(),
      email: `${username}@example.com`,
      full_name: username,
      default_visibility: 'friends',
      friends: [],
      pending_requests: [],
      created_at: 1000,
      updated_at: 1000,
    },
    isIntersecting,
  };
}

describe('Friends Activity & Note Overlap Display Limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: 'user_1', displayName: 'Johnny' };
    mockProfile = { username: 'johnny', display_name: 'Johnny' };
  });

  describe('Dashboard Friends Activity 3-item limit and toggle', () => {
    it('caps Shared Passages at 3 items when there are 5 items, and toggles Show all / Show less', async () => {
      const items: FriendActivityItem[] = [
        createSampleFriendActivityItem('n1', 'alice', true),
        createSampleFriendActivityItem('n2', 'bob', true),
        createSampleFriendActivityItem('n3', 'carol', true),
        createSampleFriendActivityItem('n4', 'david', true),
        createSampleFriendActivityItem('n5', 'eve', true),
      ];

      mockFriendActivity = {
        intersectingNotes: items,
        otherFriendNotes: [],
        hasFriends: true,
      };

      let component: renderer.ReactTestRenderer | undefined;
      await act(async () => {
        component = renderer.create(<DashboardScreen />);
      });

      const root = component!.root;

      // Find "Show all (5)" button
      const showAllBtn = root.findByProps({ accessibilityLabel: 'Show all 5 shared passages' });
      expect(showAllBtn).toBeTruthy();

      // Only the first 3 friend display names should be present initially
      const textsBefore = root.findAllByType(Text).map((t) => t.props.children);
      expect(textsBefore).toContain('ALICE');
      expect(textsBefore).toContain('BOB');
      expect(textsBefore).toContain('CAROL');
      expect(textsBefore).not.toContain('DAVID');
      expect(textsBefore).not.toContain('EVE');

      // Click "Show all (5)"
      await act(async () => {
        showAllBtn.props.onPress();
      });

      // Now all 5 items should be rendered
      const textsAfter = root.findAllByType(Text).map((t) => t.props.children);
      expect(textsAfter).toContain('ALICE');
      expect(textsAfter).toContain('BOB');
      expect(textsAfter).toContain('CAROL');
      expect(textsAfter).toContain('DAVID');
      expect(textsAfter).toContain('EVE');

      // Button should now say "Show less"
      const showLessBtn = root.findByProps({ accessibilityLabel: 'Show fewer shared passages' });
      expect(showLessBtn).toBeTruthy();

      // Click "Show less"
      await act(async () => {
        showLessBtn.props.onPress();
      });

      // Should be back to 3 items
      const textsReset = root.findAllByType(Text).map((t) => t.props.children);
      expect(textsReset).toContain('ALICE');
      expect(textsReset).not.toContain('DAVID');
    });

    it('does not display Show all button when Shared Passages has <= 3 items', async () => {
      mockFriendActivity = {
        intersectingNotes: [
          createSampleFriendActivityItem('n1', 'alice', true),
          createSampleFriendActivityItem('n2', 'bob', true),
        ],
        otherFriendNotes: [],
        hasFriends: true,
      };

      let component: renderer.ReactTestRenderer | undefined;
      await act(async () => {
        component = renderer.create(<DashboardScreen />);
      });

      const root = component!.root;
      const showAllBtns = root.findAllByProps({ accessibilityLabel: 'Show all 2 shared passages' });
      expect(showAllBtns).toHaveLength(0);
    });

    it('caps Recent Updates at 3 items when there are 4 items, and toggles Show all', async () => {
      const otherItems: FriendActivityItem[] = [
        createSampleFriendActivityItem('o1', 'frank', false),
        createSampleFriendActivityItem('o2', 'grace', false),
        createSampleFriendActivityItem('o3', 'heidi', false),
        createSampleFriendActivityItem('o4', 'ivan', false),
      ];

      mockFriendActivity = {
        intersectingNotes: [],
        otherFriendNotes: otherItems,
        hasFriends: true,
      };

      let component: renderer.ReactTestRenderer | undefined;
      await act(async () => {
        component = renderer.create(<DashboardScreen />);
      });

      const root = component!.root;
      const showAllBtn = root.findByProps({ accessibilityLabel: 'Show all 4 recent updates' });
      expect(showAllBtn).toBeTruthy();

      const textsBefore = root.findAllByType(Text).map((t) => t.props.children);
      expect(textsBefore).toContain('FRANK');
      expect(textsBefore).not.toContain('IVAN');

      await act(async () => {
        showAllBtn.props.onPress();
      });

      const textsAfter = root.findAllByType(Text).map((t) => t.props.children);
      expect(textsAfter).toContain('IVAN');
    });
  });

  describe('Note Detail Screen Reference Header & Overlap Pills', () => {
    const baseOverlaps: FriendOverlapItem[] = [
      {
        friendProfile: { id: 'f1', uid: 'f1', username: 'sarah', display_name: 'Sarah' } as any,
        note: createSampleNote('fn1'),
      },
      {
        friendProfile: { id: 'f2', uid: 'f2', username: 'alex', display_name: 'Alex' } as any,
        note: createSampleNote('fn2'),
      },
      {
        friendProfile: { id: 'f3', uid: 'f3', username: 'james', display_name: 'James' } as any,
        note: createSampleNote('fn3'),
      },
      {
        friendProfile: { id: 'f4', uid: 'f4', username: 'hannah', display_name: 'Hannah' } as any,
        note: createSampleNote('fn4'),
      },
      {
        friendProfile: { id: 'f5', uid: 'f5', username: 'lucas', display_name: 'Lucas' } as any,
        note: createSampleNote('fn5'),
      },
    ];

    it('always renders Reference header block for titled note above friend pills', async () => {
      mockSingleNote = createSampleNote('note_titled', 'The Good Shepherd');
      mockOverlaps = baseOverlaps.slice(0, 2);
      mockParams = { id: 'note_titled' };

      let component: renderer.ReactTestRenderer | undefined;
      await act(async () => {
        component = renderer.create(<NoteDetailScreen />);
      });

      const root = component!.root;
      const texts = root.findAllByType(Text).map((t) => t.props.children);

      expect(texts).toContain('The Good Shepherd');
      expect(texts).toContain('Romans 1:1');
      // Overlap friend badges present
      expect(root.findByProps({ accessibilityLabel: 'Sarah also noted Romans 1:1' })).toBeTruthy();
      expect(root.findByProps({ accessibilityLabel: 'Alex also noted Romans 1:1' })).toBeTruthy();
    });

    it('always renders Reference header block for untitled note with passage as main heading', async () => {
      mockSingleNote = createSampleNote('note_untitled', undefined, 'Romans', 1);
      mockOverlaps = baseOverlaps.slice(0, 2);
      mockParams = { id: 'note_untitled' };

      let component: renderer.ReactTestRenderer | undefined;
      await act(async () => {
        component = renderer.create(<NoteDetailScreen />);
      });

      const root = component!.root;
      const texts = root.findAllByType(Text).map((t) => t.props.children);

      // Passage appears as main title
      expect(texts).toContain('Romans 1:1');
    });

    it('caps friend overlap pills at 3 and displays "+2 more" toggle pill when there are 5 overlaps', async () => {
      mockSingleNote = createSampleNote('note_with_many_overlaps', 'Shared Wisdom');
      mockOverlaps = baseOverlaps; // 5 items
      mockParams = { id: 'note_with_many_overlaps' };

      let component: renderer.ReactTestRenderer | undefined;
      await act(async () => {
        component = renderer.create(<NoteDetailScreen />);
      });

      const root = component!.root;

      // Only first 3 should be rendered
      expect(root.findByProps({ accessibilityLabel: 'Sarah also noted Romans 1:1' })).toBeTruthy();
      expect(root.findByProps({ accessibilityLabel: 'Alex also noted Romans 1:1' })).toBeTruthy();
      expect(root.findByProps({ accessibilityLabel: 'James also noted Romans 1:1' })).toBeTruthy();
      expect(root.findAllByProps({ accessibilityLabel: 'Hannah also noted Romans 1:1' })).toHaveLength(0);
      expect(root.findAllByProps({ accessibilityLabel: 'Lucas also noted Romans 1:1' })).toHaveLength(0);

      // "+2 more" pill should exist
      const togglePill = root.findByProps({ accessibilityLabel: 'Show all 5 friend notes' });
      expect(togglePill).toBeTruthy();

      const pillTexts = togglePill.findAllByType(Text).map((t: any) => t.props.children);
      expect(pillTexts).toContain('+2 more');

      // Click "+2 more"
      await act(async () => {
        togglePill.props.onPress();
      });

      // Now all 5 should be rendered
      expect(root.findByProps({ accessibilityLabel: 'Hannah also noted Romans 1:1' })).toBeTruthy();
      expect(root.findByProps({ accessibilityLabel: 'Lucas also noted Romans 1:1' })).toBeTruthy();

      // Pill text should now be "Show less"
      const showLessPill = root.findByProps({ accessibilityLabel: 'Show fewer friend notes' });
      expect(showLessPill).toBeTruthy();

      // Click "Show less"
      await act(async () => {
        showLessPill.props.onPress();
      });

      // Collapses back to 3
      expect(root.findAllByProps({ accessibilityLabel: 'Hannah also noted Romans 1:1' })).toHaveLength(0);
    });
  });
});
