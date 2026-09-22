/**
 * Bible Ordinal Conversion and Range Overlap Math
 * Authoritative source: ORIGINAL_REQUEST.md (R3), specs.md (§5.1, §5.6), PROJECT.md
 */

import {
  CANONICAL_BOOKS,
  findCanonicalBook,
  TOTAL_CANONICAL_VERSES,
  CanonicalBook,
} from '../constants/bibleData';

export interface ScriptureReference {
  book: string;
  chapter: number;
  verse: number;
}

export interface RangeOverlapResult {
  overlaps: boolean;
  overlapRange?: [number, number];
}

/**
 * Maps a passage reference across book, chapter, and verse ranges to a 1D ordinal pair [start, end].
 * Genesis 1:1 = Ordinal 1; Revelation 22:21 = Ordinal 31,102.
 */
export function referenceToOrdinals(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): [number, number] {
  const bookMeta = findCanonicalBook(book);
  if (!bookMeta) {
    throw new Error(`Unknown book: ${book}`);
  }

  if (startChapter < 1 || startChapter > bookMeta.chapters) {
    throw new Error(`Invalid start chapter ${startChapter} for ${bookMeta.name}`);
  }
  if (endChapter < startChapter || endChapter > bookMeta.chapters) {
    throw new Error(`Invalid end chapter ${endChapter} for ${bookMeta.name}`);
  }
  if (startVerse < 1 || endVerse < 1) {
    throw new Error(`Invalid verse boundaries [${startVerse}, ${endVerse}]`);
  }
  if (startChapter === endChapter && endVerse < startVerse) {
    throw new Error(`End verse ${endVerse} cannot be less than start verse ${startVerse}`);
  }

  const maxStartVerses = bookMeta.versesPerChapter[startChapter - 1];
  const maxEndVerses = bookMeta.versesPerChapter[endChapter - 1];
  if (startVerse > maxStartVerses || endVerse > maxEndVerses) {
    throw new Error(`Invalid verse boundaries [${startVerse}, ${endVerse}]`);
  }

  const startId = bookMeta.startOrdinal + bookMeta.chapterOffsets[startChapter - 1] + (startVerse - 1);
  const endId = bookMeta.startOrdinal + bookMeta.chapterOffsets[endChapter - 1] + (endVerse - 1);

  if (startId < 1 || endId > TOTAL_CANONICAL_VERSES || startId > endId) {
    throw new Error(`Computed invalid ordinal range [${startId}, ${endId}]`);
  }

  return [startId, endId];
}

/**
 * Maps a 1D continuous integer ordinal [1, 31,102] back to its canonical scripture reference.
 * Uses O(log N) binary search across books and chapters.
 */
export function ordinalToReference(ordinal: number): ScriptureReference {
  if (
    typeof ordinal !== 'number' ||
    !Number.isInteger(ordinal) ||
    ordinal < 1 ||
    ordinal > TOTAL_CANONICAL_VERSES
  ) {
    throw new Error(`Ordinal ${ordinal} is out of bounds [1, ${TOTAL_CANONICAL_VERSES}]`);
  }

  // 1. Binary search to locate book
  let low = 0;
  let high = CANONICAL_BOOKS.length - 1;
  let bookMeta: CanonicalBook | null = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = CANONICAL_BOOKS[mid];
    if (ordinal < candidate.startOrdinal) {
      high = mid - 1;
    } else if (ordinal > candidate.endOrdinal) {
      low = mid + 1;
    } else {
      bookMeta = candidate;
      break;
    }
  }

  if (!bookMeta) {
    throw new Error(`Could not locate book for ordinal ${ordinal}`);
  }

  // 2. Binary search to locate chapter within book
  const verseInBook = ordinal - bookMeta.startOrdinal; // 0-based
  let cLow = 0;
  let cHigh = bookMeta.chapters - 1;
  let chapterIndex = 0;

  while (cLow <= cHigh) {
    const mid = Math.floor((cLow + cHigh) / 2);
    const chStart = bookMeta.chapterOffsets[mid];
    const chEnd = bookMeta.chapterOffsets[mid + 1];

    if (verseInBook < chStart) {
      cHigh = mid - 1;
    } else if (verseInBook >= chEnd) {
      cLow = mid + 1;
    } else {
      chapterIndex = mid;
      break;
    }
  }

  const verse = verseInBook - bookMeta.chapterOffsets[chapterIndex] + 1;

  return {
    book: bookMeta.name,
    chapter: chapterIndex + 1,
    verse,
  };
}

/**
 * Closed-interval overlap calculation: max(s1, s2) <= min(e1, e2)
 */
export function checkRangeOverlap(
  rangeA: [number, number],
  rangeB: [number, number]
): RangeOverlapResult {
  if (!Array.isArray(rangeA) || rangeA.length !== 2 || !Array.isArray(rangeB) || rangeB.length !== 2) {
    throw new Error('Invalid range format: ranges must be [start, end] tuples');
  }

  const [s1, e1] = rangeA;
  const [s2, e2] = rangeB;

  if (typeof s1 !== 'number' || typeof e1 !== 'number' || typeof s2 !== 'number' || typeof e2 !== 'number') {
    throw new Error('Invalid range format: range boundaries must be numbers');
  }

  if (s1 > e1 || s2 > e2) {
    throw new Error(`Invalid range format: [${s1}, ${e1}] or [${s2}, ${e2}]`);
  }

  const overlapStart = Math.max(s1, s2);
  const overlapEnd = Math.min(e1, e2);

  if (overlapStart <= overlapEnd) {
    return {
      overlaps: true,
      overlapRange: [overlapStart, overlapEnd],
    };
  }

  return { overlaps: false };
}

/**
 * Returns total verses in a given book's chapter.
 */
export function getChapterVerseCount(book: string, chapter: number): number {
  const bookMeta = findCanonicalBook(book);
  if (!bookMeta) {
    throw new Error(`Unknown book: ${book}`);
  }
  if (chapter < 1 || chapter > bookMeta.chapters) {
    throw new Error(`Invalid chapter ${chapter} for ${bookMeta.name}`);
  }
  return bookMeta.versesPerChapter[chapter - 1];
}

/**
 * Returns metadata for a book by name or abbreviation.
 */
export function getBookMetadata(book: string): CanonicalBook | undefined {
  return findCanonicalBook(book);
}

/**
 * Validates whether an integer is within canonical ordinal bounds [1, 31102].
 */
export function isValidOrdinal(ordinal: number): boolean {
  return typeof ordinal === 'number' && Number.isInteger(ordinal) && ordinal >= 1 && ordinal <= TOTAL_CANONICAL_VERSES;
}

/**
 * Formats canonical reference summary string (e.g. "Romans 8:1–11" or "John 3:16").
 */
export function formatPassageSummary(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): string {
  const meta = findCanonicalBook(book);
  const bookName = meta ? meta.name : book;
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${bookName} ${startChapter}:${startVerse}`;
    }
    return `${bookName} ${startChapter}:${startVerse}–${endVerse}`;
  }
  return `${bookName} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
}
