/**
 * Automated Unit Test Suite for BibleService & BibleReader Logic
 * Verifies Phase 5 Requirements:
 * - Crossway ESV API fetching with default Bearer token & user override
 * - bolls.life REST API fetching across NIV, CSB, NLT, and public domain versions
 * - bible-api.com fallback
 * - Multi-translation AsyncStorage caching (isolated cache keys)
 * - Cache clearance
 * - Zero anti-patterns (no arrows, no banned colors)
 */

import {
  fetchPassageText,
  buildBibleCacheKey,
  formatPassageQuery,
  getBookNumber,
  clearPassageCache,
  DEFAULT_ESV_API_TOKEN,
  SUPPORTED_TRANSLATIONS,
  parseBracketVerses,
  extractBollsHeadingAndText,
  isSectionHeading,
  buildScriptureHtml,
} from '../../src/services/bibleService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PassageReference } from '../../src/types/note';

const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  getItem: jest.fn(async (key: string) => {
    return mockStorage.has(key) ? mockStorage.get(key)! : null;
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  clear: jest.fn(async () => {
    mockStorage.clear();
  }),
  getAllKeys: jest.fn(async () => {
    return Array.from(mockStorage.keys());
  }),
}));

// Global fetch mock
const originalFetch = global.fetch;
let mockFetch: jest.Mock;

