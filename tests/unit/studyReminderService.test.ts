import {
  DEFAULT_STUDY_REMINDER,
  formatReminderTime,
  loadStudyReminderPrefs,
  saveStudyReminderPrefs,
  STUDY_REMINDER_STORAGE_KEY,
} from '../../src/services/studyReminderService';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('../../src/utils/safeStorage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockGetItem(...args),
    setItem: (...args: any[]) => mockSetItem(...args),
  },
}));

describe('studyReminderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('formatReminderTime uses 12-hour clock', () => {
    expect(formatReminderTime(8, 0)).toBe('8:00 AM');
    expect(formatReminderTime(0, 5)).toBe('12:05 AM');
    expect(formatReminderTime(12, 30)).toBe('12:30 PM');
    expect(formatReminderTime(20, 0)).toBe('8:00 PM');
  });

  test('loadStudyReminderPrefs returns defaults when empty', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await expect(loadStudyReminderPrefs()).resolves.toEqual(DEFAULT_STUDY_REMINDER);
  });

  test('loadStudyReminderPrefs parses stored JSON', async () => {
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({ enabled: true, hour: 21, minute: 15 })
    );
    await expect(loadStudyReminderPrefs()).resolves.toEqual({
      enabled: true,
      hour: 21,
      minute: 15,
    });
  });

  test('saveStudyReminderPrefs writes storage key', async () => {
    mockSetItem.mockResolvedValueOnce(undefined);
    const prefs = { enabled: true, hour: 7, minute: 0 };
    await saveStudyReminderPrefs(prefs);
    expect(mockSetItem).toHaveBeenCalledWith(
      STUDY_REMINDER_STORAGE_KEY,
      JSON.stringify(prefs)
    );
  });
});
