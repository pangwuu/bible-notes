import React from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
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
  renderHeading?: boolean;
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
  renderHeading = true,
}) => {
  const isWeb = Platform.OS === 'web';

  return (
    <Text
      onLayout={onLayout}
      onPress={() => onToggle(verse.verseNumber)}
      accessibilityRole={isWeb ? undefined : 'button'}
      accessibilityState={isWeb ? undefined : { selected: isSelected }}
      accessibilityHint={
        isWeb ? undefined : 'Selects this verse to link, share or find related passages'
      }
      style={[
        styles.verseTextUnit,
        isSelected && styles.verseSelected,
        isTargetHighlighted && styles.verseTargetHighlighted,
      ]}
    >
      {renderHeading && verse.heading ? (
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
            { fontSize: Math.max(11, Math.round(fontSize * 0.65)) },
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
  // "Where you landed" uses a neutral parchment wash so it reads differently from the
  // amber, underlined "what you selected" state.
  verseTargetHighlighted: {
    backgroundColor: 'rgba(237, 231, 221, 0.16)',
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
