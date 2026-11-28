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
  AppState,
  Keyboard,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Alert } from '../../src/utils/alert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radii, typography, layout } from '../../src/constants/theme';
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
  insertVerseTag,
  removeVerseTag,
} from '../../src/utils/verseLinkUtils';
import { useEditorPreferences } from '../../src/hooks/useEditorPreferences';
import { carrySectionsToTemplate } from '../../src/utils/templateSwitch';
import { findCanonicalBook } from '../../src/constants/bibleData';
import { createPassageReference, formatSegmentDisplay } from '../../src/utils/passageParser';
import { useReaderFontSize } from '../../src/hooks/useReaderFontSize';
import { useVersePreview } from '../../src/hooks/useVersePreview';
import TOCSegmentBar from '../../src/components/note/TOCSegmentBar';
import { safeStorage } from '../../src/utils/safeStorage';
import {
  NoteDraft,
  NoteDraftPayload,
  clearDraft,
  draftHasContent,
  draftKeyForNote,
  listNewNoteDrafts,
  loadDraft,
  newDraftKey,
  saveDraft,
  toMillis,
} from '../../src/services/noteDraftStore';

const LOCAL_IDLE_MS = 800;
const REMOTE_IDLE_MS = 3000;
const REMOTE_MAX_WAIT_MS = 15000;
const SERVER_TIMEOUT_MS = 10000;
const CONFLICT_TOLERANCE_MS = 10000;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'device' | 'error';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function describeDraft(draft: NoteDraft): string {
  return draft.payload.passage ? formatPassageDisplay(draft.payload.passage) : 'no passage yet';
}
import { tailScrollOffset } from '../../src/utils/noteScroll';

