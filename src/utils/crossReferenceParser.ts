/**
 * crossReferenceParser.ts
 * Pure parser and validator for scripture cross-references in note content.
 */

import { findCanonicalBook } from '../constants/bibleData';
import { PassageReference } from '../types/note';

export type ReferenceType = 'invalid' | 'simple' | 'compound';

export interface VerseSegmentRef {
  book: string;
  chapter: number;
  verses: number[];
  startVerse: number;
  endVerse: number;
}

export interface ParsedReference {
  type: ReferenceType;
  raw: string;
  segments: VerseSegmentRef[];
  error?: string;
}

const ASCII_DIGITS_ONLY = /^[0-9]+$/;

/**
 * Validates that an exact string token represents a valid positive integer without leading zeros or oddities.
 */
function parseStrictInteger(token: string): number | null {
  const trimmed = token.trim();
  if (!trimmed || !ASCII_DIGITS_ONLY.test(trimmed)) return null;
  if (trimmed.length > 1 && trimmed.startsWith('0')) return null; // reject leading zero e.g. "01"
  const val = Number(trimmed);
  if (!Number.isSafeInteger(val) || val <= 0) return null;
  return val;
}

/**
 * Parses verse specification string like "1-3, 5, 6-7, 13" or "3-3" or "13"
 * Enforces strictly ascending, non-overlapping verses, allowing "-" and "–".
 */
function parseVerseSpecification(
  specStr: string,
  maxVersesInChapter: number
): { verses: number[]; startVerse: number; endVerse: number } | null {
  // Disallow trailing, leading, or empty consecutive commas
  const commaTokens = specStr.split(',');
  if (commaTokens.length === 0) return null;

  for (const t of commaTokens) {
    if (t.trim() === '') return null; // trailing or leading or consecutive commas
  }

  const allVerses: number[] = [];
  let lastEndVerse = 0;

  for (const token of commaTokens) {
    const trimmed = token.trim();
    if (!trimmed) return null;

    // Check for range with "-" or "–"
    // Disallow em-dash "—"
    if (trimmed.includes('—')) return null;

    const parts = trimmed.split(/[-–]/);
    if (parts.length === 1) {
      // Single verse
      const v = parseStrictInteger(parts[0]);
      if (v === null || v > maxVersesInChapter) return null;
      if (v <= lastEndVerse) return null; // strictly ascending and non-overlapping

      allVerses.push(v);
      lastEndVerse = v;
    } else if (parts.length === 2) {
      // Verse range
      const s = parseStrictInteger(parts[0]);
      const e = parseStrictInteger(parts[1]);
      if (s === null || e === null) return null;
      if (s > maxVersesInChapter || e > maxVersesInChapter) return null;
      if (s > e) return null; // reversed range rejected
      if (s <= lastEndVerse) return null; // out of order or overlapping

      for (let i = s; i <= e; i++) {
        allVerses.push(i);
      }
      lastEndVerse = e;
    } else {
      // More than one dash in range
      return null;
    }
  }

  if (allVerses.length === 0) return null;

  return {
    verses: allVerses,
    startVerse: allVerses[0],
    endVerse: allVerses[allVerses.length - 1],
  };
}

/**
 * Parses and strictly validates a scripture reference candidate.
 * Accepts bracketed strings like "[Matt 1:1-3]" or "[Matt 1:1; 2:3]".
 */
