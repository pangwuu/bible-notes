import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export function getTimeGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

export function formatGreetingDate(now: Date = new Date()): string {
  return now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function extractFirstName(fullNameOrUsername?: string | null): string {
  if (!fullNameOrUsername) return '';
  const trimmed = fullNameOrUsername.trim();
  if (!trimmed) return '';
  // Split on whitespace or underscore/hyphen if single string
  return trimmed.split(/\s+/)[0];
}

interface DashboardGreetingProps {
  currentDate?: Date;
}

export default function DashboardGreeting({ currentDate }: DashboardGreetingProps) {
  const { user, profile } = useAuth();
  const date = currentDate || new Date();

  const rawName =
    profile?.display_name ||
    user?.displayName ||
    profile?.username ||
    '';
  const firstName = extractFirstName(rawName);
  const greetingSalutation = getTimeGreeting(date);
  const formattedDate = formatGreetingDate(date);

  const greetingLine = firstName
    ? `${greetingSalutation}, ${firstName}`
    : greetingSalutation;

  return (
    <View style={styles.container}>
      <Text style={styles.dateLabel}>{formattedDate}</Text>
      <Text style={styles.greetingText}>{greetingLine}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetingText: {
    fontFamily: 'SourceSerifPro-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    color: colors.textPrimary,
  },
});
