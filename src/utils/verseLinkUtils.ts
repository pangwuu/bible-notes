/**
 * Utilities for extracting, formatting, and linking Bible verses with note sections.
 */

import { findCanonicalBook } from '../constants/bibleData';
import { NoteSectionValue, PassageReference } from '../types/note';
import { extractCrossReferences } from './crossReferenceParser';

export interface VerseReference {
  raw: string;
  startVerse: number;
  endVerse: number;
  book?: string;
  chapter?: number;
  verses?: number[];
}

export interface LinkedSectionInfo {
  sectionId: string;
  sectionTitle: string;
  sectionIcon?: string;
  sectionColor?: string;
}

// Matches legacy tags like [v. 3], [v. 3-5], [v. 3–5], [v. 1-3, 10], [v1], [v3-5]
export const VERSE_TAG_REGEX = /\[v\.?\s*((?:\d+(?:\s*[-–—]\s*\d+)?)(?:\s*,\s*\d+(?:\s*[-–—]\s*\d+)?)*)\]/gi;

// Matches canonical tags like [Matt 1:1], [Matt 1:1-3], [Matt 1:1-3, 10], [1 Cor 13:4-7], [Rom 8:28]
export const CANONICAL_VERSE_TAG_REGEX = /\[([0-9]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)[:.]((?:\d+(?:\s*[-–—]\s*\d+)?)(?:\s*,\s*\d+(?:\s*[-–—]\s*\d+)?)*)\]/gi;

// Matches verse anchor markdown links like [⚓ Matt 1:1](verse:...) or [⚓ v. 1](verse:...)
export const ANCHOR_VERSE_LINK_REGEX = /\[⚓\s*[^\]]+\]\(verse:[^)]+\)/gi;

/**
 * Strips all verse reference tags and markdown links from a raw text snippet.
 */
export function stripVerseTags(text: string): string {
  if (!text) return '';
  return text
    .replace(new RegExp(ANCHOR_VERSE_LINK_REGEX.source, 'gi'), '')
    .replace(new RegExp(CANONICAL_VERSE_TAG_REGEX.source, 'gi'), '')
    .replace(new RegExp(VERSE_TAG_REGEX.source, 'gi'), '');
}

/**
 * Parses a comma-separated verse specification (e.g. "1-3, 10" or "1–3, 10–12") into a sorted array of distinct numbers.
 */
export function parseVerseNumbersList(listStr: string): number[] {
  if (!listStr) return [];
  const parts = listStr.split(',');
  const resultSet = new Set<number>();

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const rangeMatch = trimmed.match(/^(\d+)(?:\s*[-–—]\s*(\d+))?$/);
    if (rangeMatch) {
      const s = parseInt(rangeMatch[1], 10);
      const e = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : s;
      if (!isNaN(s) && !isNaN(e) && s > 0 && e >= s) {
        for (let v = s; v <= e; v++) {
          resultSet.add(v);
        }
      }
    }
  }

  return Array.from(resultSet).sort((a, b) => a - b);
}

/**
 * Formats an array of verse numbers into grouped ranges (for example, [1, 2, 3, 10] becomes "1-3, 10", [1] becomes "1").
 */
export function formatVerseRangeNumbers(verses: number[], dashChar: string = '–'): string {
  if (!verses || verses.length === 0) return '';
  const sorted = Array.from(new Set(verses)).sort((a, b) => a - b);
  const groups: string[] = [];

  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      groups.push(start === prev ? `${start}` : `${start}${dashChar}${prev}`);
      start = curr;
      prev = curr;
    }
  }
  groups.push(start === prev ? `${start}` : `${start}${dashChar}${prev}`);

  return groups.join(', ');
}

/**
 * Extracts all verse reference tags (both canonical and legacy) from markdown/plain text.
 */
