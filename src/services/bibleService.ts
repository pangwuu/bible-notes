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
  heading?: string;
}

export interface MultiPassageSection {
  title: string;
  verses: VerseSegment[];
  text: string;
}

/**
 * Builds HTML document for Scripture rendering inside RenderHtml.
 * Generates an intentional typography hierarchy:
 * 1. Passage Reference Title (e.g. John 3:16, Luke 1:1–80) - larger, bold
 * 2. Pericope Subheadings - bold, not significantly larger
 * 3. Scripture Verse Text - normal serif text with clean superscript verse numbers
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

export interface PassageFetchResult {
  verses: VerseSegment[];
  text: string;
  sections?: MultiPassageSection[];
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
      // If there are multiple paragraphs before the next verse marker,
      // the last paragraph may be a section heading for the upcoming verse
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
 * Helper to distinguish true section/pericope headings from broken poetry lines or clauses.
 */
export function isSectionHeading(candidate: string): boolean {
  const trimmed = candidate.replace(/<[^>]*>/g, '').trim();
  if (trimmed.length === 0 || trimmed.length > 75) return false;
  // If it starts with lowercase or quotation/bracket punctuation, it's a continuing clause
  if (/^[a-z“"‘'(\[]/.test(trimmed)) return false;
  // If it ends with clause/sentence punctuation (.,;:!?—–-), it's part of a verse
  if (/[.,;:!?—–-]$/.test(trimmed)) return false;
  // Poetry lines typically lead with lower/upper connecting prepositions or pronouns
  if (/^(for|because|to|and|that|with|from|he|she|they|you|we|i)\s+/i.test(trimmed)) return false;
  return true;
}

/**
 * Extracts pericope heading and clean verse text from bolls.life HTML string.
 * Many bolls translations embed headings as: "Heading<br/>Verse text..."
 */
export function extractBollsHeadingAndText(raw: string): { heading?: string; text: string } {
  if (!raw) return { text: '' };

  // Match leading candidate preceding <br/> or <br>
  const match = raw.match(/^([^<]+?)\s*<br\s*\/?>\s*([\s\S]+)$/i);
  if (match) {
    const candidate = match[1].replace(/<[^>]*>/g, '').trim();
    if (isSectionHeading(candidate)) {
      const rest = cleanHtml(match[2]);
      return {
        heading: candidate,
        text: rest,
      };
    }
  }

  return {
    text: cleanHtml(raw),
  };
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
  const allSegments: VerseSegment[] = [];

  for (let ch = startChapter; ch <= endChapter; ch++) {
    const url = `${BOLLS_LIFE_BASE_URL}get-chapter/${slug}/${bookNum}/${ch}/`;
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
      if (ch === startChapter) {
        return v.verse >= startVerse;
      }
      if (ch === endChapter) {
        return v.verse <= endVerse;
      }
      return true;
    });

    for (const v of matching) {
      const parsed = extractBollsHeadingAndText(v.text);
      allSegments.push({
        verseNumber: v.verse,
        text: parsed.text,
        heading: parsed.heading,
      });
    }
  }

  return allSegments;
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

import { formatSegmentDisplay } from '../utils/passageParser';

/**
 * Primary Unified Passage Fetcher.
 * Checks AsyncStorage cache first, resolves translation, executes provider query with graceful fallbacks,
 * and caches results. Supports multi-segment compound references.
 */
export async function fetchPassageText(
  passageInput: PassageReference | string,
  options: FetchPassageOptions = {}
): Promise<PassageFetchResult> {
  const translation: BibleTranslation = options.translation || 'ESV';

  // Multi-segment handling:
  if (typeof passageInput !== 'string' && passageInput.segments && passageInput.segments.length > 1) {
    const combinedTitle = passageInput.displayString || formatPassageQuery(passageInput);
    const compoundCacheKey = buildBibleCacheKey(translation, combinedTitle);

    if (!options.forceRefresh) {
      try {
        const cached = await safeStorage.getItem(compoundCacheKey);
        if (cached) {
          return JSON.parse(cached) as PassageFetchResult;
        }
      } catch {}
    }

    try {
      // Fetch each segment in parallel
      const segmentResults = await Promise.all(
        passageInput.segments.map(async (seg) => {
          const segQuery = formatPassageQuery(seg);
          const res = await fetchPassageText(segQuery, options);
          return {
            title: formatSegmentDisplay(seg),
            verses: res.verses,
            text: res.text,
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

      const combinedResult: PassageFetchResult = {
        verses: allVerses,
        text: allTexts.join('\n\n'),
        sections,
        translation,
        source: 'esv',
        cached: false,
      };

      safeStorage
        .setItem(compoundCacheKey, JSON.stringify(combinedResult))
        .catch(() => {});

      return combinedResult;
    } catch (err: any) {
      console.warn('[BibleService] Error fetching compound passages in parallel:', err);
    }
  }

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
          sections: parsed.sections,
          translation,
          source: 'cache',
          cached: true,
        };
      }
    } catch {
      // Continue to network fetch if cache read throws
    }
  }

  const parsed: { book: string; startChapter: number; startVerse: number; endChapter: number; endVerse: number } =
    typeof passageInput === 'string'
      ? parsePassageQuery(passageInput)
      : passageInput.segments && passageInput.segments.length > 0
      ? passageInput.segments[0]
      : (passageInput as any).book
      ? (passageInput as any)
      : parsePassageQuery(query);
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

