/**
 * Bible Service & Scripture Caching Layer
 * Provides multi-translation Scripture text fetching across:
 * ESV, WEB, KJV, ASV, BBE, NIV, CSB, NLT
 * 
 * Data Sources:
 * - Crossway ESV API (official text endpoint with default Bearer token or user override)
 * - bolls.life REST API (free multi-translation access)
 * - bible-api.com (public domain fallback)
 * 
 * Strict compliance with DESIGN.md and AsyncStorage caching specifications.
 */

import safeStorage from '../utils/safeStorage';
import { PassageReference } from '../types/note';
import { BibleTranslation } from '../types/user';
import { findCanonicalBook, CANONICAL_BOOKS } from '../constants/bibleData';

export const DEFAULT_ESV_API_TOKEN = '6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba';
export const ESV_API_BASE_URL = 'https://api.esv.org/v3/passage/text/';
export const BIBLE_API_BASE_URL = 'https://bible-api.com/';
export const BOLLS_LIFE_BASE_URL = 'https://bolls.life/';

export interface TranslationMetadata {
  id: BibleTranslation;
  shortName: string;
  fullName: string;
  isPublicDomain: boolean;
}

export const SUPPORTED_TRANSLATIONS: TranslationMetadata[] = [
  { id: 'ESV', shortName: 'ESV', fullName: 'English Standard Version', isPublicDomain: false },
  { id: 'NIV', shortName: 'NIV', fullName: 'New International Version', isPublicDomain: false },
  { id: 'NLT', shortName: 'NLT', fullName: 'New Living Translation', isPublicDomain: false },
  // Temporarily disabled:
  // { id: 'CSB', shortName: 'CSB', fullName: 'Christian Standard Bible', isPublicDomain: false },
  // { id: 'KJV', shortName: 'KJV', fullName: 'King James Version', isPublicDomain: true },
  { id: 'WEB', shortName: 'WEB', fullName: 'World English Bible', isPublicDomain: true },
  // { id: 'ASV', shortName: 'ASV', fullName: 'American Standard Version', isPublicDomain: true },
  { id: 'BBE', shortName: 'BBE', fullName: 'Bible in Basic English', isPublicDomain: true },
];

export interface VerseSegment {
  verseNumber: number;
  text: string;
}

export interface PassageFetchResult {
  verses: VerseSegment[];
  text: string;
  translation: BibleTranslation;
  source: 'cache' | 'esv' | 'bolls' | 'web';
  cached: boolean;
  error?: string;
  debugInfo?: string;
}

export interface FetchPassageOptions {
  translation?: BibleTranslation;
  esvApiKey?: string;
  forceRefresh?: boolean;
}

/**
 * Builds standard cache key: bible_cache_${translation.toLowerCase()}_${sanitizedPassage}
 * Conforms to specs.md and testHelpers.ts oracle.
 */
export function buildBibleCacheKey(translation: string, passageRef: string): string {
  const trans = (translation || 'esv').toLowerCase();
  const sanitized = passageRef.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  return `bible_cache_${trans}_${sanitized}`;
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
  passage: PassageReference | { book: string; startChapter: number; startVerse: number; endChapter: number; endVerse: number }
): string {
  const { book, startChapter, startVerse, endChapter, endVerse } = passage;
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
  const clean = query.trim();
  const match = clean.match(/^([0-9]?\s*[A-Za-z]+)\s+([0-9]+):([0-9]+)(?:[-–—](?:([0-9]+):)?([0-9]+))?/);
  if (!match) {
    return {
      book: 'John',
      startChapter: 3,
      startVerse: 16,
      endChapter: 3,
      endVerse: 16,
    };
  }

  const book = match[1].trim();
  const startChapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  const endChapter = match[4] ? parseInt(match[4], 10) : startChapter;
  const endVerse = match[5] ? parseInt(match[5], 10) : startVerse;

  return { book, startChapter, startVerse, endChapter, endVerse };
}

/**
 * Helper to parse raw text with [N] markers into structured VerseSegment[]
 */
export function parseBracketVerses(rawText: string, fallbackStartVerse = 1): VerseSegment[] {
  if (!rawText) return [];
  const segments: VerseSegment[] = [];
  const regex = /\[(\d+)\]\s*([^[]*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawText)) !== null) {
    const verseNumber = parseInt(match[1], 10);
    const text = match[2].trim();
    if (text.length > 0) {
      segments.push({ verseNumber, text });
    }
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
 * Fetches passage text from Crossway ESV API.
 */
export async function fetchFromCrosswayEsv(passageQuery: string, customApiKey?: string): Promise<VerseSegment[]> {
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
    throw new Error(`ESV API error status: ${response.status}`);
  }

  const data = await response.json();
  const passages: string[] = data.passages || [];
  if (passages.length === 0) {
    console.warn('[BibleService] No passage text returned from ESV API');
    throw new Error('No passage text returned from ESV API');
  }

  const combined = passages.join('\n\n').trim();
  const parsedRef = parsePassageQuery(passageQuery);
  return parseBracketVerses(combined, parsedRef.startVerse);
}

