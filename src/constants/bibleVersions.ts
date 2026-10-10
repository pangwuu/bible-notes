/**
 * Supported Bible Versions & YouVersion Platform Metadata.
 * Curated list of top translations mapped to YouVersion numeric version IDs.
 */

export interface BibleVersionMetadata {
  id: number;
  code: string;
  shortName: string;
  fullName: string;
  isPublicDomain: boolean;
  summary: string;
}

export const DEFAULT_BIBLE_VERSION_ID = 59; // English Standard Version (ESV)

export const SUPPORTED_BIBLE_VERSIONS: readonly BibleVersionMetadata[] = [
  // 1. English Standard Version (Served via Crossway API)
  {
    id: 59,
    code: 'ESV',
    shortName: 'ESV',
    fullName: 'English Standard Version',
    isPublicDomain: false,
    summary:
      'An "essentially literal" translation first published in 2001 as a revision of the Revised Standard Version. It balances word-for-word accuracy with readable English and is widely used for study and preaching.',
  },

  // 2. Active & Licensed YouVersion Platform Bibles
  {
    id: 111,
    code: 'NIV',
    shortName: 'NIV',
    fullName: 'New International Version',
    isPublicDomain: false,
    summary:
      'One of the most widely read modern translations, first completed in 1978 and last updated in 2011. It balances word-for-word and thought-for-thought translation for clear, natural English.',
  },
  {
    id: 2692,
    code: 'NASB',
    shortName: 'NASB',
    fullName: 'New American Standard Bible',
    isPublicDomain: false,
    summary:
      'A highly literal, word-for-word translation first completed in 1971 and updated in 1995 and 2020. Valued for close adherence to the original Hebrew and Greek, making it a strong choice for detailed study.',
  },
  {
    id: 110,
    code: 'NIRV',
    shortName: 'NIrV',
    fullName: "New International Reader's Version",
    isPublicDomain: false,
    summary:
      'A simplified edition of the NIV published in 1996, written with shorter sentences and simpler words. Ideal for children, new readers, and those learning English.',
  },
  {
    id: 1588,
    code: 'AMP',
    shortName: 'AMP',
    fullName: 'Amplified Bible',
    isPublicDomain: false,
    summary:
      'First published in 1965 and updated in 2015, it expands key words with bracketed alternatives and explanations to bring out shades of meaning in the original languages. Useful alongside another translation for word study.',
  },
  {
    id: 3034,
    code: 'BSB',
    shortName: 'BSB',
    fullName: 'Berean Standard Bible',
    isPublicDomain: true,
    summary:
      'A modern translation completed in 2020 and released into the public domain in 2023. It aims for accuracy close to the original texts while staying clear and readable for everyday use.',
  },
  {
    id: 206,
    code: 'WEB',
    shortName: 'WEB',
    fullName: 'World English Bible',
    isPublicDomain: true,
    summary:
      'A public domain update of the 1901 American Standard Version into contemporary English, produced by volunteers. Fairly literal and free to copy and share.',
  },
  {
    id: 12,
    code: 'ASV',
    shortName: 'ASV',
    fullName: 'American Standard Version',
    isPublicDomain: true,
    summary:
      'A very literal 1901 American revision in the King James tradition, known for its precision. Its older English is formal, and it served as the basis for several later translations, including the NASB.',
  },
  {
    id: 1932,
    code: 'FBV',
    shortName: 'FBV',
    fullName: 'Free Bible Version',
    isPublicDomain: true,
    summary:
      'A contemporary, thought-for-thought translation that focuses on conveying meaning in plain modern English. Freely available and easy to read devotionally.',
  },
  {
    id: 2660,
    code: 'LSV',
    shortName: 'LSV',
    fullName: 'Literal Standard Version',
    isPublicDomain: true,
    summary:
      "A strictly literal translation released in 2020, building on Young's Literal Translation. It preserves original word order and verb tenses where possible, which suits close textual study.",
  },
  {
    id: 2163,
    code: 'GNV',
    shortName: 'GNV',
    fullName: 'Geneva Bible',
    isPublicDomain: true,
    summary:
      'A landmark 1560 translation by English Protestant exiles in Geneva, famous for its extensive study notes. It predates the King James Version and was the Bible of Shakespeare and the Pilgrims.',
  },
  {
    id: 42,
    code: 'CPDV',
    shortName: 'CPDV',
    fullName: 'Catholic Public Domain Version',
    isPublicDomain: true,
    summary:
      'A modern English translation of the Latin Vulgate, completed in 2009 and released into the public domain. Its wording reflects Catholic tradition, offering a helpful point of comparison with Protestant translations.',
  },

  // --- Not Distributed in YouVersion Platform API Catalog ---
  // { id: 114, code: 'NKJV', shortName: 'NKJV', fullName: 'New King James Version', isPublicDomain: false },
  // { id: 1713, code: 'CSB', shortName: 'CSB', fullName: 'Christian Standard Bible', isPublicDomain: false },
  // { id: 1, code: 'KJV', shortName: 'KJV', fullName: 'King James Version', isPublicDomain: true },
  // { id: 116, code: 'NLT', shortName: 'NLT', fullName: 'New Living Translation', isPublicDomain: false },
];

