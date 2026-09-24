/**
 * Note Edit Screen
 * Day One unbordered editor with dynamic Note Templates (Swedish, SOAP, Inductive, Custom),
 * quick-selector pill bar, template manager & creator modals,
 * YouVersion-style passage picker drill-down, auto-save,
 * and dirty-state back confirmation modal.
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radii, typography } from '../../src/constants/theme';
import DynamicNoteEditor from '../../src/components/DynamicNoteEditor';
import TemplateQuickSelector from '../../src/components/TemplateQuickSelector';
import TemplateManagerModal from '../../src/components/TemplateManagerModal';
import TemplateCreatorModal from '../../src/components/TemplateCreatorModal';
import PassagePicker, { PassageSelection } from '../../src/components/PassagePicker';
import BibleReader from '../../src/components/BibleReader';
import FontSizeControls from '../../src/components/FontSizeControls';
import safeStorage from '../../src/utils/safeStorage';
import { PassageReference, NoteVisibility, NoteSectionValue, formatPassageDisplay } from '../../src/types/note';
import { NoteTemplate } from '../../src/types/template';
import {
  BUILT_IN_TEMPLATES,
  DEFAULT_TEMPLATE,
  getTemplateById,
  initializeSectionValues,
} from '../../src/constants/templates';
import * as notesService from '../../src/services/notesService';
import { updateUserProfile } from '../../src/services/authService';
import { notifyFriendsOfNoteOverlap } from '../../src/services/noteOverlapService';
import { useAuth } from '../../src/context/AuthContext';

export default function NoteEditScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState<boolean>(!!id);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState<boolean>(false);

  // Template Modals State
  const [showTemplateManager, setShowTemplateManager] = useState<boolean>(false);
  const [showTemplateCreator, setShowTemplateCreator] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);

  // All combined templates: built-ins + user custom templates
  const allTemplates = useMemo<NoteTemplate[]>(() => {
    const custom = profile?.custom_templates || [];
    return [...BUILT_IN_TEMPLATES, ...custom];
  }, [profile?.custom_templates]);

  // Note State - defaults to null for new notes so users choose their own passage
  const [passage, setPassage] = useState<PassageReference | null>(null);
  const [readerFontSize, setReaderFontSize] = useState<number>(16);

  // Active Template & Dynamic Sections
  const [activeTemplate, setActiveTemplate] = useState<NoteTemplate>(DEFAULT_TEMPLATE);
  const [sections, setSections] = useState<NoteSectionValue[]>(() =>
    initializeSectionValues(DEFAULT_TEMPLATE)
  );

  const [tags, setTags] = useState<string[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<NoteVisibility>(
    profile?.default_visibility || 'friends'
  );

  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(id);
  const currentNoteIdRef = useRef<string | undefined>(id);
  const isSavingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    safeStorage.getItem('bible_font_size').then((stored) => {
      if (isMounted && stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 26) {
          setReaderFontSize(parsed);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load user tag history for autocomplete
  useEffect(() => {
    if (user?.uid) {
      notesService.getUserTags(user.uid).then((t) => {
        setUserSuggestions(t);
      }).catch(() => {});
    }
  }, [user?.uid]);

  // Load existing note if editing
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    (async () => {
      try {
        const existing = await notesService.getNote(id);
        if (existing && isMounted) {
          setPassage(existing.passage);
          const tpl = getTemplateById(existing.templateId, profile?.custom_templates);
          setActiveTemplate(tpl);

          if (existing.sections && existing.sections.length > 0) {
            setSections(existing.sections);
          } else {
            // Synthesize from legacy Swedish fields
            setSections([
              { id: 'light', title: 'Key Idea', icon: 'bulb-outline', content: existing.lightContent || '' },
              { id: 'question', title: 'Question', icon: 'help-circle-outline', content: existing.questionContent || '' },
              { id: 'arrow', title: 'Application', icon: 'footsteps-outline', content: existing.arrowContent || '' },
            ]);
          }

          setTags(existing.tags);
          setVisibility(existing.visibility);
          setIsDirty(false);
        }
      } catch (err) {
        if (isMounted) setErrorBanner('Failed to load note.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id, profile?.custom_templates]);

  // Template switching logic with dirty state handling
  const handleSelectTemplate = useCallback(
    (targetTemplate: NoteTemplate) => {
      if (targetTemplate.id === activeTemplate.id) return;

      const hasText = sections.some((s) => s.content.trim().length > 0);
      if (!hasText) {
        setActiveTemplate(targetTemplate);
        setSections(initializeSectionValues(targetTemplate));
        setIsDirty(true);
        return;
      }

      Alert.alert(
        'Switch Template?',
        'Do you want to keep your current text in the new template or discard it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setActiveTemplate(targetTemplate);
              setSections(initializeSectionValues(targetTemplate));
              setIsDirty(true);
            },
          },
          {
            text: 'Keep Text',
            onPress: () => {
              const newSections = targetTemplate.sections.map((sec, idx) => ({
                id: sec.id,
                title: sec.title,
                icon: sec.icon,
                content: sections[idx]?.content || '',
              }));
              setActiveTemplate(targetTemplate);
              setSections(newSections);
              setIsDirty(true);
            },
          },
        ]
      );
    },
    [activeTemplate.id, sections]
  );

  // Template CRUD actions
  const handleSaveCustomTemplate = useCallback(
    async (template: NoteTemplate) => {
      if (!user?.uid) return;
      const existingCustom = profile?.custom_templates || [];
      const index = existingCustom.findIndex((t) => t.id === template.id);
      let updated: NoteTemplate[];
      if (index >= 0) {
        updated = [...existingCustom];
        updated[index] = template;
      } else {
        updated = [...existingCustom, template];
      }

      try {
        await updateUserProfile(user.uid, { custom_templates: updated });
        setActiveTemplate(template);
        setSections(initializeSectionValues(template));
      } catch (err) {
        Alert.alert('Error', 'Failed to save custom template.');
      }
    },
    [user?.uid, profile?.custom_templates]
  );

  const handleDeleteCustomTemplate = useCallback(
    async (templateId: string) => {
      if (!user?.uid) return;
      const existingCustom = profile?.custom_templates || [];
      const filtered = existingCustom.filter((t) => t.id !== templateId);

      try {
        await updateUserProfile(user.uid, { custom_templates: filtered });
        if (activeTemplate.id === templateId) {
          setActiveTemplate(DEFAULT_TEMPLATE);
          setSections(initializeSectionValues(DEFAULT_TEMPLATE));
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to delete custom template.');
      }
    },
    [user?.uid, profile?.custom_templates, activeTemplate.id]
  );

  // Master Save Handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current) return false;
    if (!passage) {
      setErrorBanner('Please select a scripture passage before saving');
      return false;
    }
    isSavingRef.current = true;
    setIsSaving(true);
    setErrorBanner(null);

    const targetId = currentNoteIdRef.current || id;

    // Extract Swedish fields for backwards compatibility
    const lightContent = sections.find((s) => s.id === 'light')?.content || '';
    const questionContent = sections.find((s) => s.id === 'question')?.content || '';
    const arrowContent = sections.find((s) => s.id === 'arrow')?.content || '';

    try {
      let savedNote;
      if (targetId) {
        savedNote = await notesService.updateNote(targetId, {
          passage,
          templateId: activeTemplate.id,
          templateName: activeTemplate.name,
          sections,
          lightContent,
          questionContent,
          arrowContent,
          tags,
          visibility,
        });
      } else {
        savedNote = await notesService.createNote({
          userId: user?.uid || '',
          authorUsername: profile?.username || user?.displayName || '',
          authorDisplayName: profile?.display_name || user?.displayName || '',
          passage,
          templateId: activeTemplate.id,
          templateName: activeTemplate.name,
          sections,
          lightContent,
          questionContent,
          arrowContent,
          tags,
          visibility,
        });
        if (savedNote?.id) {
          setCurrentNoteId(savedNote.id);
          currentNoteIdRef.current = savedNote.id;
        }
      }

      // If note is visible to friends, evaluate verse overlaps and notify friends asynchronously
      if (savedNote && visibility === 'friends' && user?.uid) {
        const authorName = profile?.display_name || profile?.username || user?.displayName || 'A friend';
        notifyFriendsOfNoteOverlap(user.uid, authorName, savedNote).catch((err) => {
          console.warn('Failed to dispatch friend overlap notifications:', err);
        });
      }

      setIsDirty(false);
      return true;
    } catch (err: any) {
      setIsDirty(true);
      setErrorBanner('Failed to save note. Changes retained locally.');
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [id, user, profile, passage, activeTemplate, sections, tags, visibility]);

  // Explicit Save
  const handleExplicitSave = useCallback(async () => {
    const success = await handleSave();
    if (success) {
      router.back();
    }
  }, [handleSave, router]);

  // Back confirmation dialog
  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'Do you want to save your notes before leaving?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setIsDirty(false);
              router.back();
            },
          },
          {
            text: 'Save',
            onPress: async () => {
              const success = await handleSave();
              if (success) router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  }, [isDirty, router, handleSave]);

  // Navigation Header Setup
  useLayoutEffect(() => {
    navigation.setOptions({
      title: id ? 'Edit Note' : 'New Note',
      headerLeft: () => (
        <Pressable onPress={handleBack} style={styles.headerButton} hitSlop={8}>
          <Text style={styles.headerBackText}>Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={handleExplicitSave}
          disabled={isSaving}
          style={styles.headerButton}
          hitSlop={8}
        >
          <Text style={[styles.headerSaveText, isSaving && { opacity: 0.6 }]}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, id, isSaving, handleExplicitSave, handleBack]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent.keyIdea} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {errorBanner && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorBanner}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
      >
        {/* Passage Selector Trigger Card */}
        <View style={styles.passageCardRow}>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[styles.pickerTrigger, !passage && styles.pickerTriggerEmpty]}
            accessibilityRole="button"
            accessibilityLabel="Select passage reference"
          >
            <View style={styles.pickerTextColumn}>
              <Text style={styles.pickerLabel}>Passage Reference</Text>
              <Text style={[styles.pickerValue, !passage && styles.pickerValueEmpty]}>
                {passage ? formatPassageDisplay(passage) : 'Tap to select passage...'}
              </Text>
            </View>
          </Pressable>

          {passage ? (
            <FontSizeControls
              initialSize={readerFontSize}
              onSizeChange={setReaderFontSize}
              style={styles.editFontSizeControls}
            />
          ) : null}
        </View>

        {/* Live Scripture Reader with Translation Switcher */}
        {passage && (
          <BibleReader
            passage={passage}
            preferredTranslation={profile?.settings?.preferred_translation || 'ESV'}
            customApiKey={profile?.settings?.custom_esv_api_key || profile?.custom_esv_api_key}
            initiallyCollapsed={false}
            fontSize={readerFontSize}
          />
        )}

        {/* Dynamic Multi-Section Note Editor */}
        <DynamicNoteEditor
          template={activeTemplate}
          sections={sections}
          tags={tags}
          visibility={visibility}
          templateSelector={
            <TemplateQuickSelector
              templates={allTemplates}
              selectedTemplateId={activeTemplate.id}
              onSelectTemplate={handleSelectTemplate}
              onOpenManager={() => setShowTemplateManager(true)}
            />
          }
          onChangeSection={(index, val) => {
            const nextSections = [...sections];
            nextSections[index] = { ...nextSections[index], content: val };
            setSections(nextSections);
            setIsDirty(true);
          }}
          onAddTag={(tag) => {
            if (tags.length < 5) {
              setTags([...tags, tag]);
              setIsDirty(true);
            }
          }}
          onRemoveTag={(tag) => {
            setTags(tags.filter((t) => t !== tag));
            setIsDirty(true);
          }}
          onChangeVisibility={(vis) => {
            setVisibility(vis);
            setIsDirty(true);
          }}
          suggestionTags={userSuggestions}
        />
      </ScrollView>

      {/* YouVersion Passage Picker Modal */}
      <PassagePicker
        visible={showPicker}
        initialPassage={passage || undefined}
        onSelect={(selected: PassageSelection) => {
          setPassage(selected);
          setIsDirty(true);
          setShowPicker(false);
          if (errorBanner) setErrorBanner(null);
        }}
        onClose={() => setShowPicker(false)}
      />

      {/* Template Manager Bottom Sheet Modal */}
      <TemplateManagerModal
        visible={showTemplateManager}
        templates={allTemplates}
        selectedTemplateId={activeTemplate.id}
        onClose={() => setShowTemplateManager(false)}
        onSelectTemplate={handleSelectTemplate}
        onCreateNew={() => {
          setEditingTemplate(null);
          setShowTemplateCreator(true);
        }}
        onEditTemplate={(tpl) => {
          setEditingTemplate(tpl);
          setShowTemplateCreator(true);
        }}
        onDeleteTemplate={handleDeleteCustomTemplate}
      />

      {/* Template Creator / Editor Modal */}
      <TemplateCreatorModal
        visible={showTemplateCreator}
        initialTemplate={editingTemplate}
        onClose={() => {
          setShowTemplateCreator(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveCustomTemplate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  headerButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  headerBackText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  headerSaveText: {
    ...typography.body,
    color: colors.accent.keyIdea,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: colors.accent.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.bg.base,
    textAlign: 'center',
  },
  passageCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  pickerTrigger: {
    flex: 1,
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  pickerTriggerEmpty: {
    borderStyle: 'dashed',
    borderColor: colors.accent.keyIdea,
  },
  pickerTextColumn: {
    flexDirection: 'column',
  },
  pickerLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  pickerValue: {
    ...typography.title,
    fontSize: 16,
    color: colors.text.primary,
  },
  pickerValueEmpty: {
    ...typography.body,
    color: colors.accent.keyIdea,
    fontWeight: 'normal',
  },
  editFontSizeControls: {
    marginLeft: spacing.sm,
  },
});
