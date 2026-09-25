import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from './TemplateIcon';
import { colors, spacing, radii, typography } from '../constants/theme';
import { NoteTemplate } from '../types/template';

interface TemplateQuickSelectorProps {
  templates: NoteTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (template: NoteTemplate) => void;
  onOpenManager: () => void;
}

export const TemplateQuickSelector: React.FC<TemplateQuickSelectorProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onOpenManager,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Header Row: Template Label (left) and pinned Browse all button (right) */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="albums-outline" size={15} color={colors.accent.keyIdea} />
          <Text style={styles.headerLabel}>Template</Text>
        </View>
        <Pressable
          onPress={onOpenManager}
          style={styles.browseAllButton}
          accessibilityRole="button"
          accessibilityLabel="Browse all templates"
          hitSlop={8}
        >
          <Ionicons name="options-outline" size={13} color={colors.accent.keyIdea} />
          <Text style={styles.browseAllText}>Browse all</Text>
        </Pressable>
      </View>

      {/* Horizontally scrollable template options */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {templates.map((template) => {
          const isSelected = template.id === selectedTemplateId;
          return (
            <Pressable
              key={template.id}
              onPress={() => onSelectTemplate(template)}
              style={[styles.pill, isSelected && styles.pillActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Select template ${template.name}`}
            >
              <TemplateIcon
                name={template.icon || 'document-text-outline'}
                size={14}
                color={isSelected ? colors.bg.base : colors.text.secondary}
                style={styles.pillIcon}
              />
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {template.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  browseAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.controls,
    backgroundColor: colors.bg.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    gap: 4,
  },
  browseAllText: {
    ...typography.caption,
    color: colors.accent.keyIdea,
    fontWeight: '600',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pillActive: {
    backgroundColor: colors.accent.keyIdea,
    borderColor: colors.accent.keyIdea,
  },
  pillIcon: {
    marginRight: 6,
  },
  pillText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  pillTextActive: {
    color: colors.bg.base,
    fontWeight: '600',
  },
});

export default TemplateQuickSelector;
