/**
 * Utilities for extracting, formatting, and linking Bible verses with note sections.
 */

import { findCanonicalBook } from '../constants/bibleData';

export interface VerseReference {
  raw: string;
  startVerse: number;
  endVerse: number;
  book?: string;
  chapter?: number;
}

export interface LinkedSectionInfo {
  sectionId: string;
  sectionTitle: string;
  sectionIcon?: string;
  sectionColor?: string;
}

// Matches legacy tags like [v. 3], [v. 3-5], [v. 3–5], [v3], [v3-5], [v3–5]
export const VERSE_TAG_REGEX = /\[v\.?\s*(\d+)(?:\s*[-–—]\s*(\d+))?\]/gi;

// Matches canonical tags like [Matt 1:1], [Matt 1:1-3], [1 Cor 13:4-7], [Rom 8:28]
export const CANONICAL_VERSE_TAG_REGEX = /\[([0-9]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)[:.](\d+)(?:\s*[-–—]\s*(\d+))?\]/gi;

/**
 * Extracts all verse reference tags (both canonical and legacy) from markdown/plain text.
 */
export function extractVerseReferences(text: string): VerseReference[] {
  if (!text) return [];
  const results: VerseReference[] = [];

  // 1. Canonical tags [Book Ch:V] or [Book Ch:V-V]
  const canonicalRegex = new RegExp(CANONICAL_VERSE_TAG_REGEX.source, 'gi');
  let cMatch: RegExpExecArray | null;
  while ((cMatch = canonicalRegex.exec(text)) !== null) {
    const rawBook = cMatch[1].trim();
    const chapter = parseInt(cMatch[2], 10);
    const startVerse = parseInt(cMatch[3], 10);
    const endVerse = cMatch[4] ? parseInt(cMatch[4], 10) : startVerse;
    const canonBook = findCanonicalBook(rawBook);
    const resolvedBook = canonBook ? canonBook.name : rawBook;

    if (!isNaN(startVerse) && !isNaN(endVerse) && startVerse > 0 && endVerse >= startVerse) {
      results.push({
        raw: cMatch[0],
        book: resolvedBook,
        chapter,
        startVerse,
        endVerse,
      });
    }
  }

  // 2. Legacy relative tags [v. N] or [v. N-M]
  const legacyRegex = new RegExp(VERSE_TAG_REGEX.source, 'gi');
  let lMatch: RegExpExecArray | null;
  while ((lMatch = legacyRegex.exec(text)) !== null) {
    const startVerse = parseInt(lMatch[1], 10);
    const endVerse = lMatch[2] ? parseInt(lMatch[2], 10) : startVerse;
    if (!isNaN(startVerse) && !isNaN(endVerse) && startVerse > 0 && endVerse >= startVerse) {
      results.push({
        raw: lMatch[0],
        startVerse,
        endVerse,
      });
    }
  }

  return results;
}

/**
 * Formats an array of verse numbers into a canonical markdown reference tag:
 * If context has book and chapter, generates e.g. "[Matt 1:1-3]", "[Matt 1:1]".
 * Otherwise falls back to legacy e.g. "[v. 1-3]", "[v. 5]".
 */
export function formatVerseReferenceTag(
  verses: number[],
  context?: { book?: string; chapter?: number }
): string {
  if (!verses || verses.length === 0) return '';
  const sorted = [...verses].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (context?.book && typeof context?.chapter === 'number') {
    const canonBook = findCanonicalBook(context.book);
    const abbr = canonBook?.abbreviations?.[0] || context.book;
    if (min === max) {
      return `[${abbr} ${context.chapter}:${min}]`;
    }
    return `[${abbr} ${context.chapter}:${min}-${max}]`;
  }

  if (min === max) {
    return `[v. ${min}]`;
  }
  return `[v. ${min}-${max}]`;
}

/**
 * Formats a verse range into a clean user-facing label (e.g. "Matt 1:1" or "Matt 1:1–3", or legacy "v. 1")
 */