export function parseReference(text: string): ParsedReference {
  if (!text || typeof text !== 'string') {
    return { type: 'invalid', raw: text || '', segments: [] };
  }

  let raw = text.trim();
  if (raw.startsWith('[') && raw.endsWith(']')) {
    raw = raw.slice(1, -1).trim();
  } else {
    // If it wasn't bracketed, check if brackets were mismatched
    return { type: 'invalid', raw: text, segments: [] };
  }

  // Reject empty brackets
  if (!raw) {
    return { type: 'invalid', raw: text, segments: [] };
  }

  // Disallow nested brackets
  if (raw.includes('[') || raw.includes(']')) {
    return { type: 'invalid', raw: text, segments: [] };
  }

  // Reject alternative separators like period or European comma
  if (raw.includes('.')) {
    return { type: 'invalid', raw: text, segments: [] };
  }

  // Reject leading or trailing commas or empty commas in the candidate as a whole
  if (raw.startsWith(',') || raw.endsWith(',')) {
    return { type: 'invalid', raw: text, segments: [] };
  }

  // Split compound parts by semicolon
  const semicolonParts = raw.split(';');
  const segments: VerseSegmentRef[] = [];
  let currentBook: string | null = null;

  for (let part of semicolonParts) {
    part = part.trim();
    if (!part || part.startsWith(',') || part.endsWith(',')) {
      // Empty segment like trailing semicolon or leading comma
      return { type: 'invalid', raw: text, segments: [] };
    }

    // Must contain exactly one colon separating chapter from verse specification
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) {
      // Missing colon (e.g. "[Philemon 13]" or "[Luke 16]")
      return { type: 'invalid', raw: text, segments: [] };
    }

    const beforeColon = part.slice(0, colonIndex).trim();
    const afterColon = part.slice(colonIndex + 1).trim();

    if (!beforeColon || !afterColon) {
      return { type: 'invalid', raw: text, segments: [] };
    }

    let bookCandidate = '';
    let chapterCandidate = '';

    // Check if beforeColon is purely a chapter number (same-book shorthand e.g. "2:3")
    const pureChapter = parseStrictInteger(beforeColon);
    if (pureChapter !== null) {
      if (!currentBook) {
        // First segment cannot omit book
        return { type: 'invalid', raw: text, segments: [] };
      }
      chapterCandidate = beforeColon;
    } else {
      // Must separate book name from chapter number
      // Match book name followed by chapter number at the end
      const match = beforeColon.match(/^(.*?)(?:\s+)(\d+)$/);
      if (!match) {
        return { type: 'invalid', raw: text, segments: [] };
      }
      bookCandidate = match[1].trim();
      chapterCandidate = match[2].trim();

      const canon = findCanonicalBook(bookCandidate);
      if (!canon) {
        return { type: 'invalid', raw: text, segments: [] };
      }
      currentBook = canon.name;
    }

    const canonBook = findCanonicalBook(currentBook!);
    if (!canonBook) {
      return { type: 'invalid', raw: text, segments: [] };
    }

    const chapterNum = parseStrictInteger(chapterCandidate);
    if (chapterNum === null || chapterNum > canonBook.chapters) {
      return { type: 'invalid', raw: text, segments: [] };
    }

    // Single-chapter books strictly require chapter 1
    if (canonBook.chapters === 1 && chapterNum !== 1) {
      return { type: 'invalid', raw: text, segments: [] };
    }

    const maxVerses = canonBook.versesPerChapter[chapterNum - 1];
    const verseSpec = parseVerseSpecification(afterColon, maxVerses);
    if (!verseSpec) {
      return { type: 'invalid', raw: text, segments: [] };
    }

    segments.push({
      book: canonBook.name,
      chapter: chapterNum,
      verses: verseSpec.verses,
      startVerse: verseSpec.startVerse,
      endVerse: verseSpec.endVerse,
    });
  }

  if (segments.length === 0) {
    return { type: 'invalid', raw: text, segments: [] };
  }

  if (segments.length === 1) {
    return { type: 'simple', raw: text, segments };
  }

  return { type: 'compound', raw: text, segments };
}

/**
 * Checks whether all verses in a parsed reference are fully loaded in the given BibleReader tab passage.
 * Enforces all-or-nothing containment:
 * - Compound references across multiple chapters/books always return false.
 * - Simple references return true only if all verses are present in the tab passage.
 */
