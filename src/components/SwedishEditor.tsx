/**
 * Day One-style Minimalist Unbordered Swedish Method Editor
 * Governed strictly by DESIGN.md.
 */

import React, { useState, useCallback } from 'react';
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
}) => {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = useCallback(() => {
    const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (clean && !tags.includes(clean) && tags.length < 5) {
      onAddTag(clean);
      setTagInput('');
    }
  }, [tagInput, tags, onAddTag]);

  const filteredSuggestions = tagInput.trim()
    ? COMMON_TAG_SUGGESTIONS.filter(
        (t) => t.startsWith(tagInput.trim().toLowerCase()) && !tags.includes(t)
      )
    : [];

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

      {/* Section 1: 💡 Key Idea */}
      <View style={styles.section}>
        <Text style={[styles.sectionCaption, { color: colors.accent.keyIdea }]}>
          💡 Key Idea
        </Text>
        <TextInput
          value={lightContent}
          onChangeText={onChangeLight}
          onBlur={onBlur}
          placeholder="What is the main truth, light, or takeaway?"
          placeholderTextColor={colors.text.secondary}
          multiline
          editable={editable}
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Section 2: ❓ Question */}
      <View style={styles.section}>
        <Text style={[styles.sectionCaption, { color: colors.accent.question }]}>
          ❓ Question
        </Text>
        <TextInput
          value={questionContent}
          onChangeText={onChangeQuestion}
          onBlur={onBlur}
          placeholder="What is unclear, difficult, or invites deeper inquiry?"
          placeholderTextColor={colors.text.secondary}
          multiline
          editable={editable}
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Section 3: 🏹 Application */}
      <View style={styles.section}>
        <Text style={[styles.sectionCaption, { color: colors.accent.application }]}>
          🏹 Application
        </Text>
        <TextInput
          value={arrowContent}
          onChangeText={onChangeArrow}
          onBlur={onBlur}
          placeholder="How does this truth strike your personal walk today?"
          placeholderTextColor={colors.text.secondary}
          multiline
          editable={editable}
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />

      {/* Tag Chips Management */}
      <View style={styles.tagsContainer}>
        <Text style={styles.metaLabel}>Tags ({tags.length}/5)</Text>

        <View style={styles.tagChipsRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>#{tag}</Text>
              {editable && (
                <Pressable
                  onPress={() => onRemoveTag(tag)}
                  hitSlop={6}
                  style={styles.removeTagBtn}
                >
                  <Ionicons name="close" size={14} color={colors.text.secondary} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {editable && tags.length < 5 && (
          <View style={styles.tagInputWrapper}>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              placeholder="Add tag (e.g. grace, prayer)..."
              placeholderTextColor={colors.text.secondary}
              autoCapitalize="none"
              returnKeyType="done"
              style={styles.tagTextInput}
            />
            {tagInput.trim().length > 0 && (
              <Pressable onPress={handleAddTag} style={styles.addTagButton}>
                <Text style={styles.addTagButtonText}>Add</Text>
              </Pressable>
            )}
          </View>
        )}

        {filteredSuggestions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
            {filteredSuggestions.map((sug) => (
              <Pressable
                key={sug}
                onPress={() => {
                  onAddTag(sug);
                  setTagInput('');
                }}
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionText}>+{sug}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
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
  sectionCaption: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginBottom: spacing.xs,
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
