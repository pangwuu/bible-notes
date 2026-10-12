import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TemplateIcon } from '../TemplateIcon';
import { colors, spacing, radii, typography } from '../../constants/theme';
import {
  CROSSREF_ATTRIBUTION,
  CrossRefScope,
  CrossReferenceTarget,
  buildCrossRefSegment,
  formatCrossRefPassageQuery,
} from '../../services/crossReferenceService';
import { fetchPassageText, VerseSegment } from '../../services/bibleService';
import { PassageSegment } from '../../types/note';
import { SectionOption } from './types';

export interface CrossReferencesSheetProps {
  visible: boolean;
  onClose: () => void;
  sourceLabel: string;
  references: CrossReferenceTarget[];
  versionId: number;
  translationLabel: string;
  availableSections?: SectionOption[];
  onAttachReference?: (
    target: CrossReferenceTarget,
    sectionId: string
  ) => void;
  onAddPassage?: (segment: PassageSegment) => void;
  isPassageIncluded?: (segment: PassageSegment) => boolean;
}

const SCOPE_OPTIONS: { id: CrossRefScope; label: string }[] = [
  { id: 'exact', label: 'Verse' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'chapter', label: 'Chapter' },
];

function versesForTarget(target: CrossReferenceTarget): number[] {
  if (target.startChapter !== target.endChapter) {
    return [target.startVerse];
  }
  const list: number[] = [];
  for (let v = target.startVerse; v <= target.endVerse; v++) {
    list.push(v);
  }
  return list;
}

function isCoreVerse(target: CrossReferenceTarget, chapter: number, verse: number): boolean {
  const afterStart =
    chapter > target.startChapter ||
    (chapter === target.startChapter && verse >= target.startVerse);
  const beforeEnd =
    chapter < target.endChapter ||
    (chapter === target.endChapter && verse <= target.endVerse);
  return afterStart && beforeEnd;
}

