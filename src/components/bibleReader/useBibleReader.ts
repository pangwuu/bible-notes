import { useState, useEffect, useCallback, useMemo } from 'react';
import { Share } from 'react-native';
import { BibleTranslation } from '../../types/user';
import { PassageReference } from '../../types/note';
import safeStorage from '../../utils/safeStorage';
import {
  fetchPassageText,
  formatPassageQuery,
  PassageFetchResult,
} from '../../services/bibleService';
import {
  formatVerseRangeLabel,
  extractVerseRangeText,
  getLinkedSectionsForVerses,
  LinkedSectionInfo,
} from '../../utils/verseLinkUtils';
import {
  BibleReaderProps,
  DEFAULT_SECTION_OPTIONS,
  SectionOption,
} from './types';

export function useBibleReader({
  passage,
  activeSegment,
  preferredTranslation = 'ESV',
  customApiKey,
  initiallyCollapsed = false,
  fontSize: propFontSize,
  linkedVerseMap = {},
  sectionOptions,
}: BibleReaderProps) {
  const [selectedTranslation, setSelectedTranslation] = useState<BibleTranslation>(preferredTranslation);
  const [passageResult, setPassageResult] = useState<PassageFetchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [collapsed, setCollapsed] = useState<boolean>(initiallyCollapsed);
  const [showVerseNumbers, setShowVerseNumbers] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(propFontSize || 16);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());

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

  // Sync selectedTranslation when preferredTranslation prop changes
  useEffect(() => {
    setSelectedTranslation(preferredTranslation);
  }, [preferredTranslation]);

  const loadPassage = useCallback(
    async (trans: BibleTranslation, force = false) => {
      setLoading(true);
      try {
        const result = await fetchPassageText(targetPassage, {
          translation: trans,
          esvApiKey: customApiKey,
          forceRefresh: force,
        });
        setPassageResult(result);
        if (result.error) {
          console.warn(`[BibleReader] Passage fetch reported error for ${trans}:`, result.error);
        }
      } catch (err: any) {
        const errorMsg = err?.message || 'offline';
        console.error(`[BibleReader] fetchPassageText threw exception:`, errorMsg);
        setPassageResult({
          verses: [],
          text: '',
          translation: trans,
          source: 'web',
          cached: false,
          error: errorMsg,
        });
      } finally {
        setLoading(false);
      }
    },
    [targetPassage, customApiKey]
  );

  useEffect(() => {
    loadPassage(selectedTranslation);
  }, [loadPassage, selectedTranslation]);

  const handleSelectTranslation = useCallback((trans: BibleTranslation) => {
    setSelectedTranslation((prev) => {
      if (trans !== prev) {
        setSelectedVerses(new Set());
        return trans;
      }
      return prev;
    });
  }, []);

  const passageDisplay = useMemo(() => {
    return targetPassage?.display || targetPassage?.displayString || formatPassageQuery(targetPassage);
  }, [targetPassage]);

  const isOfflineEmpty = Boolean(
    (passageResult?.error ||
      (!passageResult?.text &&
        (!passageResult?.verses || passageResult.verses.length === 0))) &&
      !loading
  );

  // Verse selection toggle
  const handleToggleVerse = useCallback((verseNum: number) => {
    setSelectedVerses((prev) => {
      const next = new Set(prev);
      if (next.has(verseNum)) {
        next.delete(verseNum);
      } else {
        next.add(verseNum);
      }
      return next;
    });
  }, []);

  const clearSelectedVerses = useCallback(() => {
    setSelectedVerses(new Set());
  }, []);

  const sortedSelectedVerses = useMemo(() => {
    return Array.from(selectedVerses).sort((a, b) => a - b);
  }, [selectedVerses]);

  // Compute all unique linked sections across selected verses
  const linkedSectionsToJump: LinkedSectionInfo[] = useMemo(() => {
    return getLinkedSectionsForVerses(sortedSelectedVerses, linkedVerseMap);
  }, [sortedSelectedVerses, linkedVerseMap]);

  // Share selected verses
  const handleShareSelected = useCallback(async () => {
    if (sortedSelectedVerses.length === 0) return;
    const start = sortedSelectedVerses[0];
    const end = sortedSelectedVerses[sortedSelectedVerses.length - 1];
    const text = extractVerseRangeText(passageResult?.verses || [], start, end);
    const rangeLabel = formatVerseRangeLabel(start, end);
    const message = `"${text}"\n\n— ${passageDisplay} (${rangeLabel}) [${selectedTranslation}]`;
    try {
      await Share.share({ message });
    } catch (err) {
      console.warn('Share error:', err);
    }
  }, [sortedSelectedVerses, passageResult?.verses, passageDisplay, selectedTranslation]);

  const availableSections: SectionOption[] = useMemo(() => {
    return sectionOptions && sectionOptions.length > 0 ? sectionOptions : DEFAULT_SECTION_OPTIONS;
  }, [sectionOptions]);

  const handleRetry = useCallback(() => {
    loadPassage(selectedTranslation, true);
  }, [loadPassage, selectedTranslation]);

  return {
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
    targetPassage,
    passageDisplay,
    isOfflineEmpty,
    linkedSectionsToJump,
    availableSections,
    handleToggleVerse,
    clearSelectedVerses,
    handleShareSelected,
    handleRetry,
  };
}
