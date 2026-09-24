import { segmentsOverlap } from '../../src/services/noteOverlapService';
import { PassageSegment } from '../../src/types/note';

describe('segmentsOverlap', () => {
  const seg = (
    book: string,
    startChapter: number,
    startVerse: number,
    endChapter: number,
    endVerse: number
  ): PassageSegment => ({
    book,
    startChapter,
    startVerse,
    endChapter,
    endVerse,
  });

  test('returns false when books differ', () => {
    const a = seg('Matthew', 6, 24, 6, 34);
    const b = seg('Mark', 6, 24, 6, 34);
    expect(segmentsOverlap(a, b)).toBe(false);
  });

  test('user case: Matthew 6:24-34 does NOT overlap with Matthew 24:24-25:4', () => {
    const myNoteSeg = seg('Matthew', 6, 24, 6, 34);
    const friendCh24Seg = seg('Matthew', 24, 24, 25, 4);
    expect(segmentsOverlap(myNoteSeg, friendCh24Seg)).toBe(false);
  });

  test('user case: Matthew 6:24-34 DOES overlap with Matthew 6:33-34', () => {
    const myNoteSeg = seg('Matthew', 6, 24, 6, 34);
    const friendOverlapSeg = seg('Matthew', 6, 33, 6, 34);
    expect(segmentsOverlap(myNoteSeg, friendOverlapSeg)).toBe(true);
  });

  test('user case: Matthew 6:24-34 does NOT overlap with Matthew 1:1', () => {
    const myNoteSeg = seg('Matthew', 6, 24, 6, 34);
    const friendCh1Seg = seg('Matthew', 1, 1, 1, 1);
    expect(segmentsOverlap(myNoteSeg, friendCh1Seg)).toBe(false);
  });

  test('handles cross-chapter spans correctly', () => {
    // 1 Corinthians 12:27 to 13:3
    const spanA = seg('1 Corinthians', 12, 27, 13, 3);
    // 1 Corinthians 13:1 to 13:13
    const spanB = seg('1 Corinthians', 13, 1, 13, 13);
    expect(segmentsOverlap(spanA, spanB)).toBe(true);

    // 1 Corinthians 14:1 to 14:5
    const spanC = seg('1 Corinthians', 14, 1, 14, 5);
    expect(segmentsOverlap(spanA, spanC)).toBe(false);
  });

  test('defensively handles raw snake_case objects without throwing or false positive', () => {
    const myNoteSeg = seg('Matthew', 6, 24, 6, 34);
    const rawSnakeCaseFriendSeg: any = {
      book: 'Matthew',
      start_chapter: 24,
      start_verse: 24,
      end_chapter: 25,
      end_verse: 4,
    };
    expect(segmentsOverlap(myNoteSeg, rawSnakeCaseFriendSeg)).toBe(false);

    const rawSnakeCaseOverlap: any = {
      book: 'Matthew',
      start_chapter: 6,
      start_verse: 33,
      end_chapter: 6,
      end_verse: 34,
    };
    expect(segmentsOverlap(myNoteSeg, rawSnakeCaseOverlap)).toBe(true);
  });

  test('defensively returns false for null/undefined/malformed input', () => {
    const validSeg = seg('Matthew', 6, 24, 6, 34);
    expect(segmentsOverlap(validSeg, null as any)).toBe(false);
    expect(segmentsOverlap(null as any, validSeg)).toBe(false);
    expect(segmentsOverlap({} as any, validSeg)).toBe(false);
    expect(segmentsOverlap(validSeg, { book: 'Matthew' } as any)).toBe(false);
  });
});
