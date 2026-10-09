/**
 * Bible Service & Scripture Caching Layer
 * Powered by the YouVersion Platform REST API.
 * 
 * Provides unified Scripture text fetching across supported translations:
 * NIV, ESV, BSB, NKJV, NASB, NLT, CSB, KJV, WEB, NIrV
 * 
 * Complies with YouVersion Platform licensing, attribution requirements,
 * and offline AsyncStorage caching.
 */

import safeStorage from '../utils/safeStorage';
import { PassageReference, PassageSegment } from '../types/note';
import { BibleTranslation } from '../types/user';
import { findCanonicalBook, CANONICAL_BOOKS } from '../constants/bibleData';
import {
  BibleVersionMetadata,
  SUPPORTED_BIBLE_VERSIONS,
  DEFAULT_BIBLE_VERSION_ID,
  resolveVersionId,
  getVersionMetadata,
} from '../constants/bibleVersions';
import { queryToUsfm, formatSegmentToUsfm } from '../utils/usfmUtils';
import { formatSegmentDisplay, splitSegmentByChapters } from '../utils/passageParser';

export const YOUVERSION_API_BASE_URL = 'https://api.youversion.com/v1';
export const DEFAULT_ESV_API_TOKEN = '6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba';
export const ESV_API_BASE_URL = 'https://api.esv.org/v3/passage/text/';
export const ESV_COPYRIGHT_ATTRIBUTION =
  'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.';

// Backward compatibility alias for UI components
export type TranslationMetadata = BibleVersionMetadata;
export const SUPPORTED_TRANSLATIONS = SUPPORTED_BIBLE_VERSIONS;

export interface VerseSegment {
  verseNumber: number;
  text: string;
  heading?: string;
}

export interface MultiPassageSection {
  title: string;
  verses: VerseSegment[];
  text: string;
  segment?: PassageSegment;
}

export interface PassageFetchResult {
  verses: VerseSegment[];
  text: string;
  sections?: MultiPassageSection[];
  translation: BibleTranslation;
  versionId?: number;
  source: 'cache' | 'youversion' | 'esv' | 'bolls' | 'web' | 'firestore';
  cached: boolean;
  attribution?: string;
  error?: string;
  debugInfo?: string;
}

export interface FetchPassageOptions {
  translation?: BibleTranslation;
  versionId?: number;
  esvApiKey?: string;
  forceRefresh?: boolean;
}

/**
/**
 * Builds standard canonical cache key: bible_cache_${versionId}_${sanitizedUsfm}
 * Canonicalizes query strings or PassageReference objects into USFM so that
 * different representations ("John 3:16", "JHN.3.16", or PassageReference)
 * resolve to the exact same cache key.
 */
export function buildBibleCacheKey(
  versionOrTrans: string | number,
  passageInput: PassageReference | string
): string {
  const versionId = resolveVersionId(versionOrTrans);

  if (typeof passageInput === 'object' && passageInput !== null) {
    const p = passageInput as PassageReference;
    if (p.segments && p.segments.length > 0) {
      const usfmParts = p.segments.map(formatSegmentToUsfm);
      const sanitized = usfmParts.join('_').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      return `bible_cache_${versionId}_${sanitized}`;
    }
    const query = formatPassageQuery(passageInput);
    const usfm = queryToUsfm(query);
    const sanitized = (usfm || query).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    return `bible_cache_${versionId}_${sanitized}`;
  }

  const query = String(passageInput).trim();
  const usfm = queryToUsfm(query);
  const keySource = usfm || query;
  const sanitized = keySource.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  return `bible_cache_${versionId}_${sanitized}`;
}

/**
 * Computes canonical 1-based book number (1 for Genesis, 66 for Revelation).
 */
export function getBookNumber(bookName: string): number {
  const book = findCanonicalBook(bookName);
  if (!book) return 1;
  const index = CANONICAL_BOOKS.findIndex((b) => b.name === book.name);
  return index >= 0 ? index + 1 : 1;
}

