import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { styles } from './styles';

interface VerseRangeViewProps {
  mode: 'verses' | 'end-chapter';
  bookName: string;
  startChapter: number;
  endChapter: number;
  startVerse: number | null;
  endVerse: number | null;
  verseAnchor: number | null;
  totalVerses: number;
  totalChapters: number;
  tileSize: number;
  onSelectVerse: (verse: number) => void;
  onSelectEndChapter: (chapter: number) => void;
  onEntireChapter?: () => void;
  onAnotherChapter?: () => void;
  onStayInChapter?: () => void;
}

export const VerseRangeView: React.FC<VerseRangeViewProps> = ({
  mode,
  bookName,
  startChapter,
  endChapter,
  startVerse,
  endVerse,
  verseAnchor,
  totalVerses,
  totalChapters,
  tileSize,
  onSelectVerse,
  onSelectEndChapter,
  onEntireChapter,
  onAnotherChapter,
  onStayInChapter,
}) => {
  const sameChapter = startChapter === endChapter;
  const verses = Array.from({ length: totalVerses }, (_, i) => i + 1);
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

  const instruction = (() => {
    if (mode === 'end-chapter') {
      return `Choose the last chapter. The passage starts in chapter ${startChapter}.`;
    }
    if (!sameChapter) {
      return `Tap the last verse in chapter ${endChapter}.`;
    }
    if (verseAnchor !== null) {
      return 'Tap the last verse. Tap the same verse again for just that one.';
    }
    if (startVerse !== null && endVerse !== null && startVerse !== endVerse) {
      return 'Range selected. Tap a verse to start a different range.';
    }
    if (startVerse !== null) {
      return 'One verse selected. Tap another verse to extend the range.';
    }
    return 'Tap the first verse.';
  })();

  return (
    <View style={styles.stepContainer}>
      <View style={styles.verseActionHeader}>
        {mode === 'verses' && onEntireChapter && (
          <Pressable
            style={styles.wholeChapterChip}
            onPress={onEntireChapter}
            accessibilityRole="button"
            accessibilityLabel="Entire chapter"
          >
            <Text style={styles.wholeChapterChipText}>Entire chapter</Text>
          </Pressable>
        )}
        {mode === 'verses' && onAnotherChapter && (
          <Pressable
            style={styles.wholeChapterChip}
            onPress={onAnotherChapter}
            accessibilityRole="button"
            accessibilityLabel="Another chapter"
          >
            <Text style={styles.wholeChapterChipText}>Another chapter</Text>
          </Pressable>
        )}
        {mode === 'end-chapter' && onStayInChapter && (
          <Pressable
            style={styles.wholeChapterChip}
            onPress={onStayInChapter}
            accessibilityRole="button"
            accessibilityLabel="This chapter"
          >
            <Text style={styles.wholeChapterChipText}>This chapter</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.verseHint}>{instruction}</Text>

      <ScrollView
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'end-chapter' ? (
          <View style={styles.chapterGrid}>
            {chapters.map((chapter) => {
              const isDisabled = chapter < startChapter;
              const isSelected = chapter === endChapter;
              return (
                <Pressable
                  key={chapter}
                  disabled={isDisabled}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                  accessibilityLabel={`${bookName} chapter ${chapter}`}
                  style={[
                    styles.chapterTile,
                    { width: tileSize, height: tileSize },
                    isDisabled && { opacity: 0.35 },
                    isSelected && styles.chapterTileSelected,
                  ]}
                  onPress={() => onSelectEndChapter(chapter)}
                >
                  <Text
                    style={[
                      styles.chapterTileText,
                      isSelected && styles.chapterTileTextSelected,
                    ]}
                  >
                    {chapter}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.verseGrid}>
            {verses.map((verse) => {
              const isCross = !sameChapter;
              const isEndpoint = isCross
                ? endVerse !== null && verse === endVerse
                : (startVerse !== null && verse === startVerse) ||
                  (endVerse !== null && verse === endVerse);
              const inRange = isCross
                ? endVerse !== null && verse < endVerse
                : startVerse !== null &&
                  endVerse !== null &&
                  verse > startVerse &&
                  verse < endVerse;

              return (
                <Pressable
                  key={verse}
                  accessibilityRole="button"
                  accessibilityLabel={`Verse ${verse}`}
                  style={[
                    styles.verseTile,
                    { width: tileSize, height: tileSize },
                    inRange && styles.verseTileInRange,
                    isEndpoint && styles.verseTileEndpoint,
                  ]}
                  onPress={() => onSelectVerse(verse)}
                >
                  <Text
                    style={[
                      styles.verseTileText,
                      inRange && styles.verseTileTextInRange,
                      isEndpoint && styles.verseTileTextEndpoint,
                    ]}
                  >
                    {verse}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
