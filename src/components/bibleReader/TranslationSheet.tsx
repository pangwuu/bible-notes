import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUPPORTED_BIBLE_VERSIONS, BibleVersionMetadata } from '../../constants/bibleVersions';
import { colors, spacing, radius, typography } from '../../constants/theme';
import safeStorage from '../../utils/safeStorage';

const RECENTS_KEY = 'recent_version_ids';
const MAX_RECENTS = 3;

export async function rememberRecentVersion(versionId: number): Promise<number[]> {
  const raw = await safeStorage.getItem(RECENTS_KEY);
  let recents: number[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) recents = parsed.filter((n) => typeof n === 'number');
  } catch {
    recents = [];
  }
  const next = [versionId, ...recents.filter((id) => id !== versionId)].slice(0, MAX_RECENTS);
  await safeStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

interface TranslationSheetProps {
  visible: boolean;
  selectedVersionId: number;
  onSelect: (versionId: number) => void;
  onClose: () => void;
  onOpenVersionGuide?: () => void;
}

export const TranslationSheet: React.FC<TranslationSheetProps> = ({
  visible,
  selectedVersionId,
  onSelect,
  onClose,
  onOpenVersionGuide,
}) => {
  const insets = useSafeAreaInsets();
  const [recentIds, setRecentIds] = useState<number[]>([]);

  useEffect(() => {
    if (!visible) return;
    safeStorage.getItem(RECENTS_KEY).then((raw) => {
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        setRecentIds(Array.isArray(parsed) ? parsed : []);
      } catch {
        setRecentIds([]);
      }
    });
  }, [visible]);

  const recents = useMemo(
    () =>
      recentIds
        .map((id) => SUPPORTED_BIBLE_VERSIONS.find((v) => v.id === id))
        .filter((v): v is BibleVersionMetadata => Boolean(v)),
    [recentIds]
  );

  const choose = (versionId: number) => {
    rememberRecentVersion(versionId);
    onSelect(versionId);
    onClose();
  };

  const renderRow = (v: BibleVersionMetadata) => {
    const isActive = v.id === selectedVersionId;
    return (
      <Pressable
        key={v.id}
        onPress={() => choose(v.id)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${v.fullName} (${v.shortName})`}
      >
        <Text style={[styles.rowShort, isActive && styles.rowActive]}>{v.shortName}</Text>
        <Text style={styles.rowFull} numberOfLines={1}>
          {v.fullName}
        </Text>
        {isActive && <Ionicons name="checkmark" size={18} color={colors.accent.keyIdea} />}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close translations" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Translation</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {recents.length > 0 && (
            <>
              <Text style={styles.groupLabel}>Recent</Text>
              {recents.map(renderRow)}
              <Text style={styles.groupLabel}>All translations</Text>
            </>
          )}
          {SUPPORTED_BIBLE_VERSIONS.map(renderRow)}
        </ScrollView>

        {onOpenVersionGuide && (
          <Pressable
            onPress={() => {
              onClose();
              onOpenVersionGuide();
            }}
            style={styles.guideLink}
            accessibilityRole="button"
            accessibilityLabel="About Bible versions"
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.accent.keyIdea} />
            <Text style={styles.guideText}>About these versions</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.bg.surfaceRaised,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.hairline,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
  },
  list: {
    paddingBottom: spacing.sm,
  },
  groupLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.control,
  },
  rowPressed: {
    backgroundColor: colors.bg.surface,
  },
  rowShort: {
    ...typography.label,
    color: colors.text.primary,
    fontWeight: '600',
    width: 56,
  },
  rowActive: {
    color: colors.accent.keyIdea,
  },
  rowFull: {
    ...typography.label,
    color: colors.text.secondary,
    flex: 1,
  },
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    marginTop: spacing.xs,
  },
  guideText: {
    ...typography.label,
    color: colors.accent.keyIdea,
  },
});