/**
 * Processes HTML from multi-translation responses (bolls.life / APIs).
 * Preserves section headings (h3, h4, b, div.s) while cleaning raw noise.
 */
function cleanHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<(?:h[1-6]|b|strong|div class="s[^"]*")[^>]*>(.*?)<\/(?:h[1-6]|b|strong|div)>/gi, '<b class="heading">$1</b><br/>')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps app BibleTranslation code to bolls.life translation slug.
 */
function toBollsSlug(translation: BibleTranslation): string {
  switch (translation) {
    case 'CSB':
      return 'CSB17';
    case 'NIV':
      return 'NIV';
    case 'NLT':
      return 'NLT';
    case 'KJV':
      return 'KJV';
    case 'WEB':
      return 'WEB';
    case 'ASV':
      return 'ASV';
    case 'BBE':
      return 'YLT'; // fallback to Young's Literal on bolls if BBE not hosted
    case 'ESV':
    default:
      return 'ESV';
  }
}

/**
 * Fetches passage text from bolls.life REST API.
 */
export async function fetchFromBolls(
  translation: BibleTranslation,
  bookName: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): Promise<VerseSegment[]> {
  const bookNum = getBookNumber(bookName);
  const slug = toBollsSlug(translation);
  const url = `${BOLLS_LIFE_BASE_URL}get-chapter/${slug}/${bookNum}/${startChapter}/`;

  console.log(`[BibleService] Fetching from bolls.life: ${url}`);
  let response: Response;
  try {
    response = await fetch(url);
  } catch (netErr: any) {
    console.warn(`[BibleService] bolls.life network request failed for ${url}:`, netErr?.message || netErr);
    throw new Error(`bolls.life network error: ${netErr?.message || 'Network unreachable'}`);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.warn(`[BibleService] bolls.life error status ${response.status}: ${errorBody.slice(0, 150)}`);
    throw new Error(`bolls.life error status: ${response.status}`);
  }

  const verses: Array<{ verse: number; text: string }> = await response.json();
  if (!Array.isArray(verses) || verses.length === 0) {
    console.warn(`[BibleService] No verses returned from bolls.life for ${slug}`);
    throw new Error(`No verses returned from bolls.life for ${slug}`);
  }

  // Filter verses within chapter boundaries
  const matching = verses.filter((v) => {
    if (startChapter === endChapter) {
      return v.verse >= startVerse && v.verse <= endVerse;
    }
    return v.verse >= startVerse;
  });

  return matching.map((v) => ({
    verseNumber: v.verse,
    text: cleanHtml(v.text),
  }));
}

/**
 * Fetches passage text from public domain bible-api.com.
 */
