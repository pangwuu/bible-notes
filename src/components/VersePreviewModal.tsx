import React from 'react';
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
import { colors, spacing, radii, typography } from '../constants/theme';
import { formatVerseRangeLabel } from '../utils/verseLinkUtils';

export interface VersePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  passageRef: string;
  startVerse: number;
  endVerse: number;
  book?: string;
  chapter?: number;
  verses?: number[];
  verseText: string;
  loading?: boolean;
  translation?: string;
  onViewInContext?: () => void;
}

export default function VersePreviewModal({
  visible,
  onClose,
  passageRef,
  startVerse,
  endVerse,
  book,
  chapter,
  verses,
  verseText,
  loading = false,
  translation = 'ESV',
  onViewInContext,
}: VersePreviewModalProps) {
  const title = book
    ? formatVerseRangeLabel(startVerse, endVerse, { book, chapter }, verses)
    : `${passageRef} (${formatVerseRangeLabel(startVerse, endVerse, undefined, verses)})`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop overlay */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss verse preview"
        />

        {/* Bottom Sheet Container */}
        <View style={styles.sheetContainer}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Ionicons name="book-outline" size={18} color={colors.accent.keyIdea} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
              <View style={styles.translationBadge}>
                <Text style={styles.translationText}>{translation}</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close verse preview"
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Verse Content */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            showsVerticalScrollIndicator={true}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent.keyIdea} />
                <Text style={styles.emptyText}>Loading Scripture text...</Text>
              </View>
            ) : verseText ? (
              <Text style={styles.verseText}>{verseText}</Text>
            ) : (
              <Text style={styles.emptyText}>No Scripture text available.</Text>
            )}
          </ScrollView>

          {/* Bottom Action Footer */}
          {onViewInContext && (
            <View style={styles.footerRow}>
              <Pressable
                style={styles.viewInContextButton}
                onPress={() => {
                  onClose();
                  onViewInContext();
                }}
                accessibilityRole="button"
                accessibilityLabel="View in Scripture reader"
              >
                <Ionicons name="arrow-up-circle-outline" size={17} color={colors.accent.keyIdea} />
                <Text style={styles.viewInContextText}>View in Passage</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

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
    maxHeight: '80%',
    minHeight: 180,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
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
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  verseText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.primary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  footerRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  viewInContextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  viewInContextText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent.keyIdea,
  },
});
