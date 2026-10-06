/**
 * Integration Test for FriendsScreen & FriendProfileScreen
 * Validates social tabs, friend lists, pending request acceptance/decline,
 * user search and request dispatch, friend profile rendering, and unfriending.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import FriendsScreen from '../../app/(tabs)/friends';
import FriendProfileScreen from '../../app/friend/[id]';
import * as friendService from '../../src/services/friendService';
import * as authService from '../../src/services/authService';
import { FriendItem } from '../../src/types/friendship';
import { UserProfile } from '../../src/types/user';
import { Note } from '../../src/types/note';

const renderWithPaper = (ui: React.ReactElement) => {
  return render(<PaperProvider>{ui}</PaperProvider>);
};

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('expo-router', () => {
  const ReactModule = require('react');
  return {
    useRouter: () => ({
      push: mockPush,
      back: mockBack,
      canGoBack: mockCanGoBack,
      replace: jest.fn(),
    }),
    useLocalSearchParams: () => mockLocalSearchParams,
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => {
        cb();
      }, [cb]);
    },
  };
});

let mockLocalSearchParams: { id?: string } = { id: 'friend_uid_1' };

const mockCurrentUser = {
  uid: 'current_user_id',
  email: 'current@bible.org',
};

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    profile: { uid: 'current_user_id', username: 'currentuser' },
  }),
}));

jest.mock('../../src/services/friendService', () => ({
  getFriends: jest.fn(),
  getPendingRequests: jest.fn(),
  searchUsers: jest.fn(),
  sendFriendRequest: jest.fn(),
  acceptFriendRequest: jest.fn(),
  declineFriendRequest: jest.fn(),
  getFriendshipStatus: jest.fn(),
  getFriendNotes: jest.fn(),
  unfriend: jest.fn(),
}));

jest.mock('../../src/services/authService', () => ({
  getUserProfile: jest.fn(),
}));

const mockFriend1: FriendItem = {
  friendshipId: 'rel_1',
  friendUid: 'friend_uid_1',
  status: 'accepted',
  requestedBy: 'current_user_id',
  isIncoming: false,
  friendProfile: {
    id: 'friend_uid_1',
    uid: 'friend_uid_1',
    username: 'john_doe',
    display_name: 'John Doe',
    full_name: 'John Doe',
    email: 'john@doe.com',
    default_visibility: 'friends',
    created_at: 100,
    updated_at: 100,
  },
  createdAt: 100,
};

const mockIncomingRequest: FriendItem = {
  friendshipId: 'rel_req_1',
  friendUid: 'requester_uid_1',
  status: 'pending',
  requestedBy: 'requester_uid_1',
  isIncoming: true,
  friendProfile: {
    id: 'requester_uid_1',
    uid: 'requester_uid_1',
    username: 'mary_grace',
    display_name: 'Mary Grace',
    full_name: 'Mary Grace',
    email: 'mary@grace.com',
    default_visibility: 'friends',
    created_at: 200,
    updated_at: 200,
  },
  createdAt: 200,
};

const mockFriendNotes: Note[] = [
  {
    id: 'friend_note_1',
    userId: 'friend_uid_1',
    user_id: 'friend_uid_1',
    title: 'Walking by Faith',
    passage: {
      display: 'Hebrews 11:1',
      books: ['Hebrews'],
      segments: [{ book: 'Hebrews', startChapter: 11, startVerse: 1, endChapter: 11, endVerse: 1 }],
    },
    lightContent: '',
    questionContent: '',
    arrowContent: '',
    content: 'Now faith is confidence in what we hope for...',
    tags: ['faith'],
    visibility: 'friends',
    createdAt: 300,
    updatedAt: 300,
    created_at: 300,
    updated_at: 300,
  },
];

describe('Friends Screen & Friend Profile Screen (app/(tabs)/friends.tsx & app/friend/[id].tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalSearchParams = { id: 'friend_uid_1' };
  });

  describe('FriendsScreen', () => {
    test('renders list of mutual friends and navigates on tap', async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValue([mockFriend1]);
      (friendService.getPendingRequests as jest.Mock).mockResolvedValue({ incoming: [], outgoing: [] });

      const { getByText } = await render(<FriendsScreen />);

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('@john_doe')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('John Doe'));
      });

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/friend/[id]',
        params: { id: 'friend_uid_1' },
      });
    });

    test('renders incoming friend requests and handles accept and decline actions', async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValue([]);
      (friendService.getPendingRequests as jest.Mock).mockResolvedValue({
        incoming: [mockIncomingRequest],
        outgoing: [],
      });
      (friendService.acceptFriendRequest as jest.Mock).mockResolvedValue(undefined);
      (friendService.declineFriendRequest as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = await render(<FriendsScreen />);

      await waitFor(() => {
        expect(getByText('Friend Requests')).toBeTruthy();
        expect(getByText('Mary Grace')).toBeTruthy();
        expect(getByText('Accept')).toBeTruthy();
        expect(getByText('Decline')).toBeTruthy();
      });

      // Test accept
      await act(async () => {
        fireEvent.press(getByText('Accept'));
      });

      expect(friendService.acceptFriendRequest).toHaveBeenCalledWith('rel_req_1');
    });

    test('performs search by query >= 3 chars and sends friend request', async () => {
      (friendService.getFriends as jest.Mock).mockResolvedValue([]);
      (friendService.getPendingRequests as jest.Mock).mockResolvedValue({ incoming: [], outgoing: [] });

      const searchResultUser: UserProfile = {
        id: 'search_target_uid',
        uid: 'search_target_uid',
        username: 'peter_rock',
        display_name: 'Peter Rock',
        full_name: 'Peter Rock',
        email: 'peter@rock.com',
        default_visibility: 'friends',
        created_at: 500,
        updated_at: 500,
      };
      (friendService.searchUsers as jest.Mock).mockResolvedValue([searchResultUser]);
      (friendService.sendFriendRequest as jest.Mock).mockResolvedValue(undefined);

      jest.useFakeTimers();

      const { getByPlaceholderText, getByText } = await render(<FriendsScreen />);

      const searchInput = getByPlaceholderText('Search friends by name or username');
      await act(async () => {
        fireEvent.changeText(searchInput, 'peter');
      });

      // Fast-forward debounce timer (250ms)
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(getByText('Search Results')).toBeTruthy();
        expect(getByText('Peter Rock')).toBeTruthy();
        expect(getByText('Add')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Add'));
      });

      expect(friendService.sendFriendRequest).toHaveBeenCalledWith(
        mockCurrentUser.uid,
        'search_target_uid'
      );

      jest.useRealTimers();
    });
  });

  describe('FriendProfileScreen', () => {
    test('renders friend profile header, mutual status, and friend shared notes', async () => {
      (authService.getUserProfile as jest.Mock).mockResolvedValue(mockFriend1.friendProfile);
      (friendService.getFriendshipStatus as jest.Mock).mockResolvedValue({
        status: 'accepted',
        friendshipId: 'rel_1',
      });
      (friendService.getFriendNotes as jest.Mock).mockResolvedValue(mockFriendNotes);

      const { getByText } = await renderWithPaper(<FriendProfileScreen />);

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('@john_doe')).toBeTruthy();
        expect(getByText('Mutual Friend')).toBeTruthy();
        expect(getByText('Walking by Faith')).toBeTruthy();
        expect(getByText('Hebrews 11:1')).toBeTruthy();
      });
    });

    test('opens unfriend confirmation dialog and successfully unfriends', async () => {
      (authService.getUserProfile as jest.Mock).mockResolvedValue(mockFriend1.friendProfile);
      (friendService.getFriendshipStatus as jest.Mock).mockResolvedValue({
        status: 'accepted',
        friendshipId: 'rel_1',
      });
      (friendService.getFriendNotes as jest.Mock).mockResolvedValue([]);
      (friendService.unfriend as jest.Mock).mockResolvedValue(undefined);

      const { getByText, getAllByText } = await renderWithPaper(<FriendProfileScreen />);

      await waitFor(() => {
        expect(getByText('Unfriend')).toBeTruthy();
      });

      // Press the initial unfriend button on screen
      await act(async () => {
        fireEvent.press(getByText('Unfriend'));
      });

      await waitFor(() => {
        expect(getByText(/Are you sure you want to remove John Doe/i)).toBeTruthy();
      });

      // The dialog also has an 'Unfriend' action button
      const unfriendButtons = getAllByText('Unfriend');
      // The dialog action button is the second one rendered
      const dialogConfirmButton = unfriendButtons[unfriendButtons.length - 1];
      await act(async () => {
        fireEvent.press(dialogConfirmButton);
      });

      expect(friendService.unfriend).toHaveBeenCalledWith('rel_1');
      expect(mockBack).toHaveBeenCalled();
    });
  });
});
