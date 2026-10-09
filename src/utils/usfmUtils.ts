/**
 * USFM Reference Utilities.
 * Translates application passage references and query strings into canonical
 * USFM passage identifiers for the YouVersion Platform API (e.g., JHN.3.16, PSA.23.1-6, GEN.1).
 */

import { findCanonicalBook, CANONICAL_BOOKS } from '../constants/bibleData';
import { FIRESTORE_BOOK_ABBREVIATIONS } from '../services/firestoreBibleService';
import { PassageSegment } from '../types/note';

/**
 * Resolves a book name, alias, or abbreviation into its 3-character uppercase USFM code.
 * e.g., "John" maps to "JHN", "1 Cor" to "1CO", "Genesis" to "GEN"
 */
export function getUsfmBookCode(bookName: string): string {
  if (!bookName) return 'JHN';
  const canonical = findCanonicalBook(bookName);
  if (!canonical) {
    return bookName.trim().slice(0, 3).toUpperCase();
  }

  const index = CANONICAL_BOOKS.findIndex((b) => b.name === canonical.name);
  if (index >= 0 && index < FIRESTORE_BOOK_ABBREVIATIONS.length) {
    return FIRESTORE_BOOK_ABBREVIATIONS[index];
  }

  return canonical.name.slice(0, 3).toUpperCase();
}

/**
 * Formats a single PassageSegment into a canonical USFM reference.
 */
export function formatSegmentToUsfm(segment: PassageSegment): string {
  const bookCode = getUsfmBookCode(segment.book);

  if (segment.startChapter === segment.endChapter) {
    // If it spans all verses or start/end are not valid verse bounds
    if (segment.startVerse <= 1 && segment.endVerse >= 50) {
      // Check if whole chapter
      const canonical = findCanonicalBook(segment.book);
      const totalVerses = canonical?.versesPerChapter?.[segment.startChapter - 1];
      if (totalVerses && segment.endVerse >= totalVerses) {
        return `${bookCode}.${segment.startChapter}`;
      }
    }

    if (segment.startVerse === segment.endVerse) {
      return `${bookCode}.${segment.startChapter}.${segment.startVerse}`;
    }
    return `${bookCode}.${segment.startChapter}.${segment.startVerse}-${segment.endVerse}`;
  }

  // Cross-chapter range: e.g. GEN.1.1-GEN.2.3
  return `${bookCode}.${segment.startChapter}.${segment.startVerse}-${bookCode}.${segment.endChapter}.${segment.endVerse}`;
}

/**
 * Converts a raw query string (e.g. "John 3:16", "Romans 8:1-8", "Luke 12")
 * into a canonical USFM passage identifier.
 */
export function queryToUsfm(query: string): string {
  const clean = query.trim().replace(/[—–]/g, '-');

  // Match Book Chapter:Verse-Verse e.g. "John 3:16-18" or "1 John 1:9"
  const verseRangeMatch = clean.match(/^([0-9]?\s*[A-Za-z]+)\s+([0-9]+):([0-9]+)(?:-([0-9]+))?$/);
  if (verseRangeMatch) {
    const book = verseRangeMatch[1].trim();
    const chapter = parseInt(verseRangeMatch[2], 10);
    const startVerse = parseInt(verseRangeMatch[3], 10);
    const endVerse = verseRangeMatch[4] ? parseInt(verseRangeMatch[4], 10) : startVerse;
    const bookCode = getUsfmBookCode(book);

    if (startVerse === endVerse) {
      return `${bookCode}.${chapter}.${startVerse}`;
    }
    return `${bookCode}.${chapter}.${startVerse}-${endVerse}`;
  }

  // Match Book Chapter:Verse-Chapter:Verse e.g. "John 3:16-4:2"
  const crossChapterMatch = clean.match(/^([0-9]?\s*[A-Za-z]+)\s+([0-9]+):([0-9]+)-([0-9]+):([0-9]+)$/);
  if (crossChapterMatch) {
    const book = crossChapterMatch[1].trim();
    const ch1 = crossChapterMatch[2];
    const v1 = crossChapterMatch[3];
    const ch2 = crossChapterMatch[4];
    const v2 = crossChapterMatch[5];
    const bookCode = getUsfmBookCode(book);
    return `${bookCode}.${ch1}.${v1}-${bookCode}.${ch2}.${v2}`;
  }

  // Match Book Chapter e.g. "Luke 12", "Gen 1"
  const chapterMatch = clean.match(/^([0-9]?\s*[A-Za-z]+)\s+([0-9]+)$/);
  if (chapterMatch) {
    const book = chapterMatch[1].trim();
    const chapter = parseInt(chapterMatch[2], 10);
    const bookCode = getUsfmBookCode(book);
    return `${bookCode}.${chapter}`;
  }

  // If already in USFM format e.g. "JHN.3.16", "JHN.3.16-17", "GEN.1.1-GEN.2.3", "ROM.8.1-ROM.8.8"
  if (/^[1-3]?[A-Z]{2,3}\.[0-9]+(\.[0-9]+)?(-([1-3]?[A-Z]{2,3}\.)?[0-9]+(\.[0-9]+)?)?$/.test(clean.toUpperCase())) {
    return clean.toUpperCase();
  }

  // Safe fallback: strip invalid characters without arbitrarily defaulting to John 3:16
  return clean.toUpperCase().replace(/[^A-Z0-9.-]/g, '');
}
