import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';

interface BibleReaderHeaderProps {
  passageDisplay: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const BibleReaderHeader: React.FC<BibleReaderHeaderProps> = ({
  passageDisplay,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <Pressable
      style={styles.headerRow}
      onPress={onToggleCollapse}
      accessibilityRole="button"
      accessibilityLabel={`Toggle Scripture text. Currently ${collapsed ? 'collapsed' : 'expanded'}`}
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
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  bookIcon: {
    marginRight: spacing.xs,
  },
  scriptureHeaderLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  collapseIcon: {
    flexShrink: 0,
  },
});
