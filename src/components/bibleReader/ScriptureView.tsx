import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../constants/theme';
import {
  PassageFetchResult,
  SUPPORTED_TRANSLATIONS,
  VerseSegment,
  MultiPassageSection,
} from '../../services/bibleService';
import { PassageReference } from '../../types/note';
import { BibleTranslation } from '../../types/user';
import { LinkedSectionInfo, LinkedVerseData } from '../../utils/verseLinkUtils';
import { VerseItem } from './VerseItem';

interface ScriptureViewProps {
  loading: boolean;
  isOfflineEmpty: boolean;
  passageResult: PassageFetchResult | null;
  selectedTranslation: BibleTranslation;
  targetPassage?: PassageReference;
  fontSize: number;
  showVerseNumbers: boolean;
  selectedVerses: Set<number>;
  targetHighlightedVerse?: number | null;
  linkedVerseMap?: Record<string | number, LinkedVerseData | LinkedSectionInfo>;
  onToggleVerse: (verseNum: number) => void;
  onRetry: () => void;
  actionSlot?: React.ReactNode;
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
  targetHighlightedVerse,
  linkedVerseMap = {},
  onToggleVerse,
  onRetry,
  actionSlot,
}) => {
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

  const renderVerse = (v: VerseSegment, sec?: MultiPassageSection) => {
    const isSelected = selectedVerses.has(v.verseNumber);
    const isTargetHighlighted = targetHighlightedVerse === v.verseNumber;

    // Resolve book and chapter for canonical link lookup
    const resolvedSegment = sec?.segment || targetPassage?.segments?.[0];
    const resolvedBook = resolvedSegment?.book;
    const resolvedChapter = resolvedSegment?.startChapter;

    const canonicalKey = resolvedBook && resolvedChapter ? `${resolvedBook}:${resolvedChapter}:${v.verseNumber}` : undefined;
    const linkedItem = (canonicalKey && linkedVerseMap[canonicalKey]) || linkedVerseMap[v.verseNumber];
    const linked = linkedItem ? ('primary' in linkedItem ? linkedItem.primary : linkedItem) : null;

    return (
      <VerseItem
        key={v.verseNumber}
        verse={v}
        isSelected={isSelected}
        isTargetHighlighted={isTargetHighlighted}
        linkedSection={linked}
        showVerseNumbers={showVerseNumbers}
        fontSize={fontSize}
        onToggle={onToggleVerse}
      />
    );
  };

  return (
    <View style={styles.contentWrapper}>
      <View style={[styles.scriptureContainer, loading && styles.scriptureDimmed]}>
        {sections && sections.length > 0 ? (
          sections.map((sec, secIdx) => (
            <View key={secIdx} style={styles.sectionBlock}>
              {sec.title ? (
                <Text style={[styles.passageSectionTitle, { fontSize: fontSize + 2 }]}>
                  {sec.title}
                </Text>
              ) : null}
              <Text style={styles.verseParagraph}>
                {sec.verses.map((v) => renderVerse(v, sec))}
              </Text>
            </View>
          ))
        ) : verses && verses.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.verseParagraph}>
              {verses.map((v) => renderVerse(v))}
            </Text>
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
          {SUPPORTED_TRANSLATIONS.find((t) => t.id === selectedTranslation)?.fullName ||
            selectedTranslation}
          {passageResult?.cached ? ' (Cached)' : ''}
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
