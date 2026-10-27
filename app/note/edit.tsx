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
  ActivityIndicator,
  BackHandler,
  Keyboard,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Alert } from '../../src/utils/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radii, typography } from '../../src/constants/theme';
import DynamicNoteEditor from '../../src/components/DynamicNoteEditor';
import TemplateQuickSelector from '../../src/components/TemplateQuickSelector';
import TemplateManagerModal from '../../src/components/TemplateManagerModal';
import TemplateCreatorModal from '../../src/components/TemplateCreatorModal';
import PassagePicker, { PassageSelection } from '../../src/components/PassagePicker';
import BibleReader from '../../src/components/BibleReader';
import { PassageReference, PassageSegment, NoteVisibility, NoteSectionValue, TargetVerseHighlight, formatPassageDisplay } from '../../src/types/note';
import { segmentContains } from '../../src/services/crossReferenceService';
import { NoteTemplate } from '../../src/types/template';
import {
  BUILT_IN_TEMPLATES,
  DEFAULT_TEMPLATE,
  getTemplateById,
  initializeSectionValues,
  getSectionColor,
} from '../../src/constants/templates';
import * as notesService from '../../src/services/notesService';
import { updateUserProfile } from '../../src/services/authService';
import { notifyFriendsOfNoteOverlap } from '../../src/services/noteOverlapService';
import { useAuth } from '../../src/context/AuthContext';
import {
  buildLinkedVerseMap,
  formatVerseReferenceTag,
  extractVerseReferences,
  syncSectionVerseReferencesFromContent,
  appendVerseTagOnNearestClearLine,
} from '../../src/utils/verseLinkUtils';
import { findCanonicalBook } from '../../src/constants/bibleData';
import { createPassageReference, formatSegmentDisplay } from '../../src/utils/passageParser';
import { useReaderFontSize } from '../../src/hooks/useReaderFontSize';
import { useVersePreview } from '../../src/hooks/useVersePreview';
import TOCSegmentBar from '../../src/components/note/TOCSegmentBar';
import { safeStorage } from '../../src/utils/safeStorage';
import { tailScrollOffset } from '../../src/utils/noteScroll';
import { debugAgentLog } from '../../src/utils/debugAgentLog';

