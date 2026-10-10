/**
 * Automated Unit Test Suite for BibleService & YouVersion Platform Integration
 * Verifies:
 * - YouVersion REST API passage fetching with App Key header
 * - YouVersion metadata & copyright attribution retrieval
 * - USFM reference conversion (queryToUsfm, formatSegmentToUsfm)
 * - HTML verse parsing with pericope heading extraction and footnote stripping
 * - Multi-translation AsyncStorage caching (isolated versionId cache keys)
 * - Cache clearance
 */

import {
  fetchPassageText,
  buildBibleCacheKey,
  formatPassageQuery,
  getBookNumber,
  clearPassageCache,
  SUPPORTED_TRANSLATIONS,
  parseYouVersionHtml,
  fetchVersionMetadata,
  buildScriptureHtml,
  YOUVERSION_API_BASE_URL,
} from '../../src/services/bibleService';
import {
  SUPPORTED_BIBLE_VERSIONS,
  DEFAULT_BIBLE_VERSION_ID,
  resolveVersionId,
} from '../../src/constants/bibleVersions';
import { queryToUsfm, formatSegmentToUsfm } from '../../src/utils/usfmUtils';
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

describe('BibleService & YouVersion API Unit Tests', () => {
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

  test('resolveVersionId handles numbers, abbreviations, and defaults to ESV (59)', () => {
    expect(resolveVersionId(59)).toBe(59);
    expect(resolveVersionId('ESV')).toBe(59);
    expect(resolveVersionId(3034)).toBe(3034);
    expect(resolveVersionId('BSB')).toBe(3034);
    expect(resolveVersionId('WEB')).toBe(206);
    expect(resolveVersionId('ASV')).toBe(12);
    expect(resolveVersionId('NIV')).toBe(111);
    expect(resolveVersionId('NASB')).toBe(2692);
    expect(resolveVersionId('NIRV')).toBe(110);
    expect(resolveVersionId('AMP')).toBe(1588);
    expect(resolveVersionId('unknown')).toBe(DEFAULT_BIBLE_VERSION_ID);
    expect(resolveVersionId(undefined)).toBe(DEFAULT_BIBLE_VERSION_ID);
  });

  test('buildBibleCacheKey conforms to version ID format and canonicalizes to USFM', () => {
    expect(buildBibleCacheKey('BSB', 'John 3:16')).toBe('bible_cache_3034_jhn_3_16');
    expect(buildBibleCacheKey('BSB', 'JHN.3.16')).toBe('bible_cache_3034_jhn_3_16');
    expect(buildBibleCacheKey(59, 'Romans 8:1-2')).toBe('bible_cache_59_rom_8_1_2');
    expect(buildBibleCacheKey('WEB', 'Genesis 1:1')).toBe('bible_cache_206_gen_1_1');
    expect(buildBibleCacheKey(111, passageJohn316)).toBe('bible_cache_111_jhn_3_16');
  });

  test('queryToUsfm converts queries into canonical USFM passage IDs', () => {
    expect(queryToUsfm('John 3:16')).toBe('JHN.3.16');
    expect(queryToUsfm('Romans 8:1-8')).toBe('ROM.8.1-8');
    expect(queryToUsfm('Luke 12')).toBe('LUK.12');
    expect(queryToUsfm('Genesis 1:1')).toBe('GEN.1.1');
    expect(queryToUsfm('1 Corinthians 13:4-7')).toBe('1CO.13.4-7');
  });

  test('formatSegmentToUsfm converts PassageSegment into USFM reference', () => {
    expect(
      formatSegmentToUsfm({
        book: 'John',
        startChapter: 3,
        startVerse: 16,
        endChapter: 3,
        endVerse: 16,
      })
    ).toBe('JHN.3.16');

    expect(
      formatSegmentToUsfm({
        book: 'Romans',
        startChapter: 8,
        startVerse: 1,
        endChapter: 8,
        endVerse: 8,
      })
    ).toBe('ROM.8.1-8');
  });

  test('getBookNumber returns accurate 1-66 canonical index', () => {
    expect(getBookNumber('Genesis')).toBe(1);
    expect(getBookNumber('John')).toBe(43);
    expect(getBookNumber('Revelation')).toBe(66);
    expect(getBookNumber('Unknown')).toBe(1);
  });

  test('SUPPORTED_TRANSLATIONS includes all active supported translations', () => {
    const codes = SUPPORTED_BIBLE_VERSIONS.map((t) => t.code);
    expect(codes).toContain('ESV');
    expect(codes).toContain('BSB');
    expect(codes).toContain('WEB');
    expect(codes).toContain('ASV');
    expect(codes).toContain('FBV');
    expect(codes).toContain('LSV');
    expect(codes).toContain('GNV');
    expect(codes).toContain('CPDV');
  });

  test('every supported translation has a full name and summary', () => {
    for (const version of SUPPORTED_BIBLE_VERSIONS) {
      expect(version.fullName.trim().length).toBeGreaterThan(0);
      expect(version.summary.trim().length).toBeGreaterThan(0);
    }
  });

  test('fetchPassageText fetches ESV passage from Crossway API and caches it', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: 'John 3:16',
        passages: ['[16] For God so loved the world, that he gave his only Son.'],
      }),
    });

    const result = await fetchPassageText(passageJohn316, { translation: 'ESV' });

    expect(result.text).toContain('For God so loved the world');
    expect(result.translation).toBe('ESV');
    expect(result.versionId).toBe(59);
    expect(result.source).toBe('esv');
    expect(result.cached).toBe(false);
    expect(result.attribution).toContain('Crossway');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.esv.org'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Token'),
        }),
      })
    );
  });

  test('fetchPassageText fetches passage from YouVersion REST API and caches it', async () => {
    // 1. Mock YouVersion passage call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'JHN.3.16',
        content: '<p><span class="v">16</span>For God so loved the world that he gave his one and only Son.</p>',
        reference: 'John 3:16',
      }),
    });

    // 2. Mock YouVersion metadata call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 111,
        title: 'New International Version',
        copyright: 'Holy Bible, New International Version®, NIV® Copyright © 1973 by Biblica, Inc.®',
      }),
    });

    const result = await fetchPassageText(passageJohn316, { translation: 'NIV' });

    expect(result.text).toContain('For God so loved the world');
    expect(result.translation).toBe('NIV');
    expect(result.versionId).toBe(111);
    expect(result.source).toBe('youversion');
    expect(result.cached).toBe(false);
    expect(result.attribution).toContain('Biblica');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`${YOUVERSION_API_BASE_URL}/bibles/111/passages/JHN.3.16`),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept': 'application/json',
        }),
      })
    );

    // Verify written to AsyncStorage cache with canonical USFM key
    const cached = await AsyncStorage.getItem('bible_cache_111_jhn_3_16');
    expect(cached).not.toBeNull();
  });

  test('fetchPassageText reads from AsyncStorage cache on subsequent calls without network', async () => {
    const cacheKey = 'bible_cache_111_jhn_3_16';
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({
        verses: [{ verseNumber: 16, text: 'Cached Verse Text' }],
        text: 'Cached Verse Text',
        translation: 'NIV',
        versionId: 111,
        source: 'cache',
        attribution: 'Cached Copyright Notice',
      })
    );

    const result = await fetchPassageText(passageJohn316, { translation: 'NIV' });

    expect(result.cached).toBe(true);
    expect(result.text).toBe('Cached Verse Text');
    expect(result.attribution).toBe('Cached Copyright Notice');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('fetchPassageText handles API failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network offline'));

    const result = await fetchPassageText('John 3:16', { translation: 'NIV', forceRefresh: true });

    expect(result.text).toBe('');
    expect(result.error).toContain('Network offline');
    expect(result.cached).toBe(false);
  });

  test('clearPassageCache removes all bible_cache_* and yv_meta_* keys', async () => {
    await AsyncStorage.setItem('bible_cache_111_jhn_3_16', 'text1');
    await AsyncStorage.setItem('yv_meta_111', 'meta1');
    await AsyncStorage.setItem('user_notes_123', 'other_data');

    await clearPassageCache();

    expect(await AsyncStorage.getItem('bible_cache_111_jhn_3_16')).toBeNull();
    expect(await AsyncStorage.getItem('yv_meta_111')).toBeNull();
    expect(await AsyncStorage.getItem('user_notes_123')).toBe('other_data');
  });

  test('buildBibleCacheKey produces identical keys for string, USFM, and PassageReference', () => {
    const keyFromString = buildBibleCacheKey(111, 'John 3:16');
    const keyFromUsfm = buildBibleCacheKey(111, 'JHN.3.16');
    const keyFromObj = buildBibleCacheKey(111, passageJohn316);

    expect(keyFromString).toBe('bible_cache_111_jhn_3_16');
    expect(keyFromUsfm).toBe('bible_cache_111_jhn_3_16');
    expect(keyFromObj).toBe('bible_cache_111_jhn_3_16');
  });

  test('multi-segment compound passages without display string generate safe canonical cache keys', () => {
    const compoundWithoutDisplay = {
      books: ['John', 'Romans'],
      segments: [
        { book: 'John', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 16 },
        { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 2 },
      ],
    } as unknown as PassageReference;

    const key = buildBibleCacheKey(111, compoundWithoutDisplay);
    expect(key).toBe('bible_cache_111_jhn_3_16_rom_8_1_2');
    expect(key).not.toContain('undefined');

    const formatted = formatPassageQuery(compoundWithoutDisplay);
    expect(formatted).toBe('John 3:16; Romans 8:1-2');
  });

  describe('YouVersion HTML Parsing & Section Headings', () => {
    test('parseYouVersionHtml parses transformed HTML with .yv-v and .label markers', () => {
      const html = `
        <div class="s1">For God So Loved the World</div>
        <p><span class="yv-v" v="16"><span class="label">16</span>For God so loved the world that he gave his one and only Son.</span>
        <span class="yv-v" v="17"><span class="label">17</span>For God did not send his Son into the world to condemn the world.</span></p>
      `;

      const parsed = parseYouVersionHtml(html);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].verseNumber).toBe(16);
      expect(parsed[0].heading).toBe('For God So Loved the World');
      expect(parsed[0].text).toBe('For God so loved the world that he gave his one and only Son.');

      expect(parsed[1].verseNumber).toBe(17);
      expect(parsed[1].heading).toBeUndefined();
      expect(parsed[1].text).toBe('For God did not send his Son into the world to condemn the world.');
    });

    test('parseYouVersionHtml strips footnotes correctly', () => {
      const html = `
        <p><span class="v">16</span>For God so loved the world<span class="footnote"><span class="f">Or humanity</span></span> that he gave his only Son.</p>
      `;

      const parsed = parseYouVersionHtml(html);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].verseNumber).toBe(16);
      expect(parsed[0].text).toBe('For God so loved the world that he gave his only Son.');
      expect(parsed[0].text).not.toContain('Or humanity');
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

      expect(html).toContain('<div class="passage-header-title">Luke 1:1–2</div>');
      expect(html).toContain('<div class="scripture-subheading">Introduction</div>');
      expect(html).toContain('<sup style="font-size:11px;font-weight:700;color:#E3A53D;vertical-align:super;line-height:0;">1&nbsp;</sup>');
      expect(html).toContain('<span>Many have undertaken to compile a narrative...&nbsp;</span>');
    });
  });
});