export function extractVerseReferences(text: string): VerseReference[] {
  if (!text) return [];
  const results: VerseReference[] = [];

  // 1. Valid Canonical tags using strict cross-reference parser
  const crossRefs = extractCrossReferences(text);
  for (const item of crossRefs) {
    for (const seg of item.parsed.segments) {
      const isDiscontinuous =
        seg.verses.length > 1 &&
        seg.verses[seg.verses.length - 1] - seg.verses[0] + 1 !== seg.verses.length;
      const refItem: VerseReference = {
        raw: item.raw,
        book: seg.book,
        chapter: seg.chapter,
        startVerse: seg.startVerse,
        endVerse: seg.endVerse,
      };
      if (isDiscontinuous) {
        refItem.verses = seg.verses;
      }
      results.push(refItem);
    }
  }

  // 2. Legacy relative tags [v. N-M, N]
  const legacyRegex = new RegExp(VERSE_TAG_REGEX.source, 'gi');
  let lMatch: RegExpExecArray | null;
  while ((lMatch = legacyRegex.exec(text)) !== null) {
    const verseSpec = lMatch[1];
    const verses = parseVerseNumbersList(verseSpec);
    if (verses.length > 0) {
      const isDiscontinuous = verses.length > 1 && verses[verses.length - 1] - verses[0] + 1 !== verses.length;
      const refItem: VerseReference = {
        raw: lMatch[0],
        startVerse: verses[0],
        endVerse: verses[verses.length - 1],
      };
      if (isDiscontinuous) {
        refItem.verses = verses;
      }
      results.push(refItem);
    }
  }

  // 3. Verse markdown links [⚓ Book Ch:V](verse:...) or [Book Ch:V](verse:...) or [⚓ v. N](verse:...)
  const linkRegex = /\[(?:⚓\s*)?(?:(?:([0-9]?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)[:.])|(?:v\.?\s*))?((?:\d+(?:\s*[-–—]\s*\d+)?)(?:\s*,\s*\d+(?:\s*[-–—]\s*\d+)?)*)\]\(verse:[^)]+\)/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(text)) !== null) {
    const rawBook = linkMatch[1]?.trim();
    const chapter = linkMatch[2] ? parseInt(linkMatch[2], 10) : undefined;
    const verseSpec = linkMatch[3];
    const verses = parseVerseNumbersList(verseSpec);
    const canonBook = rawBook ? findCanonicalBook(rawBook) : undefined;
    const resolvedBook = canonBook ? canonBook.name : rawBook;

    if (verses.length > 0) {
      const isDiscontinuous = verses.length > 1 && verses[verses.length - 1] - verses[0] + 1 !== verses.length;
      const refItem: VerseReference = {
        raw: linkMatch[0],
        book: resolvedBook,
        chapter,
        startVerse: verses[0],
        endVerse: verses[verses.length - 1],
      };
      if (isDiscontinuous) {
        refItem.verses = verses;
      }
      const alreadyAdded = results.some(
        (r) =>
          r.book === refItem.book &&
          r.chapter === refItem.chapter &&
          r.startVerse === refItem.startVerse &&
          r.endVerse === refItem.endVerse
      );
      if (!alreadyAdded) {
        results.push(refItem);
      }
    }
  }

  return results;
}

/**
 * Formats an array of verse numbers into a canonical markdown reference tag:
 * Supports compound/discontinuous verses e.g. "[Matt 1:1, 3]" or "[v. 1, 3]".
 */
export function formatVerseReferenceTag(
  verses: number[],
  context?: { book?: string; chapter?: number }
): string {
  if (!verses || verses.length === 0) return '';

  const rangeNumbers = formatVerseRangeNumbers(verses, '-');

  if (context?.book && typeof context?.chapter === 'number') {
    const canonBook = findCanonicalBook(context.book);
    const abbr = canonBook?.abbreviations?.[0] || context.book;
    return `[${abbr} ${context.chapter}:${rangeNumbers}]`;
  }

  return `[v. ${rangeNumbers}]`;
}

/**
 * Formats a verse range into a clean user-facing label (e.g. "Matt 1:1–3, 10", "Matt 1:1–3", or legacy "v. 1")
 */