export const CrossReferencesSheet: React.FC<CrossReferencesSheetProps> = ({
  visible,
  onClose,
  sourceLabel,
  references,
  versionId,
  translationLabel,
  availableSections = [],
  onAttachReference,
  onAddPassage,
  isPassageIncluded,
}) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [scope, setScope] = useState<CrossRefScope>('exact');
  const [loadingText, setLoadingText] = useState(false);
  const [verses, setVerses] = useState<VerseSegment[]>([]);
  const [fallbackText, setFallbackText] = useState('');
  const [attribution, setAttribution] = useState<string | undefined>();

  const expanded = useMemo(
    () => references.find((r) => refKey(r) === expandedKey) || null,
    [references, expandedKey]
  );

  useEffect(() => {
    if (!visible) {
      setExpandedKey(null);
      setScope('exact');
      setVerses([]);
      setFallbackText('');
      setAttribution(undefined);
    }
  }, [visible]);

  const loadText = useCallback(
    async (target: CrossReferenceTarget, viewScope: CrossRefScope) => {
      setLoadingText(true);
      try {
        const range = buildCrossRefSegment(target, viewScope);
        const query = formatCrossRefPassageQuery(
          range.book,
          range.startChapter,
          range.startVerse,
          range.endChapter,
          range.endVerse
        );
        const result = await fetchPassageText(query, { versionId });
        setVerses(result.verses || []);
        setFallbackText(result.text || '');
        setAttribution(result.attribution);
      } catch (err: any) {
        setVerses([]);
        setFallbackText('');
        console.warn('[CrossRefs] Failed to load passage:', err?.message || err);
      } finally {
        setLoadingText(false);
      }
    },
    [versionId]
  );

  useEffect(() => {
    if (expanded) {
      loadText(expanded, scope);
    }
  }, [expanded, scope, loadText]);

  const handleSelect = (ref: CrossReferenceTarget) => {
    const key = refKey(ref);
    setVerses([]);
    setFallbackText('');
    if (expandedKey === key) {
      setExpandedKey(null);
      setScope('exact');
      return;
    }
    setExpandedKey(key);
    setScope('exact');
  };

  const canAttach = Boolean(onAttachReference && availableSections.length > 0);

  const renderPassageText = (target: CrossReferenceTarget) => {
    if (loadingText) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.accent.keyIdea} />
          <Text style={styles.emptyText}>Loading Scripture…</Text>
        </View>
      );
    }
    if (verses.length === 0) {
      return fallbackText ? (
        <Text style={styles.verseText}>{fallbackText}</Text>
      ) : (
        <Text style={styles.emptyText}>No Scripture text available.</Text>
      );
    }
    // Multi-chapter targets are rare; verse numbers alone can't tell chapters apart,
    // so only dim context when the view stays inside a single chapter.
    const singleChapter = target.startChapter === target.endChapter;
    return (
      <Text style={styles.verseText}>
        {verses.map((v) => {
          const core =
            scope === 'exact' ||
            !singleChapter ||
            isCoreVerse(target, target.startChapter, v.verseNumber);
          return (
            <Text key={v.verseNumber} style={core ? null : styles.contextVerse}>
              <Text style={[styles.verseNum, core ? null : styles.contextVerseNum]}>
                {v.verseNumber}{' '}
              </Text>
              {v.text}{' '}
            </Text>
          );
        })}
      </Text>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss cross references"
        />

        <View style={styles.sheetContainer}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Ionicons name="git-network-outline" size={18} color={colors.accent.question} />
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Related passages
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {sourceLabel}
                </Text>
              </View>
              <View style={styles.translationBadge}>
                <Text style={styles.translationText}>{translationLabel}</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close cross references"
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {references.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No cross references for this verse.</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
            >
              {references.map((ref) => {
                const key = refKey(ref);
                const isOpen = expandedKey === key;
                return (
                  <View key={key} style={[styles.refCard, isOpen && styles.refCardOpen]}>
                    <Pressable
                      onPress={() => handleSelect(ref)}
                      style={styles.refRow}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${ref.display}`}
                    >
                      <View style={styles.refRowLeft}>
                        <Text style={styles.refLabel}>{ref.display}</Text>
                      </View>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.text.secondary}
                      />
                    </Pressable>

                    {isOpen && (
                      <View style={styles.expandedBody}>
                        <View style={styles.scopeRow} accessibilityRole="tablist">
                          {SCOPE_OPTIONS.map((opt) => {
                            const active = scope === opt.id;
                            return (
                              <Pressable
                                key={opt.id}
                                onPress={() => setScope(opt.id)}
                                style={[styles.scopeBtn, active && styles.scopeBtnActive]}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: active }}
                                accessibilityLabel={`Show ${opt.label.toLowerCase()}`}
                              >
                                <Text style={[styles.scopeBtnText, active && styles.scopeBtnTextActive]}>
                                  {opt.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>

                        {renderPassageText(ref)}

                        {onAddPassage && (
                          <View style={styles.attachWrap}>
                            <Text style={styles.attachPrompt}>Add to passages</Text>
                            <View style={styles.sectionPickerRow}>
                              {SCOPE_OPTIONS.map((opt) => {
                                const segment = buildCrossRefSegment(ref, opt.id);
                                const included = Boolean(isPassageIncluded?.(segment));
                                return (
                                  <Pressable
                                    key={opt.id}
                                    disabled={included}
                                    onPress={() => onAddPassage(segment)}
                                    style={[styles.sectionPickBtn, included && styles.addedBtn]}
                                    accessibilityLabel={
                                      included
                                        ? `${opt.label} already in passages`
                                        : `Add ${opt.label.toLowerCase()} to passages`
                                    }
                                  >
                                    <Ionicons
                                      name={included ? 'checkmark' : 'add'}
                                      size={13}
                                      color={included ? colors.accent.application : colors.text.primary}
                                    />
                                    <Text
                                      style={[
                                        styles.sectionPickBtnText,
                                        included && { color: colors.accent.application },
                                      ]}
                                    >
                                      {opt.label}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {canAttach && (
                          <View style={styles.attachWrap}>
                            <Text style={styles.attachPrompt}>Add to note</Text>
                            <View style={styles.sectionPickerRow}>
                              {availableSections.map((sec) => (
                                <Pressable
                                  key={sec.id}
                                  onPress={() => {
                                    onAttachReference?.(ref, sec.id);
                                  }}
                                  style={styles.sectionPickBtn}
                                  accessibilityLabel={`Add ${ref.display} to ${sec.title}`}
                                >
                                  {sec.icon ? (
                                    <TemplateIcon
                                      name={sec.icon}
                                      size={13}
                                      color={sec.color || colors.accent.keyIdea}
                                    />
                                  ) : null}
                                  <Text style={styles.sectionPickBtnText}>{sec.title}</Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.attributionRow}>
            {attribution ? (
              <Text style={styles.attributionText}>{attribution}</Text>
            ) : null}
            <Text style={styles.attributionText}>{CROSSREF_ATTRIBUTION}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

function refKey(ref: CrossReferenceTarget): string {
  return `${ref.bookIndex}:${ref.startChapter}:${ref.startVerse}:${ref.endChapter}:${ref.endVerse}`;
}

export { versesForTarget };

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(26, 24, 22, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderColor: colors.border.hairline,
    maxHeight: '85%',
    minHeight: 200,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs + 2,
    marginRight: spacing.sm,
  },
  headerTextWrap: {
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  translationBadge: {
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.content,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  translationText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent.keyIdea,
  },
  closeButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.hairline,
    marginHorizontal: spacing.md,
  },
  scrollBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  emptyWrap: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  refCard: {
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.content,
    backgroundColor: colors.bg.base,
    overflow: 'hidden',
  },
  refCardOpen: {
    backgroundColor: colors.bg.surfaceRaised,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
  },
  refRowLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  refLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  expandedBody: {
    paddingHorizontal: spacing.sm + 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    gap: spacing.sm,
  },
  scopeRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.controls,
    overflow: 'hidden',
  },
  scopeBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    backgroundColor: colors.bg.base,
  },
  scopeBtnActive: {
    backgroundColor: colors.bg.surface,
  },
  scopeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  scopeBtnTextActive: {
    color: colors.accent.keyIdea,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  verseText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text.primary,
  },
  verseNum: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent.keyIdea,
  },
  contextVerse: {
    color: colors.text.secondary,
  },
  contextVerseNum: {
    color: colors.text.disabled,
  },
  attachWrap: {
    gap: 6,
  },
  attachPrompt: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  sectionPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  sectionPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bg.base,
    borderRadius: radii.controls,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  addedBtn: {
    borderColor: colors.accent.application,
  },
  sectionPickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
  },
  attributionRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  attributionText: {
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 14,
  },
});

export default CrossReferencesSheet;
