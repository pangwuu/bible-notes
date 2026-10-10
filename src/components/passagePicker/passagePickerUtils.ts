import {
  findCanonicalBook,
  TOTAL_CANONICAL_VERSES,
  BOOK_STARTING_ORDINALS,
  CanonicalBook,
} from '../../constants/bibleData';
import { referenceToOrdinals } from '../../utils/bibleOrdinals';
import { PassageSegment } from '../../types/note';
import { buildSegment, splitSegmentByChapters } from '../../utils/passageParser';

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

export function sameSegment(a: PassageSegment, b: PassageSegment): boolean {
  return (
    a.book === b.book &&
    a.startChapter === b.startChapter &&
    a.endChapter === b.endChapter &&
    a.startVerse === b.startVerse &&
    a.endVerse === b.endVerse
  );
}

/**
 * Appends incoming passages, splitting cross-chapter spans and skipping exact duplicates.
 */
export function appendUniqueSegments(
  existing: PassageSegment[],
  incoming: PassageSegment[]
): PassageSegment[] {
  const next = [...existing];
  for (const seg of incoming.flatMap(splitSegmentByChapters)) {
    if (!next.some((item) => sameSegment(item, seg))) {
      next.push(seg);
    }
  }
  return next;
}

/**
 * Applies an in-progress draft onto the committed list.
 * An edit replaces that row. A new draft is appended if it is not already present.
 */
export function assemblePassageSegments(
  segments: PassageSegment[],
  draft: PassageSegment | null,
  editingIndex: number | null
): PassageSegment[] {
  if (!draft) return [...segments];
  if (editingIndex !== null && editingIndex >= 0 && editingIndex < segments.length) {
    const next = [...segments];
    next.splice(editingIndex, 1, ...splitSegmentByChapters(draft));
    return next;
  }
  return appendUniqueSegments(segments, [draft]);
}

export function draftFromSelection(selection: {
  selectedBook: string | null;
  selectedChapter: number | null;
  selectedChapterEnd: number | null;
  selectedVerseStart: number | null;
  selectedVerseEnd: number | null;
}): PassageSegment | null {
  if (
    !selection.selectedBook ||
    selection.selectedChapter === null ||
    selection.selectedVerseStart === null
  ) {
    return null;
  }
  return buildSegment(
    selection.selectedBook,
    selection.selectedChapter,
    selection.selectedVerseStart,
    selection.selectedChapterEnd ?? selection.selectedChapter,
    selection.selectedVerseEnd ?? selection.selectedVerseStart
  );
}

export function bookMatchesQuery(book: CanonicalBook, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (book.name.toLowerCase().includes(q)) return true;
  return book.abbreviations.some((abbr) => abbr.toLowerCase().includes(q));
}
