import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { Note, formatPassageDisplay } from '../types/note';

export interface NoteCardProps {
  note: Note;
  onPress: () => void;
  style?: any;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onPress, style }) => {
  // Determine left border highlight: Key Idea (Amber), Question (Blue), Application (Green), or Hairline
  const leftBorderColor = note.lightContent
    ? colors.accentKeyIdea
    : note.questionContent
    ? colors.accentQuestion
    : note.arrowContent
    ? colors.accentApplication
    : colors.borderHairline;

  // Clean preview snippet: remove markdown headers and Swedish emojis so only user reflection appears
  const cleanSnippet = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/###?\s*(?:[💡❓🏹]\s*)?(?:Key Idea(?:\(s\))?|Question(?:\(s\))?|Application(?:\(s\))?)/gi, '')
      .replace(/[💡❓🏹]/g, '')
      .trim();
  };

  const rawSnippet =
    note.lightContent ||
    note.questionContent ||
    note.arrowContent ||
    note.content ||
    '';

  const previewSnippet = cleanSnippet(rawSnippet);

  const passageDisplay = note.passage
    ? formatPassageDisplay(note.passage)
    : `${note.book} ${note.chapter_start}:${note.verse_start}`;

  return (
    <Pressable
      style={[
        styles.card,
        { borderLeftColor: leftBorderColor, borderLeftWidth: 3 },
        style,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Note on ${passageDisplay}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.passageRef}>{passageDisplay}</Text>
        <View style={styles.indicators}>
          {note.lightContent ? (
            <Ionicons name="bulb-outline" size={13} color={colors.accentKeyIdea} />
          ) : null}
          {note.questionContent ? (
            <Ionicons name="help-circle-outline" size={13} color={colors.accentQuestion} />
          ) : null}
          {note.arrowContent ? (
            <Ionicons name="navigate-outline" size={13} color={colors.accentApplication} />
          ) : null}
        </View>
      </View>

      {previewSnippet ? (
        <Text numberOfLines={2} style={styles.snippet}>
          {previewSnippet}
        </Text>
      ) : null}

      {note.tags && note.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {note.tags.map((tag) => (
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
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  passageRef: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  indicatorSymbol: {
    fontSize: 14,
  },
  snippet: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'SourceSerifPro',
    lineHeight: 20,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  tagText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '400',
  },
});

export default NoteCard;
