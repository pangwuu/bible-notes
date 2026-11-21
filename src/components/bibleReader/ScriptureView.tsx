import React, { useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';
import {
  PassageFetchResult,
  SUPPORTED_TRANSLATIONS,
  VerseSegment,
  MultiPassageSection,
} from '../../services/bibleService';
import { PassageReference, TargetVerseHighlight } from '../../types/note';
import { BibleTranslation } from '../../types/user';
import { LinkedSectionInfo, LinkedVerseData } from '../../utils/verseLinkUtils';
import { findCanonicalBook } from '../../constants/bibleData';
import { VerseItem } from './VerseItem';
import { ActivePassageContext } from './useBibleReader';

interface ScriptureViewProps {
  loading: boolean;
  isOfflineEmpty: boolean;
  passageResult: PassageFetchResult | null;
  selectedTranslation: BibleTranslation;
  targetPassage?: PassageReference;
  fontSize: number;
  showVerseNumbers: boolean;
  selectedVerses: Set<number>;
  activeContext?: ActivePassageContext | null;
  targetHighlightedVerse?: TargetVerseHighlight | null;
  linkedVerseMap?: Record<string | number, LinkedVerseData | LinkedSectionInfo>;
  onToggleVerse: (verseNum: number, context?: ActivePassageContext) => void;
  onRetry: () => void;
  actionSlot?: React.ReactNode;
  onVerseLayout?: (verseKey: string, y: number) => void;
}

export const ScriptureView: React.FC<ScriptureViewProps> = ({
  loading,
  isOfflineEmpty,
  passageResult,
  selectedTranslation,
  targetPassage,
  fontSize,
  showVerseNumbers,
  selectedVerses,
  activeContext,
  targetHighlightedVerse,
  linkedVerseMap = {},
  onToggleVerse,
  onRetry,
  actionSlot,
  onVerseLayout,
}) => {
  let sectionYMap: Record<number, number> = {};
  try {
    const ref = useRef<Record<number, number>>({});
    sectionYMap = ref.current;
  } catch {
    sectionYMap = {};
  }
  if (loading && !passageResult) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent.keyIdea} />
        <Text style={styles.loadingText}>Fetching Scripture...</Text>
      </View>
    );
  }

  if (isOfflineEmpty) {
    return (
      <View style={styles.offlineBox}>
        <Ionicons name="cloud-offline-outline" size={24} color={colors.text.secondary} />
        <Text style={styles.offlineText}>
          Passage not available. Check your connection and retry.
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry fetching Scripture"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const sections = passageResult?.sections;
  const verses = passageResult?.verses || [];

  const renderVerse = (v: VerseSegment, sec?: MultiPassageSection, secIdx?: number) => {
    // Resolve book and chapter for this section
    const resolvedSegment =
      sec?.segment ||
      (typeof secIdx === 'number' ? targetPassage?.segments?.[secIdx] : undefined) ||
      targetPassage?.segments?.[0];
    const rawBook = resolvedSegment?.book;
    const resolvedBook = rawBook ? findCanonicalBook(rawBook)?.name || rawBook : undefined;
    const resolvedChapter = resolvedSegment?.startChapter;
    const currentContext: ActivePassageContext = { book: resolvedBook, chapter: resolvedChapter };

    // Selection check: verse must be in selectedVerses AND current context must match activeContext
    const isContextMatch =
      !activeContext ||
      (activeContext.book === currentContext.book && activeContext.chapter === currentContext.chapter);
    const isSelected = isContextMatch && selectedVerses.has(v.verseNumber);

    // Target highlight check: support object { book, chapter, verses } or simple number
    let isTargetHighlighted = false;
    if (typeof targetHighlightedVerse === 'number') {
      isTargetHighlighted = targetHighlightedVerse === v.verseNumber;
    } else if (targetHighlightedVerse && typeof targetHighlightedVerse === 'object') {
      const target = targetHighlightedVerse;
      const targetBookCanon = target.book ? findCanonicalBook(target.book)?.name || target.book : undefined;
      const currentBookCanon = currentContext.book ? findCanonicalBook(currentContext.book)?.name || currentContext.book : undefined;
      const bookMatches = !targetBookCanon || !currentBookCanon || targetBookCanon === currentBookCanon;
      const chapterMatches = !target.chapter || !currentContext.chapter || target.chapter === currentContext.chapter;
      isTargetHighlighted = bookMatches && chapterMatches && Array.isArray(target.verses) && target.verses.includes(v.verseNumber);
    }

    const canonicalKey = resolvedBook && resolvedChapter ? `${resolvedBook}:${resolvedChapter}:${v.verseNumber}` : undefined;
    const linkedItem = canonicalKey ? linkedVerseMap[canonicalKey] : linkedVerseMap[v.verseNumber];
    const linked = linkedItem ? ('primary' in linkedItem ? linkedItem.primary : linkedItem) : null;
    const sectionBaseY = typeof secIdx === 'number' ? (sectionYMap[secIdx] || 0) : 0;

    return (
      <VerseItem
        key={`${resolvedBook || ''}:${resolvedChapter || ''}:${v.verseNumber}`}
        verse={v}
        renderHeading={false}
        isSelected={isSelected}
        isTargetHighlighted={isTargetHighlighted}
        linkedSection={linked}
        showVerseNumbers={showVerseNumbers}
        fontSize={fontSize}
        onToggle={(num) => onToggleVerse(num, currentContext)}
        onLayout={(e) => {
          const totalY = sectionBaseY + (e.nativeEvent?.layout?.y || 0);
          if (canonicalKey) {
            onVerseLayout?.(canonicalKey, totalY);
          }
          onVerseLayout?.(String(v.verseNumber), totalY);
        }}
      />
    );
  };

  const groupVersesByPericope = (verseList: VerseSegment[]) => {
    interface PericopeGroup {
      heading?: string;
      startVerse: number;
      verses: VerseSegment[];
    }
    const groups: PericopeGroup[] = [];
    let current: PericopeGroup | null = null;

    for (const v of verseList) {
      const cleanHeading = v.heading ? v.heading.replace(/<[^>]*>/g, '').trim() : undefined;
      if (cleanHeading) {
        if (current && current.verses.length > 0) {
          groups.push(current);
        }
        current = {
          heading: cleanHeading,
          startVerse: v.verseNumber,
          verses: [v],
        };
      } else {
        if (!current) {
          current = {
            heading: undefined,
            startVerse: v.verseNumber,
            verses: [v],
          };
        } else {
          current.verses.push(v);
        }
      }
    }

    if (current && current.verses.length > 0) {
      groups.push(current);
    }
    return groups;
  };

  const renderVersesWithHeadings = (
    verseList: VerseSegment[],
    sec?: MultiPassageSection,
    secIdx?: number
  ) => {
    const hasAnyHeading = verseList.some((v) => Boolean(v.heading && v.heading.trim()));
    if (!hasAnyHeading) {
      return (
        <Text style={styles.verseParagraph}>
          {verseList.map((v) => renderVerse(v, sec, secIdx))}
        </Text>
      );
    }

    const groups = groupVersesByPericope(verseList);
    return groups.map((grp, gIdx) => (
      <View key={`pericope-${secIdx ?? 0}-${grp.startVerse}-${gIdx}`}>
        {grp.heading ? (
          <Text
            testID={`pericope-heading-${grp.startVerse}`}
            style={[
              styles.pericopeHeading,
              {
                fontSize: fontSize + 1,
                lineHeight: Math.round((fontSize + 1) * 1.4),
                marginTop: gIdx === 0 && (!sec || !sec.title) ? spacing.xs : spacing.md,
              },
            ]}
          >
            {grp.heading}
          </Text>
        ) : null}
        <Text style={styles.verseParagraph}>
          {grp.verses.map((v) => renderVerse(v, sec, secIdx))}
        </Text>
      </View>
    ));
  };

  return (
    <View style={styles.contentWrapper}>
      <View style={[styles.scriptureContainer, loading && styles.scriptureDimmed]}>
        {sections && sections.length > 0 ? (
          sections.map((sec, secIdx) => (
            <View
              key={secIdx}
              style={styles.sectionBlock}
              onLayout={(e) => {
                sectionYMap[secIdx] = e.nativeEvent.layout.y;
              }}
            >
              {sec.title ? (
                <Text style={[styles.passageSectionTitle, { fontSize: fontSize + 2 }]}>
                  {sec.title}
                </Text>
              ) : null}
              {renderVersesWithHeadings(sec.verses, sec, secIdx)}
            </View>
          ))
        ) : verses && verses.length > 0 ? (
          <View
            style={styles.sectionBlock}
            onLayout={(e) => {
              sectionYMap[0] = e.nativeEvent.layout.y;
            }}
          >
            {renderVersesWithHeadings(verses)}
          </View>
        ) : (
          <Text
            style={[
              styles.scriptureText,
              { fontSize, lineHeight: Math.round(fontSize * 1.5) },
            ]}
          >
            {passageResult?.text}
          </Text>
        )}
      </View>

      {/* Floating Action Bar slot */}
      {actionSlot}

      {/* Stale-While-Revalidate Overlay */}
      {loading && (
        <View style={styles.reloadingOverlay}>
          <ActivityIndicator size="small" color={colors.accent.keyIdea} />
          <Text style={styles.reloadingText}>Updating Scripture...</Text>
        </View>
      )}

      {/* Attribution Line */}
      <View style={styles.attributionRow}>
        <Text style={styles.attributionText}>
          {passageResult?.attribution ||
            SUPPORTED_TRANSLATIONS.find(
              (t) => t.id === (passageResult?.versionId || selectedTranslation) || t.shortName === selectedTranslation
            )?.fullName ||
            String(selectedTranslation)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentWrapper: {
    position: 'relative',
    minHeight: 120,
  },
  scriptureContainer: {
    marginVertical: spacing.xs,
    minHeight: 100,
  },
  scriptureDimmed: {
    opacity: 0.45,
  },
  sectionBlock: {
    marginBottom: spacing.sm,
  },
  passageSectionTitle: {
    fontFamily: typography.body.fontFamily,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(227, 165, 61, 0.25)',
    paddingBottom: 4,
  },
  pericopeHeading: {
    fontFamily: typography.body.fontFamily,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  verseParagraph: {
    fontFamily: typography.body.fontFamily,
    color: colors.text.primary,
  },
  scriptureText: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    color: colors.text.primary,
    lineHeight: 24,
    marginVertical: spacing.xs,
  },
  reloadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(24, 21, 16, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    zIndex: 10,
    borderRadius: radius.control,
  },
  reloadingText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  offlineBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  offlineText: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  retryButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  retryButtonText: {
    fontSize: 12,
    color: colors.accent.keyIdea,
    fontWeight: '600',
  },
  attributionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  attributionText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
});
