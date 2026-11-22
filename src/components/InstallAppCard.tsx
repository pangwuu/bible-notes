/**
 * Expandable "Install Bible Notes as an app" guide, shown on web only and only
 * when the app isn't already running from the home screen.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../constants/theme';
import safeStorage from '../utils/safeStorage';
import {
  InstallGuide,
  currentInstallPlatform,
  getInstallGuide,
  getOtherInstallGuides,
  hasInstallPrompt,
  isRunningStandalone,
  promptInstall,
  subscribeToInstallChanges,
} from '../utils/pwaInstall';

export const PWA_CARD_DISMISSED_KEY = 'pwa_card_dismissed';

interface InstallAppCardProps {
  /** Dashboard cards can be dismissed for good; the Settings card is always available. */
  dismissible?: boolean;
  initiallyExpanded?: boolean;
}

const GuideSteps: React.FC<{ guide: InstallGuide }> = ({ guide }) => (
  <View style={styles.steps}>
    {guide.steps.map((step, idx) => (
      <View key={idx} style={styles.stepRow}>
        <Text style={styles.stepNumber}>{guide.steps.length > 1 ? `${idx + 1}.` : ''}</Text>
        {step.icon ? (
          <Ionicons name={step.icon as any} size={16} color={colors.text.secondary} style={styles.stepIcon} />
        ) : null}
        <Text style={styles.stepText}>{step.text}</Text>
      </View>
    ))}
    {guide.note ? <Text style={styles.note}>{guide.note}</Text> : null}
  </View>
);

export const InstallAppCard: React.FC<InstallAppCardProps> = ({
  dismissible = false,
  initiallyExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [showOthers, setShowOthers] = useState(false);
  const [canPrompt, setCanPrompt] = useState(hasInstallPrompt());
  const [installed, setInstalled] = useState(isRunningStandalone());
  const [dismissed, setDismissed] = useState<boolean | null>(dismissible ? null : false);

  const platform = useMemo(() => currentInstallPlatform(), []);
  const guide = getInstallGuide(platform);
  const others = useMemo(() => getOtherInstallGuides(platform), [platform]);

  useEffect(() => {
    if (!dismissible) return;
    safeStorage.getItem(PWA_CARD_DISMISSED_KEY).then((v) => setDismissed(v === 'true'));
  }, [dismissible]);

  useEffect(
    () =>
      subscribeToInstallChanges(() => {
        setCanPrompt(hasInstallPrompt());
        setInstalled(isRunningStandalone());
      }),
    []
  );

  if (Platform.OS !== 'web' || installed || dismissed !== false) return null;

  const handleInstall = async () => {
    const outcome = await promptInstall();
    setCanPrompt(hasInstallPrompt());
    if (outcome === 'accepted') setInstalled(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    safeStorage.setItem(PWA_CARD_DISMISSED_KEY, 'true').catch(() => {});
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={styles.headerPress}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel="Install Bible Notes as an app"
        >
          <Ionicons name="phone-portrait-outline" size={18} color={colors.accent.keyIdea} />
          <Text style={styles.title}>Install Bible Notes as an app</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.text.secondary}
          />
        </Pressable>
        {dismissible && (
          <Pressable
            onPress={handleDismiss}
            style={styles.dismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Hide install guide"
          >
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </Pressable>
        )}
      </View>

      {expanded && (
        <View style={styles.body}>
          <Text style={styles.why}>
            It opens full screen with its own icon, launches faster, and keeps you signed in. Your
            notes stay exactly the same.
          </Text>

          {canPrompt ? (
            <Pressable
              onPress={handleInstall}
              style={styles.installButton}
              accessibilityRole="button"
              accessibilityLabel="Install Bible Notes"
            >
              <Ionicons name="download-outline" size={18} color={colors.bg.base} />
              <Text style={styles.installButtonText}>Install</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.guideLabel}>{guide.label}</Text>
              <GuideSteps guide={guide} />
            </>
          )}

          <Pressable
            onPress={() => setShowOthers((v) => !v)}
            style={styles.othersToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: showOthers }}
          >
            <Text style={styles.othersToggleText}>Other devices</Text>
            <Ionicons
              name={showOthers ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.text.secondary}
            />
          </Pressable>
          {showOthers &&
            others.map((g) => (
              <View key={g.platform} style={styles.otherGuide}>
                <Text style={styles.guideLabel}>{g.label}</Text>
                <GuideSteps guide={g} />
              </View>
            ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.label,
    color: colors.text.primary,
    flex: 1,
  },
  dismiss: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  why: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radii.controls,
    backgroundColor: colors.accent.keyIdea,
  },
  installButtonText: {
    ...typography.label,
    color: colors.bg.base,
    fontWeight: '600',
  },
  guideLabel: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
  },
  steps: {
    gap: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  stepNumber: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    minWidth: 16,
  },
  stepIcon: {
    marginTop: 1,
  },
  stepText: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.primary,
    flex: 1,
  },
  note: {
    ...typography.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  othersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
  },
  othersToggleText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  otherGuide: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
});

export default InstallAppCard;
