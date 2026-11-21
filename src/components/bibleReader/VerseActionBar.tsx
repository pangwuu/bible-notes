import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from '../TemplateIcon';
import { colors, spacing, radius } from '../../constants/theme';
import { PassageReference } from '../../types/note';
import { formatVerseRangeLabel, LinkedSectionInfo } from '../../utils/verseLinkUtils';
import { SectionOption } from './types';

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

  return (
    <View style={styles.floatingActionBar}>
      <View style={styles.actionHeaderRow}>
        <View style={styles.actionHeaderLeft}>
          <Ionicons name="checkmark-circle" size={15} color={colors.accent.keyIdea} />
          <Text style={styles.actionHeaderTitle}>{rangeLabel} selected</Text>
        </View>
        <Pressable
          onPress={onClearSelection}
          style={styles.actionCloseBtn}
          hitSlop={6}
          accessibilityLabel="Clear selection"
        >
          <Ionicons name="close" size={16} color={colors.text.secondary} />
        </Pressable>
      </View>

      <View style={styles.actionControlsRow}>
        {/* Share action */}
        <Pressable
          onPress={onShareSelected}
          style={styles.actionBtnPill}
          accessibilityLabel="Share selected verses"
        >
          <Ionicons name="share-outline" size={14} color={colors.text.primary} />
          <Text style={styles.actionBtnPillText}>Share</Text>
        </Pressable>

        {onOpenCrossReferences && crossReferenceCount > 0 && (
          <Pressable
            onPress={onOpenCrossReferences}
            style={[styles.actionBtnPill, styles.actionBtnRelated]}
            accessibilityLabel={`Show ${crossReferenceCount} related passages`}
          >
            <Ionicons name="git-network-outline" size={14} color={colors.accent.question} />
            <Text style={[styles.actionBtnPillText, { color: colors.accent.question }]}>
              Related{crossReferenceCount > 0 ? ` (${crossReferenceCount})` : ''}
            </Text>
          </Pressable>
        )}

        {/* Jump to Note actions - supports multiple linked sections */}
        {linkedSectionsToJump.length > 0 && onJumpToSection && (
          <View style={styles.jumpGroupRow}>
            {linkedSectionsToJump.map((sec) => (
              <Pressable
                key={sec.sectionId}
                onPress={() => {
                  onJumpToSection(sec.sectionId);
                  setTimeout(() => {
                    onClearSelection();
                  }, 350);
                }}
                style={[styles.actionBtnPill, styles.actionBtnJump]}
                accessibilityLabel={`Jump to ${sec.sectionTitle}`}
              >
                <Ionicons
                  name="arrow-down-circle-outline"
                  size={14}
                  color={sec.sectionColor || colors.accent.keyIdea}
                />
                <Text
                  style={[
                    styles.actionBtnPillText,
                    { color: sec.sectionColor || colors.accent.keyIdea },
                  ]}
                >
                  Jump to {sec.sectionTitle}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Quick-Pick Section Buttons */}
        {onAttachToSection && (
          <View style={styles.sectionPickerWrap}>
            <Text style={styles.sectionPickerPrompt}>Note in:</Text>
            <View style={styles.sectionPickerRow}>
              {availableSections.map((sec) => (
                <Pressable
                  key={sec.id}
                  onPress={() => {
                    const fallbackSeg = targetPassage?.segments?.[0];
                    const book = activeContext?.book || fallbackSeg?.book;
                    const chapter = activeContext?.chapter || fallbackSeg?.startChapter;
                    onAttachToSection(sortedSelectedVerses, sec.id, {
                      book,
                      chapter,
                    });
                    onClearSelection();
                  }}
                  style={styles.sectionPickBtn}
                  accessibilityLabel={`Attach to ${sec.title}`}
                >
                  {sec.icon && (
                    <TemplateIcon
                      name={sec.icon}
                      size={13}
                      color={sec.color || colors.accent.keyIdea}
                    />
                  )}
                  <Text style={styles.sectionPickBtnText}>{sec.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
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
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  actionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  actionCloseBtn: {
    padding: 2,
  },
  actionControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  actionBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.base,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  actionBtnPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  actionBtnJump: {
    borderColor: colors.accent.keyIdea,
  },
  actionBtnRelated: {
    borderColor: colors.accent.question,
  },
  jumpGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  sectionPickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sectionPickerPrompt: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  sectionPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  sectionPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bg.base,
    borderRadius: radius.control,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  sectionPickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