export function formatVerseRangeLabel(
  startVerse: number,
  endVerse: number,
  context?: { book?: string; chapter?: number },
  verses?: number[]
): string {
  const rangeStr = (verses && verses.length > 0)
    ? formatVerseRangeNumbers(verses)
    : startVerse === endVerse
    ? `${startVerse}`
    : `${startVerse}–${endVerse}`;

  if (context?.book && typeof context?.chapter === 'number') {
    const canonBook = findCanonicalBook(context.book);
    const abbr = canonBook?.abbreviations?.[0] || context.book;
    return `${abbr} ${context.chapter}:${rangeStr}`;
  }

  return `v. ${rangeStr}`;
}

/**
 * Appends a verse tag to content on the nearest clear line:
 * - If content is empty, returns the tag.
 * - If content already ends with a newline, appends the tag directly.
 * - Otherwise, appends a newline followed by the tag.
 */
export function appendVerseTagOnNearestClearLine(currentContent: string, tag: string): string {
  if (!tag) return currentContent || '';
  if (!currentContent) return tag;
  if (currentContent.endsWith('\n')) {
    return `${currentContent}${tag}`;
  }
  return `${currentContent}\n${tag}`;
}

export type VerseTagPlacement = 'newline' | 'inline' | 'cursor';

export const DEFAULT_VERSE_TAG_PLACEMENT: VerseTagPlacement = 'newline';

export function isVerseTagPlacement(value: unknown): value is VerseTagPlacement {
  return value === 'newline' || value === 'inline' || value === 'cursor';
}

export interface VerseTagInsertResult {
  content: string;
  /** Caret index just after the inserted tag, so consecutive links stay in reading order. */
  cursorAfter: number;
}

function insertAt(content: string, tag: string, index: number): VerseTagInsertResult {
  const before = content.slice(0, index);
  const after = content.slice(index);
  const spaceBefore = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  const spaceAfter = after.length > 0 && !/^\s/.test(after) ? ' ' : '';
  const head = `${before}${spaceBefore}${tag}`;
  return { content: `${head}${spaceAfter}${after}`, cursorAfter: head.length };
}

/**
 * Inserts a verse tag according to the user's placement preference.
 * - newline: tag goes on its own line at the end.
 * - inline: tag continues the last line after a single space.
 * - cursor: tag goes where the caret last was in this section; falls back to inline.
 */
export function insertVerseTag(
  currentContent: string,
  tag: string,
  placement: VerseTagPlacement,
  cursor?: number | null
): VerseTagInsertResult {
  const content = currentContent || '';
  if (!tag) return { content, cursorAfter: content.length };

  if (placement === 'newline') {
    const next = appendVerseTagOnNearestClearLine(content, tag);
    return { content: next, cursorAfter: next.length };
  }

  if (placement === 'cursor' && typeof cursor === 'number' && cursor >= 0 && cursor <= content.length) {
    return insertAt(content, tag, cursor);
  }

  if (!content || content.endsWith('\n')) {
    const next = `${content}${tag}`;
    return { content: next, cursorAfter: next.length };
  }
  const trimmed = content.replace(/[ \t]+$/, '');
  const next = `${trimmed} ${tag}`;
  return { content: next, cursorAfter: next.length };
}

/**
 * Removes one occurrence of a verse tag along with the whitespace that only existed
 * to separate it, so inline tags don't leave double spaces and own-line tags don't
 * leave blank lines. Returns null when the tag isn't present.
 */
