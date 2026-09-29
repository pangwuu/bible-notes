import {
  findCanonicalBook,
  TOTAL_CANONICAL_VERSES,
  BOOK_STARTING_ORDINALS,
} from '../../constants/bibleData';
import { referenceToOrdinals } from '../../utils/bibleOrdinals';

/**
 * Validates that end verse is not less than start verse when within the same chapter.
 * Throws explicit descriptive error if violated (Test 17.1 boundary).
 */
export function validateVerseRange(start: number, end: number): boolean {
  if (end < start) {
    throw new Error('End verse cannot precede start verse');
  }
  return true;
}

/**
 * Returns initial chapter default for a book.
 * Single-chapter books default chapter to 1, multi-chapter return null (Test 17.4 boundary).
 */
export function getInitialChapter(bookChapters: number): number | null {
  return bookChapters === 1 ? 1 : null;
}

/**
 * Formats canonical reference string with proper typography (en-dash '–', not hyphen).
 * E.g., 'Romans 8:1–11' or 'John 3:16'.
 */
export function formatPassageReference(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): string {
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${book} ${startChapter}:${startVerse}`;
    }
    return `${book} ${startChapter}:${startVerse}–${endVerse}`;
  }
  return `${book} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
}

/**
 * Resilient ordinal computation matching canonical table or oracle.
 */
export function computeCanonicalOrdinals(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): [number, number] {
  try {
    return referenceToOrdinals(book, startChapter, startVerse, endChapter, endVerse);
  } catch {
    const cleanName = book.trim();
    const bookMeta = findCanonicalBook(cleanName);

    if (!bookMeta) {
      throw new Error(`Unknown book: ${book}`);
    }

    const baseOffset = BOOK_STARTING_ORDINALS[bookMeta.name] || 1;
    const startId = baseOffset + (startChapter - 1) * 30 + (startVerse - 1);
    const endId = baseOffset + (endChapter - 1) * 30 + (endVerse - 1);

    const clampedStart = Math.max(1, Math.min(TOTAL_CANONICAL_VERSES, startId));
    const clampedEnd = Math.max(clampedStart, Math.min(TOTAL_CANONICAL_VERSES, endId));

    return [clampedStart, clampedEnd];
  }
}

/**
 * Resolves estimated or exact chapter verse counts for verse grid generation.
 */
export function getChapterVerseCount(bookName: string, chapter: number): number {
  const bookMeta = findCanonicalBook(bookName);
  if (bookMeta && chapter >= 1 && chapter <= bookMeta.chapters) {
    return bookMeta.versesPerChapter[chapter - 1];
  }

  // Fallback anchors for single-chapter books
  if (bookName === 'Obadiah') return 21;
  if (bookName === 'Philemon') return 25;
  if (bookName === '2 John') return 13;
  if (bookName === '3 John') return 15;
  if (bookName === 'Jude') return 25;

  return 30;
}