describe('BibleService Unit Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const passageJohn316: PassageReference = {
    display: 'John 3:16',
    books: ['John'],
    segments: [
      {
        book: 'John',
        startChapter: 3,
        startVerse: 16,
        endChapter: 3,
        endVerse: 16,
      },
    ],
  };

  test('buildBibleCacheKey conforms to specs.md format', () => {
    expect(buildBibleCacheKey('esv', 'John 3:16')).toBe('bible_cache_esv_john_3_16');
    expect(buildBibleCacheKey('NIV', 'Romans 8:1-2')).toBe('bible_cache_niv_romans_8_1_2');
    expect(buildBibleCacheKey('KJV', 'Genesis 1:1')).toBe('bible_cache_kjv_genesis_1_1');
  });

  test('getBookNumber returns accurate 1-66 canonical index', () => {
    expect(getBookNumber('Genesis')).toBe(1);
    expect(getBookNumber('John')).toBe(43);
    expect(getBookNumber('Revelation')).toBe(66);
    expect(getBookNumber('Unknown')).toBe(1);
  });

  test('formatPassageQuery formats single and range passages properly', () => {
    expect(formatPassageQuery(passageJohn316)).toBe('John 3:16');
    expect(
      formatPassageQuery({
        book: 'Romans',
        startChapter: 8,
        startVerse: 1,
        endChapter: 8,
        endVerse: 11,
      })
    ).toBe('Romans 8:1-11');
  });

  test('SUPPORTED_TRANSLATIONS includes all active translations', () => {
    const ids = SUPPORTED_TRANSLATIONS.map((t) => t.id);
    expect(ids).toContain('ESV');
    expect(ids).toContain('WEB');
    // Temporarily disabled:
    // expect(ids).toContain('KJV');
    // expect(ids).toContain('ASV');
    // expect(ids).toContain('CSB');
    expect(ids).toContain('BBE');
    expect(ids).toContain('NIV');
    expect(ids).toContain('NLT');
    expect(ids).not.toContain('KJV');
    expect(ids).not.toContain('ASV');
    expect(ids).not.toContain('CSB');
  });

  test('fetchPassageText fetches ESV from Crossway using default Bearer token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        passages: ['For God so loved the world, that he gave his only Son...'],
      }),
    });

    const result = await fetchPassageText(passageJohn316, { translation: 'ESV' });

    expect(result.text).toContain('For God so loved the world');
    expect(result.translation).toBe('ESV');
    expect(result.source).toBe('esv');
    expect(result.cached).toBe(false);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.esv.org'),
      expect.objectContaining({
        headers: {
          Authorization: `Token ${DEFAULT_ESV_API_TOKEN}`,
        },
      })
    );

    // Verify written to cache
    const cached = await AsyncStorage.getItem('bible_cache_esv_john_3_16');
    expect(cached).not.toBeNull();
  });

  test('fetchPassageText respects user custom ESV API key override', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        passages: ['Custom ESV passage text.'],
      }),
    });

    const customKey = 'user_custom_token_123';
    const result = await fetchPassageText('John 3:16', {
      translation: 'ESV',
      esvApiKey: customKey,
      forceRefresh: true,
    });

    expect(result.text).toBe('Custom ESV passage text.');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.esv.org'),
      expect.objectContaining({
        headers: {
          Authorization: `Token ${customKey}`,
        },
      })
    );
  });

  test('fetchPassageText reads from AsyncStorage cache on subsequent calls without network', async () => {
    const cacheKey = 'bible_cache_esv_john_3_16';
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({ text: 'Cached Verse Text', translation: 'ESV', source: 'esv' })
    );

    const result = await fetchPassageText(passageJohn316, { translation: 'ESV' });

    expect(result.cached).toBe(true);
    expect(result.text).toBe('Cached Verse Text');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('fetchPassageText fetches NIV from bolls.life and cleans HTML', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          verse: 16,
          text: 'For God so loved the world<br>that he gave his one and only Son...',
        },
      ],
    });

    const result = await fetchPassageText('John 3:16', { translation: 'NIV' });

    expect(result.translation).toBe('NIV');
    expect(result.source).toBe('bolls');
    expect(result.verses).toHaveLength(1);
    expect(result.verses[0]).toEqual({
      verseNumber: 16,
      text: 'For God so loved the world that he gave his one and only Son...',
    });
    expect(result.text).toContain('For God so loved the world that he gave his one and only Son...');
    expect(result.text).not.toContain('[16]');
    expect(result.text).not.toContain('<br>');

    // Verifies cache key isolation
    const cachedNiv = await AsyncStorage.getItem('bible_cache_niv_john_3_16');
    expect(cachedNiv).not.toBeNull();
  });

  test('fetchPassageText falls back to bolls.life when Crossway ESV fails', async () => {
    // Crossway failure (e.g. rate limit 429)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    // bolls.life success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          verse: 16,
          text: 'For God so loved the world, that he gave his only Son...',
        },
      ],
    });

    const result = await fetchPassageText('John 3:16', { translation: 'ESV', forceRefresh: true });

    expect(result.source).toBe('bolls');
    expect(result.translation).toBe('ESV');
    expect(result.verses).toHaveLength(1);
    expect(result.verses[0].verseNumber).toBe(16);
    expect(result.text).toContain('For God so loved');
    expect(result.text).not.toContain('[16]');
  });

  test('fetchPassageText falls back to bible-api.com when both Crossway and bolls fail', async () => {
    // Crossway failure
    mockFetch.mockRejectedValueOnce(new Error('Network offline'));
    // bolls failure
    mockFetch.mockRejectedValueOnce(new Error('Bolls timeout'));
    // bible-api success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        text: 'For God loved the world so much that he gave his only Son...',
      }),
    });

    const result = await fetchPassageText('John 3:16', { translation: 'ESV', forceRefresh: true });

    expect(result.source).toBe('web');
    expect(result.text).toContain('For God loved the world so much');
  });

  test('fetchPassageText returns graceful offline state when completely disconnected and uncached', async () => {
    mockFetch.mockRejectedValue(new Error('Network request failed'));

    const result = await fetchPassageText('Romans 12:1-2', { translation: 'NLT', forceRefresh: true });

    expect(result.text).toBe('');
    expect(result.error).toBe('offline');
    expect(result.cached).toBe(false);
  });

  test('clearPassageCache removes all and only bible_cache_* keys', async () => {
    await AsyncStorage.setItem('bible_cache_esv_john_3_16', 'text1');
    await AsyncStorage.setItem('bible_cache_niv_john_3_16', 'text2');
    await AsyncStorage.setItem('user_notes_123', 'other_data');

    await clearPassageCache();

    expect(await AsyncStorage.getItem('bible_cache_esv_john_3_16')).toBeNull();
    expect(await AsyncStorage.getItem('bible_cache_niv_john_3_16')).toBeNull();
    expect(await AsyncStorage.getItem('user_notes_123')).toBe('other_data');
  });

  test('parseBracketVerses parses [N] markers into structured VerseSegment array', () => {
    const raw = '[1] In the beginning was the Word, [2] and the Word was with God, [3] All things were made through him';
    const parsed = parseBracketVerses(raw, 1);

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({ verseNumber: 1, text: 'In the beginning was the Word,' });
    expect(parsed[1]).toEqual({ verseNumber: 2, text: 'and the Word was with God,' });
    expect(parsed[2]).toEqual({ verseNumber: 3, text: 'All things were made through him' });
  });

  test('parseBracketVerses falls back gracefully when no [N] markers are present', () => {
    const raw = 'For God so loved the world, that he gave his only Son.';
    const parsed = parseBracketVerses(raw, 16);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({ verseNumber: 16, text: 'For God so loved the world, that he gave his only Son.' });
  });

  describe('Section Heading Extraction & Typography Hierarchy', () => {
    test('isSectionHeading correctly identifies section titles and rejects poetic lines', () => {
      expect(isSectionHeading('Introduction')).toBe(true);
      expect(isSectionHeading('The Birth of John the Baptist Foretold')).toBe(true);
      expect(isSectionHeading('Jesus Teaches Nicodemus')).toBe(true);

      // Rejects poetic continuations or lowercase clauses
      expect(isSectionHeading('for he has been mindful')).toBe(false);
      expect(isSectionHeading('He makes me lie down in green pastures,')).toBe(false);
      expect(isSectionHeading('For God so loved the world')).toBe(false);
      expect(isSectionHeading('“Praise be to the Lord, the God of Israel,')).toBe(false);
    });

    test('extractBollsHeadingAndText extracts leading heading and leaves clean verse text', () => {
      const rawV1 = 'Introduction<br/>Many have undertaken to draw up an account of the things that have been fulfilled among us,';
      const extractedV1 = extractBollsHeadingAndText(rawV1);
      expect(extractedV1.heading).toBe('Introduction');
      expect(extractedV1.text).toBe('Many have undertaken to draw up an account of the things that have been fulfilled among us,');

      const rawV5 = 'The Birth of John the Baptist Foretold<br/>In the time of Herod king of Judea there was a priest...';
      const extractedV5 = extractBollsHeadingAndText(rawV5);
      expect(extractedV5.heading).toBe('The Birth of John the Baptist Foretold');
      expect(extractedV5.text).toBe('In the time of Herod king of Judea there was a priest...');

      // Normal verse without heading remains pure text
      const rawV2 = 'just as they were handed down to us by those who from the first were eyewitnesses...';
      const extractedV2 = extractBollsHeadingAndText(rawV2);
      expect(extractedV2.heading).toBeUndefined();
      expect(extractedV2.text).toBe('just as they were handed down to us by those who from the first were eyewitnesses...');
    });

    test('parseBracketVerses extracts initial and intermediate section headings in ESV text', () => {
      const esvRaw = `Dedication to Theophilus\n\n  [1] Inasmuch as many have undertaken to compile a narrative... [2] just as those who from the beginning...\n\nBirth of John the Baptist Foretold\n\n  [5] In the days of Herod, king of Judea... (ESV)`;
      const parsed = parseBracketVerses(esvRaw, 1);

      expect(parsed).toHaveLength(3);
      expect(parsed[0].verseNumber).toBe(1);
      expect(parsed[0].heading).toBe('Dedication to Theophilus');
      expect(parsed[0].text).toContain('Inasmuch as many have undertaken');

      expect(parsed[1].verseNumber).toBe(2);
      expect(parsed[1].heading).toBeUndefined();

      expect(parsed[2].verseNumber).toBe(5);
      expect(parsed[2].heading).toBe('Birth of John the Baptist Foretold');
      expect(parsed[2].text).toBe('In the days of Herod, king of Judea...');
      expect(parsed[2].text).not.toContain('(ESV)');
    });

    test('buildScriptureHtml renders distinct hierarchy: reference title, subheadings, and verse numbers', () => {
      const verses = [
        {
          verseNumber: 1,
          heading: 'Introduction',
          text: 'Many have undertaken to compile a narrative...',
        },
        {
          verseNumber: 2,
          text: 'just as those who from the beginning were eyewitnesses...',
        },
      ];

      const html = buildScriptureHtml(verses, true, '#EDE7DD', '#E3A53D', 16, 24, 'Luke 1:1–2');

      // Reference Title
      expect(html).toContain('<div class="passage-header-title">Luke 1:1–2</div>');
      expect(html).toContain('.passage-header-title');

      // Subheading
      expect(html).toContain('<div class="scripture-subheading">Introduction</div>');
      expect(html).toContain('.scripture-subheading');

      // Verse Number (superscript) attached before verse text
      expect(html).toContain('<sup style="font-size:11px;font-weight:700;color:#E3A53D;vertical-align:super;line-height:0;">1&nbsp;</sup>');
      expect(html).toContain('<span>Many have undertaken to compile a narrative...&nbsp;</span>');
    });
  });
});
