import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { styles } from './styles';

interface VerseGridStepViewProps {
  mode: 'start' | 'end';
  selectedBook: string | null;
  selectedChapter: number | null;
  selectedChapterEnd: number | null;
  totalVerses: number;
  totalBookChapters: number;
  selectedVerseStart: number | null;
  selectedVerseEnd: number | null;
  squareTileSize: number;
  onSelectVerse: (v: number) => void;
  onSelectEntireChapter?: () => void;
  onSpanMultipleChapters?: () => void;
}

export const VerseGridStepView: React.FC<VerseGridStepViewProps> = ({
  mode,
  selectedBook,
  selectedChapter,
  selectedChapterEnd,
  totalVerses,
  totalBookChapters,
  selectedVerseStart,
  selectedVerseEnd,
  squareTileSize,
  onSelectVerse,
  onSelectEntireChapter,
  onSpanMultipleChapters,
}) => {
  const versesArray = Array.from({ length: totalVerses }, (_, i) => i + 1);

  if (mode === 'start') {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.verseActionHeader}>
          <Text style={styles.stepHeaderNoticeText}>
            Select start verse for {selectedBook} {selectedChapter}
          </Text>
          {onSelectEntireChapter && (
            <Pressable
              style={styles.wholeChapterChip}
              onPress={onSelectEntireChapter}
            >
              <Text style={styles.wholeChapterChipText}>
                Entire chapter ({totalVerses} v)
              </Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.verseGrid}>
            {versesArray.map((v) => {
              const isSelected = v === selectedVerseStart;
              return (
                <Pressable
                  key={v}
                  style={[
                    styles.verseTile,
                    { width: squareTileSize, height: squareTileSize },
                    isSelected && styles.verseTileEndpoint,
                  ]}
                  onPress={() => onSelectVerse(v)}
                >
                  <Text
                    style={[
                      styles.verseTileText,
                      isSelected && styles.verseTileTextEndpoint,
                    ]}
                  >
                    {v}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.stepContainer}>
      <View style={styles.verseActionHeader}>
        <Text style={styles.stepHeaderNoticeText}>
          Select end verse for {selectedBook} {selectedChapterEnd ?? selectedChapter}
        </Text>
        {totalBookChapters > 1 && onSpanMultipleChapters && (
          <Pressable
            style={styles.wholeChapterChip}
            onPress={onSpanMultipleChapters}
          >
            <Text style={styles.wholeChapterChipText}>
              Span multiple chapters ›
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.verseGrid}>
          {versesArray.map((v) => {
            const isSameChapter = (selectedChapter ?? 1) === (selectedChapterEnd ?? selectedChapter ?? 1);
            const isDisabled = isSameChapter && selectedVerseStart !== null && v < selectedVerseStart;
            const isStart = isSameChapter && selectedVerseStart !== null && v === selectedVerseStart;
            const isEnd = selectedVerseEnd !== null && v === selectedVerseEnd;
            const isSelected = isStart || isEnd;
            const inRange =
              isSameChapter &&
              selectedVerseStart !== null &&
              selectedVerseEnd !== null &&
              v > selectedVerseStart &&
              v < selectedVerseEnd;

            return (
              <Pressable
                key={v}
                disabled={isDisabled}
                style={[
                  styles.verseTile,
                  { width: squareTileSize, height: squareTileSize },
                  isDisabled && { opacity: 0.3 },
                  inRange && styles.verseTileInRange,
                  isSelected && styles.verseTileEndpoint,
                ]}
                onPress={() => onSelectVerse(v)}
              >
                <Text
                  style={[
                    styles.verseTileText,
                    inRange && styles.verseTileTextInRange,
                    isSelected && styles.verseTileTextEndpoint,
                  ]}
                >
                  {v}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
