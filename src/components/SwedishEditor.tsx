/**
 * Day One-style Minimalist Unbordered Swedish Method Editor
 * Governed strictly by DESIGN.md.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../constants/theme';
import { NoteVisibility } from '../types/note';
import TagInput from './TagInput';

export interface SwedishEditorProps {
  lightContent: string;
  questionContent: string;
  arrowContent: string;
  tags: string[];
  visibility: NoteVisibility;
  onChangeLight: (val: string) => void;
  onChangeQuestion: (val: string) => void;
  onChangeArrow: (val: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onChangeVisibility: (val: NoteVisibility) => void;
  onBlur?: () => void;
  editable?: boolean;
  suggestionTags?: string[];
}

const COMMON_TAG_SUGGESTIONS = [
  'faith',
  'grace',
  'assurance',
  'discipleship',
  'salvation',
  'prayer',
  'hope',
  'love',
  'wisdom',
  'repentance',
];

export const SwedishEditor: React.FC<SwedishEditorProps> = ({
  lightContent,
  questionContent,
  arrowContent,
  tags,
  visibility,
  onChangeLight,
  onChangeQuestion,
  onChangeArrow,
  onAddTag,
  onRemoveTag,
  onChangeVisibility,
  onBlur,
  editable = true,
  suggestionTags,
}) => {
  const combinedSuggestions = useMemo(() => {
    return Array.from(new Set([...(suggestionTags || []), ...COMMON_TAG_SUGGESTIONS]));
  }, [suggestionTags]);

  return (
    <View style={styles.container}>
      {/* Visibility Toggle Row */}
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Visibility</Text>
        <View style={styles.visibilityToggle}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Note visibility: friends"
            onPress={() => onChangeVisibility('friends')}
            style={[
              styles.visOption,
              visibility === 'friends' && styles.visOptionActive,
            ]}
          >
            <Ionicons
              name="people"
              size={14}
              color={visibility === 'friends' ? colors.bg.base : colors.text.secondary}
            />
            <Text
              style={[
                styles.visText,
                visibility === 'friends' && styles.visTextActive,
              ]}
            >
              Friends
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Note visibility: private"
            onPress={() => onChangeVisibility('private')}
            style={[
              styles.visOption,
              visibility === 'private' && styles.visOptionActive,
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={14}
              color={visibility === 'private' ? colors.bg.base : colors.text.secondary}
            />
            <Text
              style={[
                styles.visText,
                visibility === 'private' && styles.visTextActive,
              ]}
            >
              Private
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Section 1: Key Idea */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="bulb-outline" size={15} color={colors.accent.keyIdea} />
          <Text style={[styles.sectionCaption, { color: colors.accent.keyIdea }]}>
            Key Idea
          </Text>
        </View>
        <TextInput
          value={lightContent}
          onChangeText={onChangeLight}
          onBlur={onBlur}
          placeholder="What light or main truth shines out from this passage?"
          placeholderTextColor={colors.text.secondary}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          editable={editable}
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Section 2: Question */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="help-circle-outline" size={15} color={colors.accent.question} />
          <Text style={[styles.sectionCaption, { color: colors.accent.question }]}>
            Question
          </Text>
        </View>
        <TextInput
          value={questionContent}
          onChangeText={onChangeQuestion}
          onBlur={onBlur}
          placeholder="What is unclear, difficult, or invites deeper inquiry?"
          placeholderTextColor={colors.text.secondary}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          editable={editable}
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Section 3: Application */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="navigate-outline" size={15} color={colors.accent.application} />
          <Text style={[styles.sectionCaption, { color: colors.accent.application }]}>
            Application
          </Text>
        </View>
        <TextInput
          value={arrowContent}
          onChangeText={onChangeArrow}
          onBlur={onBlur}
          placeholder="How does this truth strike your personal walk today?"
          placeholderTextColor={colors.text.secondary}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          editable={editable}
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Tag Chips Management via TagInput */}
      <TagInput
        tags={tags}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        suggestions={combinedSuggestions}
        maxTags={5}
        editable={editable}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  metaLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  visibilityToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  visOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.controls - 2,
  },
  visOptionActive: {
    backgroundColor: colors.accent.keyIdea,
  },
  visText: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  visTextActive: {
    color: colors.bg.base,
    fontWeight: '600',
  },
  section: {
    paddingVertical: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  sectionCaption: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  unborderedInput: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text.primary,
    minHeight: 64,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.hairline,
    marginVertical: spacing.xs,
  },
  tagsContainer: {
    paddingVertical: spacing.sm,
  },
  tagChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    gap: 4,
  },
  tagChipText: {
    fontSize: typography.caption.fontSize,
    color: colors.text.primary,
  },
  removeTagBtn: {
    padding: 2,
  },
  tagInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  tagTextInput: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.text.primary,
    fontSize: typography.caption.fontSize,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  addTagButton: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  addTagButtonText: {
    color: colors.accent.keyIdea,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  suggestionsRow: {
    marginTop: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginRight: spacing.xs,
  },
  suggestionText: {
    color: colors.text.secondary,
    fontSize: 11,
  },
});

export default SwedishEditor;