export function isInTab(
  parsed: ParsedReference,
  tabPassage: PassageReference | null | undefined
): boolean {
  if (!parsed || parsed.type !== 'simple' || !parsed.segments || parsed.segments.length !== 1) {
    return false;
  }

  if (!tabPassage || !tabPassage.segments || tabPassage.segments.length === 0) {
    return false;
  }

  const targetSeg = parsed.segments[0];
  const targetCanon = findCanonicalBook(targetSeg.book)?.name || targetSeg.book;

  // Find a matching segment in tabPassage that contains this book & chapter
  const matchingSegment = tabPassage.segments.find((seg) => {
    const segCanon = findCanonicalBook(seg.book)?.name || seg.book;
    if (segCanon !== targetCanon) return false;
    return targetSeg.chapter >= seg.startChapter && targetSeg.chapter <= seg.endChapter;
  });

  if (!matchingSegment) {
    return false;
  }

  // Check that every verse in targetSeg.verses is within the matching segment's loaded range
  const startV = matchingSegment.startVerse;
  const endV = matchingSegment.endVerse;

  for (const v of targetSeg.verses) {
    if (v < startV || v > endV) {
      return false; // all-or-nothing
    }
  }

  return true;
}

/**
 * Formats an array of verse numbers into grouped ranges (e.g. [1, 2, 3] becomes "1-3").
 */
export function formatVerseRangeString(verses: number[]): string {
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
      groups.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = curr;
      prev = curr;
    }
  }
  groups.push(start === prev ? `${start}` : `${start}-${prev}`);

  return groups.join(',');
}

/**
 * Extracts valid cross-references from text, ignoring markdown links, escaped brackets, and inline code.
 */
export function extractCrossReferences(
  text: string
): Array<{ raw: string; index: number; parsed: ParsedReference }> {
  if (!text) return [];

  const results: Array<{ raw: string; index: number; parsed: ParsedReference }> = [];

  // Match bracketed content: [ ... ]
  let i = 0;
  while (i < text.length) {
    if (text[i] === '[' && (i === 0 || text[i - 1] !== '\\')) {
      // Find closing bracket
      const closeIdx = text.indexOf(']', i + 1);
      if (closeIdx === -1) {
        break;
      }

      // Check if followed by "(" which would make it a markdown link [text](url)
      if (closeIdx + 1 < text.length && text[closeIdx + 1] === '(') {
        i = closeIdx + 1;
        continue;
      }

      // Check if inside inline code (odd number of backticks before i)
      const beforeText = text.slice(0, i);
      const backticks = (beforeText.match(/`/g) || []).length;
      if (backticks % 2 === 0) {
        const rawBracket = text.slice(i, closeIdx + 1);
        const parsed = parseReference(rawBracket);
        if (parsed.type !== 'invalid') {
          results.push({
            raw: rawBracket,
            index: i,
            parsed,
          });
        }
      }

      i = closeIdx + 1;
    } else {
      i++;
    }
  }

  return results;
}

/**
 * Formats markdown text by replacing ONLY valid references with custom links indicating inTab status.
 * Leaves invalid references untouched as plain text.
 */
export function formatMarkdownCrossReferences(
  rawText: string,
  tabPassage?: PassageReference | null
): string {
  if (!rawText) return '';

  const extracted = extractCrossReferences(rawText);
  if (extracted.length === 0) return rawText;

  // Replace matches from right to left so indices remain stable
  let result = rawText;
  const sorted = [...extracted].sort((a, b) => b.index - a.index);

  for (const item of sorted) {
    const inTab = isInTab(item.parsed, tabPassage) ? 1 : 0;
    const seg = item.parsed.segments[0];
    const versesStr = formatVerseRangeString(seg.verses);
    const href = `verse:/${encodeURIComponent(seg.book)}/${seg.chapter}/${versesStr}?inTab=${inTab}`;
    const replacement = `${item.raw}(${href})`;

    result =
      result.slice(0, item.index) +
      replacement +
      result.slice(item.index + item.raw.length);
  }

  return result;
}
