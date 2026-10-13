import { adjacentChapter } from '../../src/utils/bibleNavigation';

describe('adjacentChapter', () => {
  test('steps within a book', () => {
    expect(adjacentChapter('John', 3, 'next')).toEqual({ book: 'John', chapter: 4 });
    expect(adjacentChapter('John', 3, 'previous')).toEqual({ book: 'John', chapter: 2 });
  });

  test('crosses from the last chapter of a book into the next book', () => {
    expect(adjacentChapter('Genesis', 50, 'next')).toEqual({ book: 'Exodus', chapter: 1 });
    expect(adjacentChapter('Malachi', 4, 'next')).toEqual({ book: 'Matthew', chapter: 1 });
  });

  test('crosses from chapter 1 back to the previous book’s last chapter', () => {
    expect(adjacentChapter('Exodus', 1, 'previous')).toEqual({ book: 'Genesis', chapter: 50 });
    expect(adjacentChapter('Matthew', 1, 'previous')).toEqual({ book: 'Malachi', chapter: 4 });
  });

  test('treats a one-chapter book as a single stop between its neighbors', () => {
    expect(adjacentChapter('Amos', 9, 'next')).toEqual({ book: 'Obadiah', chapter: 1 });
    expect(adjacentChapter('Obadiah', 1, 'next')).toEqual({ book: 'Jonah', chapter: 1 });
    expect(adjacentChapter('Obadiah', 1, 'previous')).toEqual({ book: 'Amos', chapter: 9 });
  });

  test('stops at the ends of the canon', () => {
    expect(adjacentChapter('Genesis', 1, 'previous')).toBeNull();
    expect(adjacentChapter('Revelation', 22, 'next')).toBeNull();
  });

  test('rejects unknown books and chapters outside the book', () => {
    expect(adjacentChapter('Not A Book', 1, 'next')).toBeNull();
    expect(adjacentChapter('John', 0, 'next')).toBeNull();
    expect(adjacentChapter('John', 22, 'next')).toBeNull();
  });
});