export default function NoteEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { id, book, chapter, verseStart, verseEnd } = useLocalSearchParams<{
    id?: string;
    book?: string;
    chapter?: string;
    verseStart?: string;
    verseEnd?: string;
  }>();
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
  const { readerFontSize, setReaderFontSize } = useReaderFontSize(16);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  const activeSegmentPassage = useMemo(() => {
    if (activeSegmentIndex === null || !passage?.segments?.[activeSegmentIndex]) {
      return null;
    }
    return createPassageReference([passage.segments[activeSegmentIndex]]);
  }, [passage, activeSegmentIndex]);

  // Active Template & Dynamic Sections
  const [title, setTitle] = useState<string>('');
  const preferredDefaultTplId = profile?.settings?.default_template_id || profile?.default_template_id;
  const initialTpl = useMemo(() => {
    if (!id && preferredDefaultTplId) {
      const found = allTemplates.find((t) => t.id === preferredDefaultTplId);
      if (found) return found;
    }
    return DEFAULT_TEMPLATE;
  }, [id, preferredDefaultTplId, allTemplates]);

  const [activeTemplate, setActiveTemplate] = useState<NoteTemplate>(initialTpl);
  const [sections, setSections] = useState<NoteSectionValue[]>(() =>
    initializeSectionValues(initialTpl)
  );

  const [tags, setTags] = useState<string[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<NoteVisibility>(
    profile?.default_visibility || 'friends'
  );

  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(id);
  const currentNoteIdRef = useRef<string | undefined>(id);
  const editorLayoutY = useRef<number>(0);
  const sectionLayoutMap = useRef<Record<string, number>>({});
  const sectionHeightMap = useRef<Record<string, number>>({});
  const focusedSectionIdRef = useRef<string | null>(null);
  const pendingRevealSectionId = useRef<string | null>(null);
  const scrollOffsetY = useRef(0);
  const scrollViewportHeight = useRef(0);
  const keyboardHeightRef = useRef(0);
  const verseLayoutMap = useRef<Record<string, number>>({});
  const isSavingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const bibleReaderTop = useRef<number>(0);
  const bibleReaderBottom = useRef<number>(0);
  const tocTop = useRef<number>(0);
  const [targetHighlightedVerse, setTargetHighlightedVerse] = useState<TargetVerseHighlight | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showScrollToBible, setShowScrollToBible] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardHeightRef.current = e.endCoordinates.height;
      // #region agent log
      debugAgentLog('A', 'edit.tsx:keyboardDidShow', 'keyboard shown', {
        height: e.endCoordinates.height,
        focusedSectionId: focusedSectionIdRef.current,
        scrollOffsetY: scrollOffsetY.current,
      });
      // #endregion
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      // #region agent log
      debugAgentLog('A', 'edit.tsx:keyboardDidHide', 'keyboard hidden', {
        prevHeight: keyboardHeightRef.current,
        focusedSectionId: focusedSectionIdRef.current,
        scrollOffsetY: scrollOffsetY.current,
      });
      // #endregion
      keyboardHeightRef.current = 0;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const revealSectionTail = useCallback((sectionId: string) => {
    const sectionY = sectionLayoutMap.current[sectionId];
    const sectionHeight = sectionHeightMap.current[sectionId];
    if (typeof sectionY !== 'number' || typeof sectionHeight !== 'number') return;
    if (scrollViewportHeight.current <= 0) return;

    const nextOffset = tailScrollOffset({
      tailY: editorLayoutY.current + sectionY + sectionHeight,
      offsetY: scrollOffsetY.current,
      viewportHeight: scrollViewportHeight.current,
      keyboardHeight: keyboardHeightRef.current,
    });
    // #region agent log
    debugAgentLog('E', 'edit.tsx:revealSectionTail', 'revealSectionTail called', {
      sectionId,
      sectionY,
      sectionHeight,
      nextOffset,
      scrollOffsetY: scrollOffsetY.current,
      keyboardHeight: keyboardHeightRef.current,
      focusedSectionId: focusedSectionIdRef.current,
    });
    // #endregion
    if (nextOffset === null) return;
    scrollViewRef.current?.scrollTo({ y: nextOffset, animated: true });
  }, []);

  // Apply default template preference for new notes
  useEffect(() => {
    if (!id) {
      safeStorage.getItem('default_template_id').then((stored) => {
        const targetId = profile?.settings?.default_template_id || profile?.default_template_id || stored;
        if (targetId) {
          const targetTpl = allTemplates.find((t) => t.id === targetId);
          if (targetTpl && targetTpl.id !== activeTemplate.id && !isDirty) {
            setActiveTemplate(targetTpl);
            setSections(initializeSectionValues(targetTpl));
          }
        }
      });
    }
  }, [id, profile?.settings?.default_template_id, profile?.default_template_id, allTemplates, isDirty]);

  // If friends are disabled, enforce private visibility
  useEffect(() => {
    if (profile?.settings?.enable_friends === false) {
      setVisibility('private');
    }
  }, [profile?.settings?.enable_friends]);

  // Verse Link & Preview Modal State
  const {
    openVersePreview: handlePreviewVerse,
    renderVersePreviewModal,
  } = useVersePreview({
    passage,
    translation: profile?.settings?.preferred_translation || 'ESV',
    esvApiKey: profile?.settings?.custom_esv_api_key || profile?.custom_esv_api_key,
    onViewInContext: (data) => {
      // Blur any focused notes input before scrolling (same as floating "To Bible").
      // Closing the preview Modal otherwise restores focus and scrollIntoView snaps
      // back to the notes section after an otherwise-correct scrollTo.
      Keyboard.dismiss();

      let targetCanon: string | undefined;
      let matchIdx = -1;
      if (data.book && passage?.segments && passage.segments.length > 0) {
        targetCanon = findCanonicalBook(data.book)?.name || data.book;
        matchIdx = passage.segments.findIndex((seg) => {
          const segCanon = findCanonicalBook(seg.book)?.name || seg.book;
          if (segCanon !== targetCanon) return false;
          if (typeof data.chapter === 'number') {
            return data.chapter >= seg.startChapter && data.chapter <= seg.endChapter;
          }
          return true;
        });
        if (matchIdx >= 0 && matchIdx !== activeSegmentIndex) {
          // #region agent log
          debugAgentLog('C', 'edit.tsx:onViewInContext', 'setActiveSegmentIndex before scroll', {
            matchIdx,
            prevActiveSegmentIndex: activeSegmentIndex,
            targetCanon,
          });
          // #endregion
          setActiveSegmentIndex(matchIdx);
        }
      }

      const canonicalKey = targetCanon && typeof data.chapter === 'number'
        ? `${targetCanon}:${data.chapter}:${data.startVerse}`
        : undefined;

      const verseRelY =
        (canonicalKey && verseLayoutMap.current[canonicalKey]) ??
        verseLayoutMap.current[String(data.startVerse)] ??
        0;

      const baseTop = bibleReaderTop.current > 0 ? bibleReaderTop.current : (tocTop.current > 0 ? tocTop.current : 0);
      const numVerseY = Number(verseRelY) || 0;
      const targetY = numVerseY > 0 ? Math.max(0, baseTop + numVerseY - 80) : (baseTop > 0 ? Math.max(0, baseTop - 16) : 0);
      // #region agent log
      debugAgentLog('D', 'edit.tsx:onViewInContext', 'computed scroll target for Jump', {
        startVerse: data.startVerse,
        book: data.book,
        chapter: data.chapter,
        canonicalKey,
        verseRelY,
        numVerseY,
        baseTop,
        bibleReaderTop: bibleReaderTop.current,
        tocTop: tocTop.current,
        targetY,
        scrollOffsetBefore: scrollOffsetY.current,
        focusedSectionId: focusedSectionIdRef.current,
        keyboardHeight: keyboardHeightRef.current,
        matchIdx,
        editorLayoutY: editorLayoutY.current,
        verseMapKeysSample: Object.keys(verseLayoutMap.current).slice(0, 8),
        runId: 'post-fix',
      });
      // #endregion

      const applyJumpScroll = (animated: boolean, reason: string) => {
        // #region agent log
        debugAgentLog('FIX', 'edit.tsx:applyJumpScroll', reason, {
          targetY,
          animated,
          offsetY: scrollOffsetY.current,
          runId: 'post-fix',
        });
        // #endregion
        scrollViewRef.current?.scrollTo({ y: targetY, animated });
      };

      applyJumpScroll(true, 'initial-jump');

      // Modal focus restoration / scrollIntoView races the animated scroll (logs:
      // offset reaches ~targetY by ~350ms then jumps to ~850 by ~700ms). Re-assert
      // after that window so the passage position sticks.
      setTimeout(() => {
        Keyboard.dismiss();
        applyJumpScroll(false, 'reassert-after-modal-focus');
      }, 450);

      // #region agent log
      [50, 150, 350, 700, 1200].forEach((ms) => {
        setTimeout(() => {
          debugAgentLog('A', 'edit.tsx:postJumpScrollSample', 'scroll offset after Jump', {
            ms,
            offsetY: scrollOffsetY.current,
            targetY,
            focusedSectionId: focusedSectionIdRef.current,
            keyboardHeight: keyboardHeightRef.current,
            activeSegmentIndexAfter: activeSegmentIndex,
            runId: 'post-fix',
          });
        }, ms);
      });
      // #endregion

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      if (data.book || data.chapter || data.verses) {
        setTargetHighlightedVerse({
          book: data.book,
          chapter: data.chapter,
          verses: data.verses || [data.startVerse],
        });
      } else {
        setTargetHighlightedVerse(data.startVerse);
      }

      highlightTimerRef.current = setTimeout(() => {
        setTargetHighlightedVerse(null);
      }, 10000);
    },
  });

  const linkedVerseMap = useMemo(() => {
    return buildLinkedVerseMap(sections);
  }, [sections]);

  const sectionOptions = useMemo(() => {
    return sections.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon,
      color: s.color,
    }));
  }, [sections]);

  const sectionsRef = useRef<NoteSectionValue[]>(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  const handleAttachToSection = useCallback((
    verses: number[],
    sectionId: string,
    context?: { book?: string; chapter?: number }
  ) => {
    if (verses.length === 0) return;
    const sorted = [...verses].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const book = context?.book || passage?.segments?.[0]?.book;
    const chapter = context?.chapter || passage?.segments?.[0]?.startChapter;

    const tag = formatVerseReferenceTag(sorted, { book, chapter });

    setSections((prev) => {
      const secIdx = prev.findIndex((s) => s.id === sectionId);
      if (secIdx < 0) return prev;

      const targetSec = prev[secIdx];
      const existingRefs = targetSec.verseReferences || [];
      const alreadyExists = existingRefs.some((r) => {
        if (r.book !== book || r.chapter !== chapter) return false;
        if (r.verses && sorted) {
          if (r.verses.length !== sorted.length) return false;
          return r.verses.every((v, i) => v === sorted[i]);
        }
        return r.startVerse === min && r.endVerse === max;
      });
      const updatedRefs = alreadyExists
        ? existingRefs
        : [...existingRefs, { startVerse: min, endVerse: max, book, chapter, verses: sorted }];

      const currentContent = targetSec.content || '';
      const hasTag = currentContent.includes(tag);
      const updatedContent = hasTag
        ? currentContent
        : appendVerseTagOnNearestClearLine(currentContent, tag);

      const copy = [...prev];
      copy[secIdx] = {
        ...targetSec,
        content: updatedContent,
        verseReferences: updatedRefs,
      };
      return copy;
    });
    setIsDirty(true);
    pendingRevealSectionId.current = sectionId;
    setTimeout(() => {
      if (pendingRevealSectionId.current !== sectionId) return;
      revealSectionTail(sectionId);
      pendingRevealSectionId.current = null;
    }, 50);
  }, [passage, revealSectionTail]);

  const handleAddPassageSegment = useCallback((segment: PassageSegment) => {
    setPassage((prev) => {
      const existing = prev?.segments || [];
      if (existing.some((seg) => segmentContains(seg, segment))) return prev;
      const kept = existing.filter((seg) => !segmentContains(segment, seg));
      return createPassageReference([...kept, segment]);
    });
    setIsDirty(true);
  }, []);

  const handleRemoveVerseReference = useCallback((sectionIndex: number, referenceIndex: number) => {
    setSections((prev) => {
      const targetSec = prev[sectionIndex];
      if (!targetSec || !targetSec.verseReferences) return prev;
      const refToRemove = targetSec.verseReferences[referenceIndex];
      const versesToPass =
        refToRemove.verses && refToRemove.verses.length > 0
          ? refToRemove.verses
          : Array.from(
              { length: refToRemove.endVerse - refToRemove.startVerse + 1 },
              (_, i) => refToRemove.startVerse + i
            );
      const generatedTag = formatVerseReferenceTag(
        versesToPass,
        refToRemove.book ? { book: refToRemove.book, chapter: refToRemove.chapter } : undefined
      );
      const rawTag = (refToRemove as any).raw;
      const updatedRefs = targetSec.verseReferences.filter((_, idx) => idx !== referenceIndex);

      let updatedContent = targetSec.content || '';
      if (rawTag && updatedContent.includes(rawTag)) {
        updatedContent = updatedContent.replace(rawTag, '').trim();
      } else if (generatedTag && updatedContent.includes(generatedTag)) {
        updatedContent = updatedContent.replace(generatedTag, '').trim();
      } else {
        // Fallback: match tags for startVerse-endVerse
        const fallbackRegex = new RegExp(
          `\\[v\\.?\\s*${refToRemove.startVerse}(?:\\s*[-–—]\\s*${refToRemove.endVerse})?\\]`,
          'i'
        );
        updatedContent = updatedContent.replace(fallbackRegex, '').trim();
      }

      const copy = [...prev];
      copy[sectionIndex] = {
        ...targetSec,
        content: updatedContent,
        verseReferences: updatedRefs,
      };
      return copy;
    });
    setIsDirty(true);
  }, []);

  const handleFocusTagInput = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Load user tag history for autocomplete
  useEffect(() => {
    if (user?.uid) {
      notesService.getUserTags(user.uid).then((t) => {
        setUserSuggestions(t);
      }).catch(() => {});
    }
  }, [user?.uid]);

  // Prefill passage when opening editor from Bible browse ("Note this")
  useEffect(() => {
    if (id || !book || !chapter) return;
    const ch = parseInt(String(chapter), 10);
    if (!Number.isFinite(ch) || ch < 1) return;
    const startV = Math.max(1, parseInt(String(verseStart || '1'), 10) || 1);
    const endV = Math.max(startV, parseInt(String(verseEnd || String(startV)), 10) || startV);
    try {
      setPassage(
        createPassageReference([
          {
            book: String(book),
            startChapter: ch,
            startVerse: startV,
            endChapter: ch,
            endVerse: endV,
          },
        ])
      );
    } catch (err) {
      console.warn('Failed to prefill passage from browse params:', err);
    }
  }, [id, book, chapter, verseStart, verseEnd]);

  // Load existing note if editing
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    (async () => {
      try {
        const existing = await notesService.getNote(id);
        if (existing && isMounted) {
          setTitle(existing.title || '');
          setPassage(existing.passage);
          const tpl = getTemplateById(existing.templateId, profile?.custom_templates);
          setActiveTemplate(tpl);

          if (existing.sections && existing.sections.length > 0) {
            setSections(existing.sections.map((s) => ({
              ...s,
              content: (s.content || '').trim(),
            })));
          } else {
            // Synthesize from legacy Swedish fields
            setSections([
              { id: 'light', title: 'Key Idea', icon: 'bulb-outline', content: (existing.lightContent || '').trim() },
              { id: 'question', title: 'Question', icon: 'help-circle-outline', content: (existing.questionContent || '').trim() },
              { id: 'arrow', title: 'Application', icon: 'footsteps-outline', content: (existing.arrowContent || '').trim() },
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

      const currentSections = sectionsRef.current;
      const hasText = currentSections.some((s) => s.content.trim().length > 0);
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
              const latest = sectionsRef.current;
              const newSections: NoteSectionValue[] = targetTemplate.sections.map((sec, idx) => ({
                id: sec.id,
                title: sec.title,
                icon: sec.icon || 'document-text-outline',
                color: sec.color || getSectionColor(sec.id),
                content: latest[idx]?.content || '',
                verseReferences: latest[idx]?.verseReferences,
              }));
              setActiveTemplate(targetTemplate);
              setSections(newSections);
              setIsDirty(true);
            },
          },
        ]
      );
    },
    [activeTemplate.id]
  );

  // Template CRUD actions
  const applyTemplatePreservingContent = useCallback(
    (template: NoteTemplate, currentSections: NoteSectionValue[]) => {
      const newSections: NoteSectionValue[] = template.sections.map((sec, idx) => {
        // Try matching by section id first; fallback to index position
        const existing = currentSections.find((s) => s.id === sec.id) || currentSections[idx];
        return {
          id: sec.id,
          title: sec.title,
          icon: sec.icon,
          color: sec.color,
          content: existing?.content || '',
        };
      });
      setActiveTemplate(template);
      setSections(newSections);
      setIsDirty(true);
    },
    []
  );

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

        // If editing the active template or activating this template
        if (activeTemplate.id === template.id) {
          // Detect if any section with non-empty content was removed or reordered
          const existingWithContent = sections.filter((s) => s.content.trim().length > 0);
          const newIds = template.sections.map((s) => s.id);

          const hasRemovedSections = existingWithContent.some(
            (s) => !newIds.includes(s.id)
          );

          // Check if the relative ordering of persisting sections with content has changed
          const persistingIds = existingWithContent
            .map((s) => s.id)
            .filter((id) => newIds.includes(id));
          const newIndices = persistingIds.map((id) => newIds.indexOf(id));
          const hasReordered = newIndices.some((pos, idx) => idx > 0 && pos < newIndices[idx - 1]);

          if (hasRemovedSections || hasReordered) {
            Alert.alert(
              'Section Changes',
              'Some sections with text were removed or reordered. Existing text will be preserved where possible.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Keep My Text',
                  onPress: () => applyTemplatePreservingContent(template, sections),
                },
              ]
            );
          } else {
            // No sections with text were removed or reordered (e.g. icon, color, title, or new section added)
            applyTemplatePreservingContent(template, sections);
          }
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to save custom template.');
      }
    },
    [user?.uid, profile?.custom_templates, activeTemplate.id, sections, applyTemplatePreservingContent]
  );

  const handleDeleteCustomTemplate = useCallback(
    async (templateId: string) => {
      if (!user?.uid) return;
      const existingCustom = profile?.custom_templates || [];
      const filtered = existingCustom.filter((t) => t.id !== templateId);

      try {
        await updateUserProfile(user.uid, { custom_templates: filtered });
        if (activeTemplate.id === templateId) {
          const hasContent = sections.some((s) => s.content.trim().length > 0);
          if (hasContent) {
            Alert.alert(
              'Template Deleted',
              'The active template was deleted. Your note has been switched to the default template with your text preserved.',
              [
                {
                  text: 'Keep My Text',
                  onPress: () => applyTemplatePreservingContent(DEFAULT_TEMPLATE, sections),
                },
              ]
            );
          } else {
            setActiveTemplate(DEFAULT_TEMPLATE);
            setSections(initializeSectionValues(DEFAULT_TEMPLATE));
          }
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to delete custom template.');
      }
    },
    [user?.uid, profile?.custom_templates, activeTemplate.id, sections, applyTemplatePreservingContent]
  );

  // Master Save Handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (isSavingRef.current) return false;
    if (!passage) {
      setErrorBanner('Please select a passage before saving');
      return false;
    }
    isSavingRef.current = true;
    setIsSaving(true);
    setErrorBanner(null);

    const targetId = currentNoteIdRef.current || id;

    // Sync section verse references with in-text tags and sanitize content
    const syncedSections = syncSectionVerseReferencesFromContent(sections, passage);
    const sanitizedSections = syncedSections.map((s) => ({
      ...s,
      content: (s.content || '').trim(),
    }));
    setSections(syncedSections);

    // Extract Swedish fields for backwards compatibility
    const lightContent = sanitizedSections.find((s) => s.id === 'light')?.content || '';
    const questionContent = sanitizedSections.find((s) => s.id === 'question')?.content || '';
    const arrowContent = sanitizedSections.find((s) => s.id === 'arrow')?.content || '';

    try {
      let savedNote;
      const cleanTitle = title.trim() || undefined;
      if (targetId) {
        savedNote = await notesService.updateNote(targetId, {
          title: cleanTitle,
          passage,
          templateId: activeTemplate.id,
          templateName: activeTemplate.name,
          sections: sanitizedSections,
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
          title: cleanTitle,
          passage,
          templateId: activeTemplate.id,
          templateName: activeTemplate.name,
          sections: sanitizedSections,
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

      // If note is visible to friends, evaluate verse overlaps and notify friends asynchronously ONLY on note creation
      const isNewNote = !targetId;
      if (isNewNote && savedNote && visibility === 'friends' && user?.uid) {
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
  }, [id, user, profile, passage, activeTemplate, sections, tags, visibility, title]);

  // Safe back navigation helper to prevent unhandled GO_BACK actions
  const navigateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/notes');
    }
  }, [router]);

  // Explicit Save
  const handleExplicitSave = useCallback(async () => {
    const success = await handleSave();
    if (success) {
      navigateBack();
    }
  }, [handleSave, navigateBack]);

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
              navigateBack();
            },
          },
          {
            text: 'Save',
            onPress: async () => {
              const success = await handleSave();
              if (success) {
                setIsDirty(false);
                navigateBack();
              }
            },
          },
        ]
      );
    } else {
      navigateBack();
    }
  }, [isDirty, navigateBack, handleSave]);

  // Intercept Android hardware back button when note has unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const onHardwareBackPress = () => {
      handleBack();
      return true; // Prevent default Android back navigation
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, [isDirty, handleBack]);

  // Navigation Header Setup
  useLayoutEffect(() => {
    navigation.setOptions({
      title: id ? 'Edit Note' : 'New Note',
      gestureEnabled: !isDirty,
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

      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          onLayout={(e) => {
            scrollViewportHeight.current = e.nativeEvent.layout.height;
          }}
          onScrollBeginDrag={Keyboard.dismiss}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            scrollOffsetY.current = offsetY;
            const threshold = bibleReaderBottom.current > 0 ? bibleReaderBottom.current : 350;
            setShowScrollToBible(offsetY > threshold);
          }}
          scrollEventThrottle={16}
          canCancelContentTouches={true}
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
        </View>

        {/* Optional Note Title Input Card */}
        <View style={styles.titleCardRow}>
          <TextInput
            value={title}
            onChangeText={(val) => {
              setTitle(val);
              setIsDirty(true);
            }}
            placeholder="Note Title (Optional)"
            placeholderTextColor={colors.text.secondary}
            style={styles.titleInput}
            maxLength={100}
            accessibilityLabel="Note Title"
          />
        </View>

        {/* Interactive Table of Contents (Passage Segments) */}
        {passage?.segments && passage.segments.length > 0 && (
          <TOCSegmentBar
            segments={passage.segments}
            activeSegmentIndex={activeSegmentIndex}
            onSelectSegment={setActiveSegmentIndex}
            onLayout={(y) => {
              tocTop.current = y;
            }}
          />
        )}

        {/* Live Scripture Reader with Translation Switcher */}
        {passage && (
          <View
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              bibleReaderTop.current = y;
              bibleReaderBottom.current = y + height;
            }}
          >
            <BibleReader
              passage={passage}
              activeSegment={activeSegmentPassage}
              preferredTranslation={profile?.preferred_version_id || profile?.settings?.preferred_version_id || profile?.settings?.preferred_translation || 'ESV'}
              initiallyCollapsed={false}
              fontSize={readerFontSize}
              onFontSizeChange={setReaderFontSize}
              onOpenVersionGuide={() => router.push('/bible-versions')}
              linkedVerseMap={linkedVerseMap}
              sectionOptions={sectionOptions}
              onAttachToSection={handleAttachToSection}
              onAddPassageSegment={handleAddPassageSegment}
              onVerseLayout={(key, y) => {
                verseLayoutMap.current[key] = y;
              }}
              onJumpToSection={(sectionId) => {
                const secY = sectionLayoutMap.current[sectionId];
                if (typeof secY === 'number') {
                  const targetY = editorLayoutY.current + secY;
                  scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY - 16), animated: true });
                } else {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }
              }}
              targetHighlightedVerse={targetHighlightedVerse}
            />
          </View>
        )}

        {/* Dynamic Multi-Section Note Editor */}
        <View
          onLayout={(e) => {
            editorLayoutY.current = e.nativeEvent.layout.y;
          }}
        >
          <DynamicNoteEditor
            template={activeTemplate}
            sections={sections}
            tags={tags}
            visibility={visibility}
            hideVisibility={profile?.settings?.enable_friends === false}
            onBlur={() => {
              setSections((prev) => syncSectionVerseReferencesFromContent(prev, passage));
            }}
            templateSelector={
              <TemplateQuickSelector
                templates={allTemplates}
                selectedTemplateId={activeTemplate.id}
                onSelectTemplate={handleSelectTemplate}
                onOpenManager={() => setShowTemplateManager(true)}
              />
            }
            onFocusSection={(sectionId) => {
              focusedSectionIdRef.current = sectionId;
              // #region agent log
              debugAgentLog('A', 'edit.tsx:onFocusSection', 'section focused', {
                sectionId,
                scrollOffsetY: scrollOffsetY.current,
              });
              // #endregion
            }}
            onBlurSection={(sectionId) => {
              // #region agent log
              debugAgentLog('A', 'edit.tsx:onBlurSection', 'section blurred', {
                sectionId,
                wasFocused: focusedSectionIdRef.current === sectionId,
                scrollOffsetY: scrollOffsetY.current,
              });
              // #endregion
              if (focusedSectionIdRef.current === sectionId) {
                focusedSectionIdRef.current = null;
              }
            }}
            onSectionLayout={(sectionId, y, height) => {
              sectionLayoutMap.current[sectionId] = y;
              const previousHeight = sectionHeightMap.current[sectionId];
              sectionHeightMap.current[sectionId] = height;
              const grew = previousHeight !== undefined && height > previousHeight + 0.5;
              const pendingReveal = pendingRevealSectionId.current === sectionId;
              if (!pendingReveal && !(focusedSectionIdRef.current === sectionId && grew)) {
                return;
              }
              revealSectionTail(sectionId);
            }}
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
            onFocusTagInput={handleFocusTagInput}
            onPreviewVerse={handlePreviewVerse}
            onRemoveVerseReference={handleRemoveVerseReference}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Quick-Jump to Bible shortcut when scrolled deep into note */}
      {showScrollToBible && passage && (
        <Pressable
          style={styles.floatingBibleJump}
          onPress={() => {
            // #region agent log
            debugAgentLog('A', 'edit.tsx:toBibleButton', 'To Bible pressed (contrast path)', {
              dismissedKeyboard: true,
              tocTop: tocTop.current,
              bibleReaderTop: bibleReaderTop.current,
              scrollOffsetBefore: scrollOffsetY.current,
              focusedSectionId: focusedSectionIdRef.current,
            });
            // #endregion
            Keyboard.dismiss();
            const targetY = tocTop.current > 0 ? tocTop.current : bibleReaderTop.current;
            scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY - 16), animated: true });
          }}
          accessibilityRole="button"
          accessibilityLabel="Scroll to the bible passage"
          hitSlop={6}
        >
          <Ionicons name="book-outline" size={14} color={colors.accent.keyIdea} />
          <Text style={styles.floatingBibleJumpText}>To Bible</Text>
          <Ionicons name="arrow-up" size={12} color={colors.accent.keyIdea} />
        </Pressable>
      )}

      {/* In-Place Verse Preview Modal */}
      {renderVersePreviewModal()}

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
  keyboardAvoider: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: 200, // Consistent 200px whitespace for keyboard clearance & tags menu
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
  titleCardRow: {
    marginVertical: spacing.xs,
  },
  titleInput: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : 0,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.body.fontFamily,
    color: colors.text.primary,
    minHeight: 48,
    textAlignVertical: 'center',
    includeFontPadding: false,
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
  floatingBibleJump: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.surfaceRaised,
    borderWidth: 1,
    borderColor: 'rgba(227, 165, 61, 0.4)',
    borderRadius: radii.controls,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    zIndex: 20,
  },
  floatingBibleJumpText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent.keyIdea,
  },
});
