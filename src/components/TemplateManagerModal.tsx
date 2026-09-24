import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from './TemplateIcon';
import { colors, spacing, radii, typography } from '../constants/theme';
import { NoteTemplate } from '../types/template';

interface TemplateManagerModalProps {
  visible: boolean;
  templates: NoteTemplate[];
  selectedTemplateId: string;
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate) => void;
  onCreateNew: () => void;
  onEditTemplate: (template: NoteTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  visible,
  templates,
  selectedTemplateId,
  onClose,
  onSelectTemplate,
  onCreateNew,
  onEditTemplate,
  onDeleteTemplate,
}) => {
  const handleDelete = (template: NoteTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete the "${template.name}" template?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteTemplate(template.id),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Note Templates</Text>
              <Text style={styles.subtitle}>Choose or create structured reflection formats</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Create New CTA */}
          <Pressable
            onPress={() => {
              onClose();
              onCreateNew();
            }}
            style={styles.createButton}
            accessibilityRole="button"
            accessibilityLabel="Create custom template"
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.bg.base} />
            <Text style={styles.createButtonText}>Create Custom Template</Text>
          </Pressable>

          {/* Template Cards List */}
          <ScrollView
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {templates.map((template) => {
              const isSelected = template.id === selectedTemplateId;
              const templateColor = template.color || colors.accent.keyIdea;
              return (
                <View
                  key={template.id}
                  style={[styles.card, isSelected && styles.cardActive]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <View style={[styles.iconCircle, { borderColor: templateColor }]}>
                        <TemplateIcon
                          name={template.icon || 'document-text-outline'}
                          size={18}
                          color={templateColor}
                        />
                      </View>
                      <View style={styles.nameBlock}>
                        <Text style={styles.templateName}>{template.name}</Text>
                        <Text style={styles.sectionCountText}>
                          {template.sections.length} {template.sections.length === 1 ? 'section' : 'sections'}
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                      {!template.isBuiltIn && (
                        <>
                          <Pressable
                            onPress={() => {
                              onClose();
                              onEditTemplate(template);
                            }}
                            style={styles.actionIconBtn}
                            hitSlop={8}
                          >
                            <Ionicons name="pencil-outline" size={16} color={colors.text.secondary} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDelete(template)}
                            style={styles.actionIconBtn}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.accent.danger} />
                          </Pressable>
                        </>
                      )}
                      <Pressable
                        onPress={() => {
                          onSelectTemplate(template);
                          onClose();
                        }}
                        style={[
                          styles.selectBtn,
                          isSelected && styles.selectBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectBtnText,
                            isSelected && styles.selectBtnTextActive,
                          ]}
                        >
                          {isSelected ? 'Active' : 'Use'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {template.description ? (
                    <Text style={styles.description}>{template.description}</Text>
                  ) : null}

                  {/* Section badges preview */}
                  <View style={styles.sectionChipsRow}>
                    {template.sections.map((sec, idx) => (
                      <View key={sec.id || idx} style={styles.sectionChip}>
                        {sec.icon ? (
                          <TemplateIcon
                            name={sec.icon || 'document-text-outline'}
                            size={12}
                            color={sec.color || templateColor}
                            style={styles.secChipIcon}
                          />
                        ) : null}
                        <Text style={styles.sectionChipText}>{sec.title}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.keyIdea,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.controls,
    gap: spacing.xs,
  },
  createButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.bg.base,
  },
  listContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  cardActive: {
    borderColor: colors.accent.keyIdea,
    backgroundColor: colors.bg.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  nameBlock: {
    flex: 1,
  },
  templateName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionCountText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIconBtn: {
    padding: 6,
  },
  selectBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.content,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  selectBtnActive: {
    backgroundColor: colors.accent.keyIdea,
    borderColor: colors.accent.keyIdea,
  },
  selectBtnText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.primary,
  },
  selectBtnTextActive: {
    color: colors.bg.base,
  },
  description: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  sectionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  sectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  secChipIcon: {
    marginRight: 4,
  },
  sectionChipText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.secondary,
  },
});

export default TemplateManagerModal;