/**
 * Formats a passage query string e.g. "John 3:16-17" or "Romans 8:1".
 */
export function formatPassageQuery(
  passage:
    | PassageReference
    | { book: string; startChapter: number; startVerse: number; endChapter: number; endVerse: number }
): string {
  const p = passage as any;
  if (p.segments && p.segments.length === 1) {
    const s = p.segments[0];
    if (s.startChapter === s.endChapter) {
      if (s.startVerse === s.endVerse) {
        return `${s.book} ${s.startChapter}:${s.startVerse}`;
      }
      return `${s.book} ${s.startChapter}:${s.startVerse}-${s.endVerse}`;
    }
    return `${s.book} ${s.startChapter}:${s.startVerse}-${s.endChapter}:${s.endVerse}`;
  }
  if (p.display) return p.display.replace(/[—–]/g, '-');
  if (p.displayString) return p.displayString.replace(/[—–]/g, '-');

  // Multi-segment fallback if display string is absent
  if (p.segments && p.segments.length > 1) {
    return p.segments
      .map((s: PassageSegment) => {
        if (s.startChapter === s.endChapter) {
          if (s.startVerse === s.endVerse) {
            return `${s.book} ${s.startChapter}:${s.startVerse}`;
          }
          return `${s.book} ${s.startChapter}:${s.startVerse}-${s.endVerse}`;
        }
        return `${s.book} ${s.startChapter}:${s.startVerse}-${s.endChapter}:${s.endVerse}`;
      })
      .join('; ');
  }

  const { book, startChapter, startVerse, endChapter, endVerse } = p;
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${book} ${startChapter}:${startVerse}`;
    }
    return `${book} ${startChapter}:${startVerse}-${endVerse}`;
  }
  return `${book} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
}

/**
 * Parses passage query into structured reference components.
 */
export function parsePassageQuery(query: string): {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
} {
  const clean = query.trim().replace(/[—–]/g, '-');
  const match = clean.match(/^([0-9]?\s*[A-Za-z]+)\s+([0-9]+):([0-9]+)(?:-(?:([0-9]+):)?([0-9]+))?/);
  if (match) {
    const book = match[1].trim();
    const startChapter = parseInt(match[2], 10);
    const startVerse = parseInt(match[3], 10);
    const endChapter = match[4] ? parseInt(match[4], 10) : startChapter;
    const endVerse = match[5] ? parseInt(match[5], 10) : startVerse;
    return { book, startChapter, startVerse, endChapter, endVerse };
  }

  // Whole-chapter queries like "Luke 12" or "Gen 1"
  const chapterMatch = clean.match(/^([0-9]?\s*[A-Za-z]+)\s+([0-9]+)$/);
  if (chapterMatch) {
    const rawBook = chapterMatch[1].trim();
    const chapter = parseInt(chapterMatch[2], 10);
    const canonical = findCanonicalBook(rawBook);
    const book = canonical ? canonical.name : rawBook;
    const verseCount = (canonical && canonical.versesPerChapter && canonical.versesPerChapter[chapter - 1]) || 50;
    return {
      book,
      startChapter: chapter,
      startVerse: 1,
      endChapter: chapter,
      endVerse: verseCount,
    };
  }

  return {
    book: 'John',
    startChapter: 3,
    startVerse: 16,
    endChapter: 3,
    endVerse: 16,
  };
}

/**
 * In-memory and AsyncStorage cache for Bible version metadata (copyright, attribution).
 */
const metadataMemoryCache = new Map<number, { title: string; copyright: string; attribution: string }>();

function getYouVersionHeaders(): Record<string, string> {
  const appKey = process.env.EXPO_PUBLIC_YOUVERSION_APP_KEY || '';
  return {
    'X-YVP-App-Key': appKey,
    'Accept': 'application/json',
  };
}

