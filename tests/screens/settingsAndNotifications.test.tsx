/**
 * Integration Test for SettingsScreen & NotificationsModal
 * Validates ESV API key customization, passage cache clearance,
 * notification stream subscription, mark-all-read dispatch, and tap navigation.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import SettingsScreen from '../../app/(tabs)/settings';
import NotificationsModal from '../../app/notifications';
import * as authService from '../../src/services/authService';
import * as bibleService from '../../src/services/bibleService';
import * as notificationService from '../../src/services/notificationService';
import { NotificationDocument } from '../../src/types/notification';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

let mockNavOptions: any = {};
const mockNavigation = {
  setOptions: jest.fn((opts) => {
    mockNavOptions = { ...mockNavOptions, ...opts };
  }),
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
    canGoBack: mockCanGoBack,
  }),
  useNavigation: () => mockNavigation,
}));

const mockCurrentUser = {
  uid: 'settings_user_1',
  email: 'settings@bible.org',
  displayName: 'Settings User',
};

const mockUserProfile = {
  uid: 'settings_user_1',
  username: 'settingsuser',
  display_name: 'Settings User',
  email: 'settings@bible.org',
  default_visibility: 'friends' as const,
  settings: {
    preferred_translation: 'ESV' as const,
    default_template_id: 'swedish',
    enable_friends: true,
    custom_esv_api_key: '',
  },
};

const mockSignOut = jest.fn();

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    profile: mockUserProfile,
    signOut: mockSignOut,
  }),
}));

jest.mock('../../src/services/authService', () => ({
  updateUserProfile: jest.fn(),
}));

jest.mock('../../src/services/bibleService', () => ({
  clearPassageCache: jest.fn(),
  SUPPORTED_TRANSLATIONS: ['ESV', 'KJV', 'NIV', 'NASB', 'NLT'],
}));

jest.mock('../../src/services/notificationService', () => ({
  subscribeToNotifications: jest.fn(),
  getNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
}));

jest.mock('../../src/utils/safeStorage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const renderWithPaper = (ui: React.ReactElement) => {
  return render(<PaperProvider>{ui}</PaperProvider>);
};

const mockNotificationsList: NotificationDocument[] = [
  {
    id: 'notif_1',
    user_id: 'settings_user_1',
    type: 'friend_note_exists',
    related_user_id: 'friend_uid_1',
    related_user_name: 'Barnabas',
    related_note_id: 'note_barnabas_1',
    passage_summary: 'Acts 4:32-37',
    read: false,
    created_at: Date.now() - 60000,
  },
  {
    id: 'notif_2',
    user_id: 'settings_user_1',
    type: 'friend_accept',
    related_user_id: 'friend_uid_2',
    related_user_name: 'Timothy',
    read: true,
    created_at: Date.now() - 3600000,
  },
];

describe('Settings Screen & Notifications Screen (app/(tabs)/settings.tsx & app/notifications.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavOptions = {};
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('SettingsScreen', () => {
    test('updates custom ESV API token and calls updateUserProfile', async () => {
      (authService.updateUserProfile as jest.Mock).mockResolvedValue(undefined);

      const { getByPlaceholderText, getByText } = await renderWithPaper(<SettingsScreen />);

      const esvInput = getByPlaceholderText('Personal ESV API Token');
      await act(async () => {
        fireEvent.changeText(esvInput, 'my-custom-crossway-token');
      });

      const saveKeyBtn = getByText('Save key');
      await act(async () => {
        fireEvent.press(saveKeyBtn);
      });

      expect(authService.updateUserProfile).toHaveBeenCalledWith(
        'settings_user_1',
        expect.objectContaining({
          custom_esv_api_key: 'my-custom-crossway-token',
        })
      );

      await waitFor(() => {
        expect(getByText('API key updated')).toBeTruthy();
      });
    });

    test('opens Clear Passage Cache dialog and invokes clearPassageCache', async () => {
      (bibleService.clearPassageCache as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = await renderWithPaper(<SettingsScreen />);

      const openDialogBtn = getByText('Clear passage cache');
      await act(async () => {
        fireEvent.press(openDialogBtn);
      });

      await waitFor(() => {
        expect(
          getByText('Are you sure you want to remove all offline cached Bible passages from this device?')
        ).toBeTruthy();
      });

      const confirmClearBtn = getByText('Clear cache');
      await act(async () => {
        fireEvent.press(confirmClearBtn);
      });

      expect(bibleService.clearPassageCache).toHaveBeenCalled();

      await waitFor(() => {
        expect(getByText('Passage cache cleared')).toBeTruthy();
      });
    });
  });

  describe('NotificationsModal', () => {
    test('subscribes to notifications and renders notification list items', async () => {
      let subCallback: any;
      (notificationService.subscribeToNotifications as jest.Mock).mockImplementation(
        (_uid, onNext) => {
          subCallback = onNext;
          onNext(mockNotificationsList);
          return () => {};
        }
      );

      const { getByText } = await renderWithPaper(<NotificationsModal />);

      await waitFor(() => {
        expect(getByText(/Barnabas/)).toBeTruthy();
        expect(getByText(/also noted Acts 4:32-37/)).toBeTruthy();
        expect(getByText(/Timothy/)).toBeTruthy();
        expect(getByText(/accepted your friend request/)).toBeTruthy();
      });
    });

    test('marks all notifications as read when header button is pressed', async () => {
      (notificationService.subscribeToNotifications as jest.Mock).mockImplementation(
        (_uid, onNext) => {
          onNext(mockNotificationsList);
          return () => {};
        }
      );
      (notificationService.markAllNotificationsAsRead as jest.Mock).mockResolvedValue(undefined);

      await renderWithPaper(<NotificationsModal />);

      // The headerRight contains "Mark all read" button since unread notifications exist
      expect(mockNavOptions.headerRight).toBeDefined();

      const { getByText } = await renderWithPaper(mockNavOptions.headerRight());
      const markAllBtn = getByText('Mark all read');

      await act(async () => {
        fireEvent.press(markAllBtn);
      });

      expect(notificationService.markAllNotificationsAsRead).toHaveBeenCalledWith('settings_user_1');
    });

    test('navigates to note on tapping friend_note_exists notification and marks it as read', async () => {
      (notificationService.subscribeToNotifications as jest.Mock).mockImplementation(
        (_uid, onNext) => {
          onNext(mockNotificationsList);
          return () => {};
        }
      );
      (notificationService.markNotificationAsRead as jest.Mock).mockResolvedValue(undefined);

      const { getByText } = await renderWithPaper(<NotificationsModal />);

      await waitFor(() => {
        expect(getByText(/also noted Acts 4:32-37/)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText(/also noted Acts 4:32-37/));
      });

      expect(notificationService.markNotificationAsRead).toHaveBeenCalledWith('notif_1');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/note/[id]',
        params: { id: 'note_barnabas_1' },
      });
    });
  });
});
