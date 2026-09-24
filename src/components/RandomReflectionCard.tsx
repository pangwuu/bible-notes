import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { Note, formatPassageDisplay } from '../types/note';
import { TemplateIcon } from './TemplateIcon';

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
  let indicatorColor: string = colors.accentKeyIdea;

  if (note.sections && note.sections.length > 0) {
    const firstSec = note.sections.find((s) => s.content?.trim());
    if (firstSec) {
      indicatorColor =
        firstSec.color ||
        (firstSec.id === 'light'
          ? colors.accentKeyIdea
          : firstSec.id === 'question'
          ? colors.accentQuestion
          : firstSec.id === 'arrow'
          ? colors.accentApplication
          : colors.accentKeyIdea);
    }
  } else if (note.lightContent?.trim()) {
    indicatorColor = colors.accentKeyIdea;
  } else if (note.questionContent?.trim()) {
    indicatorColor = colors.accentQuestion;
  } else if (note.arrowContent?.trim()) {
    indicatorColor = colors.accentApplication;
  }

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

      <View style={styles.passageRow}>
        <Text style={styles.passageRef} numberOfLines={1}>
          {passageDisplay}
        </Text>

        {/* Section indicator icons on the right */}
        <View style={styles.sectionIndicators}>
          {note.sections && note.sections.length > 0 ? (
            note.sections.map((sec) =>
              sec.content?.trim() ? (
                <TemplateIcon
                  key={sec.id}
                  name={sec.icon || 'document-text-outline'}
                  size={14}
                  color={
                    sec.color ||
                    (sec.id === 'light'
                      ? colors.accentKeyIdea
                      : sec.id === 'question'
                      ? colors.accentQuestion
                      : sec.id === 'arrow'
                      ? colors.accentApplication
                      : colors.textSecondary)
                  }
                />
              ) : null
            )
          ) : (
            <>
              {note.lightContent ? (
                <Ionicons name="bulb-outline" size={14} color={colors.accentKeyIdea} />
              ) : null}
              {note.questionContent ? (
                <Ionicons name="help-circle-outline" size={14} color={colors.accentQuestion} />
              ) : null}
              {note.arrowContent ? (
                <Ionicons name="footsteps-outline" size={14} color={colors.accentApplication} />
              ) : null}
            </>
          )}
        </View>
      </View>

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
    marginBottom: spacing.xs + 4,
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
  passageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passageRef: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  sectionIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
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