export function formatVerseRangeLabel(
  startVerse: number,
  endVerse: number,
  context?: { book?: string; chapter?: number }
): string {
  if (context?.book && typeof context?.chapter === 'number') {
    const canonBook = findCanonicalBook(context.book);
    const abbr = canonBook?.abbreviations?.[0] || context.book;
    if (startVerse === endVerse) {
      return `${abbr} ${context.chapter}:${startVerse}`;
    }
    return `${abbr} ${context.chapter}:${startVerse}–${endVerse}`;
  }

  if (startVerse === endVerse) {
    return `v. ${startVerse}`;
  }
  return `v. ${startVerse}–${endVerse}`;
}

export interface LinkedVerseData {
  primary: LinkedSectionInfo;
  allSections: LinkedSectionInfo[];
}

/**
 * Inspects all sections in a note (both structured verseReferences array and inline text tags)
 * and builds a map. Keys include:
 * 1. Canonical string coordinates: "Book:Chapter:Verse" (e.g. "Matthew:1:1")
 * 2. Legacy numeric verse numbers: verseNumber (e.g. 1)
 */
export function buildLinkedVerseMap(
  sections: Array<{
    id: string;
    title: string;
    content?: string;
    icon?: string;
    color?: string;
    verseReferences?: Array<{ startVerse: number; endVerse: number; book?: string; chapter?: number }>;
  }>
): Record<string | number, LinkedVerseData> {
  const map: Record<string | number, LinkedVerseData> = {};

  const addLink = (key: string | number, info: LinkedSectionInfo) => {
    if (!map[key]) {
      map[key] = {
        primary: info,
        allSections: [info],
      };
    } else {
      const exists = map[key].allSections.some((s) => s.sectionId === info.sectionId);
      if (!exists) {
        map[key].allSections.push(info);
      }
    }
  };

  for (const sec of sections) {
    const info: LinkedSectionInfo = {
      sectionId: sec.id,
      sectionTitle: sec.title,
      sectionIcon: sec.icon,
      sectionColor: sec.color,
    };

    // 1. Structured verse references
    if (sec.verseReferences && sec.verseReferences.length > 0) {
      for (const ref of sec.verseReferences) {
        const bookName = ref.book ? findCanonicalBook(ref.book)?.name || ref.book : undefined;
        for (let v = ref.startVerse; v <= ref.endVerse; v++) {
          if (bookName && typeof ref.chapter === 'number') {
            addLink(`${bookName}:${ref.chapter}:${v}`, info);
          }
          addLink(v, info);
        }
      }
    }

    // 2. In-text tags
    if (sec.content) {
      const extracted = extractVerseReferences(sec.content);
      for (const ref of extracted) {
        const bookName = ref.book ? findCanonicalBook(ref.book)?.name || ref.book : undefined;
        for (let v = ref.startVerse; v <= ref.endVerse; v++) {
          if (bookName && typeof ref.chapter === 'number') {
            addLink(`${bookName}:${ref.chapter}:${v}`, info);
          }
          addLink(v, info);
        }
      }
    }
  }

  return map;
}

/**
 * Deduplicates and returns all unique sections linked across an array of verses.
 */
export function getLinkedSectionsForVerses(
  verses: number[],
  linkedMap: Record<number, LinkedVerseData | LinkedSectionInfo>
): LinkedSectionInfo[] {
  if (!verses || verses.length === 0 || !linkedMap) return [];
  const mapById: Record<string, LinkedSectionInfo> = {};

  for (const v of verses) {
    const item = linkedMap[v];
    if (!item) continue;
    if ('allSections' in item && Array.isArray(item.allSections)) {
      for (const s of item.allSections) {
        if (!mapById[s.sectionId]) {
          mapById[s.sectionId] = s;
        }
      }
    } else if ('sectionId' in item) {
      if (!mapById[item.sectionId]) {
        mapById[item.sectionId] = item as LinkedSectionInfo;
      }
    }
  }

  return Object.values(mapById);
}

/**
 * Extracts concatenated text for a verse range from a list of VerseSegment objects.
 */
export function extractVerseRangeText(
  verses: Array<{ verseNumber: number; text: string }>,
  startVerse: number,
  endVerse: number
): string {
  if (!verses || verses.length === 0) return '';
  const matched = verses.filter(
    (v) => v.verseNumber >= startVerse && v.verseNumber <= endVerse
  );
  return matched.map((v) => `${v.verseNumber}. ${v.text.trim()}`).join('\n\n');
}
