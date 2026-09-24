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

        <Pressable
          onPress={onOpenManager}
          style={styles.manageButton}
          accessibilityRole="button"
          accessibilityLabel="Browse or create templates"
          hitSlop={8}
        >
          <Ionicons name="options-outline" size={14} color={colors.accent.keyIdea} />
          <Text style={styles.manageText}>Browse</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
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
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: colors.bg.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.accent.keyIdea,
  },
  manageText: {
    ...typography.caption,
    color: colors.accent.keyIdea,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default TemplateQuickSelector;
