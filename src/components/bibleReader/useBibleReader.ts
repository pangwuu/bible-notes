import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Share } from 'react-native';
import { BibleTranslation } from '../../types/user';
import {
  fetchPassageText,
  formatPassageQuery,
  PassageFetchResult,
} from '../../services/bibleService';
import {
  resolveVersionId,
  getVersionMetadata,
} from '../../constants/bibleVersions';
import {
  CrossReferenceTarget,
  getCrossReferencesForVerses,
  hasCrossReferences,
} from '../../services/crossReferenceService';
import safeStorage from '../../utils/safeStorage';
import { PassageReference } from '../../types/note';
import {
  extractSelectedVersesText,
  formatVerseRangeLabel,
  getLinkedSectionsForVerses,
  LinkedSectionInfo,
} from '../../utils/verseLinkUtils';
import { BibleReaderProps, DEFAULT_SECTION_OPTIONS, SectionOption } from './types';

export interface ActivePassageContext {
  book?: string;
  chapter?: number;
}

export function useBibleReader({
  passage,
  activeSegment,
  preferredTranslation = 'NIV',
  preferredVersionId,
  initiallyCollapsed = false,
  fontSize: propFontSize,
  linkedVerseMap = {},
  sectionOptions,
  targetHighlightedVerse,
}: BibleReaderProps) {
  const initialVersionId = resolveVersionId(preferredVersionId ?? preferredTranslation);
  const [selectedVersionId, setSelectedVersionId] = useState<number>(initialVersionId);
  const [selectedTranslation, setSelectedTranslation] = useState<BibleTranslation>(
    (getVersionMetadata(initialVersionId).shortName as BibleTranslation) || 'NIV'
  );

  const [passageResult, setPassageResult] = useState<PassageFetchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [collapsed, setCollapsed] = useState<boolean>(initiallyCollapsed);
  const [showVerseNumbers, setShowVerseNumbers] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(propFontSize || 16);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [activeContext, setActiveContext] = useState<ActivePassageContext | null>(null);
  const [crossRefSheetVisible, setCrossRefSheetVisible] = useState(false);
  const [crossRefSourceLabel, setCrossRefSourceLabel] = useState('');
  const [crossRefTargets, setCrossRefTargets] = useState<CrossReferenceTarget[]>([]);

  // Auto-uncollapse reader when a target verse is highlighted
  useEffect(() => {
    if (targetHighlightedVerse && collapsed) {
      setCollapsed(false);
    }
  }, [targetHighlightedVerse, collapsed]);

  const targetPassage: PassageReference = useMemo(() => {
    return activeSegment || passage;
  }, [activeSegment, passage]);

  useEffect(() => {
    if (propFontSize) {
      setFontSize(propFontSize);
    }
  }, [propFontSize]);

  // Read verse number preference and font size from safeStorage
  useEffect(() => {
    let isMounted = true;
    safeStorage.getItem('bible_show_verse_numbers').then((stored) => {
      if (isMounted && stored !== null) {
        try {
          setShowVerseNumbers(JSON.parse(stored));
        } catch {
          setShowVerseNumbers(stored !== 'false');
        }
      }
    });

    safeStorage.getItem('bible_font_size').then((stored) => {
      if (isMounted && stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 26) {
          setFontSize(parsed);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync selectedTranslation when preferredTranslation / preferredVersionId prop changes
  useEffect(() => {
    const nextId = resolveVersionId(preferredVersionId ?? preferredTranslation);
    setSelectedVersionId(nextId);
    setSelectedTranslation(getVersionMetadata(nextId).shortName as BibleTranslation);
  }, [preferredTranslation, preferredVersionId]);

  const loadPassage = useCallback(
    async (versionId: number, force = false) => {
      setLoading(true);
      try {
        const trans = getVersionMetadata(versionId).shortName as BibleTranslation;
        const result = await fetchPassageText(targetPassage, {
          translation: trans,
          versionId,
          forceRefresh: force,
        });
        setPassageResult(result);
        if (result.error) {
          console.warn(`[BibleReader] Passage fetch reported error for version ${versionId}:`, result.error);
        }
      } catch (err: any) {
        const errorMsg = err?.message || 'offline';
        console.error(`[BibleReader] fetchPassageText threw exception:`, errorMsg);
        const meta = getVersionMetadata(versionId);
        setPassageResult({
          verses: [],
          text: '',
          translation: meta.shortName as BibleTranslation,
          versionId,
          source: 'youversion',
          cached: false,
          error: errorMsg,
          attribution: meta.fullName,
        });
      } finally {
        setLoading(false);
      }
    },
    [targetPassage]
  );

  const prevPassageRef = useRef(targetPassage);
  useEffect(() => {
    if (prevPassageRef.current !== targetPassage) {
      prevPassageRef.current = targetPassage;
      setPassageResult(null);
    }
    loadPassage(selectedVersionId);
  }, [loadPassage, selectedVersionId, targetPassage]);

  const handleSelectVersion = useCallback((versionId: number) => {
    setSelectedVersionId((prev) => {
      if (versionId !== prev) {
        setSelectedVerses(new Set());
        setActiveContext(null);
        setSelectedTranslation(getVersionMetadata(versionId).shortName as BibleTranslation);
        return versionId;
      }
      return prev;
    });
  }, []);

  const handleSelectTranslation = useCallback((trans: BibleTranslation) => {
    const vId = resolveVersionId(trans);
    handleSelectVersion(vId);
  }, [handleSelectVersion]);

  const passageDisplay = useMemo(() => {
    return targetPassage?.display || targetPassage?.displayString || formatPassageQuery(targetPassage);
  }, [targetPassage]);

  const isOfflineEmpty = useMemo(() => {
    return !loading && (!passageResult || passageResult.verses.length === 0);
  }, [loading, passageResult]);

  // Verse Selection Logic
  const handleToggleVerse = useCallback(
    (verseNum: number, context?: ActivePassageContext) => {
      setSelectedVerses((prev) => {
        const next = new Set(prev);
        if (context) {
          if (
            activeContext &&
            (activeContext.book !== context.book || activeContext.chapter !== context.chapter)
          ) {
            next.clear();
          }
          setActiveContext(context);
        }

        if (next.has(verseNum)) {
          next.delete(verseNum);
          if (next.size === 0) {
            setActiveContext(null);
          }
        } else {
          next.add(verseNum);
        }
        return next;
      });
    },
    [activeContext]
  );

  const clearSelectedVerses = useCallback(() => {
    setSelectedVerses(new Set());
    setActiveContext(null);
  }, []);

  const sortedSelectedVerses = useMemo(() => {
    return Array.from(selectedVerses).sort((a, b) => a - b);
  }, [selectedVerses]);

  // Compute all unique linked sections across selected verses
  const linkedSectionsToJump: LinkedSectionInfo[] = useMemo(() => {
    return getLinkedSectionsForVerses(sortedSelectedVerses, linkedVerseMap, activeContext || undefined);
  }, [sortedSelectedVerses, linkedVerseMap, activeContext]);

  // Share selected verses
  const handleShareSelected = useCallback(async () => {
    if (sortedSelectedVerses.length === 0) return;
    const text = extractSelectedVersesText(passageResult?.verses || [], sortedSelectedVerses);
    const rangeLabel = formatVerseRangeLabel(
      sortedSelectedVerses[0],
      sortedSelectedVerses[sortedSelectedVerses.length - 1],
      activeContext || undefined,
      sortedSelectedVerses
    );
    const citation = activeContext?.book
      ? `${rangeLabel} [${selectedTranslation}]`
      : `${passageDisplay} (${rangeLabel}) [${selectedTranslation}]`;
    const message = `"${text}"\n\n— ${citation}`;
    try {
      await Share.share({ message });
    } catch (err) {
      console.warn('Share error:', err);
    }
  }, [sortedSelectedVerses, passageResult?.verses, passageDisplay, selectedTranslation, activeContext]);

  const availableSections: SectionOption[] = useMemo(() => {
    return sectionOptions && sectionOptions.length > 0 ? sectionOptions : DEFAULT_SECTION_OPTIONS;
  }, [sectionOptions]);

  const handleRetry = useCallback(() => {
    loadPassage(selectedVersionId, true);
  }, [loadPassage, selectedVersionId]);

  const resolveContext = useCallback(
    (context?: ActivePassageContext | null) => {
      const fallbackSeg = targetPassage?.segments?.[0];
      const book = context?.book || activeContext?.book || fallbackSeg?.book;
      const chapter = context?.chapter || activeContext?.chapter || fallbackSeg?.startChapter;
      return { book, chapter };
    },
    [targetPassage, activeContext]
  );

  const verseHasCrossReferences = useCallback(
    (book: string | undefined, chapter: number | undefined, verse: number) => {
      if (!book || !chapter) return false;
      return hasCrossReferences({ book, chapter, verse });
    },
    []
  );

  const openCrossReferencesForVerses = useCallback(
    (verses: number[], context?: ActivePassageContext | null) => {
      const { book, chapter } = resolveContext(context);
      if (!book || !chapter || verses.length === 0) return;
      const refs = getCrossReferencesForVerses(book, chapter, verses);
      if (refs.length === 0) return;
      const label = formatVerseRangeLabel(
        verses[0],
        verses[verses.length - 1],
        { book, chapter },
        verses
      );
      setCrossRefSourceLabel(label);
      setCrossRefTargets(refs);
      setCrossRefSheetVisible(true);
    },
    [resolveContext]
  );

  const handleOpenCrossReferencesForVerse = useCallback(
    (verseNum: number, context?: ActivePassageContext) => {
      openCrossReferencesForVerses([verseNum], context);
    },
    [openCrossReferencesForVerses]
  );

  const handleOpenCrossReferencesForSelection = useCallback(() => {
    openCrossReferencesForVerses(sortedSelectedVerses, activeContext);
  }, [openCrossReferencesForVerses, sortedSelectedVerses, activeContext]);

  const selectedCrossReferenceCount = useMemo(() => {
    const { book, chapter } = resolveContext(activeContext);
    if (!book || !chapter || sortedSelectedVerses.length === 0) return 0;
    return getCrossReferencesForVerses(book, chapter, sortedSelectedVerses).length;
  }, [resolveContext, activeContext, sortedSelectedVerses]);

  const closeCrossReferences = useCallback(() => {
    setCrossRefSheetVisible(false);
  }, []);

  return {
    selectedVersionId,
    setSelectedVersionId: handleSelectVersion,
    selectedTranslation,
    setSelectedTranslation: handleSelectTranslation,
    passageResult,
    loading,
    collapsed,
    setCollapsed,
    showVerseNumbers,
    fontSize,
    selectedVerses,
    sortedSelectedVerses,
    activeContext,
    targetPassage,
    passageDisplay,
    isOfflineEmpty,
    linkedSectionsToJump,
    availableSections,
    handleToggleVerse,
    clearSelectedVerses,
    handleShareSelected,
    handleRetry,
    verseHasCrossReferences,
    handleOpenCrossReferencesForVerse,
    handleOpenCrossReferencesForSelection,
    selectedCrossReferenceCount,
    crossRefSheetVisible,
    crossRefSourceLabel,
    crossRefTargets,
    closeCrossReferences,
  };
}
