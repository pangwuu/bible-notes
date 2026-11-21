import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { CanonicalBook } from '../../constants/bibleData';
import { styles } from './styles';

interface BookAccordionViewProps {
  books: readonly CanonicalBook[];
  expandedBook: string | null;
  highlightedChapter: number | null;
  searchQuery: string;
  suggestionLabel: string | null;
  tileSize: number;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onSubmitSearch?: () => void;
  onAddSuggestion?: () => void;
  onToggleBook: (book: CanonicalBook) => void;
  onSelectChapter: (chapter: number) => void;
}

const TESTAMENT_SECTIONS: Array<{ testament: 'OT' | 'NT'; label: string }> = [
  { testament: 'OT', label: 'Old Testament' },
  { testament: 'NT', label: 'New Testament' },
];

/**
 * YouVersion-style book accordion: one canonical list, search at the top,
 * and the selected book's chapters opening inline underneath its name.
 */
export const BookAccordionView: React.FC<BookAccordionViewProps> = ({
  books,
  expandedBook,
  highlightedChapter,
  searchQuery,
  suggestionLabel,
  tileSize,
  onSearchChange,
  onClearSearch,
  onSubmitSearch,
  onAddSuggestion,
  onToggleBook,
  onSelectChapter,
}) => {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search books or type a reference"
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={onSubmitSearch}
            accessibilityLabel="Search books or passages"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={onClearSearch}
              style={styles.searchClearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.searchClearText}>Clear</Text>
            </Pressable>
          )}
        </View>
        {suggestionLabel && onAddSuggestion && (
          <View style={styles.suggestionBar}>
            <Text style={styles.suggestionLabel} numberOfLines={2}>
              {suggestionLabel}
            </Text>
            <Pressable
              style={styles.suggestionAdd}
              onPress={onAddSuggestion}
              accessibilityRole="button"
              accessibilityLabel={`Add ${suggestionLabel}`}
            >
              <Text style={styles.suggestionAddText}>Add</Text>
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.bookListContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {books.length === 0 && (
          <View style={styles.emptyFilter}>
            <Text style={styles.emptyFilterText}>No books match that search.</Text>
          </View>
        )}

        {TESTAMENT_SECTIONS.map((section) => {
          const sectionBooks = books.filter((book) => book.testament === section.testament);
          if (sectionBooks.length === 0) return null;
          return (
            <View key={section.testament}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {sectionBooks.map((book) => {
                const isExpanded = book.name === expandedBook && book.chapters > 1;
                const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
                return (
                  <View key={book.name}>
                    <Pressable
                      testID={`book-row-${book.name}`}
                      style={({ pressed }) => [
                        styles.bookRow,
                        isExpanded && styles.bookRowExpanded,
                        pressed && styles.bookRowPressed,
                      ]}
                      onPress={() => onToggleBook(book)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      accessibilityLabel={book.name}
                    >
                      <Text
                        style={[
                          styles.bookRowTitle,
                          isExpanded && styles.bookRowTitleExpanded,
                        ]}
                      >
                        {book.name}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={18}
                        color={isExpanded ? colors.accentKeyIdea : colors.textSecondary}
                        style={styles.disclosure}
                      />
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.chapterWell}>
                        <View style={styles.chapterGrid}>
                          {chapters.map((chapter) => {
                            const isSelected = chapter === highlightedChapter;
                            return (
                              <Pressable
                                key={chapter}
                                accessibilityRole="button"
                                accessibilityLabel={`${book.name} chapter ${chapter}`}
                                style={[
                                  styles.chapterTile,
                                  { width: tileSize, height: tileSize },
                                  isSelected && styles.chapterTileSelected,
                                ]}
                                onPress={() => onSelectChapter(chapter)}
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
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
