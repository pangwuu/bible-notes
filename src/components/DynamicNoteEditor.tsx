/**
 * Dynamic Minimalist Unbordered Note Editor
 * Supports up to 10 dynamic sections defined by any NoteTemplate (Swedish, SOAP, Inductive, Custom).
 * Governed strictly by DESIGN.md.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from './TemplateIcon';
import { colors, spacing, radii, typography } from '../constants/theme';
import { NoteVisibility, NoteSectionValue } from '../types/note';
import { NoteTemplate } from '../types/template';
import TagInput from './TagInput';

export interface DynamicNoteEditorProps {
  template: NoteTemplate;
  sections: NoteSectionValue[];
  tags: string[];
  visibility: NoteVisibility;
  onChangeSection: (index: number, val: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onChangeVisibility: (val: NoteVisibility) => void;
  onBlur?: () => void;
  editable?: boolean;
  suggestionTags?: string[];
  templateSelector?: React.ReactNode;
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

export const DynamicNoteEditor: React.FC<DynamicNoteEditorProps> = ({
  template,
  sections,
  tags,
  visibility,
  onChangeSection,
  onAddTag,
  onRemoveTag,
  onChangeVisibility,
  onBlur,
  editable = true,
  suggestionTags,
  templateSelector,
}) => {
  const combinedSuggestions = useMemo(() => {
    return Array.from(new Set([...(suggestionTags || []), ...COMMON_TAG_SUGGESTIONS]));
  }, [suggestionTags]);

  const getSectionColor = (sec: NoteSectionValue, templateSec?: any) => {
    if (sec.color) return sec.color;
    if (templateSec?.color) return templateSec.color;
    if (sec.id === 'light') return colors.accent.keyIdea;
    if (sec.id === 'question') return colors.accent.question;
    if (sec.id === 'arrow') return colors.accent.application;
    return colors.accent.keyIdea;
  };

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

      {/* Template Quick Selector (Underneath Scripture Component, Below Visibility) */}
      {templateSelector && (
        <>
          <View style={styles.templateSelectorWrapper}>
            <Text style={styles.metaLabel}>Template</Text>
            {templateSelector}
          </View>
          <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />
        </>
      )}

      {/* Dynamic Sections */}
      {sections.map((section, idx) => {
        const templateSec = template.sections[idx] || template.sections.find((s) => s.id === section.id);
        const iconName = (section.icon || templateSec?.icon || 'document-text-outline') as any;
        const color = getSectionColor(section, templateSec);
        const placeholder =
          templateSec?.placeholder || `Write your reflection for ${section.title}...`;

        return (
          <React.Fragment key={section.id || idx}>
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <TemplateIcon name={iconName} size={15} color={color} />
                <Text style={[styles.sectionCaption, { color }]}>
                  {section.title}
                </Text>
              </View>
              <TextInput
                value={section.content}
                onChangeText={(val) => onChangeSection(idx, val)}
                onBlur={onBlur}
                placeholder={placeholder}
                placeholderTextColor={colors.text.secondary}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                editable={editable}
                style={styles.unborderedInput}
              />
            </View>
            <View style={styles.divider} accessibilityRole="none" importantForAccessibility="no" />
          </React.Fragment>
        );
      })}

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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  templateSelectorWrapper: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  visibilityToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: 9999,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  visOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 4,
  },
  visOptionActive: {
    backgroundColor: colors.text.primary,
  },
  visText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  visTextActive: {
    color: colors.bg.base,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.hairline,
    marginVertical: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  sectionCaption: {
    ...typography.caption,
    fontWeight: '600',
  },
  unborderedInput: {
    ...typography.body,
    color: colors.text.primary,
    minHeight: 64,
    paddingVertical: 4,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
});

export default DynamicNoteEditor;
