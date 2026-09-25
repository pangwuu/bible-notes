import React from 'react';
import {
  getTimeGreeting,
  formatGreetingDate,
  extractFirstName,
} from '../../src/components/DashboardGreeting';
import { spacing } from '../../src/constants/theme';
import safeStorage from '../../src/utils/safeStorage';

describe('Dashboard UI Enhancements', () => {
  describe('getTimeGreeting', () => {
    test('returns "Good morning" between 05:00 and 11:59', () => {
      expect(getTimeGreeting(new Date(2026, 8, 25, 5, 0, 0))).toBe('Good morning');
      expect(getTimeGreeting(new Date(2026, 8, 25, 9, 30, 0))).toBe('Good morning');
      expect(getTimeGreeting(new Date(2026, 8, 25, 11, 59, 59))).toBe('Good morning');
    });

    test('returns "Good afternoon" between 12:00 and 16:59', () => {
      expect(getTimeGreeting(new Date(2026, 8, 25, 12, 0, 0))).toBe('Good afternoon');
      expect(getTimeGreeting(new Date(2026, 8, 25, 14, 15, 0))).toBe('Good afternoon');
      expect(getTimeGreeting(new Date(2026, 8, 25, 16, 59, 59))).toBe('Good afternoon');
    });

    test('returns "Good evening" from 17:00 through late night/early morning until 04:59', () => {
      expect(getTimeGreeting(new Date(2026, 8, 25, 17, 0, 0))).toBe('Good evening');
      expect(getTimeGreeting(new Date(2026, 8, 25, 21, 0, 0))).toBe('Good evening');
      expect(getTimeGreeting(new Date(2026, 8, 25, 23, 59, 59))).toBe('Good evening');
      expect(getTimeGreeting(new Date(2026, 8, 25, 0, 0, 0))).toBe('Good evening');
      expect(getTimeGreeting(new Date(2026, 8, 25, 4, 59, 59))).toBe('Good evening');
    });
  });

  describe('extractFirstName', () => {
    test('extracts first name from full display name', () => {
      expect(extractFirstName('Johnny Wu')).toBe('Johnny');
      expect(extractFirstName('Mary Jane Watson')).toBe('Mary');
    });

    test('handles single word username or display name', () => {
      expect(extractFirstName('johnny')).toBe('johnny');
      expect(extractFirstName('apostle_paul')).toBe('apostle_paul');
    });

    test('handles empty, null, and whitespace inputs gracefully', () => {
      expect(extractFirstName('')).toBe('');
      expect(extractFirstName(null)).toBe('');
      expect(extractFirstName(undefined)).toBe('');
      expect(extractFirstName('   ')).toBe('');
    });
  });

  describe('formatGreetingDate', () => {
    test('formats a given date into weekday, month, day', () => {
      const fixedDate = new Date(2026, 8, 25, 10, 0, 0); // Friday, Sep 25, 2026
      const formatted = formatGreetingDate(fixedDate);
      expect(formatted).toContain('Sep');
      expect(formatted).toContain('25');
    });
  });

  describe('safeStorage persistence for dashboard hidden sections', () => {
    beforeEach(async () => {
      await safeStorage.removeItem('dashboard_hidden_sections');
    });

    test('persists and retrieves hidden section toggles correctly', async () => {
      const initial = await safeStorage.getItem('dashboard_hidden_sections');
      expect(initial).toBeNull();

      const stateToSave = {
        recentNotes: true,
        friendsActivity: false,
        rediscover: true,
      };
      await safeStorage.setItem('dashboard_hidden_sections', JSON.stringify(stateToSave));

      const retrieved = await safeStorage.getItem('dashboard_hidden_sections');
      expect(retrieved).not.toBeNull();
      const parsed = JSON.parse(retrieved!);
      expect(parsed.recentNotes).toBe(true);
      expect(parsed.friendsActivity).toBe(false);
      expect(parsed.rediscover).toBe(true);
    });
  });

  describe('Tab header margin normalization', () => {
    test('standard margin spacing is spacing.md (16px)', () => {
      expect(spacing.md).toBe(16);
    });
  });
});
