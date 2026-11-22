import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from '../TemplateIcon';
import { colors, spacing, radius } from '../../constants/theme';
import { PassageReference } from '../../types/note';
import { formatVerseRangeLabel, LinkedSectionInfo } from '../../utils/verseLinkUtils';
import { SectionOption } from './types';
import { OverflowChipRow } from './OverflowChipRow';

interface VerseActionBarProps {
  sortedSelectedVerses: number[];
  linkedSectionsToJump: LinkedSectionInfo[];
  availableSections: SectionOption[];
  targetPassage?: PassageReference;
  activeContext?: { book?: string; chapter?: number } | null;
  onClearSelection: () => void;
  onShareSelected: () => void;
  onJumpToSection?: (sectionId: string) => void;
  onAttachToSection?: (verses: number[], sectionId: string, context?: { book?: string; chapter?: number }) => void;
  onOpenCrossReferences?: () => void;
  crossReferenceCount?: number;
}

export const VerseActionBar: React.FC<VerseActionBarProps> = ({
  sortedSelectedVerses,
  linkedSectionsToJump,
  availableSections,
  targetPassage,
  activeContext,
  onClearSelection,
  onShareSelected,
  onJumpToSection,
  onAttachToSection,
  onOpenCrossReferences,
  crossReferenceCount = 0,
}) => {
  if (sortedSelectedVerses.length === 0) return null;

  const rangeLabel = formatVerseRangeLabel(
    sortedSelectedVerses[0],
    sortedSelectedVerses[sortedSelectedVerses.length - 1],
    activeContext || undefined,
    sortedSelectedVerses
  );

  const showJumps = linkedSectionsToJump.length > 0 && !!onJumpToSection;
  const showAttach = !!onAttachToSection && availableSections.length > 0;

  return (
    <View style={styles.floatingActionBar}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="checkmark-circle" size={15} color={colors.accent.keyIdea} />
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {rangeLabel} selected
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={onShareSelected}
            style={[styles.headerBtn, styles.iconOnlyBtn]}
            accessibilityRole="button"
            accessibilityLabel="Share selected verses"
            hitSlop={6}
          >
            <Ionicons name="share-outline" size={16} color={colors.text.primary} />
          </Pressable>

          {onOpenCrossReferences && crossReferenceCount > 0 && (
            <Pressable
              onPress={onOpenCrossReferences}
              style={[styles.headerBtn, styles.headerBtnRelated]}
              accessibilityRole="button"
              accessibilityLabel={`Show ${crossReferenceCount} related passages`}
              hitSlop={6}
            >
              <Ionicons name="git-network-outline" size={15} color={colors.accent.question} />
              <Text style={[styles.headerBtnText, { color: colors.accent.question }]}>
                Related ({crossReferenceCount})
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onClearSelection}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear selection"
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </Pressable>
        </View>
      </View>

      {showJumps && (
        <View style={styles.chipRow}>
          <OverflowChipRow>
            {linkedSectionsToJump.map((sec) => (
              <Pressable
                key={sec.sectionId}
                onPress={() => {
                  onJumpToSection!(sec.sectionId);
                  setTimeout(() => {
                    onClearSelection();
                  }, 350);
                }}
                style={[styles.chip, { borderColor: sec.sectionColor || colors.accent.keyIdea }]}
                accessibilityRole="button"
                accessibilityLabel={`Jump to ${sec.sectionTitle}`}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={14}
                  color={sec.sectionColor || colors.accent.keyIdea}
                />
                <Text style={[styles.chipText, { color: sec.sectionColor || colors.accent.keyIdea }]}>
                  Jump to {sec.sectionTitle}
                </Text>
              </Pressable>
            ))}
          </OverflowChipRow>
        </View>
      )}

      {showAttach && (
        <View style={styles.chipRow}>
          <Text style={styles.rowPrompt}>Note in:</Text>
          <OverflowChipRow>
            {availableSections.map((sec) => (
              <Pressable
                key={sec.id}
                onPress={() => {
                  const fallbackSeg = targetPassage?.segments?.[0];
                  const book = activeContext?.book || fallbackSeg?.book;
                  const chapter = activeContext?.chapter || fallbackSeg?.startChapter;
                  onAttachToSection!(sortedSelectedVerses, sec.id, { book, chapter });
                  onClearSelection();
                }}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={`Attach to ${sec.title}`}
              >
                {sec.icon && (
                  <TemplateIcon name={sec.icon} size={14} color={sec.color || colors.accent.keyIdea} />
                )}
                <Text style={styles.chipText}>{sec.title}</Text>
              </Pressable>
            ))}
          </OverflowChipRow>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  floatingActionBar: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bg.base,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  iconOnlyBtn: {
    width: 32,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  headerBtnRelated: {
    borderColor: colors.accent.question,
  },
  headerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowPrompt: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
    flexShrink: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bg.base,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
