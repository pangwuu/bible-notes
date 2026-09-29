import { findCanonicalBook, CANONICAL_BOOKS } from '../../src/constants/bibleData';

describe('Canonical Book Sorting', () => {
  const getBookIndex = (bookName: string): number => {
    const book = findCanonicalBook(bookName);
    if (!book) return 999;
    const idx = CANONICAL_BOOKS.findIndex((b) => b.name === book.name);
    return idx >= 0 ? idx : 999;
  };

  const sortBooks = (books: string[]): string[] => {
    return [...books].sort((bookA, bookB) => {
      const idxA = getBookIndex(bookA);
      const idxB = getBookIndex(bookB);
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      return bookA.localeCompare(bookB);
    });
  };

  it('sorts biblical books in canonical order rather than alphabetical order', () => {
    // Alphabetical order would put 1 Corinthians first, then Acts, then Genesis, etc.
    const input = ['Romans', 'Genesis', '1 Corinthians', 'Exodus', 'Revelation', 'Psalms'];
    const sorted = sortBooks(input);

    expect(sorted).toEqual([
      'Genesis',
      'Exodus',
      'Psalms',
      'Romans',
      '1 Corinthians',
      'Revelation',
    ]);
  });

  it('places unknown or non-canonical books at the end alphabetically', () => {
    const input = ['Z-Topic', 'Genesis', 'A-Other', 'John'];
    const sorted = sortBooks(input);

    expect(sorted).toEqual([
      'Genesis',
      'John',
      'A-Other',
      'Z-Topic',
    ]);
  });

  it('handles abbreviations correctly through findCanonicalBook', () => {
    const input = ['Matt', 'Gen', 'Rev', 'Rom'];
    const sorted = sortBooks(input);

    expect(sorted).toEqual(['Gen', 'Matt', 'Rom', 'Rev']);
  });
});
