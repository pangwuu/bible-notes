import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from './TemplateIcon';
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
      .replace(/###?\s*(?:[💡❓🏹\p{Emoji}]\s*)?(?:Key Idea(?:\(s\))?|Question(?:\(s\))?|Application(?:\(s\))?)/giu, '')
      .replace(/^#{1,6}\s+.*$/gm, '')
      .replace(/[💡❓🏹]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Determine snippet and side color based on actual user content
  let rawSnippet = '';
  let leftBorderColor: string = colors.borderHairline;

  if (note.sections && note.sections.length > 0) {
    const firstNonEmpty = note.sections.find((s) => s.content && cleanSnippet(s.content));
    if (firstNonEmpty) {
      rawSnippet = firstNonEmpty.content;
      leftBorderColor =
        firstNonEmpty.color ||
        (firstNonEmpty.id === 'light'
          ? colors.accentKeyIdea
          : firstNonEmpty.id === 'question'
          ? colors.accentQuestion
          : firstNonEmpty.id === 'arrow'
          ? colors.accentApplication
          : colors.accentKeyIdea);
    }
  } else if (note.lightContent && cleanSnippet(note.lightContent)) {
    rawSnippet = note.lightContent;
    leftBorderColor = colors.accentKeyIdea;
  } else if (note.questionContent && cleanSnippet(note.questionContent)) {
    rawSnippet = note.questionContent;
    leftBorderColor = colors.accentQuestion;
  } else if (note.arrowContent && cleanSnippet(note.arrowContent)) {
    rawSnippet = note.arrowContent;
    leftBorderColor = colors.accentApplication;
  } else if (
    !note.sections &&
    note.lightContent === undefined &&
    note.questionContent === undefined &&
    note.arrowContent === undefined &&
    note.content &&
    cleanSnippet(note.content)
  ) {
    rawSnippet = note.content;
    leftBorderColor = note.visibility === 'friends' ? colors.accentSocial : colors.borderHairline;
  }

  if (!rawSnippet && note.visibility === 'friends') {
    leftBorderColor = colors.accentSocial;
  }

  const previewSnippet = cleanSnippet(rawSnippet);

  const passageDisplay = note.passage
    ? note.passage.display || note.passage.displayString || formatPassageDisplay(note.passage)
    : 'Scripture Note';

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
        <Text style={styles.passageRef} numberOfLines={2} ellipsizeMode="tail">
          {passageDisplay}
        </Text>
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

          {note.sections && note.sections.length > 0 ? (
            note.sections.map((sec) =>
              sec.content?.trim() ? (
                <TemplateIcon
                  key={sec.id}
                  name={sec.icon || 'document-text-outline'}
                  size={13}
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
                <Ionicons name="bulb-outline" size={13} color={colors.accentKeyIdea} />
              ) : null}
              {note.questionContent ? (
                <Ionicons name="help-circle-outline" size={13} color={colors.accentQuestion} />
              ) : null}
              {note.arrowContent ? (
                <Ionicons name="footsteps-outline" size={13} color={colors.accentApplication} />
              ) : null}
            </>
          )}
        </View>
      </View>

      {previewSnippet ? (
        <Text numberOfLines={2} style={styles.snippet}>
          {previewSnippet}
        </Text>
      ) : (
        <Text numberOfLines={1} style={styles.emptySnippet}>
          No reflection written yet
        </Text>
      )}

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
    flex: 1,
    marginRight: spacing.sm,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
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
  emptySnippet: {
    fontSize: 13,
    color: colors.textDisabled,
    fontFamily: 'SourceSerifPro',
    fontStyle: 'italic',
    lineHeight: 18,
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
