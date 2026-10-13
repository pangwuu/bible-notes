/**
 * Chapter-to-chapter movement across the Protestant canon.
 * Genesis 1 has no previous stop; Revelation 22 has no next stop.
 * The last chapter of a book continues into chapter 1 of the next book.
 */

import { CANONICAL_BOOKS, findCanonicalBook } from '../constants/bibleData';

export interface ChapterStop {
  book: string;
  chapter: number;
}

export function adjacentChapter(
  book: string,
  chapter: number,
  direction: 'previous' | 'next'
): ChapterStop | null {
  const meta = findCanonicalBook(book);
  if (!meta || !Number.isInteger(chapter) || chapter < 1 || chapter > meta.chapters) {
    return null;
  }

  const index = CANONICAL_BOOKS.findIndex((entry) => entry.name === meta.name);
  if (index < 0) return null;

  if (direction === 'next') {
    if (chapter < meta.chapters) {
      return { book: meta.name, chapter: chapter + 1 };
    }
    const nextBook = CANONICAL_BOOKS[index + 1];
    return nextBook ? { book: nextBook.name, chapter: 1 } : null;
  }

  if (chapter > 1) {
    return { book: meta.name, chapter: chapter - 1 };
  }
  const previousBook = CANONICAL_BOOKS[index - 1];
  return previousBook
    ? { book: previousBook.name, chapter: previousBook.chapters }
    : null;
}