export default function NoteEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const {
    id,
    book,
    chapter,
    verseStart,
    verseEnd,
    draft: draftParam,
    templateId: templateParam,
    attachSection,
    attachVerses,
  } = useLocalSearchParams<{
    id?: string;
    draft?: string;
    book?: string;
    chapter?: string;
    verseStart?: string;
    verseEnd?: string;
    templateId?: string;
    attachSection?: string;
    attachVerses?: string;
  }>();
  const { user, profile } = useAuth();
  const {
    verseTagPlacement,
    autoScrollOnLink,
    setAutoScrollOnLink,
    autoScrollPromptSeen,
    markAutoScrollPromptSeen,
    labelMovedSections,
  } = useEditorPreferences();
  const [linkFeedback, setLinkFeedback] = useState<
    { sectionId: string; sectionTitle: string; kind: 'prompt' | 'linked' } | null
  >(null);
  const sectionCursorRef = useRef<Record<string, number>>({});
  const [templateNotice, setTemplateNotice] = useState<{
    message: string;
    previous: { template: NoteTemplate; sections: NoteSectionValue[] };
  } | null>(null);

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
  const preferredDefaultTplId =
    (!id && templateParam) || profile?.settings?.default_template_id || profile?.default_template_id;
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

  const currentNoteIdRef = useRef<string | undefined>(id);

  // Autosave bookkeeping
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [recoveryOffer, setRecoveryOffer] = useState<
    | { kind: 'restored'; serverPayload: NoteDraftPayload }
    | { kind: 'resume'; draft: NoteDraft }
    | null
  >(null);
  const draftKeyRef = useRef<string | null>(null);
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteInFlightRef = useRef(false);
  const remoteRerunRef = useRef(false);
  const pendingRemoteSinceRef = useRef<number | null>(null);
  const changeVersionRef = useRef(0);
  const lastKnownServerAtRef = useRef<number | undefined>(undefined);
  const localDraftOkRef = useRef(true);
  const createPromiseRef = useRef<Promise<any> | null>(null);
  const allowLeaveRef = useRef(false);
  const originalSnapshotRef = useRef<NoteDraftPayload | null>(null);
  const scheduleRemoteSaveRef = useRef<() => void>(() => {});
  const customTemplatesRef = useRef(profile?.custom_templates);
  customTemplatesRef.current = profile?.custom_templates;

  const latestRef = useRef<NoteDraftPayload>({
    title: '',
    passage: null,
    templateId: '',
    sections: [],
    tags: [],
    visibility: 'friends',
  });
  latestRef.current = {
    title,
    passage,
    templateId: activeTemplate.id,
    sections,
    tags,
    visibility,
  };
  const activeTemplateRef = useRef(activeTemplate);
  activeTemplateRef.current = activeTemplate;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const applyPayload = useCallback((payload: NoteDraftPayload) => {
    setTitle(payload.title);
    setPassage(payload.passage);
    setActiveTemplate(getTemplateById(payload.templateId, customTemplatesRef.current));
    setSections(payload.sections);
    setTags(payload.tags);
    setVisibility(payload.visibility);
  }, []);
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
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
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
    if (nextOffset === null) return;
    scrollViewRef.current?.scrollTo({ y: nextOffset, animated: true });
  }, []);

  const scheduleRevealSection = useCallback(
    (sectionId: string) => {
      pendingRevealSectionId.current = sectionId;
      setTimeout(() => {
        if (pendingRevealSectionId.current !== sectionId) return;
        revealSectionTail(sectionId);
        pendingRevealSectionId.current = null;
      }, 50);
    },
    [revealSectionTail]
  );

  // Apply default template preference for new notes
  useEffect(() => {
    if (!id && !templateParam) {
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
  }, [id, templateParam, profile?.settings?.default_template_id, profile?.default_template_id, allTemplates, isDirty]);

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
      if (data.book && passage?.segments && passage.segments.length > 0) {
        targetCanon = findCanonicalBook(data.book)?.name || data.book;
        const matchIdx = passage.segments.findIndex((seg) => {
          const segCanon = findCanonicalBook(seg.book)?.name || seg.book;
          if (segCanon !== targetCanon) return false;
          if (typeof data.chapter === 'number') {
            return data.chapter >= seg.startChapter && data.chapter <= seg.endChapter;
          }
          return true;
        });
        if (matchIdx >= 0 && matchIdx !== activeSegmentIndex) {
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
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });

      // Modal focus restoration / scrollIntoView can undo the animated scroll after
      // the preview closes; re-assert so the passage position sticks.
      setTimeout(() => {
        Keyboard.dismiss();
        scrollViewRef.current?.scrollTo({ y: targetY, animated: false });
      }, 450);

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
      }, 4000);
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
      let updatedContent = currentContent;
      if (!hasTag) {
        const inserted = insertVerseTag(
          currentContent,
          tag,
          verseTagPlacement,
          sectionCursorRef.current[sectionId]
        );
        updatedContent = inserted.content;
        sectionCursorRef.current[sectionId] = inserted.cursorAfter;
      }

      const copy = [...prev];
      copy[secIdx] = {
        ...targetSec,
        content: updatedContent,
        verseReferences: updatedRefs,
      };
      return copy;
    });
    setIsDirty(true);
    const sectionTitle =
      sectionsRef.current.find((s) => s.id === sectionId)?.title || 'your note';
    if (autoScrollOnLink) {
      scheduleRevealSection(sectionId);
      if (!autoScrollPromptSeen) {
        setLinkFeedback({ sectionId, sectionTitle, kind: 'prompt' });
      }
    } else {
      setLinkFeedback({ sectionId, sectionTitle, kind: 'linked' });
    }
  }, [passage, verseTagPlacement, autoScrollOnLink, autoScrollPromptSeen, scheduleRevealSection]);

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

      const originalContent = targetSec.content || '';
      const fallbackMatch = originalContent.match(
        new RegExp(
          `\\[v\\.?\\s*${refToRemove.startVerse}(?:\\s*[-–—]\\s*${refToRemove.endVerse})?\\]`,
          'i'
        )
      )?.[0];
      let updatedContent = originalContent.trim();
      for (const candidate of [rawTag, generatedTag, fallbackMatch]) {
        if (!candidate) continue;
        const removed = removeVerseTag(originalContent, candidate);
        if (removed !== null) {
          updatedContent = removed;
          break;
        }
      }
      delete sectionCursorRef.current[targetSec.id];

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

  // Verses chosen in the Bible tab's "Note in" bar arrive already aimed at a section.
  const pendingAttachRef = useRef(!id && !!attachSection && !!attachVerses);
  useEffect(() => {
    if (!pendingAttachRef.current || !passage || !attachSection) return;
    if (!sections.some((s) => s.id === attachSection)) return;
    const verses = String(attachVerses || '')
      .split(',')
      .map((v) => parseInt(v, 10))
      .filter((v) => Number.isFinite(v) && v > 0);
    pendingAttachRef.current = false;
    if (verses.length === 0) return;
    const ch = parseInt(String(chapter), 10);
    handleAttachToSection(verses, attachSection, {
      book: book ? String(book) : undefined,
      chapter: Number.isFinite(ch) ? ch : undefined,
    });
  }, [passage, sections, attachSection, attachVerses, book, chapter, handleAttachToSection]);

  // Load existing note if editing, then reapply any unsynced draft from this device.
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    (async () => {
      try {
        const existing = await notesService.getNote(id);
        if (existing && isMounted) {
          const serverSections: NoteSectionValue[] =
            existing.sections && existing.sections.length > 0
              ? existing.sections.map((s) => ({ ...s, content: (s.content || '').trim() }))
              : [
                  // Synthesize from legacy Swedish fields
                  { id: 'light', title: 'Key Idea', icon: 'bulb-outline', content: (existing.lightContent || '').trim() },
                  { id: 'question', title: 'Question', icon: 'help-circle-outline', content: (existing.questionContent || '').trim() },
                  { id: 'arrow', title: 'Application', icon: 'footsteps-outline', content: (existing.arrowContent || '').trim() },
                ];
          const serverPayload: NoteDraftPayload = {
            title: existing.title || '',
            passage: existing.passage,
            templateId: existing.templateId || DEFAULT_TEMPLATE.id,
            sections: serverSections,
            tags: existing.tags,
            visibility: existing.visibility,
          };
          applyPayload(serverPayload);
          originalSnapshotRef.current = serverPayload;
          const serverAt = toMillis(existing.updated_at ?? existing.updatedAt);
          lastKnownServerAtRef.current = serverAt;
          setIsDirty(false);

          if (user?.uid) {
            const key = draftKeyForNote(user.uid, id);
            draftKeyRef.current = key;
            const draft = await loadDraft(key);
            if (draft && isMounted) {
              const editedElsewhere =
                typeof serverAt === 'number' &&
                typeof draft.lastKnownServerAt === 'number' &&
                serverAt > draft.lastKnownServerAt + CONFLICT_TOLERANCE_MS;
              if (editedElsewhere) {
                Alert.alert(
                  'This note changed on another device',
                  'You also have changes on this device that were never synced. Which version do you want to keep?',
                  [
                    {
                      text: 'Use saved version',
                      style: 'cancel',
                      onPress: () => clearDraft(key),
                    },
                    {
                      text: "Keep this device's changes",
                      onPress: () => {
                        applyPayload(draft.payload);
                        setIsDirty(true);
                      },
                    },
                  ]
                );
              } else {
                applyPayload(draft.payload);
                setIsDirty(true);
                setRecoveryOffer({ kind: 'restored', serverPayload });
              }
            }
          }
        }
      } catch (err) {
        if (isMounted) setErrorBanner("Couldn't load this note. Check your connection and try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
    // Load once per note. Profile snapshots (e.g. a settings change) must not reload
    // the note and overwrite edits; custom templates are read through a ref instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.uid]);

  // New notes: resume a specific draft, or offer the most recent unfinished one.
  useEffect(() => {
    if (id || !user?.uid) return;
    let isMounted = true;
    (async () => {
      if (draftParam) {
        const draft = await loadDraft(String(draftParam));
        if (draft && isMounted) {
          draftKeyRef.current = draft.key;
          applyPayload(draft.payload);
          setIsDirty(true);
          setSaveStatus('device');
        }
        return;
      }
      if (book) return; // Opened from "Note this" in the Bible tab: stay focused on that passage.
      const drafts = await listNewNoteDrafts(user.uid);
      if (drafts.length > 0 && isMounted) {
        setRecoveryOffer({ kind: 'resume', draft: drafts[0] });
      }
    })();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.uid, draftParam]);

  // Template switching logic with dirty state handling
  /**
   * Switches template right away, carrying the writing across (see
   * carrySectionsToTemplate), and offers Undo afterwards instead of asking first.
   */
  const switchTemplate = useCallback(
    (targetTemplate: NoteTemplate, message: string) => {
      const previous = { template: activeTemplateRef.current, sections: sectionsRef.current };
      const hasWriting = previous.sections.some(
        (s) => s.content.trim().length > 0 || (s.verseReferences?.length ?? 0) > 0
      );
      setActiveTemplate(targetTemplate);
      setSections(
        hasWriting
          ? carrySectionsToTemplate(previous.sections, targetTemplate, {
              labelMovedText: labelMovedSections,
            })
          : initializeSectionValues(targetTemplate)
      );
      sectionCursorRef.current = {};
      setIsDirty(true);
      setTemplateNotice(hasWriting ? { message, previous } : null);
    },
    [labelMovedSections]
  );

  const handleSelectTemplate = useCallback(
    (targetTemplate: NoteTemplate) => {
      if (targetTemplate.id === activeTemplateRef.current.id) return;
      switchTemplate(targetTemplate, `Switched to ${targetTemplate.name}. Your writing came with it.`);
    },
    [switchTemplate]
  );

  const undoTemplateSwitch = useCallback(() => {
    if (!templateNotice) return;
    setActiveTemplate(templateNotice.previous.template);
    setSections(templateNotice.previous.sections);
    sectionCursorRef.current = {};
    setIsDirty(true);
    setTemplateNotice(null);
  }, [templateNotice]);

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

        // Editing the template this note uses: re-apply it so renamed, added or
        // removed sections show up, keeping all of the writing.
        if (activeTemplateRef.current.id === template.id) {
          switchTemplate(template, `Updated ${template.name}. Your writing was kept.`);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to save custom template.');
      }
    },
    [user?.uid, profile?.custom_templates, switchTemplate]
  );

  const handleDeleteCustomTemplate = useCallback(
    async (templateId: string) => {
      if (!user?.uid) return;
      const existingCustom = profile?.custom_templates || [];
      const filtered = existingCustom.filter((t) => t.id !== templateId);

      try {
        await updateUserProfile(user.uid, { custom_templates: filtered });
        if (activeTemplateRef.current.id === templateId) {
          switchTemplate(
            DEFAULT_TEMPLATE,
            `Template deleted. This note now uses ${DEFAULT_TEMPLATE.name}, with your writing kept.`
          );
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to delete custom template.');
      }
    },
    [user?.uid, profile?.custom_templates, switchTemplate]
  );

  // ---------------------------------------------------------------------------
  // Saving
  //
  // Every change is written to a device-local draft ~800ms after typing stops.
  // Notes that already exist in Firestore are also synced ~3s after typing stops
  // (and at least every 15s while typing continues). New notes are only created
  // in Firestore when the user taps Done, because creating a note notifies
  // friends and they shouldn't be pinged about half-written notes.
  // ---------------------------------------------------------------------------

  const getDraftKey = useCallback((): string | null => {
    if (draftKeyRef.current) return draftKeyRef.current;
    if (!user?.uid) return null;
    draftKeyRef.current = currentNoteIdRef.current
      ? draftKeyForNote(user.uid, currentNoteIdRef.current)
      : newDraftKey(user.uid);
    return draftKeyRef.current;
  }, [user?.uid]);

  const writeLocalDraft = useCallback(async (): Promise<boolean> => {
    if (localTimerRef.current) {
      clearTimeout(localTimerRef.current);
      localTimerRef.current = null;
    }
    const payload = latestRef.current;
    const isNew = !currentNoteIdRef.current;
    if (isNew && !draftHasContent(payload) && !payload.passage) return true;
    const key = getDraftKey();
    if (!key) return false;
    const ok = await saveDraft({
      key,
      noteId: currentNoteIdRef.current,
      payload,
      savedAt: Date.now(),
      lastKnownServerAt: lastKnownServerAtRef.current,
    });
    localDraftOkRef.current = ok;
    if (isNew) setSaveStatus(ok ? 'device' : 'error');
    return ok;
  }, [getDraftKey]);

  const discardLocalDraft = useCallback(async () => {
    isDirtyRef.current = false;
    if (localTimerRef.current) {
      clearTimeout(localTimerRef.current);
      localTimerRef.current = null;
    }
    if (draftKeyRef.current) await clearDraft(draftKeyRef.current);
  }, []);

  /** Sends the latest editor state to Firestore. Never touches editor state, so typing isn't disturbed. */
  const persistToServer = useCallback(async (): Promise<boolean> => {
    const snapshot = latestRef.current;
    if (!snapshot.passage) return false;
    const template = activeTemplateRef.current;
    const syncedSections = syncSectionVerseReferencesFromContent(snapshot.sections, snapshot.passage);
    const sanitizedSections = syncedSections.map((s) => ({ ...s, content: (s.content || '').trim() }));
    const lightContent = sanitizedSections.find((s) => s.id === 'light')?.content || '';
    const questionContent = sanitizedSections.find((s) => s.id === 'question')?.content || '';
    const arrowContent = sanitizedSections.find((s) => s.id === 'arrow')?.content || '';
    const fields = {
      title: snapshot.title.trim() || undefined,
      passage: snapshot.passage,
      templateId: template.id,
      templateName: template.name,
      sections: sanitizedSections,
      lightContent,
      questionContent,
      arrowContent,
      tags: snapshot.tags,
      visibility: snapshot.visibility,
    };

    const existingId = currentNoteIdRef.current;
    if (existingId) {
      await withTimeout(notesService.updateNote(existingId, fields), SERVER_TIMEOUT_MS);
      return true;
    }

    // Reuse an in-flight create so a retried Done can never produce a duplicate note.
    if (!createPromiseRef.current) {
      const newKey = draftKeyRef.current;
      createPromiseRef.current = notesService
        .createNote({
          userId: user?.uid || '',
          authorUsername: profile?.username || user?.displayName || '',
          authorDisplayName: profile?.display_name || user?.displayName || '',
          ...fields,
        })
        .then((savedNote) => {
          if (newKey) clearDraft(newKey);
          if (savedNote?.id) {
            currentNoteIdRef.current = savedNote.id;
            draftKeyRef.current = user?.uid ? draftKeyForNote(user.uid, savedNote.id) : null;
            if (snapshot.visibility === 'friends' && user?.uid) {
              const authorName = profile?.display_name || profile?.username || user?.displayName || 'A friend';
              notifyFriendsOfNoteOverlap(user.uid, authorName, savedNote).catch((err) => {
                console.warn('Failed to dispatch friend overlap notifications:', err);
              });
            }
          }
          return savedNote;
        })
        .catch((err) => {
          createPromiseRef.current = null;
          throw err;
        });
    }
    await withTimeout(createPromiseRef.current, SERVER_TIMEOUT_MS);
    return true;
  }, [user, profile]);

  const runRemoteSave = useCallback(async () => {
    if (remoteTimerRef.current) {
      clearTimeout(remoteTimerRef.current);
      remoteTimerRef.current = null;
    }
    if (!currentNoteIdRef.current || !latestRef.current.passage) return;
    if (remoteInFlightRef.current) {
      remoteRerunRef.current = true;
      return;
    }
    remoteInFlightRef.current = true;
    pendingRemoteSinceRef.current = null;
    const version = changeVersionRef.current;
    setSaveStatus('saving');
    try {
      await persistToServer();
      lastKnownServerAtRef.current = Date.now();
      if (version === changeVersionRef.current) {
        setIsDirty(false);
        await discardLocalDraft();
      }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    } finally {
      remoteInFlightRef.current = false;
    }
    if (remoteRerunRef.current || version !== changeVersionRef.current) {
      remoteRerunRef.current = false;
      scheduleRemoteSaveRef.current();
    }
  }, [persistToServer, discardLocalDraft]);

  const scheduleRemoteSave = useCallback(() => {
    const now = Date.now();
    if (pendingRemoteSinceRef.current === null) pendingRemoteSinceRef.current = now;
    const delay = Math.max(
      0,
      Math.min(REMOTE_IDLE_MS, pendingRemoteSinceRef.current + REMOTE_MAX_WAIT_MS - now)
    );
    if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
    remoteTimerRef.current = setTimeout(() => {
      runRemoteSave();
    }, delay);
  }, [runRemoteSave]);
  scheduleRemoteSaveRef.current = scheduleRemoteSave;

  // Autosave whenever the user changes something.
  useEffect(() => {
    if (!isDirty || loading) return;
    changeVersionRef.current += 1;
    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    localTimerRef.current = setTimeout(() => {
      writeLocalDraft();
    }, LOCAL_IDLE_MS);
    if (currentNoteIdRef.current) scheduleRemoteSave();
  }, [title, passage, sections, tags, visibility, activeTemplate.id, isDirty, loading, writeLocalDraft, scheduleRemoteSave]);

  // Write the draft immediately when the app is backgrounded or the tab is hidden.
  useEffect(() => {
    const flush = () => {
      if (isDirtyRef.current) writeLocalDraft();
    };
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush();
    });
    const hasWindow = Platform.OS === 'web' && typeof window !== 'undefined';
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flush();
    };
    if (hasWindow) {
      window.addEventListener('pagehide', flush);
      document.addEventListener('visibilitychange', onVisibility);
    }
    return () => {
      appStateSub.remove();
      if (hasWindow) {
        window.removeEventListener('pagehide', flush);
        document.removeEventListener('visibilitychange', onVisibility);
      }
      flush();
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
    };
  }, [writeLocalDraft]);

  // Safe back navigation helper to prevent unhandled GO_BACK actions
  const navigateBack = useCallback(() => {
    allowLeaveRef.current = true;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/notes');
    }
  }, [router]);

  /**
   * Leaves the editor, making sure nothing is lost: new notes are created,
   * existing notes are synced, and if the server can't be reached the local
   * draft stays behind for next time.
   */
  const handleDone = useCallback(
    async (leave: () => void = navigateBack) => {
      if (isSavingRef.current) return;
      const finish = () => {
        allowLeaveRef.current = true;
        leave();
      };
      const payload = latestRef.current;
      const isNew = !currentNoteIdRef.current;

      if (isNew && !draftHasContent(payload)) {
        await discardLocalDraft();
        finish();
        return;
      }

      if (isNew && !payload.passage) {
        Alert.alert(
          'Choose a passage to save',
          'A note needs a passage before it can be saved. Your writing is kept on this device until then.',
          [
            { text: 'Choose passage', onPress: () => setShowPicker(true) },
            {
              text: 'Keep as draft',
              style: 'cancel',
              onPress: async () => {
                await writeLocalDraft();
                finish();
              },
            },
            {
              text: 'Discard note',
              style: 'destructive',
              onPress: async () => {
                await discardLocalDraft();
                finish();
              },
            },
          ]
        );
        return;
      }

      if (!isNew && !isDirtyRef.current) {
        finish();
        return;
      }

      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
      await writeLocalDraft();
      isSavingRef.current = true;
      setIsSaving(true);
      setErrorBanner(null);
      try {
        await persistToServer();
        setIsDirty(false);
        await discardLocalDraft();
        finish();
      } catch {
        setSaveStatus('error');
        Alert.alert(
          "Couldn't reach the server",
          'Your note is saved on this device and will finish syncing when you are back online.',
          [
            { text: 'Stay here', style: 'cancel' },
            { text: 'Leave anyway', onPress: finish },
          ]
        );
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [navigateBack, discardLocalDraft, writeLocalDraft, persistToServer]
  );

  const handleDiscard = useCallback(() => {
    const isNew = !currentNoteIdRef.current;
    if (isNew) {
      Alert.alert('Discard this note?', 'Everything you wrote in this note will be deleted.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard note',
          style: 'destructive',
          onPress: async () => {
            await discardLocalDraft();
            navigateBack();
          },
        },
      ]);
      return;
    }
    const original = originalSnapshotRef.current;
    if (!original) return;
    Alert.alert(
      'Discard changes?',
      'This puts the note back the way it was when you opened it.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard changes',
          style: 'destructive',
          onPress: () => {
            applyPayload(original);
            setIsDirty(true);
          },
        },
      ]
    );
  }, [discardLocalDraft, navigateBack, applyPayload]);

  // Every way of leaving (header, swipe-back, Android back) goes through handleDone.
  useEffect(() => {
    const unsubscribe = navigation.addListener?.('beforeRemove', (e: any) => {
      if (allowLeaveRef.current) return;
      e.preventDefault();
      handleDone(() => navigation.dispatch(e.data.action));
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigation, handleDone]);

  const statusLabel = (() => {
    if (isSaving) return 'Saving…';
    switch (saveStatus) {
      case 'saving':
        return 'Saving…';
      case 'saved':
        return isDirty ? '' : 'Saved';
      case 'device':
        return 'Draft saved';
      case 'error':
        return currentNoteIdRef.current ? 'Not synced' : 'Not saved';
      default:
        return '';
    }
  })();

  // Navigation Header Setup
  useLayoutEffect(() => {
    navigation.setOptions({
      title: id ? 'Edit note' : 'New note',
      headerLeft: () => (
        <Pressable
          onPress={() => handleDone()}
          disabled={isSaving}
          style={styles.headerButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Done, save and close"
        >
          <Text style={[styles.headerDoneText, isSaving && { opacity: 0.6 }]}>Done</Text>
        </Pressable>
      ),
      headerRight: () => (
        <View style={styles.headerRightRow}>
          {statusLabel ? (
            <Pressable
              onPress={saveStatus === 'error' ? () => runRemoteSave() : undefined}
              disabled={saveStatus !== 'error' || !currentNoteIdRef.current}
              accessibilityRole={saveStatus === 'error' ? 'button' : 'text'}
              accessibilityLabel={saveStatus === 'error' ? `${statusLabel}. Tap to retry` : statusLabel}
              accessibilityLiveRegion="polite"
              hitSlop={8}
            >
              <Text
                style={[
                  styles.headerStatusText,
                  saveStatus === 'error' && styles.headerStatusError,
                ]}
              >
                {statusLabel}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleDiscard}
            style={styles.headerDiscardButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={currentNoteIdRef.current ? 'Discard changes' : 'Discard note'}
          >
            <Text style={styles.headerDiscardText}>Discard</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, id, isSaving, handleDone, handleDiscard, statusLabel, saveStatus, runRemoteSave]);

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

      {recoveryOffer && (
        <View style={styles.recoveryBanner} accessibilityLiveRegion="polite">
          <Ionicons name="time-outline" size={16} color={colors.accent.keyIdea} />
          <Text style={styles.recoveryText}>
            {recoveryOffer.kind === 'restored'
              ? 'Restored changes that had not synced yet.'
              : `Unfinished note on ${describeDraft(recoveryOffer.draft)}.`}
          </Text>
          {recoveryOffer.kind === 'restored' ? (
            <Pressable
              onPress={() => {
                applyPayload(recoveryOffer.serverPayload);
                setIsDirty(true);
                setRecoveryOffer(null);
              }}
              style={styles.recoveryButton}
              accessibilityRole="button"
            >
              <Text style={styles.recoveryButtonText}>Undo</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  clearDraft(recoveryOffer.draft.key);
                  setRecoveryOffer(null);
                }}
                style={styles.recoveryButton}
                accessibilityRole="button"
              >
                <Text style={[styles.recoveryButtonText, styles.recoveryButtonMuted]}>Discard</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const { draft } = recoveryOffer;
                  const abandonedKey = draftKeyRef.current;
                  draftKeyRef.current = draft.key;
                  applyPayload(draft.payload);
                  setIsDirty(true);
                  setSaveStatus('device');
                  setRecoveryOffer(null);
                  if (abandonedKey && abandonedKey !== draft.key) clearDraft(abandonedKey);
                }}
                style={styles.recoveryButton}
                accessibilityRole="button"
              >
                <Text style={styles.recoveryButtonText}>Resume</Text>
              </Pressable>
            </>
          )}
          {recoveryOffer.kind === 'restored' && (
            <Pressable
              onPress={() => setRecoveryOffer(null)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Ionicons name="close" size={16} color={colors.text.secondary} />
            </Pressable>
          )}
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
              <Text style={styles.pickerLabel}>Passage</Text>
              <Text style={[styles.pickerValue, !passage && styles.pickerValueEmpty]}>
                {passage ? formatPassageDisplay(passage) : 'Choose a passage'}
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
            placeholder="Title (optional)"
            placeholderTextColor={colors.text.secondary}
            style={styles.titleInput}
            maxLength={100}
            accessibilityLabel="Note title"
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
              actionBarPlacement="docked"
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
            onSelectionChangeSection={(sectionId, _start, end) => {
              sectionCursorRef.current[sectionId] = end;
            }}
            onFocusSection={(sectionId) => {
              focusedSectionIdRef.current = sectionId;
            }}
            onBlurSection={(sectionId) => {
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

      {linkFeedback?.kind === 'prompt' && (
        <View style={styles.linkPrompt} accessibilityLiveRegion="polite">
          <Text style={styles.linkPromptText}>
            Moved you to {linkFeedback.sectionTitle} after linking. Keep doing this?
          </Text>
          <Text style={styles.linkPromptHint}>You can change this anytime in Settings.</Text>
          <View style={styles.linkPromptActions}>
            <Pressable
              onPress={() => {
                setAutoScrollOnLink(false);
                markAutoScrollPromptSeen();
                setLinkFeedback(null);
              }}
              style={styles.linkPromptButton}
              accessibilityRole="button"
            >
              <Text style={styles.linkPromptButtonText}>Stay on passage</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAutoScrollOnLink(true);
                markAutoScrollPromptSeen();
                setLinkFeedback(null);
              }}
              style={[styles.linkPromptButton, styles.linkPromptButtonPrimary]}
              accessibilityRole="button"
            >
              <Text style={[styles.linkPromptButtonText, styles.linkPromptButtonTextPrimary]}>
                Keep moving me
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <Snackbar
        visible={linkFeedback?.kind === 'linked'}
        onDismiss={() => setLinkFeedback(null)}
        duration={3500}
        style={styles.snackbar}
        action={{
          label: 'View',
          textColor: colors.accent.keyIdea,
          onPress: () => {
            if (linkFeedback) scheduleRevealSection(linkFeedback.sectionId);
          },
        }}
      >
        <Text style={styles.snackbarText}>Linked to {linkFeedback?.sectionTitle}</Text>
      </Snackbar>

      <Snackbar
        visible={!!templateNotice}
        onDismiss={() => setTemplateNotice(null)}
        duration={6000}
        style={styles.snackbar}
        action={{
          label: 'Undo',
          textColor: colors.accent.keyIdea,
          onPress: undoTemplateSwitch,
        }}
      >
        <Text style={styles.snackbarText}>{templateNotice?.message}</Text>
      </Snackbar>

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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 200, // Consistent 200px whitespace for keyboard clearance & tags menu
  },
  headerButton: {
    marginHorizontal: layout.headerEdgeInset,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  headerDoneText: {
    ...typography.label,
    fontSize: 16,
    color: colors.accent.keyIdea,
    fontWeight: '600',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: layout.headerEdgeInset,
  },
  headerStatusText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  headerStatusError: {
    color: colors.accent.danger,
    fontWeight: '600',
  },
  headerIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDiscardButton: {
    minHeight: 32,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDiscardText: {
    ...typography.label,
    fontSize: 14,
    color: colors.accent.danger,
  },
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.keyIdea,
  },
  recoveryText: {
    ...typography.caption,
    color: colors.text.primary,
    flex: 1,
  },
  recoveryButton: {
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  recoveryButtonText: {
    ...typography.label,
    color: colors.accent.keyIdea,
    fontWeight: '600',
  },
  recoveryButtonMuted: {
    color: colors.text.secondary,
  },
  errorBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.danger,
  },
  errorText: {
    ...typography.caption,
    color: colors.text.primary,
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
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    fontSize: typography.title.fontSize,
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
  linkPrompt: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.md,
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.sheet,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing.md,
    gap: spacing.xs,
    zIndex: 30,
  },
  linkPromptText: {
    ...typography.label,
    color: colors.text.primary,
  },
  linkPromptHint: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  linkPromptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  linkPromptButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    justifyContent: 'center',
  },
  linkPromptButtonPrimary: {
    backgroundColor: colors.accent.keyIdea,
    borderColor: colors.accent.keyIdea,
  },
  linkPromptButtonText: {
    ...typography.label,
    color: colors.text.primary,
  },
  linkPromptButtonTextPrimary: {
    color: colors.bg.base,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: colors.bg.surfaceRaised,
  },
  snackbarText: {
    ...typography.label,
    color: colors.text.primary,
  },
  floatingBibleJumpText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent.keyIdea,
  },
});
