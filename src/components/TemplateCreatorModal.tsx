import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from './TemplateIcon';
import { colors, spacing, radii, typography } from '../constants/theme';
import {
  NoteTemplate,
  NoteTemplateSection,
  CURATED_TEMPLATE_ICONS,
  CURATED_TEMPLATE_COLORS,
  TEMPLATE_MAX_SECTIONS,
} from '../types/template';

interface TemplateCreatorModalProps {
  visible: boolean;
  initialTemplate?: NoteTemplate | null;
  onClose: () => void;
  onSave: (template: NoteTemplate) => void;
}

export const TemplateCreatorModal: React.FC<TemplateCreatorModalProps> = ({
  visible,
  initialTemplate,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('bulb-outline');
  const [color, setColor] = useState('#E3A53D');
  const [sections, setSections] = useState<NoteTemplateSection[]>([
    { id: 'sec_1', title: '', icon: 'bulb-outline', color: '#E3A53D', placeholder: '' },
  ]);
  const [showIconPicker, setShowIconPicker] = useState<number | 'template' | null>(null);

  useEffect(() => {
    if (initialTemplate) {
      setName(initialTemplate.name);
      setDescription(initialTemplate.description || '');
      setIcon(initialTemplate.icon || 'bulb-outline');
      setColor(initialTemplate.color || '#E3A53D');
      setSections(
        initialTemplate.sections.length > 0
          ? initialTemplate.sections.map((s) => ({ ...s, color: s.color || '#E3A53D' }))
          : [{ id: 'sec_1', title: '', icon: 'bulb-outline', color: '#E3A53D', placeholder: '' }]
      );
    } else {
      setName('');
      setDescription('');
      setIcon('bulb-outline');
      setColor('#E3A53D');
      setSections([
        { id: 'sec_1', title: '', icon: 'bulb-outline', color: '#E3A53D', placeholder: '' },
      ]);
    }
  }, [initialTemplate, visible]);

  const openPicker = (target: number | 'template') => {
    Keyboard.dismiss();
    setShowIconPicker(target);
  };

  const handleAddSection = () => {
    if (sections.length >= TEMPLATE_MAX_SECTIONS) {
      Alert.alert('Section Limit', `A template can have a maximum of ${TEMPLATE_MAX_SECTIONS} sections.`);
      return;
    }
    const nextId = `sec_${Date.now()}_${sections.length + 1}`;
    setSections([
      ...sections,
      { id: nextId, title: '', icon: 'document-text-outline', color: '#5B93C4', placeholder: '' },
    ]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length <= 1) {
      Alert.alert('Minimum Sections', 'A template must have at least 1 section.');
      return;
    }
    setSections(sections.filter((_, i) => i !== index));
  };

  const handleUpdateSection = (
    index: number,
    field: keyof NoteTemplateSection,
    value: string
  ) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Please enter a name for the template.');
      return;
    }

    const trimmedSections = sections.map((s) => ({
      ...s,
      title: s.title.trim(),
      placeholder: s.placeholder?.trim() || '',
      color: s.color || color,
    }));

    const emptySection = trimmedSections.find((s) => !s.title);
    if (emptySection) {
      Alert.alert('Validation Error', 'All sections must have a title.');
      return;
    }

    const templateToSave: NoteTemplate = {
      id: initialTemplate?.id || `tpl_${Date.now()}`,
      name: trimmedName,
      description: description.trim(),
      icon,
      color,
      isBuiltIn: false,
      sections: trimmedSections,
      updated_at: Date.now(),
      created_at: initialTemplate?.created_at || Date.now(),
    };

    onSave(templateToSave);
    onClose();
  };

  // Determine currently active color & icon in the picker
  const activePickerColor =
    showIconPicker === 'template'
      ? color
      : typeof showIconPicker === 'number'
      ? sections[showIconPicker]?.color || '#E3A53D'
      : '#E3A53D';

  const activePickerIcon =
    showIconPicker === 'template'
      ? icon
      : typeof showIconPicker === 'number'
      ? sections[showIconPicker]?.icon || 'document-text-outline'
      : 'bulb-outline';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>
              {initialTemplate ? 'Edit Template' : 'New Template'}
            </Text>
            <Pressable onPress={handleSave} style={styles.headerBtn} hitSlop={8}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Template Identity */}
            <View style={styles.card}>
              <Text style={styles.label}>Template Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Weekly Sermon Notes"
                placeholderTextColor={colors.text.secondary}
                style={styles.textInput}
              />

              <Text style={[styles.label, { marginTop: spacing.sm }]}>Description (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Brief summary of how to use this template..."
                placeholderTextColor={colors.text.secondary}
                style={styles.textInput}
              />

              <Text style={[styles.label, { marginTop: spacing.sm }]}>Template Icon & Color</Text>
              <Pressable
                onPress={() => openPicker('template')}
                style={styles.iconSelectorRow}
                accessibilityRole="button"
                accessibilityLabel="Choose template icon and color"
              >
                <View style={[styles.iconCircle, { borderColor: color }]}>
                  <TemplateIcon name={icon} size={20} color={color} />
                </View>
                <View>
                  <Text style={styles.iconSelectorText}>Tap to customize icon & color</Text>
                  <View style={styles.colorPreviewRow}>
                    <View style={[styles.colorDot, { backgroundColor: color }]} />
                    <Text style={styles.colorNameText}>{color}</Text>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* Sections Section */}
            <View style={styles.sectionsHeader}>
              <Text style={styles.sectionHeading}>
                Sections ({sections.length}/{TEMPLATE_MAX_SECTIONS})
              </Text>
              <Pressable
                onPress={handleAddSection}
                disabled={sections.length >= TEMPLATE_MAX_SECTIONS}
                style={[
                  styles.addSecBtn,
                  sections.length >= TEMPLATE_MAX_SECTIONS && { opacity: 0.4 },
                ]}
              >
                <Ionicons name="add" size={16} color={colors.accent.keyIdea} />
                <Text style={styles.addSecText}>Add Section</Text>
              </Pressable>
            </View>

            {sections.map((sec, idx) => {
              const secColor = sec.color || '#E3A53D';
              return (
                <View key={sec.id} style={styles.sectionCard}>
                  <View style={styles.secCardHeader}>
                    <Pressable
                      onPress={() => openPicker(idx)}
                      style={[styles.secIconBadge, { borderColor: secColor }]}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose icon and color for section ${idx + 1}`}
                    >
                      <TemplateIcon
                        name={sec.icon || 'document-text-outline'}
                        size={16}
                        color={secColor}
                      />
                    </Pressable>

                    <TextInput
                      value={sec.title}
                      onChangeText={(val) => handleUpdateSection(idx, 'title', val)}
                      placeholder={`Section ${idx + 1} Title (e.g. Observation)`}
                      placeholderTextColor={colors.text.secondary}
                      style={styles.secTitleInput}
                    />

                    {sections.length > 1 && (
                      <Pressable
                        onPress={() => handleRemoveSection(idx)}
                        style={styles.removeSecBtn}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove section ${idx + 1}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.accent.danger} />
                      </Pressable>
                    )}
                  </View>

                  <TextInput
                    value={sec.placeholder || ''}
                    onChangeText={(val) => handleUpdateSection(idx, 'placeholder', val)}
                    placeholder="Helper prompt / placeholder (optional)..."
                    placeholderTextColor={colors.text.secondary}
                    style={styles.secPromptInput}
                  />
                </View>
              );
            })}
          </ScrollView>

          {/* Icon & Color Picker Sub-Sheet */}
          {showIconPicker !== null && (
            <View style={styles.iconPickerOverlay}>
              <View style={styles.iconPickerContent}>
                <View style={styles.iconPickerHeader}>
                  <Text style={styles.iconPickerTitle}>Select Icon & Color</Text>
                  <Pressable onPress={() => setShowIconPicker(null)} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.text.secondary} />
                  </Pressable>
                </View>

                {/* Color Palette Row */}
                <Text style={styles.pickerSectionLabel}>Accent Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPaletteRow}>
                  {CURATED_TEMPLATE_COLORS.map((c) => {
                    const isSelected = activePickerColor === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => {
                          if (showIconPicker === 'template') {
                            setColor(c);
                          } else if (typeof showIconPicker === 'number') {
                            handleUpdateSection(showIconPicker, 'color', c);
                          }
                        }}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: c },
                          isSelected && styles.colorSwatchSelected,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color={colors.text.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Icons Grid */}
                <Text style={[styles.pickerSectionLabel, { marginTop: spacing.sm }]}>Icon Symbol</Text>
                <ScrollView style={styles.iconScrollArea} showsVerticalScrollIndicator={false}>
                  <View style={styles.iconGrid}>
                    {CURATED_TEMPLATE_ICONS.map((ic) => {
                      const isSelected = activePickerIcon === ic;
                      return (
                        <Pressable
                          key={ic}
                          onPress={() => {
                            if (showIconPicker === 'template') {
                              setIcon(ic);
                            } else if (typeof showIconPicker === 'number') {
                              handleUpdateSection(showIconPicker, 'icon', ic);
                            }
                            setShowIconPicker(null);
                          }}
                          style={[
                            styles.iconGridCell,
                            isSelected && { borderColor: activePickerColor, backgroundColor: colors.bg.surface },
                          ]}
                        >
                          <TemplateIcon
                            name={ic}
                            size={22}
                            color={isSelected ? activePickerColor : colors.text.primary}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  headerTitle: {
    ...typography.title,
    color: colors.text.primary,
  },
  headerBtn: {
    padding: spacing.xs,
  },
  cancelText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  saveText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.accent.keyIdea,
  },
  body: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  textInput: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  iconSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  iconSelectorText: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '500',
  },
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colorNameText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.secondary,
  },
  sectionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    ...typography.title,
    fontSize: 16,
    color: colors.text.primary,
  },
  addSecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.accent.keyIdea,
  },
  addSecText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent.keyIdea,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.xs,
  },
  secCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  secIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  secTitleInput: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  removeSecBtn: {
    padding: 6,
  },
  secPromptInput: {
    ...typography.caption,
    color: colors.text.primary,
    marginTop: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  iconPickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconPickerContent: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: colors.bg.surface,
    borderRadius: radii.controls,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  iconPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconPickerTitle: {
    ...typography.title,
    fontSize: 16,
    color: colors.text.primary,
  },
  pickerSectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: colors.text.primary,
    transform: [{ scale: 1.1 }],
  },
  iconScrollArea: {
    maxHeight: 220,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconGridCell: {
    width: 44,
    height: 44,
    borderRadius: radii.controls,
    backgroundColor: colors.bg.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
});

export default TemplateCreatorModal;