/**
 * Fetches Bible version metadata from YouVersion Platform and caches the required copyright attribution.
 */
export async function fetchVersionMetadata(
  versionId: number
): Promise<{ title: string; copyright: string; attribution: string }> {
  if (metadataMemoryCache.has(versionId)) {
    return metadataMemoryCache.get(versionId)!;
  }

  const storageKey = `yv_meta_${versionId}`;
  try {
    const stored = await safeStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      metadataMemoryCache.set(versionId, parsed);
      return parsed;
    }
  } catch {}

  const meta = getVersionMetadata(versionId);
  try {
    const url = `${YOUVERSION_API_BASE_URL}/bibles/${versionId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getYouVersionHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      const title = data.title || data.localized_title || meta.fullName;
      const copyright = (data.copyright || '').trim();
      const promotional = (data.promotional_content || '').trim();
      const attribution = copyright || promotional || meta.fullName;

      const result = { title, copyright, attribution };
      metadataMemoryCache.set(versionId, result);
      safeStorage.setItem(storageKey, JSON.stringify(result)).catch(() => {});
      return result;
    }
  } catch (err: any) {
    console.warn(`[BibleService] Error fetching metadata for version ${versionId}:`, err?.message || err);
  }

  const fallback = { title: meta.fullName, copyright: '', attribution: meta.fullName };
  metadataMemoryCache.set(versionId, fallback);
  return fallback;
}

/**
 * Robust parser converting YouVersion passage HTML into structured VerseSegment[]
 * Handles both transformed and untransformed USFM HTML, pericope headings, and footnote stripping.
 */
export function parseYouVersionHtml(html: string, fallbackVerse = 1): VerseSegment[] {
  if (!html) return [];

  // 1. Strip footnotes and cross-reference markers
  let cleaned = html
    .replace(/<span[^>]*class="[^"]*(?:footnote|f|yv-n)[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<div[^>]*class="[^"]*footnote[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

  // 2. Mark section headings: .s1, .s2, .yv-h, .ms, etc.
  cleaned = cleaned.replace(
    /<(?:div|h[1-6]|b|strong|span)[^>]*class="[^"]*(?:s1|s2|s3|ms|ms1|yv-h|scripture-subheading)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|h[1-6]|b|strong|span)>/gi,
    (_, h) => `\n[[HEADING:${h.replace(/<[^>]+>/g, '').trim()}]]\n`
  );

  // 3. Normalize verse markers
  const hasTransformedVerses = /v="(\d+)"/i.test(cleaned);
  if (hasTransformedVerses) {
    // Transformed: <span class="yv-v" v="16">...</span>
    // Remove inner label tags before replacing verse wrapper
    cleaned = cleaned.replace(/<span[^>]*class="[^"]*(?:label|v)[^"]*"[^>]*>\s*\d+\s*<\/span>/gi, '');
    cleaned = cleaned.replace(/<[^>]*\bv="(\d+)"[^>]*>/gi, '[[VERSE:$1]]');
  } else {
    // Untransformed: <span class="v">16</span> or [16]
    cleaned = cleaned.replace(/<span[^>]*class="[^"]*(?:v|label)[^"]*"[^>]*>(\d+)<\/span>/gi, '[[VERSE:$1]]');
    cleaned = cleaned.replace(/\[(\d+)\]/g, '[[VERSE:$1]]');
  }

  // 4. Split by [[VERSE:N]] markers
  const parts = cleaned.split(/\[\[VERSE:(\d+)\]\]/);
  const segments: VerseSegment[] = [];

  let pendingHeading = '';
  const preMatch = parts[0] ? parts[0].match(/\[\[HEADING:(.*?)\]\]/) : null;
  if (preMatch) {
    pendingHeading = preMatch[1].trim();
  }

  for (let i = 1; i < parts.length; i += 2) {
    const verseNumber = parseInt(parts[i], 10);
    const content = parts[i + 1] || '';

    let nextHeading = '';
    const headingMatch = content.match(/\[\[HEADING:(.*?)\]\]/);
    if (headingMatch) {
      nextHeading = headingMatch[1].trim();
    }

    // Clean verse text
    let text = content
      .replace(/\[\[HEADING:.*?\]\]/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Strip accidental leading verse number
    text = text.replace(new RegExp(`^${verseNumber}\\s+`), '').trim();

    if (text) {
      segments.push({
        verseNumber,
        text,
        heading: pendingHeading ? pendingHeading.replace(/<[^>]*>/g, '').trim() : undefined,
      });
    }

    pendingHeading = nextHeading;
  }

  // Fallback for single verses without verse marker wrappers
  if (segments.length === 0) {
    const pureText = cleaned
      .replace(/\[\[HEADING:.*?\]\]/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pureText) {
      segments.push({
        verseNumber: fallbackVerse,
        text: pureText,
        heading: pendingHeading || undefined,
      });
    }
  }

  return segments;
}

/**
 * Helper to parse raw text with [N] markers into structured VerseSegment[]
 * Accurately extracts section headings preceding verse markers.
 */
export function parseBracketVerses(rawText: string, fallbackStartVerse = 1): VerseSegment[] {
  if (!rawText) return [];
  const segments: VerseSegment[] = [];

  // Split by [N] verse markers while capturing verse numbers
  const parts = rawText.split(/\[(\d+)\]/);
  // Text preceding the first [N] is the chapter/first pericope heading
  let pendingHeading = parts[0] ? parts[0].trim() : '';

  for (let i = 1; i < parts.length; i += 2) {
    const verseNumber = parseInt(parts[i], 10);
    const content = parts[i + 1] || '';

    // Split intermediate content into double-newline paragraphs
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    let verseText = '';
    let nextHeading = '';

    if (paragraphs.length > 1) {
      const lastP = paragraphs[paragraphs.length - 1];
      if (lastP.length < 90 && !lastP.endsWith('.')) {
        nextHeading = lastP;
        verseText = paragraphs.slice(0, -1).join('\n\n');
      } else {
        verseText = paragraphs.join('\n\n');
      }
    } else {
      verseText = paragraphs[0] || '';
    }

    // Strip trailing translation copyright notices like (ESV) from last verse
    verseText = verseText.replace(/\s*\([A-Z]+\)\s*$/, '').trim();

    if (verseText.length > 0) {
      segments.push({
        verseNumber,
        text: verseText,
        heading: pendingHeading ? pendingHeading.replace(/<[^>]*>/g, '').trim() : undefined,
      });
    }

    pendingHeading = nextHeading;
  }

  if (segments.length === 0) {
    const clean = rawText.replace(/\[\d+\]/g, '').trim();
    if (clean) {
      segments.push({ verseNumber: fallbackStartVerse, text: clean });
    }
  }

  return segments;
}

/**
 * Fetches passage text from the official Crossway ESV API.
 */
export async function fetchFromCrosswayEsv(
  passageQuery: string,
  customApiKey?: string
): Promise<{ verses: VerseSegment[]; text: string }> {
  const token = customApiKey && customApiKey.trim() ? customApiKey.trim() : DEFAULT_ESV_API_TOKEN;
  const url = `${ESV_API_BASE_URL}?q=${encodeURIComponent(passageQuery)}&include-footnotes=false&include-headings=true&include-passage-references=false&include-verse-numbers=true`;

  console.log(`[BibleService] Fetching from Crossway ESV API: ${url} (Token: ${token.slice(0, 6)}...)`);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
      },
    });
  } catch (netErr: any) {
    console.warn(`[BibleService] Crossway ESV network request failed:`, netErr?.message || netErr);
    throw new Error(`Crossway ESV network error: ${netErr?.message || 'Network unreachable'}`);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.warn(`[BibleService] Crossway ESV error status ${response.status}: ${errorBody.slice(0, 150)}`);
    throw new Error(`Crossway ESV API error status: ${response.status}`);
  }

  const data = await response.json();
  const passages: string[] = data.passages || [];
  if (passages.length === 0) {
    console.warn('[BibleService] No passage text returned from Crossway ESV API');
    throw new Error('No passage text returned from ESV API');
  }

  const combined = passages.join('\n\n').trim();
  const parsedRef = parsePassageQuery(passageQuery);
  const verses = parseBracketVerses(combined, parsedRef.startVerse);
  const text = verses.map((v) => v.text).join(' ').trim();
  return { verses, text };
}

/**
 * Fetches passage HTML directly from the YouVersion Platform REST API.
 */
export async function fetchFromYouVersion(
  versionId: number,
  usfmRef: string,
  fallbackStartVerse = 1
): Promise<{ verses: VerseSegment[]; text: string }> {
  const url = `${YOUVERSION_API_BASE_URL}/bibles/${versionId}/passages/${encodeURIComponent(usfmRef)}?format=html&include_headings=true`;
  console.log(`[BibleService] Fetching from YouVersion API: ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: getYouVersionHeaders(),
    });
  } catch (netErr: any) {
    console.warn(`[BibleService] YouVersion API network error for ${usfmRef}:`, netErr?.message || netErr);
    throw new Error(`YouVersion network error: ${netErr?.message || 'Network unreachable'}`);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.warn(`[BibleService] YouVersion API error status ${response.status}: ${errorBody.slice(0, 150)}`);
    throw new Error(`YouVersion API error status: ${response.status}`);
  }

  const data = await response.json();
  const rawHtml = data.content || '';
  const verses = parseYouVersionHtml(rawHtml, fallbackStartVerse);
  const text = verses.map((v) => v.text).join(' ').trim();

  return { verses, text };
}

