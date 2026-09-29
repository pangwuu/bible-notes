import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { styles } from './styles';

interface ChapterGridStepViewProps {
  mode: 'start' | 'end';
  selectedBook: string | null;
  totalChapters: number;
  selectedChapter: number | null;
  selectedChapterEnd: number | null;
  squareTileSize: number;
  onSelectChapter: (ch: number) => void;
  onSelectSameChapter?: (ch: number) => void;
}

export const ChapterGridStepView: React.FC<ChapterGridStepViewProps> = ({
  mode,
  selectedBook,
  totalChapters,
  selectedChapter,
  selectedChapterEnd,
  squareTileSize,
  onSelectChapter,
  onSelectSameChapter,
}) => {
  const chaptersArray = Array.from({ length: totalChapters }, (_, i) => i + 1);
  const startCh = selectedChapter ?? 1;
  const endCh = selectedChapterEnd ?? startCh;

  if (mode === 'start') {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeaderNotice}>
          <Text style={styles.stepHeaderNoticeText}>
            Select start chapter for {selectedBook}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chapterGrid}>
            {chaptersArray.map((ch) => {
              const isSelected = ch === selectedChapter;
              return (
                <Pressable
                  key={ch}
                  style={[
                    styles.chapterTile,
                    { width: squareTileSize, height: squareTileSize },
                    isSelected && styles.chapterTileSelected,
                  ]}
                  onPress={() => onSelectChapter(ch)}
                >
                  <Text
                    style={[
                      styles.chapterTileText,
                      isSelected && styles.chapterTileTextSelected,
                    ]}
                  >
                    {ch}
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
          Select end chapter (starts at ch. {startCh})
        </Text>
        {onSelectSameChapter && (
          <Pressable
            style={styles.wholeChapterChip}
            onPress={() => onSelectSameChapter(startCh)}
          >
            <Text style={styles.wholeChapterChipText}>
              Same chapter ({startCh})
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chapterGrid}>
          {chaptersArray.map((ch) => {
            const isDisabled = ch < startCh;
            const isSelected = ch === endCh;
            const inRange = ch >= startCh && ch <= endCh;

            return (
              <Pressable
                key={ch}
                disabled={isDisabled}
                style={[
                  styles.chapterTile,
                  { width: squareTileSize, height: squareTileSize },
                  isDisabled && { opacity: 0.3 },
                  inRange && styles.chapterTileInRange,
                  isSelected && styles.chapterTileSelected,
                ]}
                onPress={() => onSelectChapter(ch)}
              >
                <Text
                  style={[
                    styles.chapterTileText,
                    inRange && styles.chapterTileTextInRange,
                    isSelected && styles.chapterTileTextSelected,
                  ]}
                >
                  {ch}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