/**
 * Resolves an arbitrary input (version ID number or legacy string abbreviation)
 * to a canonical YouVersion numeric version ID.
 */
export function resolveVersionId(input?: string | number | null): number {
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
    return input;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim().toUpperCase();
    // Numeric string check
    const parsedNum = parseInt(trimmed, 10);
    if (!isNaN(parsedNum) && parsedNum > 0 && String(parsedNum) === trimmed) {
      return parsedNum;
    }

    const matched = SUPPORTED_BIBLE_VERSIONS.find(
      (v) => v.code === trimmed || v.shortName.toUpperCase() === trimmed
    );
    if (matched) return matched.id;

    // Legacy fallbacks and disabled translations
    if (trimmed === 'ESV') return 59;
    if (trimmed === 'BSB') return 3034;
    if (trimmed === 'WEB') return 206;
    if (trimmed === 'ASV') return 12;
    if (trimmed === 'FBV') return 1932;
    if (trimmed === 'LSV') return 2660;
    if (trimmed === 'GNV') return 2163;
    if (trimmed === 'CPDV') return 42;
    if (trimmed === 'NIV') return 111;
    if (trimmed === 'NKJV') return 114;
    if (trimmed === 'NASB') return 2692;
    if (trimmed === 'KJV') return 1;
    if (trimmed === 'BBE') return 103;
  }

  return DEFAULT_BIBLE_VERSION_ID;
}

const DISABLED_VERSION_METADATA: Record<number, Omit<BibleVersionMetadata, 'id' | 'summary'>> = {
  1: { code: 'KJV', shortName: 'KJV', fullName: 'King James Version', isPublicDomain: true },
  111: { code: 'NIV', shortName: 'NIV', fullName: 'New International Version', isPublicDomain: false },
  110: { code: 'NIRV', shortName: 'NIrV', fullName: "New International Reader's Version", isPublicDomain: false },
  114: { code: 'NKJV', shortName: 'NKJV', fullName: 'New King James Version', isPublicDomain: false },
  116: { code: 'NLT', shortName: 'NLT', fullName: 'New Living Translation', isPublicDomain: false },
  1713: { code: 'CSB', shortName: 'CSB', fullName: 'Christian Standard Bible', isPublicDomain: false },
  2692: { code: 'NASB', shortName: 'NASB', fullName: 'New American Standard Bible', isPublicDomain: false },
  103: { code: 'BBE', shortName: 'BBE', fullName: 'Bible in Basic English', isPublicDomain: true },
};

/**
 * Retrieves metadata for a given version ID or returns a fallback descriptor.
 */
export function getVersionMetadata(versionId: number): BibleVersionMetadata {
  const found = SUPPORTED_BIBLE_VERSIONS.find((v) => v.id === versionId);
  if (found) return found;

  const disabled = DISABLED_VERSION_METADATA[versionId];
  if (disabled) {
    return {
      id: versionId,
      ...disabled,
      summary: '',
    };
  }

  return {
    id: versionId,
    code: `V${versionId}`,
    shortName: `V${versionId}`,
    fullName: `Bible Version ${versionId}`,
    isPublicDomain: false,
    summary: '',
  };
}