/**
 * Primary Unified Passage Fetcher.
 * 1. Checks AsyncStorage cache first.
 * 2. Fetches via YouVersion REST API.
 * 3. Appends required copyright attribution.
 * 4. Persists result to local storage.
 */
export async function fetchPassageText(
  passageInput: PassageReference | string,
  options: FetchPassageOptions = {}
): Promise<PassageFetchResult> {
  const versionId = options.versionId ?? resolveVersionId(options.translation);
  const versionMeta = getVersionMetadata(versionId);

  let normalizedInput = passageInput;
  if (typeof normalizedInput !== 'string' && normalizedInput?.segments) {
    if (normalizedInput.segments.some((s) => s.startChapter !== s.endChapter)) {
      normalizedInput = {
        ...normalizedInput,
        segments: normalizedInput.segments.flatMap(splitSegmentByChapters),
      };
    }
  }

  // Multi-segment compound references (e.g. John 3:16, Romans 8:1–8)
  if (typeof normalizedInput !== 'string' && normalizedInput.segments && normalizedInput.segments.length > 1) {
    const compoundCacheKey = buildBibleCacheKey(versionId, normalizedInput);

    if (!options.forceRefresh) {
      try {
        const cached = await safeStorage.getItem(compoundCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as PassageFetchResult;
          if (parsed && Array.isArray(parsed.verses) && parsed.verses.length > 0) {
            if (parsed.sections && normalizedInput.segments) {
              parsed.sections.forEach((s, idx) => {
                if (!s.segment && normalizedInput.segments[idx]) {
                  s.segment = normalizedInput.segments[idx];
                }
              });
            }
            return {
              ...parsed,
              source: 'cache',
              cached: true,
            };
          }
        }
      } catch {}
    }

    try {
      // Parallel segment fetching
      const segmentResults = await Promise.all(
        normalizedInput.segments.map(async (seg) => {
          const segUsfm = formatSegmentToUsfm(seg);
          const res = await fetchPassageText(segUsfm, options);
          return {
            title: formatSegmentDisplay(seg),
            verses: res.verses,
            text: res.text,
            segment: seg,
          };
        })
      );

      const allVerses: VerseSegment[] = [];
      const sections: MultiPassageSection[] = [];
      const allTexts: string[] = [];

      for (const sRes of segmentResults) {
        sections.push(sRes);
        allVerses.push(...sRes.verses);
        if (sRes.text) allTexts.push(sRes.text);
      }

      let attribution = versionMeta.fullName;
      let source: PassageFetchResult['source'] = 'youversion';
      if (versionId === 59) {
        attribution = ESV_COPYRIGHT_ATTRIBUTION;
        source = 'esv';
      } else {
        try {
          const versionInfo = await fetchVersionMetadata(versionId);
          attribution = versionInfo.attribution;
        } catch {}
      }

      const combinedResult: PassageFetchResult = {
        verses: allVerses,
        text: allTexts.join('\n\n'),
        sections,
        translation: versionMeta.shortName as BibleTranslation,
        versionId,
        source,
        cached: false,
        attribution,
      };

      if (allVerses.length > 0) {
        safeStorage
          .setItem(compoundCacheKey, JSON.stringify(combinedResult))
          .catch(() => {});
      }

      return combinedResult;
    } catch (err: any) {
      console.warn('[BibleService] Error fetching compound passages in parallel:', err);
    }
  }

  // Single segment / query
  const query = typeof normalizedInput === 'string' ? normalizedInput : formatPassageQuery(normalizedInput);
  const cacheKey = buildBibleCacheKey(versionId, normalizedInput);

  // 1. Check local AsyncStorage cache
  if (!options.forceRefresh) {
    try {
      const cachedData = await safeStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const verses: VerseSegment[] = Array.isArray(parsed.verses) ? parsed.verses : [];
        const text: string = parsed.text || verses.map((v) => v.text).join(' ');
        if (verses.length > 0 || text) {
          return {
            verses,
            text,
            sections: parsed.sections,
            translation: versionMeta.shortName as BibleTranslation,
            versionId,
            source: 'cache',
            cached: true,
            attribution: parsed.attribution || versionMeta.fullName,
          };
        }
      }
    } catch {}
  }

  // 2. Resolve USFM Reference
  const usfmRef = typeof normalizedInput === 'string'
    ? queryToUsfm(normalizedInput)
    : normalizedInput.segments && normalizedInput.segments.length > 0
    ? formatSegmentToUsfm(normalizedInput.segments[0])
    : queryToUsfm(query);

  const parsedQuery = parsePassageQuery(query);

  // 3. Fetch from API (Crossway ESV or YouVersion REST)
  try {
    let verses: VerseSegment[] = [];
    let text = '';
    let attribution = versionMeta.fullName;
    let source: PassageFetchResult['source'] = 'youversion';

    if (versionId === 59) {
      const esvResult = await fetchFromCrosswayEsv(query, options.esvApiKey);
      verses = esvResult.verses;
      text = esvResult.text;
      attribution = ESV_COPYRIGHT_ATTRIBUTION;
      source = 'esv';
    } else {
      const yvResult = await fetchFromYouVersion(versionId, usfmRef, parsedQuery.startVerse);
      verses = yvResult.verses;
      text = yvResult.text;
      try {
        const versionInfo = await fetchVersionMetadata(versionId);
        attribution = versionInfo.attribution;
      } catch {}
      source = 'youversion';
    }

    const result: PassageFetchResult = {
      verses,
      text,
      translation: versionMeta.shortName as BibleTranslation,
      versionId,
      source,
      cached: false,
      attribution,
    };

    // 4. Cache successful result
    if (verses.length > 0 || text) {
      safeStorage
        .setItem(cacheKey, JSON.stringify(result))
        .catch((cacheErr) => {
          console.warn(`[BibleService] Non-fatal cache write error for "${query}":`, cacheErr);
        });
    }

    return result;
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to fetch passage';
    console.error(`[BibleService] Fetch failed for "${query}" (${versionMeta.shortName}):`, errorMsg);

    return {
      verses: [],
      text: '',
      translation: versionMeta.shortName as BibleTranslation,
      versionId,
      source: versionId === 59 ? 'esv' : 'youversion',
      cached: false,
      error: errorMsg,
      attribution: versionId === 59 ? ESV_COPYRIGHT_ATTRIBUTION : versionMeta.fullName,
    };
  }
}

