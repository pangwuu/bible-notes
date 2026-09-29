import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../constants/theme';
import { PassageSegment } from '../../types/note';
import { formatSegmentDisplay } from '../../utils/passageParser';

export interface TOCSegmentBarProps {
  segments: PassageSegment[];
  activeSegmentIndex: number | null;
  onSelectSegment: (index: number | null) => void;
  onLayout?: (y: number) => void;
}

export const TOCSegmentBar: React.FC<TOCSegmentBarProps> = ({
  segments,
  activeSegmentIndex,
  onSelectSegment,
  onLayout,
}) => {
  if (!segments || segments.length === 0) {
    return null;
  }

  return (
    <View
      style={styles.tocContainer}
      onLayout={(e) => {
        onLayout?.(e.nativeEvent.layout.y);
      }}
    >
      <View style={styles.tocHeaderRow}>
        <Ionicons name="list-outline" size={14} color={colors.accent.keyIdea} />
        <Text style={styles.tocTitle}>Table of Contents</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tocList}
      >
        {segments.length > 1 && (
          <Pressable
            onPress={() => onSelectSegment(null)}
            style={[
              styles.tocPill,
              activeSegmentIndex === null && styles.tocPillActive,
            ]}
          >
            <Text
              style={[
                styles.tocPillText,
                activeSegmentIndex === null && styles.tocPillTextActive,
              ]}
            >
              Entire Passage
            </Text>
          </Pressable>
        )}
        {segments.map((seg, idx) => (
          <Pressable
            key={idx}
            onPress={() => onSelectSegment(idx)}
            style={[
              styles.tocPill,
              activeSegmentIndex === idx && styles.tocPillActive,
            ]}
          >
            <Text
              style={[
                styles.tocPillText,
                activeSegmentIndex === idx && styles.tocPillTextActive,
              ]}
            >
              {formatSegmentDisplay(seg)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tocContainer: {
    marginVertical: spacing.xs,
    paddingVertical: spacing.xs,
  },
  tocHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  tocTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  tocList: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  tocPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.controls,
    backgroundColor: colors.bg.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  tocPillActive: {
    borderColor: colors.accent.keyIdea,
    backgroundColor: 'rgba(227, 165, 61, 0.15)',
  },
  tocPillText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  tocPillTextActive: {
    color: colors.accent.keyIdea,
    fontWeight: '600',
  },
});

export default TOCSegmentBar;