export function removeVerseTag(content: string, tag: string): string | null {
  if (!content || !tag) return null;
  const idx = content.indexOf(tag);
  if (idx < 0) return null;

  let before = content.slice(0, idx);
  let after = content.slice(idx + tag.length);

  const beforeEndsSpace = / $/.test(before);
  const afterStartsSpace = /^ /.test(after);
  const beforeIsLineStart = before === '' || before.endsWith('\n');
  const afterIsLineEnd = after === '' || after.startsWith('\n');

  if (beforeEndsSpace && (afterStartsSpace || afterIsLineEnd)) {
    before = before.slice(0, -1);
  } else if (afterStartsSpace && beforeIsLineStart) {
    after = after.slice(1);
  } else if (beforeIsLineStart && after.startsWith('\n')) {
    after = after.slice(1);
  } else if (before.endsWith('\n') && after === '') {
    before = before.slice(0, -1);
  }

  return `${before}${after}`.trim();
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
    verseReferences?: Array<{ startVerse: number; endVerse: number; book?: string; chapter?: number; verses?: number[] }>;
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
        const targetVerses = ref.verses && ref.verses.length > 0
          ? ref.verses
          : Array.from({ length: ref.endVerse - ref.startVerse + 1 }, (_, i) => ref.startVerse + i);

        for (const v of targetVerses) {
          if (bookName && typeof ref.chapter === 'number') {
            addLink(`${bookName}:${ref.chapter}:${v}`, info);
          } else {
            addLink(v, info);
          }
        }
      }
    }

    // 2. In-text tags
    if (sec.content) {
      const extracted = extractVerseReferences(sec.content);
      for (const ref of extracted) {
        const bookName = ref.book ? findCanonicalBook(ref.book)?.name || ref.book : undefined;
        const targetVerses = ref.verses && ref.verses.length > 0
          ? ref.verses
          : Array.from({ length: ref.endVerse - ref.startVerse + 1 }, (_, i) => ref.startVerse + i);

        for (const v of targetVerses) {
          if (bookName && typeof ref.chapter === 'number') {
            addLink(`${bookName}:${ref.chapter}:${v}`, info);
          } else {
            addLink(v, info);
          }
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
  linkedMap: Record<string | number, LinkedVerseData | LinkedSectionInfo>,
  context?: { book?: string; chapter?: number }
): LinkedSectionInfo[] {
  if (!verses || verses.length === 0 || !linkedMap) return [];
  const mapById: Record<string, LinkedSectionInfo> = {};

  for (const v of verses) {
    const canonicalKey =
      context?.book && typeof context?.chapter === 'number'
        ? `${context.book}:${context.chapter}:${v}`
        : undefined;
    const item = (canonicalKey && linkedMap[canonicalKey]) || linkedMap[v];
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
 * Extracts concatenated text only for specified verses from a list of VerseSegment objects.
 */
export function extractSelectedVersesText(
  verses: Array<{ verseNumber: number; text: string }>,
  selectedVerseNumbers: number[]
): string {
  if (!verses || verses.length === 0 || !selectedVerseNumbers || selectedVerseNumbers.length === 0) return '';
  const selectedSet = new Set(selectedVerseNumbers);
  const matched = verses.filter((v) => selectedSet.has(v.verseNumber));
  return matched.map((v) => `${v.verseNumber}. ${v.text.trim()}`).join('\n\n');
}

/**
 * Extracts concatenated text for a verse range from a list of VerseSegment objects.
 * (Preserved for backwards compatibility).
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

/**
 * Synchronizes structured verse references for sections based on references typed in content.
 */
export function syncSectionVerseReferencesFromContent(
  sections: NoteSectionValue[],
  passage?: PassageReference | null
): NoteSectionValue[] {
  return sections.map((sec) => {
    const extracted = extractVerseReferences(sec.content || '');
    const defaultBook = passage?.segments?.[0]?.book;
    const defaultChapter = passage?.segments?.[0]?.startChapter;

    const refs = extracted.map((r) => {
      const book = r.book || defaultBook;
      const chapter = typeof r.chapter === 'number' ? r.chapter : defaultChapter;
      const refItem: any = {
        startVerse: r.startVerse,
        endVerse: r.endVerse,
      };
      if (book) refItem.book = book;
      if (typeof chapter === 'number') refItem.chapter = chapter;
      if (Array.isArray(r.verses) && r.verses.length > 0) refItem.verses = r.verses;
      return refItem;
    });

    const uniqueRefs: typeof refs = [];
    for (const ref of refs) {
      const exists = uniqueRefs.some(
        (u) =>
          u.book === ref.book &&
          u.chapter === ref.chapter &&
          u.startVerse === ref.startVerse &&
          u.endVerse === ref.endVerse
      );
      if (!exists) {
        uniqueRefs.push(ref);
      }
    }

    return {
      ...sec,
      verseReferences: uniqueRefs,
    };
  });
}

