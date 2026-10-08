import React from 'react';
import { ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { BibleTranslation } from '../../types/user';
import { SUPPORTED_BIBLE_VERSIONS, resolveVersionId } from '../../constants/bibleVersions';
import { colors, spacing, radius } from '../../constants/theme';

interface TranslationSelectorProps {
  selectedTranslation?: BibleTranslation;
  selectedVersionId?: number;
  onSelectTranslation: (translation: BibleTranslation) => void;
  onSelectVersion?: (versionId: number) => void;
}

export const TranslationSelector: React.FC<TranslationSelectorProps> = ({
  selectedTranslation,
  selectedVersionId,
  onSelectTranslation,
  onSelectVersion,
}) => {
  const activeId = selectedVersionId ?? resolveVersionId(selectedTranslation);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.translationRow}
      style={styles.scrollWrapper}
    >
      {SUPPORTED_BIBLE_VERSIONS.map((t) => {
        const isActive = t.id === activeId || t.shortName === selectedTranslation || t.code === selectedTranslation;
        return (
          <Pressable
            key={t.id}
            onPress={() => {
              if (onSelectVersion) {
                onSelectVersion(t.id);
              }
              onSelectTranslation(t.id as any);
            }}
            style={[
              styles.transPill,
              isActive && styles.transPillActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Select ${t.fullName}`}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollWrapper: {
    marginVertical: spacing.xs,
  },
  translationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  transPill: {
    paddingHorizontal: 12,
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radius.control,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transPillActive: {
    borderColor: colors.accent.keyIdea,
    backgroundColor: colors.bg.base,
  },
  transPillText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  transPillTextActive: {
    color: colors.accent.keyIdea,
    fontWeight: '600',
  },
});
