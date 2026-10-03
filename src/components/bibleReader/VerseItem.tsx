import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { VerseSegment } from '../../services/bibleService';
import { LinkedSectionInfo } from '../../utils/verseLinkUtils';
import { colors, typography } from '../../constants/theme';

interface VerseItemProps {
  verse: VerseSegment;
  isSelected: boolean;
  isTargetHighlighted: boolean;
  linkedSection?: LinkedSectionInfo | null;
  showVerseNumbers: boolean;
  fontSize: number;
  onToggle: (verseNumber: number) => void;
  onLayout?: (e: any) => void;
}

const VerseItemComponent: React.FC<VerseItemProps> = ({
  verse,
  isSelected,
  isTargetHighlighted,
  linkedSection,
  showVerseNumbers,
  fontSize,
  onToggle,
  onLayout,
}) => {
  return (
    <Text
      onLayout={onLayout}
      onPress={() => onToggle(verse.verseNumber)}
      style={[
        styles.verseTextUnit,
        isSelected && styles.verseSelected,
        isTargetHighlighted && styles.verseTargetHighlighted,
      ]}
    >
      {verse.heading ? (
        <Text
          style={[
            styles.verseHeading,
            { fontSize: fontSize + 1, lineHeight: Math.round((fontSize + 1) * 1.4) },
          ]}
        >
          {'\n'}{verse.heading}{'\n'}
        </Text>
      ) : null}
      {showVerseNumbers && (
        <Text
          style={[
            styles.verseNumberText,
            linkedSection
              ? { color: linkedSection.sectionColor || colors.accent.keyIdea, fontWeight: '700' }
              : null,
          ]}
        >
          {verse.verseNumber}
          {linkedSection ? '*' : ''}{' '}
        </Text>
      )}
      <Text
        style={[
          styles.verseContentText,
          {
            fontSize,
            lineHeight: Math.round(fontSize * 1.5),
          },
        ]}
      >
        {verse.text}{' '}
      </Text>
    </Text>
  );
};

const styles = StyleSheet.create({
  verseTextUnit: {
    borderRadius: 3,
  },
  verseSelected: {
    backgroundColor: 'rgba(227, 165, 61, 0.22)',
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent.keyIdea,
  },
  verseTargetHighlighted: {
    backgroundColor: 'rgba(227, 165, 61, 0.45)',
  },
  verseHeading: {
    fontFamily: typography.body.fontFamily,
    fontWeight: '700',
    color: colors.text.primary,
  },
  verseNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent.keyIdea,
  },
  verseContentText: {
    fontFamily: typography.body.fontFamily,
    color: colors.text.primary,
  },
});

export const VerseItem = React.memo(VerseItemComponent);