export async function fetchFromBibleApi(translation: BibleTranslation, passageQuery: string): Promise<VerseSegment[]> {
  const transParam = translation.toLowerCase();
  const url = `${BIBLE_API_BASE_URL}${encodeURIComponent(passageQuery.toLowerCase().replace(/\s+/g, '+'))}?translation=${transParam}`;

  console.log(`[BibleService] Fetching from bible-api.com: ${url}`);
  let response: Response;
  try {
    response = await fetch(url);
  } catch (netErr: any) {
    console.warn(`[BibleService] bible-api.com network request failed for ${url}:`, netErr?.message || netErr);
    throw new Error(`bible-api.com network error: ${netErr?.message || 'Network unreachable'}`);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.warn(`[BibleService] bible-api.com error status ${response.status}: ${errorBody.slice(0, 150)}`);
    throw new Error(`bible-api.com error status: ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data?.verses) && data.verses.length > 0) {
    return data.verses.map((v: any) => ({
      verseNumber: v.verse,
      text: (v.text || '').trim(),
    }));
  }

  if (!data || !data.text) {
    console.warn('[BibleService] No text returned from bible-api.com');
    throw new Error('No text returned from bible-api.com');
  }

  const parsedRef = parsePassageQuery(passageQuery);
  return parseBracketVerses(data.text, parsedRef.startVerse);
}

/**
 * Primary Unified Passage Fetcher.
 * Checks AsyncStorage cache first, resolves translation, executes provider query with graceful fallbacks,
 * and caches results.
 */
export async function fetchPassageText(
  passageInput: PassageReference | string,
  options: FetchPassageOptions = {}
): Promise<PassageFetchResult> {
  const translation: BibleTranslation = options.translation || 'ESV';
  const query = typeof passageInput === 'string' ? passageInput : formatPassageQuery(passageInput);
  const cacheKey = buildBibleCacheKey(translation, query);

  // 1. Check local AsyncStorage cache
  if (!options.forceRefresh) {
    try {
      const cachedData = await safeStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const verses: VerseSegment[] = Array.isArray(parsed.verses) ? parsed.verses : [];
        const text: string = parsed.text || verses.map((v) => v.text).join(' ');
        return {
          verses,
          text,
          translation,
          source: 'cache',
          cached: true,
        };
      }
    } catch {
      // Continue to network fetch if cache read throws
    }
  }

  const parsed = typeof passageInput === 'string' ? parsePassageQuery(passageInput) : passageInput;
  let verses: VerseSegment[] = [];
  let source: 'esv' | 'bolls' | 'web' = 'esv';

  // 2. Fetch based on translation requested
  try {
    if (translation === 'ESV') {
      try {
        verses = await fetchFromCrosswayEsv(query, options.esvApiKey);
        source = 'esv';
      } catch (esvErr) {
        // Fallback to bolls.life for ESV
        try {
          verses = await fetchFromBolls(
            'ESV',
            parsed.book,
            parsed.startChapter,
            parsed.startVerse,
            parsed.endChapter,
            parsed.endVerse
          );
          source = 'bolls';
        } catch {
          // Final fallback to WEB via bible-api.com
          verses = await fetchFromBibleApi('WEB', query);
          source = 'web';
        }
      }
    } else if (translation === 'NIV' || translation === 'NLT' || translation === 'CSB') {
      try {
        verses = await fetchFromBolls(
          translation,
          parsed.book,
          parsed.startChapter,
          parsed.startVerse,
          parsed.endChapter,
          parsed.endVerse
        );
        source = 'bolls';
      } catch {
        // Fallback to ESV or WEB if primary bolls.life fetch fails
        try {
          verses = await fetchFromCrosswayEsv(query, options.esvApiKey);
          source = 'esv';
        } catch {
          verses = await fetchFromBibleApi('WEB', query);
          source = 'web';
        }
      }
    } else if (translation === 'BBE') {
      try {
        verses = await fetchFromBibleApi('BBE', query);
        source = 'web';
      } catch {
        verses = await fetchFromBolls(
          'BBE',
          parsed.book,
          parsed.startChapter,
          parsed.startVerse,
          parsed.endChapter,
          parsed.endVerse
        );
        source = 'bolls';
      }
    } else {
      // WEB, KJV, ASV
      try {
        verses = await fetchFromBolls(
          translation,
          parsed.book,
          parsed.startChapter,
          parsed.startVerse,
          parsed.endChapter,
          parsed.endVerse
        );
        source = 'bolls';
      } catch {
        verses = await fetchFromBibleApi(translation, query);
        source = 'web';
      }
    }

    const text = verses.map((v) => v.text).join(' ').trim();

    // 3. Persist to cache on success (decoupled & non-blocking)
    if (verses.length > 0 || text) {
      safeStorage
        .setItem(cacheKey, JSON.stringify({ verses, text, translation, source }))
        .catch((cacheErr) => {
          console.warn(`[BibleService] Non-fatal cache write error for "${query}":`, cacheErr);
        });
    }

    return {
      verses,
      text,
      translation,
      source,
      cached: false,
    };
  } catch (err: any) {
    const rawError = err?.message || String(err) || 'Failed to fetch passage';
    console.error(`[BibleService] All providers failed for query "${query}" (${translation}):`, rawError);

    // 4. Offline / Failure handling
    // Check if any translation is cached for this passage as a last resort
    try {
      const fallbackEsv = await safeStorage.getItem(buildBibleCacheKey('esv', query));
      if (fallbackEsv) {
        const parsedCached = JSON.parse(fallbackEsv);
        const cachedVerses = Array.isArray(parsedCached.verses) ? parsedCached.verses : [];
        console.log(`[BibleService] Retrieved fallback ESV from cache for "${query}"`);
        return {
          verses: cachedVerses,
          text: parsedCached.text || cachedVerses.map((v: any) => v.text).join(' '),
          translation: 'ESV',
          source: 'cache',
          cached: true,
        };
      }
    } catch {}

    return {
      verses: [],
      text: '',
      translation,
      source: 'web',
      cached: false,
      error: 'offline',
      debugInfo: `Query: "${query}" | Translation: ${translation} | Reason: ${rawError}`,
    };
  }
}

/**
 * Removes all cached Scripture passages from safeStorage.
 */
export async function clearPassageCache(): Promise<void> {
  try {
    const keys = await safeStorage.getAllKeys();
    const bibleKeys = keys.filter((k) => k.startsWith('bible_cache_'));
    if (bibleKeys.length > 0) {
      await Promise.all(bibleKeys.map((k) => safeStorage.removeItem(k)));
    }
  } catch (err) {
    console.warn('Failed to clear passage cache:', err);
  }
}

