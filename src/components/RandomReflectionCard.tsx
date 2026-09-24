import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { Note, formatPassageDisplay } from '../types/note';

export interface RandomReflectionCardProps {
  note: Note;
  onPress: () => void;
  onShuffle: () => void;
  style?: any;
}

export const RandomReflectionCard: React.FC<RandomReflectionCardProps> = ({
  note,
  onPress,
  onShuffle,
  style,
}) => {
  const cleanSnippet = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/###?\s*(?:[💡❓🏹]\s*)?(?:Key Idea(?:\(s\))?|Question(?:\(s\))?|Application(?:\(s\))?)/gi, '')
      .replace(/[💡❓🏹]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  let rawSnippet = '';
  let indicatorColor: string = colors.accentKeyIdea;

  if (note.lightContent && cleanSnippet(note.lightContent)) {
    rawSnippet = note.lightContent;
    indicatorColor = colors.accentKeyIdea;
  } else if (note.questionContent && cleanSnippet(note.questionContent)) {
    rawSnippet = note.questionContent;
    indicatorColor = colors.accentQuestion;
  } else if (note.arrowContent && cleanSnippet(note.arrowContent)) {
    rawSnippet = note.arrowContent;
    indicatorColor = colors.accentApplication;
  } else if (note.content) {
    rawSnippet = note.content;
  }

  const snippet = cleanSnippet(rawSnippet);

  const passageDisplay = note.passage
    ? note.passage.display || note.passage.displayString || formatPassageDisplay(note.passage)
    : 'Past Reflection';

  return (
    <Pressable
      style={[styles.card, { borderLeftColor: indicatorColor }, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Rediscover reflection on ${passageDisplay}`}
    >
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="sparkles-outline" size={15} color={colors.accentKeyIdea} />
          <Text style={styles.cardHeaderTitle}>Rediscover a Reflection</Text>
        </View>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onShuffle();
          }}
          hitSlop={12}
          style={styles.shuffleButton}
          accessibilityRole="button"
          accessibilityLabel="Shuffle reflection"
        >
          <Ionicons name="shuffle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.shuffleText}>Shuffle</Text>
        </Pressable>
      </View>

      <Text style={styles.passageRef} numberOfLines={1}>
        {passageDisplay}
      </Text>

      {snippet ? (
        <Text numberOfLines={3} style={styles.snippet}>
          {snippet}
        </Text>
      ) : (
        <Text numberOfLines={1} style={styles.emptySnippet}>
          No reflection snippet recorded
        </Text>
      )}

      {note.tags && note.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {note.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    borderLeftWidth: 3,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentKeyIdea,
    letterSpacing: 0.3,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgSurfaceRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  shuffleText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  passageRef: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  snippet: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'SourceSerifPro',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  emptySnippet: {
    fontSize: 13,
    color: colors.textDisabled,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tagChip: {
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
