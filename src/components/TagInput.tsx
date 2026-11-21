import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';

export interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  suggestions?: string[];
  maxTags?: number;
  editable?: boolean;
  onFocus?: () => void;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onAddTag,
  onRemoveTag,
  suggestions = [],
  maxTags = 5,
  editable = true,
  onFocus,
}) => {
  const [input, setInput] = useState('');

  const handleAdd = useCallback(() => {
    const clean = input.trim().toLowerCase().replace(/^#+/, '');
    if (clean && !tags.includes(clean) && tags.length < maxTags) {
      onAddTag(clean);
      setInput('');
    }
  }, [input, tags, maxTags, onAddTag]);

  const filteredSuggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    return suggestions
      .filter((s) => !tags.includes(s) && (q ? s.includes(q) : true))
      .slice(0, 8);
  }, [suggestions, tags, input]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Tags</Text>
        <Text style={styles.counter}>
          {tags.length}/{maxTags}
        </Text>
      </View>

      {/* Selected Tags Chips */}
      <View style={styles.chipsRow}>
        {tags.map((tag) => (
          <View key={tag} style={styles.tagChip}>
            <Text style={styles.tagChipText}>#{tag}</Text>
            {editable && (
              <Pressable
                onPress={() => onRemoveTag(tag)}
                hitSlop={6}
                style={styles.removeBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove tag ${tag}`}
              >
                <Ionicons name="close" size={14} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {/* Input Field (when under max limit) */}
      {editable && tags.length < maxTags && (
        <View style={styles.inputWrapper}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            onFocus={onFocus}
            placeholder="Add tag (e.g. faith, grace)..."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            returnKeyType="done"
            style={styles.textInput}
          />
          {input.trim().length > 0 && (
            <Pressable onPress={handleAdd} style={styles.addButton}>
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Suggestions Row */}
      {editable && filteredSuggestions.length > 0 && tags.length < maxTags && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsScroll}
          contentContainerStyle={styles.suggestionsContainer}
        >
          {filteredSuggestions.map((sug) => (
            <Pressable
              key={sug}
              onPress={() => {
                onAddTag(sug);
                setInput('');
              }}
              style={styles.suggestionChip}
            >
              <Text style={styles.suggestionText}>+{sug}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  counter: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    gap: 4,
  },
  tagChipText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  removeBtn: {
    padding: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 8,
  },
  addButton: {
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.control,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.xs,
  },
  addButtonText: {
    color: colors.accentKeyIdea,
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionsScroll: {
    marginTop: spacing.xs,
  },
  suggestionsContainer: {
    gap: spacing.xs,
  },
  suggestionChip: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  suggestionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default TagInput;
