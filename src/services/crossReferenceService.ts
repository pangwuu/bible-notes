/**
 * Lookup helpers for OpenBible.info verse cross-references.
 * Data is bundled under src/assets/crossrefs (CC BY 4.0).
 */

import { CANONICAL_BOOKS, findCanonicalBook } from '../constants/bibleData';
import {
  CROSSREF_ATTRIBUTION,
  CrossRefTuple,
  loadCrossRefBook,
} from '../assets/crossrefs';

export { CROSSREF_ATTRIBUTION };

export interface CrossReferenceTarget {
  book: string;
  bookIndex: number;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  votes: number;
  /** Display label e.g. "Romans 5:8" or "John 1:1–3" */
  display: string;
}

export interface CrossReferenceQuery {
  book: string;
  chapter: number;
  verse: number;
}

const bookCache = new Map<number, ReturnType<typeof loadCrossRefBook>>();

function getBookData(bookIndex: number) {
  if (bookCache.has(bookIndex)) {
    return bookCache.get(bookIndex) ?? null;
  }
  const data = loadCrossRefBook(bookIndex);
  bookCache.set(bookIndex, data);
  return data;
}

function resolveBookIndex(book: string): number {
  const canonical = findCanonicalBook(book);
  if (!canonical) return -1;
  return CANONICAL_BOOKS.findIndex((b) => b.name === canonical.name);
}

function formatTargetDisplay(tuple: CrossRefTuple): string {
  const [bookIndex, startChapter, startVerse, endChapter, endVerse] = tuple;
  const bookName = CANONICAL_BOOKS[bookIndex]?.name || `Book ${bookIndex}`;
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${bookName} ${startChapter}:${startVerse}`;
    }
    return `${bookName} ${startChapter}:${startVerse}–${endVerse}`;
  }
  return `${bookName} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
}

function tupleToTarget(tuple: CrossRefTuple): CrossReferenceTarget {
  const [bookIndex, startChapter, startVerse, endChapter, endVerse, votes] = tuple;
  return {
    book: CANONICAL_BOOKS[bookIndex]?.name || `Book ${bookIndex}`,
    bookIndex,
    startChapter,
    startVerse,
    endChapter,
    endVerse,
    votes,
    display: formatTargetDisplay(tuple),
  };
}

/**
 * Returns whether bundled cross-reference data exists for a verse.
 */
export function hasCrossReferences(query: CrossReferenceQuery): boolean {
  return getCrossReferences(query).length > 0;
}

/**
 * Returns ranked cross-reference targets for a single verse.
 * Empty when the verse has no entries in the bundled dataset.
 */
export function getCrossReferences(query: CrossReferenceQuery): CrossReferenceTarget[] {
  if (!query?.book || !query.chapter || !query.verse) return [];
  const bookIndex = resolveBookIndex(query.book);
  if (bookIndex < 0) return [];

  const data = getBookData(bookIndex);
  if (!data) return [];

  const chapter = data[String(query.chapter)];
  if (!chapter) return [];

  const tuples = chapter[String(query.verse)];
  if (!Array.isArray(tuples) || tuples.length === 0) return [];

  return tuples.map(tupleToTarget);
}

/**
 * Union of cross-references for multiple verses in the same book/chapter,
 * de-duplicated by target display key and sorted by votes descending.
 */
export function getCrossReferencesForVerses(
  book: string,
  chapter: number,
  verses: number[]
): CrossReferenceTarget[] {
  if (!book || !chapter || !verses?.length) return [];
  const byKey = new Map<string, CrossReferenceTarget>();

  for (const verse of verses) {
    for (const ref of getCrossReferences({ book, chapter, verse })) {
      const key = `${ref.bookIndex}:${ref.startChapter}:${ref.startVerse}:${ref.endChapter}:${ref.endVerse}`;
      const existing = byKey.get(key);
      if (!existing || ref.votes > existing.votes) {
        byKey.set(key, ref);
      }
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.votes - a.votes);
}

/**
 * Builds a verse list covering the target plus `pad` verses of nearby context
 * within the start/end chapters (single-chapter pad for simplicity).
 */
export function buildNearbyVerseRange(
  target: CrossReferenceTarget,
  pad = 2
): {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
} {
  if (target.startChapter !== target.endChapter) {
    return {
      book: target.book,
      startChapter: target.startChapter,
      startVerse: target.startVerse,
      endChapter: target.endChapter,
      endVerse: target.endVerse,
    };
  }

  const book = CANONICAL_BOOKS[target.bookIndex];
  const maxVerse =
    book?.versesPerChapter?.[target.startChapter - 1] ?? target.endVerse + pad;

  return {
    book: target.book,
    startChapter: target.startChapter,
    startVerse: Math.max(1, target.startVerse - pad),
    endChapter: target.endChapter,
    endVerse: Math.min(maxVerse, target.endVerse + pad),
  };
}

/**
 * Passage query string suitable for fetchPassageText / formatPassageQuery consumers.
 */
export function formatCrossRefPassageQuery(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): string {
  if (startChapter === endChapter) {
    if (startVerse === endVerse) return `${book} ${startChapter}:${startVerse}`;
    return `${book} ${startChapter}:${startVerse}-${endVerse}`;
  }
  return `${book} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
}
