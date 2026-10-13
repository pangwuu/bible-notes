/**
 * Local daily study reminders via expo-notifications (no remote push required).
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import safeStorage from '../utils/safeStorage';

export const STUDY_REMINDER_STORAGE_KEY = 'study_reminder_prefs';
export const STUDY_REMINDER_NOTIFICATION_ID = 'daily-study-reminder';

export interface StudyReminderPrefs {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

export const DEFAULT_STUDY_REMINDER: StudyReminderPrefs = {
  enabled: false,
  hour: 8,
  minute: 0,
};

export function formatReminderTime(hour: number, minute: number): string {
  const h24 = Math.max(0, Math.min(23, Math.floor(hour)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export async function loadStudyReminderPrefs(): Promise<StudyReminderPrefs> {
  try {
    const raw = await safeStorage.getItem(STUDY_REMINDER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STUDY_REMINDER };
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      hour: Number.isFinite(parsed.hour) ? parsed.hour : DEFAULT_STUDY_REMINDER.hour,
      minute: Number.isFinite(parsed.minute) ? parsed.minute : DEFAULT_STUDY_REMINDER.minute,
    };
  } catch {
    return { ...DEFAULT_STUDY_REMINDER };
  }
}

export async function saveStudyReminderPrefs(prefs: StudyReminderPrefs): Promise<void> {
  await safeStorage.setItem(STUDY_REMINDER_STORAGE_KEY, JSON.stringify(prefs));
}

async function ensureLocalPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/**
 * Cancels any existing daily reminder, then schedules a new one when enabled.
 */
export async function applyStudyReminder(prefs: StudyReminderPrefs): Promise<boolean> {
  if (Platform.OS === 'web') {
    await saveStudyReminderPrefs({ ...prefs, enabled: false });
    return false;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(STUDY_REMINDER_NOTIFICATION_ID);
  } catch {
    // ignore missing id
  }

  if (!prefs.enabled) {
    await saveStudyReminderPrefs(prefs);
    return true;
  }

  const granted = await ensureLocalPermission();
  if (!granted) {
    await saveStudyReminderPrefs({ ...prefs, enabled: false });
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-reminders', {
      name: 'Study reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: STUDY_REMINDER_NOTIFICATION_ID,
    content: {
      title: 'Time to study',
      body: 'Open Bible Notes and capture a reflection on Scripture.',
      data: { type: 'study_reminder' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.hour,
      minute: prefs.minute,
      channelId: Platform.OS === 'android' ? 'study-reminders' : undefined,
    },
  });

  await saveStudyReminderPrefs(prefs);
  return true;
}