/**
 * Clears cached passage data and version metadata from AsyncStorage.
 */
export async function clearPassageCache(): Promise<void> {
  try {
    const keys = await safeStorage.getAllKeys();
    const bibleKeys = keys.filter((k) => k.startsWith('bible_cache_') || k.startsWith('yv_meta_'));
    await Promise.all(bibleKeys.map((k) => safeStorage.removeItem(k)));
    metadataMemoryCache.clear();
  } catch (err) {
    console.warn('[BibleService] Error clearing passage cache:', err);
  }
}

/**
 * Builds HTML document for Scripture rendering inside RenderHtml.
 */
export function buildScriptureHtml(
  sectionsOrVerses: MultiPassageSection[] | VerseSegment[],
  showVerseNumbers: boolean,
  textColor: string,
  verseNumColor: string,
  fontSize: number,
  lineHeight: number,
  defaultTitle?: string
): string {
  const isSections = sectionsOrVerses.length > 0 && 'verses' in sectionsOrVerses[0];

  const sections: MultiPassageSection[] = isSections
    ? (sectionsOrVerses as MultiPassageSection[])
    : [
        {
          title: defaultTitle || '',
          verses: sectionsOrVerses as VerseSegment[],
          text: '',
        },
      ];

  const sectionsHtml = sections
    .map((sec, idx) => {
      const titleHtml = sec.title
        ? `<div class="passage-header-title">${sec.title}</div>`
        : '';

      const dividerHtml =
        idx > 0
          ? `<div class="passage-divider"></div>`
          : '';

      const innerVerses = sec.verses
        .map((v: VerseSegment) => {
          const headingHtml = v.heading
            ? `<div class="scripture-subheading">${v.heading}</div>`
            : '';
          const numSpan = showVerseNumbers
            ? `<sup style="font-size:11px;font-weight:700;color:${verseNumColor};vertical-align:super;line-height:0;">${v.verseNumber}&nbsp;</sup>`
            : '';
          return `${headingHtml}${numSpan}<span>${v.text}&nbsp;</span>`;
        })
        .join('');

      return `${dividerHtml}${titleHtml}<div class="passage-body">${innerVerses}</div>`;
    })
    .join('');

  return `<div style="color:${textColor};font-size:${fontSize}px;line-height:${lineHeight}px;margin:0;padding:0;">
    <style>
      .passage-header-title {
        font-family: 'SourceSerifPro';
        font-size: ${fontSize + 6}px;
        font-weight: 700;
        color: #EDE7DD;
        margin-top: 6px;
        margin-bottom: 12px;
        border-bottom: 1px solid rgba(227, 165, 61, 0.25);
        padding-bottom: 6px;
      }
      .passage-divider {
        height: 1px;
        background-color: #332E27;
        margin-top: 18px;
        margin-bottom: 18px;
      }
      .scripture-subheading, .scripture-heading, h3, h4, b.heading {
        font-family: 'SourceSerifPro';
        font-weight: 700;
        color: #EDE7DD;
        display: block;
        margin-top: 14px;
        margin-bottom: 4px;
        font-size: ${fontSize + 1}px;
        line-height: ${Math.round((fontSize + 1) * 1.4)}px;
      }
    </style>
    ${sectionsHtml}
  </div>`;
}
