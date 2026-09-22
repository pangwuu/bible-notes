/**
 * Note Edit Screen
 * Day One unbordered editor with Swedish Method headers,
 * YouVersion-style passage picker drill-down, auto-save,
 * and dirty-state back confirmation modal.
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
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
import SwedishEditor from '../../src/components/SwedishEditor';
import PassagePicker, { PassageSelection } from '../../src/components/PassagePicker';
import { PassageReference, NoteVisibility, formatPassageDisplay } from '../../src/types/note';
import * as notesService from '../../src/services/notesService';
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

  // Note State
  const [passage, setPassage] = useState<PassageReference>({
    book: 'John',
    startChapter: 3,
    startVerse: 16,
    endChapter: 3,
    endVerse: 17,
    startOrdinal: 26136,
    endOrdinal: 26137,
  });

  const [lightContent, setLightContent] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const [arrowContent, setArrowContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<NoteVisibility>(
    profile?.default_visibility || 'friends'
  );

  const isSavingRef = useRef(false);

  // Load existing note if editing
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    (async () => {
      try {
        const existing = await notesService.getNote(id);
        if (existing && isMounted) {
          setPassage(existing.passage);
          setLightContent(existing.lightContent);
          setQuestionContent(existing.questionContent);
          setArrowContent(existing.arrowContent);
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
  }, [id]);

  // Master Save Handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current) return false;
    isSavingRef.current = true;
    setIsSaving(true);
    setErrorBanner(null);

    try {
      if (id) {
        await notesService.updateNote(id, {
          passage,
          lightContent,
          questionContent,
          arrowContent,
          tags,
          visibility,
        });
      } else {
        await notesService.createNote({
          userId: user?.uid || '',
          authorUsername: profile?.username || user?.displayName || '',
          authorDisplayName: profile?.display_name || user?.displayName || '',
          passage,
          lightContent,
          questionContent,
          arrowContent,
          tags,
          visibility,
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
  }, [id, user, profile, passage, lightContent, questionContent, arrowContent, tags, visibility]);

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
          style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
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

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Passage Selector Trigger Card */}
        <Pressable
          onPress={() => setShowPicker(true)}
          style={styles.pickerTrigger}
          accessibilityRole="button"
          accessibilityLabel="Select passage reference"
        >
          <Text style={styles.pickerLabel}>Passage Reference</Text>
          <Text style={styles.pickerValue}>{formatPassageDisplay(passage)}</Text>
        </Pressable>

        {/* Day One Unbordered Swedish Editor */}
        <SwedishEditor
          lightContent={lightContent}
          questionContent={questionContent}
          arrowContent={arrowContent}
          tags={tags}
          visibility={visibility}
          onChangeLight={(val) => {
            setLightContent(val);
            setIsDirty(true);
          }}
          onChangeQuestion={(val) => {
            setQuestionContent(val);
            setIsDirty(true);
          }}
          onChangeArrow={(val) => {
            setArrowContent(val);
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
          onBlur={() => {
            if (isDirty) {
              handleSave();
            }
          }}
        />
      </ScrollView>

      {/* YouVersion Passage Picker Modal */}
      <PassagePicker
        visible={showPicker}
        initialPassage={passage}
        onSelect={(selected: PassageSelection) => {
          setPassage(selected);
          setIsDirty(true);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
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
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerBackText: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize,
  },
  saveButton: {
    backgroundColor: colors.accent.keyIdea,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.controls,
  },
  saveButtonText: {
    color: colors.bg.base,
    fontWeight: '600',
    fontSize: typography.label.fontSize,
  },
  pickerTrigger: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.md,
  },
  pickerLabel: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  pickerValue: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  errorBanner: {
    backgroundColor: colors.accent.danger,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.content,
  },
  errorText: {
    color: colors.text.primary,
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
  },
});
