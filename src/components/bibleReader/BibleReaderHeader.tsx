import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../constants/theme';

interface BibleReaderHeaderProps {
  passageDisplay: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Short name of the active translation, e.g. "ESV". Shown as a button when provided. */
  translationLabel?: string;
  onOpenTranslations?: () => void;
  /** Shows the "Aa" text-size button when provided. */
  onToggleTextSize?: () => void;
  textSizeOpen?: boolean;
}

export const BibleReaderHeader: React.FC<BibleReaderHeaderProps> = ({
  passageDisplay,
  collapsed,
  onToggleCollapse,
  translationLabel,
  onOpenTranslations,
  onToggleTextSize,
  textSizeOpen = false,
}) => {
  const showTranslationBtn = Boolean(!collapsed && translationLabel && onOpenTranslations);
  const showTextSizeBtn = Boolean(!collapsed && onToggleTextSize);
  const hasSecondaryControls = showTranslationBtn || showTextSizeBtn;
  const collapseLabel = `${passageDisplay}. ${collapsed ? 'Show' : 'Hide'} Bible text`;

  if (!hasSecondaryControls) {
    return (
      <Pressable
        style={styles.headerRow}
        onPress={onToggleCollapse}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={collapseLabel}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="book-outline" size={17} color={colors.accent.keyIdea} style={styles.bookIcon} />
          <Text style={styles.scriptureHeaderLabel} numberOfLines={2} ellipsizeMode="tail">
            {passageDisplay}
          </Text>
        </View>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={colors.text.secondary}
          style={styles.collapseIcon}
        />
      </Pressable>
    );
  }

  return (
    <View style={styles.headerRow}>
      <Pressable
        style={styles.headerLeft}
        onPress={onToggleCollapse}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={collapseLabel}
      >
        <Ionicons name="book-outline" size={17} color={colors.accent.keyIdea} style={styles.bookIcon} />
        <Text style={styles.scriptureHeaderLabel} numberOfLines={2} ellipsizeMode="tail">
          {passageDisplay}
        </Text>
      </Pressable>

      {showTranslationBtn && (
        <Pressable
          onPress={onOpenTranslations}
          style={styles.controlButton}
          accessibilityRole="button"
          accessibilityLabel={`Translation: ${translationLabel}. Change translation`}
          hitSlop={4}
        >
          <Text style={styles.controlText}>{translationLabel}</Text>
          <Ionicons name="chevron-down" size={12} color={colors.text.secondary} />
        </Pressable>
      )}

      {showTextSizeBtn && (
        <Pressable
          onPress={onToggleTextSize}
          style={[styles.controlButton, textSizeOpen && styles.controlButtonActive]}
          accessibilityRole="button"
          accessibilityState={{ expanded: textSizeOpen }}
          accessibilityLabel="Text size"
          hitSlop={4}
        >
          <Text style={[styles.controlText, styles.aaText, textSizeOpen && styles.controlTextActive]}>
            Aa
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={onToggleCollapse}
        hitSlop={8}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.collapseIconButton}
      >
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={colors.text.secondary}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    backgroundColor: colors.bg.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minHeight: 32,
    marginRight: spacing.xs,
  },
  bookIcon: {
    marginRight: spacing.xs,
  },
  scriptureHeaderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
    minWidth: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.bg.surfaceRaised,
  },
  controlButtonActive: {
    borderColor: colors.accent.keyIdea,
  },
  controlText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  aaText: {
    fontSize: 14,
  },
  controlTextActive: {
    color: colors.accent.keyIdea,
  },
  collapseIcon: {
    flexShrink: 0,
    marginLeft: spacing.xs,
  },
  collapseIconButton: {
    flexShrink: 0,
    marginLeft: spacing.xs,
    padding: 4,
  },
});
