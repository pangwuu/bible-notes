import { rememberRecentVersion } from '../../src/components/bibleReader/TranslationSheet';
import safeStorage from '../../src/utils/safeStorage';

describe('rememberRecentVersion', () => {
  beforeEach(() => safeStorage.removeItem('recent_version_ids'));

  it('keeps the three most recent translations, newest first, without duplicates', async () => {
    await rememberRecentVersion(59);
    await rememberRecentVersion(111);
    await rememberRecentVersion(59);
    await rememberRecentVersion(1);
    expect(await rememberRecentVersion(12)).toEqual([12, 1, 59]);
  });
});
