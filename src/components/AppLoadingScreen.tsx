import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

export type AppLoadingStage = 'starting' | 'signingIn' | 'loadingProfile';

const STAGE_MESSAGES: Record<AppLoadingStage, string> = {
  starting: 'Opening Bible Notes...',
  signingIn: 'Logging you in...',
  loadingProfile: 'Getting your notes...',
};

export const SLOW_HINT_DELAY_MS = 4000;
export const VERY_SLOW_HINT_DELAY_MS = 10000;

export function getSlowHint(elapsedMs: number): string | null {
  if (elapsedMs >= VERY_SLOW_HINT_DELAY_MS) {
    return 'Your connection seems slow. Hang tight, nearly there.';
  }
  if (elapsedMs >= SLOW_HINT_DELAY_MS) {
    return 'Still working on it...';
  }
  return null;
}

export interface AppLoadingScreenProps {
  stage: AppLoadingStage;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ stage }) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timers = [SLOW_HINT_DELAY_MS, VERY_SLOW_HINT_DELAY_MS].map((delay) =>
      setTimeout(() => setElapsedMs(Date.now() - start), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const message = STAGE_MESSAGES[stage];
  const hint = getSlowHint(elapsedMs);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={hint ? `${message} ${hint}` : message}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="large" color={colors.accentKeyIdea} />
      <Text style={styles.message} testID="app-loading-message">
        {message}
      </Text>
      <Text style={[styles.hint, !hint && styles.hidden]} testID="app-loading-hint">
        {hint ?? ' '}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  message: {
    ...typography.label,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  hidden: {
    opacity: 0,
  },
});

export default AppLoadingScreen;
