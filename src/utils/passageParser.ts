/**
 * passageParser.ts
 * Robust scripture reference parser and ordinal generator.
 * Supports:
 * - Single verse / single passage: "John 3:16", "Romans 8:1–11"
 * - Cross-chapter spans: "1 John 1–2", "Romans 7:21–8:4"
 * - Whole-chapter ranges: "1 John 1-2" (automatically computes chapter 1:1 through chapter 2:end)
 * - Single-book compound/split verses: "Genesis 1:1–3, 3:2–6", "Luke 1:1-4, 5-8"
 * - Multi-book compound references: "Ephesians 2:10–13, Romans 8:28", "John 3:16; Genesis 1:1"
 */

import { findCanonicalBook } from '../constants/bibleData';
import { referenceToOrdinals, getChapterVerseCount } from './bibleOrdinals';
import { PassageSegment, PassageReference } from '../types/note';

/**
 * Normalizes dashes to en-dash or standard hyphen.
 */
function cleanDashes(input: string): string {
  return input.replace(/[—–]/g, '-').trim();
}

/**
 * Formats a single segment into standard human-readable display notation (e.g. "John 3:16", "Romans 8:1–11", "1 John 1–2").
 */
export function formatSegmentDisplay(segment: PassageSegment): string {
  const { book, startChapter, startVerse, endChapter, endVerse } = segment;
  const bookMeta = findCanonicalBook(book);
  const bookName = bookMeta ? bookMeta.name : book;

  if (startChapter === endChapter) {
    const totalVerses = bookMeta ? getChapterVerseCount(bookName, startChapter) : 0;
    if (startVerse === 1 && endVerse === totalVerses && totalVerses > 0) {
      return `${bookName} ${startChapter}`;
    }
    if (startVerse === endVerse) {
      return `${bookName} ${startChapter}:${startVerse}`;
    }
    return `${bookName} ${startChapter}:${startVerse}–${endVerse}`;
  }

  // Cross chapter
  const startTotal = bookMeta ? getChapterVerseCount(bookName, startChapter) : 0;
  const endTotal = bookMeta ? getChapterVerseCount(bookName, endChapter) : 0;
  if (startVerse === 1 && endVerse === endTotal && startTotal > 0 && endTotal > 0) {
    return `${bookName} ${startChapter}–${endChapter}`;
  }

  return `${bookName} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
}

/**
 * Builds the canonical display string for an array of segments.
 * Groups segments of the same book where appropriate (e.g. "Genesis 1:1–3, 3:2–6").
 */
export function formatCompoundDisplay(segments: PassageSegment[]): string {
  if (!segments || segments.length === 0) return '';
  if (segments.length === 1) return formatSegmentDisplay(segments[0]);

  const parts: string[] = [];
  let currentBook = '';

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const bookMeta = findCanonicalBook(seg.book);
    const bookName = bookMeta ? bookMeta.name : seg.book;

    if (bookName === currentBook) {
      // Same book as previous segment: format without repeating book name
      if (seg.startChapter === seg.endChapter) {
        if (seg.startVerse === seg.endVerse) {
          parts.push(`${seg.startChapter}:${seg.startVerse}`);
        } else {
          parts.push(`${seg.startChapter}:${seg.startVerse}–${seg.endVerse}`);
        }
      } else {
        parts.push(`${seg.startChapter}:${seg.startVerse}–${seg.endChapter}:${seg.endVerse}`);
      }
    } else {
      // New book
      currentBook = bookName;
      parts.push(formatSegmentDisplay(seg));
    }
  }

  return parts.join(', ');
}

/**
 * Creates a fully validated, complete PassageReference from an array of PassageSegments.
 */
export function createPassageReference(segments: PassageSegment[]): PassageReference {
  if (!segments || segments.length === 0) {
    throw new Error('PassageReference must contain at least one segment');
  }

  const booksSet = new Set<string>();

  for (const seg of segments) {
    const meta = findCanonicalBook(seg.book);
    const canonicalName = meta ? meta.name : seg.book;
    booksSet.add(canonicalName);
  }

  const display = formatCompoundDisplay(segments);

  return {
    display,
    displayString: display,
    books: Array.from(booksSet),
    segments,
  };
}

/**
 * Builds a single PassageSegment with defensive boundary clamping.
 */
export function buildSegment(
  bookName: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): PassageSegment {
  const bookMeta = findCanonicalBook(bookName);
  if (!bookMeta) {
    throw new Error(`Unknown book: ${bookName}`);
  }

  const canonicalName = bookMeta.name;

  // Defensive clamping for chapters
  const safeStartChapter = Math.max(1, Math.min(startChapter, bookMeta.chapters));
  const safeEndChapter = Math.max(safeStartChapter, Math.min(endChapter, bookMeta.chapters));

  // Determine chapter verse bounds
  const maxStartVerses = bookMeta.versesPerChapter[safeStartChapter - 1];
  const maxEndVerses = bookMeta.versesPerChapter[safeEndChapter - 1];

  // Defensive clamping for verses
  const safeStartVerse = Math.max(1, Math.min(startVerse, maxStartVerses));
  let safeEndVerse = Math.max(1, Math.min(endVerse, maxEndVerses));

  if (safeStartChapter === safeEndChapter && safeEndVerse < safeStartVerse) {
    safeEndVerse = safeStartVerse;
  }

  return {
    book: canonicalName,
    startChapter: safeStartChapter,
    startVerse: safeStartVerse,
    endChapter: safeEndChapter,
    endVerse: safeEndVerse,
  };
}

/**
 * Parses a free-form scripture reference string into discrete PassageSegments.
 * Examples:
 * - "John 3:16"
 * - "1 John 1-2"
 * - "Romans 7:21-8:4"
 * - "Genesis 1:1-3, 3:2-6"
 * - "Ephesians 2:10-13; Romans 8:28"
 */
export function parsePassageReferenceString(raw: string): PassageSegment[] {
  if (!raw || typeof raw !== 'string') return [];
  const clean = cleanDashes(raw.trim());
  if (!clean) return [];

  // Split multi-references separated by semicolon or comma where comma precedes a new book
  // e.g. "Genesis 1:1-3, Exodus 2:1-5" or "Genesis 1:1-3, 3:2-6"
  // We tokenize by comma or semicolon
  const rawParts = clean.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
  if (rawParts.length === 0) return [];

  const segments: PassageSegment[] = [];
  let currentBook: string | null = null;
  let currentChapter: number | null = null;

  for (const part of rawParts) {
    // Try to match: [BookName] [Chapter]:[Verse]-[Chapter]:[Verse] or variants
    // Examples of `part`:
    // "Genesis 1:1-3"
    // "3:2-6" (inherits Genesis)
    // "1 John 1-2" (whole chapters)
    // "1 John 1" (whole chapter)
    // "John 3:16"
    // "8:28" (inherits previous book)
    // "Romans 7:21-8:4"

    // 1. Check if part starts with a book name
    // Regex matches leading book name, including numbered books (1 John, 2 Kings, Song of Solomon)
    const bookMatch = part.match(/^([0-9]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(.*)$/);

    let bookStr: string | null = null;
    let coordsStr = part;

    if (bookMatch) {
      const candidateBook = bookMatch[1].trim();
      const meta = findCanonicalBook(candidateBook);
      if (meta) {
        bookStr = meta.name;
        coordsStr = bookMatch[2].trim();
      }
    }

    if (bookStr) {
      currentBook = bookStr;
    }

    if (!currentBook) {
      // If we don't have a book context yet, this token is invalid
      continue;
    }

    const bookMeta = findCanonicalBook(currentBook)!;

    // 2. Parse coordsStr
    // Case A: Cross-chapter verses: "7:21-8:4"
    const crossChapterVerseMatch = coordsStr.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
    if (crossChapterVerseMatch) {
      const sCh = parseInt(crossChapterVerseMatch[1], 10);
      const sV = parseInt(crossChapterVerseMatch[2], 10);
      const eCh = parseInt(crossChapterVerseMatch[3], 10);
      const eV = parseInt(crossChapterVerseMatch[4], 10);
      currentChapter = eCh;
      segments.push(buildSegment(currentBook, sCh, sV, eCh, eV));
      continue;
    }

    // Case B: Single-chapter verses: "1:1-3" or "1:16"
    const singleChapterVerseMatch = coordsStr.match(/^(\d+):(\d+)(?:-(\d+))?$/);
    if (singleChapterVerseMatch) {
      const ch = parseInt(singleChapterVerseMatch[1], 10);
      const sV = parseInt(singleChapterVerseMatch[2], 10);
      const eV = singleChapterVerseMatch[3] ? parseInt(singleChapterVerseMatch[3], 10) : sV;
      currentChapter = ch;
      segments.push(buildSegment(currentBook, ch, sV, ch, eV));
      continue;
    }

    // Case C: Verses only under existing chapter: "2-6" or "16" (e.g. Genesis 1:1-3, 5-8)
    const verseOnlyMatch = coordsStr.match(/^(\d+)(?:-(\d+))?$/);
    if (verseOnlyMatch && currentChapter !== null && !coordsStr.includes(':')) {
      const num1 = parseInt(verseOnlyMatch[1], 10);
      const num2 = verseOnlyMatch[2] ? parseInt(verseOnlyMatch[2], 10) : num1;

      // If num1 is greater than the verses in currentChapter, it might be a chapter number
      const maxVerses = getChapterVerseCount(currentBook, currentChapter);
      if (num1 <= maxVerses) {
        segments.push(buildSegment(currentBook, currentChapter, num1, currentChapter, num2));
        continue;
      }
    }

    // Case D: Whole chapters range: "1-2" or single chapter "1"
    const chapterRangeMatch = coordsStr.match(/^(\d+)(?:-(\d+))?$/);
    if (chapterRangeMatch) {
      const sCh = parseInt(chapterRangeMatch[1], 10);
      const eCh = chapterRangeMatch[2] ? parseInt(chapterRangeMatch[2], 10) : sCh;

      if (sCh >= 1 && sCh <= bookMeta.chapters && eCh >= sCh && eCh <= bookMeta.chapters) {
        const sV = 1;
        const eV = getChapterVerseCount(currentBook, eCh);
        currentChapter = eCh;
        segments.push(buildSegment(currentBook, sCh, sV, eCh, eV));
        continue;
      }
    }
  }

  return segments;
}
