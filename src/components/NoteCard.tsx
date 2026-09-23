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
  // Clean preview snippet: remove markdown headers and Swedish emojis so only user reflection appears
  const cleanSnippet = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/###?\s*(?:[💡❓🏹]\s*)?(?:Key Idea(?:\(s\))?|Question(?:\(s\))?|Application(?:\(s\))?)/gi, '')
      .replace(/[💡❓🏹]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Determine snippet and side color based on actual user content
  let rawSnippet = '';
  let leftBorderColor: string = colors.borderHairline;

  if (note.lightContent && cleanSnippet(note.lightContent)) {
    rawSnippet = note.lightContent;
    leftBorderColor = colors.accentKeyIdea;
  } else if (note.questionContent && cleanSnippet(note.questionContent)) {
    rawSnippet = note.questionContent;
    leftBorderColor = colors.accentQuestion;
  } else if (note.arrowContent && cleanSnippet(note.arrowContent)) {
    rawSnippet = note.arrowContent;
    leftBorderColor = colors.accentApplication;
  } else if (note.content && cleanSnippet(note.content)) {
    rawSnippet = note.content;
    leftBorderColor = note.visibility === 'friends' ? colors.accentSocial : colors.borderHairline;
  } else if (note.visibility === 'friends') {
    leftBorderColor = colors.accentSocial;
  }

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
          {/* Visibility indicator pill showing whether note is shared with friends or private */}
          <View style={styles.visBadge}>
            <Ionicons
              name={note.visibility === 'friends' ? 'people' : 'lock-closed'}
              size={12}
              color={colors.textSecondary}
            />
            <Text style={styles.visBadgeText}>
              {note.visibility === 'friends' ? 'Friends' : 'Private'}
            </Text>
          </View>

          {note.lightContent ? (
            <Ionicons name="bulb-outline" size={13} color={colors.accentKeyIdea} />
          ) : null}
          {note.questionContent ? (
            <Ionicons name="help-circle-outline" size={13} color={colors.accentQuestion} />
          ) : null}
          {note.arrowContent ? (
            <Ionicons name="footsteps-outline" size={13} color={colors.accentApplication} />
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
  visBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginRight: 2,
  },
  visBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

export default NoteCard;
