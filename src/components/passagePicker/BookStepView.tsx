import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { colors } from '../../constants/theme';
import { CanonicalBook } from '../../constants/bibleData';
import { styles } from './styles';

interface BookStepViewProps {
  testamentTab: 'OT' | 'NT';
  searchQuery: string;
  selectedBook: string | null;
  filteredBooks: CanonicalBook[];
  onSetTestament: (testament: 'OT' | 'NT') => void;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onSelectBook: (book: CanonicalBook) => void;
  onSubmitSearch?: () => void;
}

export const BookStepView: React.FC<BookStepViewProps> = ({
  testamentTab,
  searchQuery,
  selectedBook,
  filteredBooks,
  onSetTestament,
  onSearchChange,
  onClearSearch,
  onSelectBook,
  onSubmitSearch,
}) => {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.filterSection}>
        <View style={styles.segmentContainer}>
          <Pressable
            style={[
              styles.segmentButton,
              testamentTab === 'OT' && styles.segmentButtonActive,
            ]}
            onPress={() => onSetTestament('OT')}
          >
            <Text
              style={[
                styles.segmentText,
                testamentTab === 'OT' && styles.segmentTextActive,
              ]}
            >
              Old Testament (39)
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentButton,
              testamentTab === 'NT' && styles.segmentButtonActive,
            ]}
            onPress={() => onSetTestament('NT')}
          >
            <Text
              style={[
                styles.segmentText,
                testamentTab === 'NT' && styles.segmentTextActive,
              ]}
            >
              New Testament (27)
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Type book or passage (e.g. Gen 1:1-3, Rom 8)..."
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            autoCapitalize="sentences"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={onSubmitSearch}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={onClearSearch} style={styles.searchClearButton}>
              <Text style={styles.searchClearText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bookGrid}>
          {filteredBooks.map((book) => {
            const isSelected = book.name === selectedBook;
            return (
              <Pressable
                key={book.name}
                style={[
                  styles.bookTile,
                  isSelected && styles.bookTileSelected,
                ]}
                onPress={() => onSelectBook(book)}
              >
                <Text
                  style={[
                    styles.bookTileTitle,
                    isSelected && styles.bookTileTitleSelected,
                  ]}
                  numberOfLines={1}
                >
                  {book.name}
                </Text>
                <Text style={styles.bookTileSubtitle}>
                  {book.chapters} ch
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
