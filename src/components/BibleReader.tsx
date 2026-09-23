/**
 * BibleReader.tsx
 * Collapsible Scripture Reading Surface with In-Place Multi-Translation Switcher
 * 
 * Supports comparison across:
 * ESV, NIV, NLT, CSB, KJV, WEB, ASV, BBE
 * 
 * Governed strictly by DESIGN.md:
 * - Surface: bg.surface (#242019)
 * - Card radius: borderRadius: 4 (readable content), hairline border (#332E27)
 * - Typography: SourceSerifPro (serif, 16px, line height 1.5)
 * - Control radius: borderRadius: 8 (interactive translation selector pills)
 * - No drop shadows, warm parchment text
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import RenderHtml from '@native-html/render';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../constants/theme';
import { PassageReference } from '../types/note';
import { BibleTranslation } from '../types/user';
import safeStorage from '../utils/safeStorage';
import {
  fetchPassageText,
  SUPPORTED_TRANSLATIONS,
  formatPassageQuery,
  PassageFetchResult,
  VerseSegment,
} from '../services/bibleService';

export interface BibleReaderProps {
  passage: PassageReference;
  preferredTranslation?: BibleTranslation;
  customApiKey?: string;
  initiallyCollapsed?: boolean;
  style?: any;
}

export function buildScriptureHtml(
  verses: VerseSegment[],
  showVerseNumbers: boolean,
  textColor: string,
  verseNumColor: string,
  fontSize: number,
  lineHeight: number
): string {
  const innerHtml = verses
    .map((v) => {
      const numSpan = showVerseNumbers
        ? `<sup style="font-size:10px;font-weight:600;color:${verseNumColor};vertical-align:super;line-height:0;">${v.verseNumber}&nbsp;</sup>`
        : '';
      return `${numSpan}<span>${v.text}&nbsp;</span>`;
    })
    .join('');

  return `<div style="color:${textColor};font-size:${fontSize}px;line-height:${lineHeight}px;margin:0;padding:0;">${innerHtml}</div>`;
}

export const BibleReader: React.FC<BibleReaderProps> = ({
  passage,
  preferredTranslation = 'ESV',
  customApiKey,
  initiallyCollapsed = false,
  style,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [selectedTranslation, setSelectedTranslation] = useState<BibleTranslation>(preferredTranslation);
  const [passageResult, setPassageResult] = useState<PassageFetchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [collapsed, setCollapsed] = useState<boolean>(initiallyCollapsed);
  const [showVerseNumbers, setShowVerseNumbers] = useState<boolean>(true);

  // Read verse number preference from safeStorage
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
        console.log(`[BibleReader] Requesting scripture: ${formatPassageQuery(passage)} in ${trans} (force: ${force})`);
        const result = await fetchPassageText(passage, {
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
    [passage, customApiKey]
  );

  useEffect(() => {
    loadPassage(selectedTranslation);
  }, [loadPassage, selectedTranslation]);

  const handleSelectTranslation = (trans: BibleTranslation) => {
    if (trans !== selectedTranslation) {
      setSelectedTranslation(trans);
    }
  };

  const passageDisplay = useMemo(() => {
    return formatPassageQuery(passage);
  }, [passage]);

  const isOfflineEmpty = Boolean((passageResult?.error || (!passageResult?.text && (!passageResult?.verses || passageResult.verses.length === 0))) && !loading);

  const scriptureHtml = useMemo(() => {
    const verses = passageResult?.verses || [];
    if (verses.length > 0) {
      return buildScriptureHtml(
        verses,
        showVerseNumbers,
        colors.textPrimary,
        colors.accentKeyIdea,
        typography.body.fontSize,
        typography.body.lineHeight
      );
    }
    return '';
  }, [passageResult?.verses, showVerseNumbers]);

  const contentWidth = Math.max(windowWidth - spacing.md * 4, 280);

  return (
    <View style={[styles.container, style]}>
      {/* Header bar with Title, Version Pill, and Collapse Toggle */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.headerLeft}
          onPress={() => setCollapsed(!collapsed)}
          accessibilityRole="button"
          accessibilityLabel={`Toggle Scripture text. Currently ${collapsed ? 'collapsed' : 'expanded'}`}
        >
          <Ionicons
            name="book"
            size={16}
            color={colors.accentKeyIdea}
            style={styles.bookIcon}
          />
          <Text style={styles.passageTitle}>{passageDisplay}</Text>
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>

        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>{selectedTranslation}</Text>
          {passageResult?.cached ? (
            <Ionicons name="cloud-offline-outline" size={12} color={colors.textSecondary} style={{ marginLeft: 3 }} />
          ) : null}
        </View>
      </View>

      {!collapsed && (
        <View style={styles.contentBody}>
          {/* Quick Version Switcher Row — fills full horizontal width */}
          <View style={styles.translationRow}>
            {SUPPORTED_TRANSLATIONS.map((t) => {
              const isActive = t.id === selectedTranslation;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => handleSelectTranslation(t.id)}
                  style={[
                    styles.transPill,
                    isActive && styles.transPillActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch translation to ${t.fullName}`}
                >
                  <Text
                    style={[
                      styles.transPillText,
                      isActive && styles.transPillTextActive,
                    ]}
                  >
                    {t.shortName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Passage Content / Loading / Offline states */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accentKeyIdea} />
              <Text style={styles.loadingText}>Fetching Scripture...</Text>
            </View>
          ) : isOfflineEmpty ? (
            <View style={styles.offlineBox}>
              <Ionicons name="cloud-offline-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.offlineText}>
                Passage not available. Check your connection and retry.
              </Text>
              {Boolean(__DEV__ && (passageResult?.debugInfo || passageResult?.error)) && (
                <Text style={styles.debugErrorText}>
                  [Dev Info: {passageResult?.debugInfo || passageResult?.error}]
                </Text>
              )}
              <Pressable
                style={styles.retryButton}
                onPress={() => loadPassage(selectedTranslation, true)}
                accessibilityRole="button"
                accessibilityLabel="Retry fetching Scripture"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {scriptureHtml ? (
                <View style={styles.scriptureContainer}>
                  <RenderHtml
                    contentWidth={contentWidth}
                    source={{ html: scriptureHtml }}
                    systemFonts={[typography.body.fontFamily]}
                    baseStyle={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.body.fontSize,
                      lineHeight: typography.body.lineHeight,
                      color: colors.textPrimary,
                    }}
                  />
                </View>
              ) : (
                <Text style={styles.scriptureText}>{passageResult?.text}</Text>
              )}

              {/* Attribution Line */}
              <View style={styles.attributionRow}>
                <Text style={styles.attributionText}>
                  {SUPPORTED_TRANSLATIONS.find((t) => t.id === selectedTranslation)?.fullName || selectedTranslation}
                  {passageResult?.cached ? ' (Cached)' : ''}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSurface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  bookIcon: {
    marginRight: 2,
  },
  passageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentKeyIdea,
  },
  contentBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
  },
  translationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    gap: spacing.xs,
  },
  transPill: {
    flex: 1,
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.control,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transPillActive: {
    borderColor: colors.accentKeyIdea,
    backgroundColor: colors.bgBase,
  },
  transPillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  transPillTextActive: {
    color: colors.accentKeyIdea,
    fontWeight: '600',
  },
  scriptureContainer: {
    marginVertical: spacing.xs,
  },
  scriptureText: {
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    color: colors.textPrimary,
    lineHeight: 24,
    marginVertical: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  offlineBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  offlineText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  debugErrorText: {
    fontSize: 11,
    color: colors.accentDanger,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  retryButtonText: {
    fontSize: 12,
    color: colors.accentKeyIdea,
    fontWeight: '600',
  },
  attributionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderHairline,
  },
  attributionText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});

export default BibleReader;
