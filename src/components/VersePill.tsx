import React from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../constants/theme';
import { formatVerseRangeLabel } from '../utils/verseLinkUtils';

export interface VersePillProps {
  startVerse: number;
  endVerse: number;
  book?: string;
  chapter?: number;
  verses?: number[];
  onPress: () => void;
  onRemove?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function VersePill({
  startVerse,
  endVerse,
  book,
  chapter,
  verses,
  onPress,
  onRemove,
  color = colors.accent.keyIdea,
  style,
}: VersePillProps) {
  const label = formatVerseRangeLabel(startVerse, endVerse, { book, chapter }, verses);

  return (
    <View style={[styles.pillContainer, { borderColor: colors.border.hairline }, style]}>
      <Pressable
        onPress={onPress}
        style={styles.pillPressable}
        accessibilityRole="button"
        accessibilityLabel={`View referenced Scripture: ${label}`}
        hitSlop={4}
      >
        <Ionicons name="bookmark" size={12} color={color} style={styles.icon} />
        <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>
      </Pressable>

      {onRemove && (
        <Pressable
          onPress={onRemove}
          style={styles.removeButton}
          accessibilityRole="button"
          accessibilityLabel={`Remove reference to ${label}`}
          hitSlop={6}
        >
          <Ionicons name="close" size={13} color={colors.text.secondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  pillPressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    marginLeft: 6,
    padding: 1,
  },
});
