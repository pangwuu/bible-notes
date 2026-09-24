import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { FriendActivityItem } from '../services/dashboardService';
import { formatPassageDisplay } from '../types/note';

export interface FriendNoteCardProps {
  item: FriendActivityItem;
  onPress: () => void;
  style?: any;
}

export const FriendNoteCard: React.FC<FriendNoteCardProps> = ({ item, onPress, style }) => {
  const { note, author, isIntersecting, overlappingPassageSummary } = item;

  // Clean Swedish emojis / markdown headers
  const cleanSnippet = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/###?\s*(?:[💡❓🏹]\s*)?(?:Key Idea(?:\(s\))?|Question(?:\(s\))?|Application(?:\(s\))?)/gi, '')
      .replace(/[💡❓🏹]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  let rawSnippet = '';
  if (note.lightContent && cleanSnippet(note.lightContent)) {
    rawSnippet = note.lightContent;
  } else if (note.questionContent && cleanSnippet(note.questionContent)) {
    rawSnippet = note.questionContent;
  } else if (note.arrowContent && cleanSnippet(note.arrowContent)) {
    rawSnippet = note.arrowContent;
  } else if (note.content) {
    rawSnippet = note.content;
  }

  const snippet = cleanSnippet(rawSnippet);

  const passageDisplay = note.passage
    ? note.passage.display || note.passage.displayString || formatPassageDisplay(note.passage)
    : 'Scripture Note';

  const authorName = author.display_name || author.username || 'Friend';
  const initial = authorName.charAt(0).toUpperCase() || '?';

  return (
    <Pressable
      style={[
        styles.card,
        isIntersecting && styles.intersectingBorder,
        style,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Friend note by ${authorName} on ${passageDisplay}`}
    >
      <View style={styles.authorRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.authorMeta}>
          <Text style={styles.authorName} numberOfLines={1}>
            {authorName}
          </Text>
          {author.username ? (
            <Text style={styles.authorUsername} numberOfLines={1}>
              @{author.username}
            </Text>
          ) : null}
        </View>

        {isIntersecting ? (
          <View style={styles.overlapBadge}>
            <Ionicons name="git-merge-outline" size={12} color={colors.accentSocial} />
            <Text style={styles.overlapBadgeText}>Mutual Passage</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.passageRef} numberOfLines={1}>
        {passageDisplay}
      </Text>

      {isIntersecting && overlappingPassageSummary ? (
        <Text style={styles.overlapContextText} numberOfLines={1}>
          You also noted {overlappingPassageSummary}
        </Text>
      ) : null}

      {snippet ? (
        <Text numberOfLines={2} style={styles.snippet}>
          {snippet}
        </Text>
      ) : (
        <Text numberOfLines={1} style={styles.emptySnippet}>
          No reflection snippet
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
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  intersectingBorder: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accentSocial,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgSurfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  authorUsername: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(180, 120, 158, 0.15)',
    borderWidth: 1,
    borderColor: colors.accentSocial,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  overlapBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentSocial,
  },
  passageRef: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  overlapContextText: {
    fontSize: 12,
    color: colors.accentSocial,
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
