import {
  OFFLINE_FIRESTORE_TRANSLATIONS,
  isOfflineFirestoreTranslation,
  SUPPORTED_BIBLE_VERSIONS,
} from '../../src/constants/bibleVersions';

describe('offline Firestore Bible download allowlist', () => {
  test('only includes known public-domain seeded codes', () => {
    expect(OFFLINE_FIRESTORE_TRANSLATIONS.map((t) => t.code)).toEqual(['BSB', 'KJV']);
  });

  test('isOfflineFirestoreTranslation accepts BSB and KJV only', () => {
    expect(isOfflineFirestoreTranslation('BSB')).toBe(true);
    expect(isOfflineFirestoreTranslation('kjv')).toBe(true);
    expect(isOfflineFirestoreTranslation('NIV')).toBe(false);
    expect(isOfflineFirestoreTranslation('NASB')).toBe(false);
    expect(isOfflineFirestoreTranslation(111)).toBe(false);
  });

  test('does not mark licensed YouVersion editions as offline downloadable', () => {
    const licensed = SUPPORTED_BIBLE_VERSIONS.filter((v) => !v.isPublicDomain);
    for (const v of licensed) {
      expect(isOfflineFirestoreTranslation(v.shortName)).toBe(false);
      expect(isOfflineFirestoreTranslation(v.code)).toBe(false);
    }
  });
});
