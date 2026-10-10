import {
  buildNearbyVerseRange,
  formatCrossRefPassageQuery,
  getCrossReferences,
  getCrossReferencesForVerses,
  hasCrossReferences,
} from '../../src/services/crossReferenceService';

describe('crossReferenceService', () => {
  it('returns ranked cross references for John 3:16', () => {
    const refs = getCrossReferences({ book: 'John', chapter: 3, verse: 16 });
    expect(refs.length).toBeGreaterThan(0);
    expect(refs[0].display).toMatch(/Romans 5:8|1 John|John/);
    expect(refs[0].votes).toBeGreaterThan(refs[refs.length - 1].votes - 1);
    // Top OpenBible hit for John 3:16 is Romans 5:8
    expect(refs.some((r) => r.book === 'Romans' && r.startChapter === 5 && r.startVerse === 8)).toBe(
      true
    );
  });

  it('hasCrossReferences is true only when data exists', () => {
    expect(hasCrossReferences({ book: 'John', chapter: 3, verse: 16 })).toBe(true);
    expect(hasCrossReferences({ book: 'John', chapter: 3, verse: 999 })).toBe(false);
  });

  it('resolves common book aliases', () => {
    const viaAlias = getCrossReferences({ book: 'Jn', chapter: 3, verse: 16 });
    const viaFull = getCrossReferences({ book: 'John', chapter: 3, verse: 16 });
    expect(viaAlias.length).toBe(viaFull.length);
    expect(viaAlias[0]?.display).toBe(viaFull[0]?.display);
  });

  it('unions refs across a verse selection without duplicates', () => {
    const combined = getCrossReferencesForVerses('John', 3, [16, 17]);
    const keys = combined.map(
      (r) => `${r.bookIndex}:${r.startChapter}:${r.startVerse}:${r.endChapter}:${r.endVerse}`
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(combined.length).toBeGreaterThan(0);
  });

  it('builds nearby pad within chapter bounds', () => {
    const target = getCrossReferences({ book: 'John', chapter: 3, verse: 16 })[0];
    // Use John 3:16 itself as a synthetic target for nearby pad
    const nearby = buildNearbyVerseRange(
      {
        book: 'John',
        bookIndex: 42,
        startChapter: 3,
        startVerse: 16,
        endChapter: 3,
        endVerse: 16,
        votes: 1,
        display: 'John 3:16',
      },
      2
    );
    expect(nearby.startVerse).toBe(14);
    expect(nearby.endVerse).toBe(18);
    expect(target).toBeTruthy();
  });

  it('formats passage queries for fetchPassageText', () => {
    expect(formatCrossRefPassageQuery('Romans', 5, 8, 5, 8)).toBe('Romans 5:8');
    expect(formatCrossRefPassageQuery('John', 1, 1, 1, 3)).toBe('John 1:1-3');
    expect(formatCrossRefPassageQuery('Psalm', 148, 4, 148, 5)).toBe('Psalm 148:4-5');
  });
});
