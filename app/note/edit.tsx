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
import BibleReader from '../../src/components/BibleReader';
import { PassageReference, NoteVisibility, formatPassageDisplay } from '../../src/types/note';
import * as notesService from '../../src/services/notesService';
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

  // Note State - defaults to null for new notes so users choose their own passage
  const [passage, setPassage] = useState<PassageReference | null>(null);

  const [lightContent, setLightContent] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const [arrowContent, setArrowContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<NoteVisibility>(
    profile?.default_visibility || 'friends'
  );

  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(id);
  const currentNoteIdRef = useRef<string | undefined>(id);
  const isSavingRef = useRef(false);

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
    if (!passage) {
      setErrorBanner('Please select a scripture passage before saving');
      return false;
    }
    isSavingRef.current = true;
    setIsSaving(true);
    setErrorBanner(null);

    const targetId = currentNoteIdRef.current || id;

    try {
      let savedNote;
      if (targetId) {
        savedNote = await notesService.updateNote(targetId, {
          passage,
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
        <Pressable
          onPress={() => setShowPicker(true)}
          style={[styles.pickerTrigger, !passage && styles.pickerTriggerEmpty]}
          accessibilityRole="button"
          accessibilityLabel="Select passage reference"
        >
          <Text style={styles.pickerLabel}>Passage Reference</Text>
          <Text style={[styles.pickerValue, !passage && styles.pickerValueEmpty]}>
            {passage ? formatPassageDisplay(passage) : 'Tap to select passage...'}
          </Text>
        </Pressable>

        {/* Live Scripture Reader with Translation Switcher - only rendered when a passage is selected */}
        {passage && (
          <BibleReader
            passage={passage}
            preferredTranslation={profile?.settings?.preferred_translation || 'ESV'}
            customApiKey={profile?.settings?.custom_esv_api_key || profile?.custom_esv_api_key}
            initiallyCollapsed={false}
          />
        )}

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
    paddingBottom: 250,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerBackText: {
    color: colors.text.secondary,
    fontSize: typography.body.fontSize,
  },
  headerSaveText: {
    color: colors.accent.keyIdea,
    fontWeight: '600',
    fontSize: typography.body.fontSize,
  },
  pickerTrigger: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.md,
  },
  pickerTriggerEmpty: {
    borderStyle: 'dashed',
    borderColor: colors.accent.keyIdea,
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
  pickerValueEmpty: {
    fontSize: typography.body.fontSize,
    color: colors.text.secondary,
    fontWeight: '400',
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
