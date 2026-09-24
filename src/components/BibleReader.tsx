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
  MultiPassageSection,
  buildScriptureHtml,
} from '../services/bibleService';

export { buildScriptureHtml };

export const SYSTEM_FONTS = [typography.body.fontFamily];

export interface BibleReaderProps {
  passage: PassageReference;
  activeSegment?: PassageReference | null;
  preferredTranslation?: BibleTranslation;
  customApiKey?: string;
  initiallyCollapsed?: boolean;
  style?: any;
  fontSize?: number;
}

const BibleReaderComponent: React.FC<BibleReaderProps> = ({
  passage,
  activeSegment,
  preferredTranslation = 'ESV',
  customApiKey,
  initiallyCollapsed = false,
  style,
  fontSize: propFontSize,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [selectedTranslation, setSelectedTranslation] = useState<BibleTranslation>(preferredTranslation);
  const [passageResult, setPassageResult] = useState<PassageFetchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [collapsed, setCollapsed] = useState<boolean>(initiallyCollapsed);
  const [showVerseNumbers, setShowVerseNumbers] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(propFontSize || 16);

  const targetPassage = useMemo(() => {
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

  const updateFontSize = (newSize: number) => {
    const clamped = Math.max(12, Math.min(26, newSize));
    setFontSize(clamped);
    safeStorage.setItem('bible_font_size', String(clamped)).catch(() => {});
  };

  const handleDecreaseFontSize = () => updateFontSize(fontSize - 2);
  const handleIncreaseFontSize = () => updateFontSize(fontSize + 2);

  // Sync selectedTranslation when preferredTranslation prop changes
  useEffect(() => {
    setSelectedTranslation(preferredTranslation);
  }, [preferredTranslation]);

  const loadPassage = useCallback(
    async (trans: BibleTranslation, force = false) => {
      setLoading(true);
      try {
        console.log(`[BibleReader] Requesting scripture: ${formatPassageQuery(targetPassage)} in ${trans} (force: ${force})`);
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

  const handleSelectTranslation = (trans: BibleTranslation) => {
    if (trans !== selectedTranslation) {
      setSelectedTranslation(trans);
    }
  };

  const passageDisplay = useMemo(() => {
    return targetPassage?.display || targetPassage?.displayString || formatPassageQuery(targetPassage);
  }, [targetPassage]);

  const isOfflineEmpty = Boolean((passageResult?.error || (!passageResult?.text && (!passageResult?.verses || passageResult.verses.length === 0))) && !loading);

  const scriptureHtml = useMemo(() => {
    const sections = passageResult?.sections;
    const verses = passageResult?.verses || [];
    const title = targetPassage?.displayString || targetPassage?.display || formatPassageQuery(targetPassage);

    if (sections && sections.length > 0) {
      return buildScriptureHtml(
        sections,
        showVerseNumbers,
        colors.textPrimary,
        colors.accentKeyIdea,
        fontSize,
        Math.round(fontSize * 1.5)
      );
    } else if (verses.length > 0) {
      return buildScriptureHtml(
        verses,
        showVerseNumbers,
        colors.textPrimary,
        colors.accentKeyIdea,
        fontSize,
        Math.round(fontSize * 1.5),
        title
      );
    }
    return '';
  }, [passageResult?.sections, passageResult?.verses, targetPassage, showVerseNumbers, fontSize]);

  const contentWidth = Math.max(windowWidth - spacing.md * 4, 280);

  const htmlSource = useMemo(() => ({ html: scriptureHtml }), [scriptureHtml]);

  const baseStyle = useMemo(
    () => ({
      fontFamily: typography.body.fontFamily,
      fontSize: fontSize,
      lineHeight: Math.round(fontSize * 1.5),
      color: colors.textPrimary,
    }),
    [fontSize]
  );

  return (
    <View style={[styles.container, style]}>
      {/* Header bar with Collapse Toggle */}
      <Pressable
        style={styles.headerRow}
        onPress={() => setCollapsed(!collapsed)}
        accessibilityRole="button"
        accessibilityLabel={`Toggle Scripture text. Currently ${collapsed ? 'collapsed' : 'expanded'}`}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="book-outline" size={17} color={colors.accentKeyIdea} style={styles.bookIcon} />
          <Text style={styles.scriptureHeaderLabel} numberOfLines={2} ellipsizeMode="tail">
            {passageDisplay}
          </Text>
        </View>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={colors.textSecondary}
          style={styles.collapseIcon}
        />
      </Pressable>

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
          {loading && !passageResult?.text && (!passageResult?.verses || passageResult.verses.length === 0) ? (
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
            <View style={styles.contentWrapper}>
              {scriptureHtml ? (
                <View style={[styles.scriptureContainer, loading && styles.scriptureDimmed]}>
                  <RenderHtml
                    contentWidth={contentWidth}
                    source={htmlSource}
                    systemFonts={SYSTEM_FONTS}
                    baseStyle={baseStyle}
                  />
                </View>
              ) : (
                <View style={[styles.scriptureContainer, loading && styles.scriptureDimmed]}>
                  {passage?.displayString ? (
                    <Text style={[styles.fallbackTitleText, { fontSize: fontSize + 4 }]}>
                      {passage.displayString}
                    </Text>
                  ) : null}
                  <Text style={[styles.scriptureText, { fontSize: fontSize, lineHeight: Math.round(fontSize * 1.5) }]}>
                    {passageResult?.text}
                  </Text>
                </View>
              )}

              {/* Seamless Stale-While-Revalidate Loading Overlay */}
              {loading && (
                <View style={styles.reloadingOverlay}>
                  <ActivityIndicator size="small" color={colors.accentKeyIdea} />
                  <Text style={styles.reloadingText}>Updating Scripture...</Text>
                </View>
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
    flex: 1,
    marginRight: spacing.sm,
  },
  bookIcon: {
    marginRight: spacing.xs,
  },
  scriptureHeaderLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  collapseIcon: {
    flexShrink: 0,
  },
  passageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurfaceRaised,
    borderRadius: radius.control,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginRight: 2,
  },
  fontBtn: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  fontBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  fontSizeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
    marginHorizontal: 3,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  fallbackTitleText: {
    fontFamily: typography.body.fontFamily,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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

export const BibleReader = React.memo(BibleReaderComponent);
export default BibleReader;
