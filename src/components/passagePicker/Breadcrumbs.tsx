import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { PickerStep } from './passagePickerTypes';
import { styles } from './styles';

interface BreadcrumbsProps {
  step: PickerStep;
  selectedBook: string | null;
  selectedChapter: number | null;
  selectedChapterEnd: number | null;
  selectedVerseStart: number | null;
  selectedVerseEnd: number | null;
  onSetStep: (step: PickerStep) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  step,
  selectedBook,
  selectedChapter,
  selectedChapterEnd,
  selectedVerseStart,
  selectedVerseEnd,
  onSetStep,
}) => {
  const chapterText =
    selectedChapter === null
      ? 'Chapter'
      : selectedChapter === selectedChapterEnd
      ? `Ch ${selectedChapter}`
      : `Ch ${selectedChapter}–${selectedChapterEnd ?? selectedChapter}`;

  const verseText =
    selectedVerseStart === null
      ? 'Verse'
      : selectedChapter === selectedChapterEnd && selectedVerseStart === selectedVerseEnd
      ? `v. ${selectedVerseStart}`
      : selectedChapter === selectedChapterEnd
      ? `v. ${selectedVerseStart}–${selectedVerseEnd ?? selectedVerseStart}`
      : `${selectedChapter}:${selectedVerseStart}–${selectedChapterEnd ?? selectedChapter}:${selectedVerseEnd ?? selectedVerseStart}`;

  return (
    <View style={styles.breadcrumbBar}>
      <Pressable
        style={[
          styles.breadcrumbChip,
          step === 'book' && styles.breadcrumbChipActive,
        ]}
        onPress={() => onSetStep('book')}
      >
        <Text
          style={[
            styles.breadcrumbText,
            step === 'book' && styles.breadcrumbTextActive,
          ]}
        >
          {selectedBook || 'Book'}
        </Text>
      </Pressable>

      <Text style={styles.breadcrumbSeparator}>›</Text>

      <Pressable
        style={[
          styles.breadcrumbChip,
          (step === 'start_chapter' || step === 'end_chapter') && styles.breadcrumbChipActive,
        ]}
        onPress={() => {
          if (selectedBook) onSetStep('start_chapter');
        }}
      >
        <Text
          style={[
            styles.breadcrumbText,
            (step === 'start_chapter' || step === 'end_chapter') && styles.breadcrumbTextActive,
          ]}
        >
          {chapterText}
        </Text>
      </Pressable>

      <Text style={styles.breadcrumbSeparator}>›</Text>

      <Pressable
        style={[
          styles.breadcrumbChip,
          (step === 'start_verse' || step === 'end_verse') && styles.breadcrumbChipActive,
        ]}
        onPress={() => {
          if (selectedBook && selectedChapter !== null) onSetStep('start_verse');
        }}
      >
        <Text
          style={[
            styles.breadcrumbText,
            (step === 'start_verse' || step === 'end_verse') && styles.breadcrumbTextActive,
          ]}
        >
          {verseText}
        </Text>
      </Pressable>
    </View>
  );
};
