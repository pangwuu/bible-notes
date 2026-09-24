import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { FriendActivityItem } from '../services/dashboardService';
import { formatPassageDisplay } from '../types/note';
import { TemplateIcon } from './TemplateIcon';

export interface FriendNoteCardProps {
  item: FriendActivityItem;
  onPress: () => void;
  style?: any;
}

export const FriendNoteCard: React.FC<FriendNoteCardProps> = ({ item, onPress, style }) => {
  const { note, author, isIntersecting } = item;

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
            <Ionicons name="people-outline" size={13} color={colors.accentSocial} />
            <Text style={styles.overlapBadgeText}>Mutual Passage</Text>
          </View>
        ) : null}
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

      {/* For intersecting notes: Display "You also noted this verse" */}
      {isIntersecting ? (
        <Text style={styles.overlapContextText}>
          You also noted this verse
        </Text>
      ) : null}

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
    paddingVertical: 3,
  },
  overlapBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentSocial,
  },
  passageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
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
  overlapContextText: {
    fontSize: 12,
    color: colors.accentSocial,
    marginTop: 2,
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
