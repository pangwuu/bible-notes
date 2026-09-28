import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BibleTranslation } from '../../types/user';
import { SUPPORTED_TRANSLATIONS } from '../../services/bibleService';
import { colors, spacing, radius } from '../../constants/theme';

interface TranslationSelectorProps {
  selectedTranslation: BibleTranslation;
  onSelectTranslation: (translation: BibleTranslation) => void;
}

export const TranslationSelector: React.FC<TranslationSelectorProps> = ({
  selectedTranslation,
  onSelectTranslation,
}) => {
  return (
    <View style={styles.translationRow}>
      {SUPPORTED_TRANSLATIONS.map((t) => {
        const isActive = t.id === selectedTranslation;
        return (
          <Pressable
            key={t.id}
            onPress={() => onSelectTranslation(t.id)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  translationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    gap: spacing.xs,
  },
  transPill: {
    flex: 1,
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
