# Handoff Report: Milestone 3 (Canon Data & Ordinal Math)

## 1. Observation
1. **`ORIGINAL_REQUEST.md` (lines 18–20)**:
   > "Implement canonical verse metadata and utilities mapping references across Genesis 1:1 to Revelation 22:21 to integer ordinals (1–31,102) and calculating range overlaps."
2. **`specs.md` §5.1 & §5.6 (lines 51, 88)**:
   > "start_verse_id and end_verse_id (standardized integer index from 1 to 31,102 across Genesis 1:1 to Revelation 22:21)"
   > "Passage Overlap Detection: Overlap occurs if two notes in the same book have intersecting verse bounds (`noteA.start_verse_id <= noteB.end_verse_id && noteA.end_verse_id >= noteB.start_verse_id`)."
3. **`PROJECT.md` lines 78–82, 125**:
   > `src/constants/bibleData.ts # 66 books, chapters, verse counts (31,102 verses)`
   > `referenceToOrdinals(book: string, startChapter: number, startVerse: number, endChapter: number, endVerse: number): [number, number]`
   > `ordinalToReference(ordinal: number): { book: string, chapter: number, verse: number }`
   > `checkRangeOverlap(rangeA: [number, number], rangeB: [number, number]): { overlaps: boolean, overlapRange?: [number, number] }`
4. **`tests/e2e/testHelpers.ts` lines 22–94**:
   > Defines `CANONICAL_BOOKS` with 66 books:
   > - Genesis (50 ch, 1533 vs), ..., 1 Chronicles (29 ch, 941 vs), ..., 3 John (1 ch, 15 vs), ..., Revelation (22 ch, 404 vs).
   > - `TOTAL_CANONICAL_CHAPTERS`: 1,189.
   > - `TOTAL_CANONICAL_VERSES`: 31,102.
5. **`tests/e2e/tier2_boundaries.test.ts` lines 595–675**:
   > Verbatim assertion expectations:
   > - `expect(() => referenceToOrdinalsOracle('Tobit', 1, 1, 1, 1)).toThrow('Unknown book');`
   > - `expect(() => referenceToOrdinalsOracle('Psalms', 151, 1, 151, 1)).toThrow('Invalid start chapter');`
   > - `expect(() => referenceToOrdinalsOracle('Romans', 8, 0, 8, 1)).toThrow('Invalid verse boundaries');`
   > - `expect(() => referenceToOrdinalsOracle('Romans', 8, 20, 8, 10)).toThrow('cannot be less than');`
   > - `expect(() => checkRangeOverlapOracle([30, 20], [10, 50])).toThrow('Invalid range format');`
6. **Empirical Bijective Verification**:
   > Running an automated verification script across all 31,102 verses showed 0 roundtrip mismatches:
   > `Ordinal 1 -> { book: 'Genesis', chapter: 1, verse: 1 }`
   > `Ordinal 31102 -> { book: 'Revelation', chapter: 22, verse: 21 }`
   > `Bijective roundtrip errors across all 31,102 verses: 0`

---

## 2. Logic Chain
1. Based on **Observation 1 & 2**, notes store `start_verse_id` and `end_verse_id` as integers in $[1, 31102]$ corresponding to continuous scriptural verses starting at Genesis 1:1 and ending at Revelation 22:21.
2. Based on **Observation 4**, the canon contains 66 books, 1,189 chapters, and 31,102 verses. In order to map any $(Book, Chapter, Verse)$ reference to an exact unique ordinal and vice-versa, the application must store the verse count for every chapter across all 66 books ($1,189$ chapter counts).
3. Based on **Observation 4 & 6**, reconciling the Protestant 31,102-verse total with modern translations (where ESV contains 3 John 1:15) requires 1 Chronicles to have 941 verses (29 chapters: 54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 29) and 3 John to have 15 verses. All other 64 books match standard chapter counts and verse sums identically.
4. Based on **Observation 5**, the validation in `referenceToOrdinals` and `checkRangeOverlap` must throw errors whose messages contain exact substrings:
   - `'Unknown book'`
   - `'Invalid start chapter'`
   - `'Invalid verse boundaries'`
   - `'cannot be less than'`
   - `'Invalid range format'`
5. Based on **Observation 3**, range overlap math is governed by closed-interval intersection: $\max(s_A, s_B) \le \min(e_A, e_B)$. Because ordinals are strictly monotonic across books, cross-book notes have disjoint integer ranges and evaluate to `{ overlaps: false }` naturally. Within the same book, overlapping verse intervals evaluate to `{ overlaps: true, overlapRange: [maxStart, minEnd] }`.

---

## 3. Caveats
1. **ESV 1 Chronicles vs 31,102 Total**: The Crossway ESV API returns 942 verses for 1 Chronicles (chapter 29 has 30 verses) and 15 verses for 3 John, which yields 31,103 verses in total. However, the project specification across all requirements documents, specs, and test suites strictly fixes the canon total at 31,102 verses (with 1 Chronicles at 941 verses and 3 John at 15 verses in `testHelpers.ts`). Downstream fetching of 1 Chronicles 29:30 (if ever requested) will function via the ESV API client in Milestone 4, but ordinal mapping remains hermetic to the 31,102 domain universe.
2. **Apocryphal Books**: Only the 66 Protestant canon books are indexed. Apocryphal or pseudepigraphal books (e.g. Tobit, Enoch, 1 Maccabees) are rejected by design.

---

## 4. Conclusion & Proposed Implementation

### 4.1 Proposed Implementation: `src/constants/bibleData.ts`
```typescript
/**
 * Canonical Protestant Bible Data & Metadata (66 Books, 1,189 Chapters, 31,102 Verses)
 * Authoritative source: ORIGINAL_REQUEST.md (R3), specs.md (§5.1), PROJECT.md
 */

export interface CanonicalBook {
  readonly name: string;
  readonly testament: 'OT' | 'NT';
  readonly chapters: number;
  readonly verseCount: number;
  readonly versesPerChapter: readonly number[];
  readonly abbreviations: readonly string[];
  readonly startOrdinal: number;
  readonly endOrdinal: number;
  readonly chapterOffsets: readonly number[];
}

// Raw chapter verse distribution for the 66 Protestant books
// Total books: 66, Total chapters: 1,189, Total verses: 31,102
const RAW_BOOKS_DATA: Array<{
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
  verseCount: number;
  versesPerChapter: number[];
  abbreviations: string[];
}> = [
  // Old Testament (39 books, 929 chapters, 23,144 verses)
  {
    name: 'Genesis',
    testament: 'OT',
    chapters: 50,
    verseCount: 1533,
    versesPerChapter: [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26],
    abbreviations: ['Gen', 'Ge', 'Gn'],
  },
  {
    name: 'Exodus',
    testament: 'OT',
    chapters: 40,
    verseCount: 1213,
    versesPerChapter: [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38],
    abbreviations: ['Exo', 'Exod', 'Ex'],
  },
  {
    name: 'Leviticus',
    testament: 'OT',
    chapters: 27,
    verseCount: 859,
    versesPerChapter: [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34],
    abbreviations: ['Lev', 'Le', 'Lv'],
  },
  {
    name: 'Numbers',
    testament: 'OT',
    chapters: 36,
    verseCount: 1288,
    versesPerChapter: [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13],
    abbreviations: ['Num', 'Nu', 'Nm', 'Nb'],
  },
  {
    name: 'Deuteronomy',
    testament: 'OT',
    chapters: 34,
    verseCount: 959,
    versesPerChapter: [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12],
    abbreviations: ['Deut', 'De', 'Dt'],
  },
  {
    name: 'Joshua',
    testament: 'OT',
    chapters: 24,
    verseCount: 658,
    versesPerChapter: [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33],
    abbreviations: ['Josh', 'Jos', 'Jsh'],
  },
  {
    name: 'Judges',
    testament: 'OT',
    chapters: 21,
    verseCount: 618,
    versesPerChapter: [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25],
    abbreviations: ['Judg', 'Jdg', 'Jdgs'],
  },
  {
    name: 'Ruth',
    testament: 'OT',
    chapters: 4,
    verseCount: 85,
    versesPerChapter: [22, 23, 18, 22],
    abbreviations: ['Ruth', 'Rth', 'Ru'],
  },
  {
    name: '1 Samuel',
    testament: 'OT',
    chapters: 31,
    verseCount: 810,
    versesPerChapter: [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13],
    abbreviations: ['1 Sam', '1Sam', '1 S', '1S', 'I Sam', 'I Samuel'],
  },
  {
    name: '2 Samuel',
    testament: 'OT',
    chapters: 24,
    verseCount: 695,
    versesPerChapter: [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25],
    abbreviations: ['2 Sam', '2Sam', '2 S', '2S', 'II Sam', 'II Samuel'],
  },
  {
    name: '1 Kings',
    testament: 'OT',
    chapters: 22,
    verseCount: 816,
    versesPerChapter: [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53],
    abbreviations: ['1 Kgs', '1Kgs', '1 Ki', '1Ki', '1Kin', '1 Kings', '1Kings', 'I Kings', 'I Kgs'],
  },
  {
    name: '2 Kings',
    testament: 'OT',
    chapters: 25,
    verseCount: 719,
    versesPerChapter: [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30],
    abbreviations: ['2 Kgs', '2Kgs', '2 Ki', '2Ki', '2Kin', '2 Kings', '2Kings', 'II Kings', 'II Kgs'],
  },
  {
    name: '1 Chronicles',
    testament: 'OT',
    chapters: 29,
    verseCount: 941,
    versesPerChapter: [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 29],
    abbreviations: ['1 Chron', '1Chron', '1 Chr', '1Chr', '1 Ch', '1Ch', 'I Chronicles', 'I Chron'],
  },
  {
    name: '2 Chronicles',
    testament: 'OT',
    chapters: 36,
    verseCount: 822,
    versesPerChapter: [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23],
    abbreviations: ['2 Chron', '2Chron', '2 Chr', '2Chr', '2 Ch', '2Ch', 'II Chronicles', 'II Chron'],
  },
  {
    name: 'Ezra',
    testament: 'OT',
    chapters: 10,
    verseCount: 280,
    versesPerChapter: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44],
    abbreviations: ['Ezra', 'Ezr', 'Ez'],
  },
  {
    name: 'Nehemiah',
    testament: 'OT',
    chapters: 13,
    verseCount: 406,
    versesPerChapter: [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31],
    abbreviations: ['Neh', 'Ne'],
  },
  {
    name: 'Esther',
    testament: 'OT',
    chapters: 10,
    verseCount: 167,
    versesPerChapter: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3],
    abbreviations: ['Esth', 'Est', 'Es'],
  },
  {
    name: 'Job',
    testament: 'OT',
    chapters: 42,
    verseCount: 1070,
    versesPerChapter: [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17],
    abbreviations: ['Job', 'Jb'],
  },
  {
    name: 'Psalms',
    testament: 'OT',
    chapters: 150,
    verseCount: 2461,
    versesPerChapter: [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6],
    abbreviations: ['Ps', 'Psa', 'Psm', 'Pss', 'Psalm'],
  },
  {
    name: 'Proverbs',
    testament: 'OT',
    chapters: 31,
    verseCount: 915,
    versesPerChapter: [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31],
    abbreviations: ['Prov', 'Pro', 'Pr', 'Prv'],
  },
  {
    name: 'Ecclesiastes',
    testament: 'OT',
    chapters: 12,
    verseCount: 222,
    versesPerChapter: [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14],
    abbreviations: ['Eccles', 'Ecc', 'Ec', 'Qoh'],
  },
  {
    name: 'Song of Solomon',
    testament: 'OT',
    chapters: 8,
    verseCount: 117,
    versesPerChapter: [17, 17, 11, 16, 16, 13, 13, 14],
    abbreviations: ['Song', 'SOS', 'Cant', 'Canticles', 'Song of Songs'],
  },
  {
    name: 'Isaiah',
    testament: 'OT',
    chapters: 66,
    verseCount: 1292,
    versesPerChapter: [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24],
    abbreviations: ['Isa', 'Is'],
  },
  {
    name: 'Jeremiah',
    testament: 'OT',
    chapters: 52,
    verseCount: 1364,
    versesPerChapter: [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34],
    abbreviations: ['Jer', 'Je', 'Jr'],
  },
  {
    name: 'Lamentations',
    testament: 'OT',
    chapters: 5,
    verseCount: 154,
    versesPerChapter: [22, 22, 66, 22, 22],
    abbreviations: ['Lam', 'La'],
  },
  {
    name: 'Ezekiel',
    testament: 'OT',
    chapters: 48,
    verseCount: 1273,
    versesPerChapter: [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35],
    abbreviations: ['Ezek', 'Eze', 'Ezk'],
  },
  {
    name: 'Daniel',
    testament: 'OT',
    chapters: 12,
    verseCount: 357,
    versesPerChapter: [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13],
    abbreviations: ['Dan', 'Da', 'Dn'],
  },
  {
    name: 'Hosea',
    testament: 'OT',
    chapters: 14,
    verseCount: 197,
    versesPerChapter: [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9],
    abbreviations: ['Hos', 'Ho'],
  },
  {
    name: 'Joel',
    testament: 'OT',
    chapters: 3,
    verseCount: 73,
    versesPerChapter: [20, 32, 21],
    abbreviations: ['Joel', 'Joe', 'Jl'],
  },
  {
    name: 'Amos',
    testament: 'OT',
    chapters: 9,
    verseCount: 146,
    versesPerChapter: [15, 16, 15, 13, 27, 14, 17, 14, 15],
    abbreviations: ['Amos', 'Amo', 'Am'],
  },
  {
    name: 'Obadiah',
    testament: 'OT',
    chapters: 1,
    verseCount: 21,
    versesPerChapter: [21],
    abbreviations: ['Obad', 'Oba', 'Ob'],
  },
  {
    name: 'Jonah',
    testament: 'OT',
    chapters: 4,
    verseCount: 48,
    versesPerChapter: [17, 10, 10, 11],
    abbreviations: ['Jon', 'Jnh'],
  },
  {
    name: 'Micah',
    testament: 'OT',
    chapters: 7,
    verseCount: 105,
    versesPerChapter: [16, 13, 12, 13, 15, 16, 20],
    abbreviations: ['Mic', 'Mc'],
  },
  {
    name: 'Nahum',
    testament: 'OT',
    chapters: 3,
    verseCount: 47,
    versesPerChapter: [15, 13, 19],
    abbreviations: ['Nah', 'Na'],
  },
  {
    name: 'Habakkuk',
    testament: 'OT',
    chapters: 3,
    verseCount: 56,
    versesPerChapter: [17, 20, 19],
    abbreviations: ['Hab', 'Hb'],
  },
  {
    name: 'Zephaniah',
    testament: 'OT',
    chapters: 3,
    verseCount: 53,
    versesPerChapter: [18, 15, 20],
    abbreviations: ['Zeph', 'Zep', 'Zp'],
  },
  {
    name: 'Haggai',
    testament: 'OT',
    chapters: 2,
    verseCount: 38,
    versesPerChapter: [15, 23],
    abbreviations: ['Hag', 'Hg'],
  },
  {
    name: 'Zechariah',
    testament: 'OT',
    chapters: 14,
    verseCount: 211,
    versesPerChapter: [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21],
    abbreviations: ['Zech', 'Zec', 'Zc'],
  },
  {
    name: 'Malachi',
    testament: 'OT',
    chapters: 4,
    verseCount: 55,
    versesPerChapter: [14, 17, 18, 6],
    abbreviations: ['Mal', 'Ml'],
  },

  // New Testament (27 books, 260 chapters, 7,958 verses)
  {
    name: 'Matthew',
    testament: 'NT',
    chapters: 28,
    verseCount: 1071,
    versesPerChapter: [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20],
    abbreviations: ['Matt', 'Mat', 'Mt'],
  },
  {
    name: 'Mark',
    testament: 'NT',
    chapters: 16,
    verseCount: 678,
    versesPerChapter: [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20],
    abbreviations: ['Mark', 'Mrk', 'Mk', 'Mr'],
  },
  {
    name: 'Luke',
    testament: 'NT',
    chapters: 24,
    verseCount: 1151,
    versesPerChapter: [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53],
    abbreviations: ['Luke', 'Luk', 'Lk', 'Lu'],
  },
  {
    name: 'John',
    testament: 'NT',
    chapters: 21,
    verseCount: 879,
    versesPerChapter: [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25],
    abbreviations: ['John', 'Jhn', 'Jn'],
  },
  {
    name: 'Acts',
    testament: 'NT',
    chapters: 28,
    verseCount: 1007,
    versesPerChapter: [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31],
    abbreviations: ['Acts', 'Act', 'Ac'],
  },
  {
    name: 'Romans',
    testament: 'NT',
    chapters: 16,
    verseCount: 433,
    versesPerChapter: [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27],
    abbreviations: ['Rom', 'Ro', 'Rm'],
  },
  {
    name: '1 Corinthians',
    testament: 'NT',
    chapters: 16,
    verseCount: 437,
    versesPerChapter: [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24],
    abbreviations: ['1 Cor', '1Cor', '1 Co', '1Co', 'I Corinthians', 'I Cor'],
  },
  {
    name: '2 Corinthians',
    testament: 'NT',
    chapters: 13,
    verseCount: 257,
    versesPerChapter: [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14],
    abbreviations: ['2 Cor', '2Cor', '2 Co', '2Co', 'II Corinthians', 'II Cor'],
  },
  {
    name: 'Galatians',
    testament: 'NT',
    chapters: 6,
    verseCount: 149,
    versesPerChapter: [24, 21, 29, 31, 26, 18],
    abbreviations: ['Gal', 'Ga'],
  },
  {
    name: 'Ephesians',
    testament: 'NT',
    chapters: 6,
    verseCount: 155,
    versesPerChapter: [23, 22, 21, 32, 33, 24],
    abbreviations: ['Eph', 'Ep'],
  },
  {
    name: 'Philippians',
    testament: 'NT',
    chapters: 4,
    verseCount: 104,
    versesPerChapter: [30, 30, 21, 23],
    abbreviations: ['Phil', 'Php', 'Pp'],
  },
  {
    name: 'Colossians',
    testament: 'NT',
    chapters: 4,
    verseCount: 95,
    versesPerChapter: [29, 23, 25, 18],
    abbreviations: ['Col', 'Co'],
  },
  {
    name: '1 Thessalonians',
    testament: 'NT',
    chapters: 5,
    verseCount: 89,
    versesPerChapter: [10, 20, 13, 18, 28],
    abbreviations: ['1 Thess', '1Thess', '1 Th', '1Th', '1 Thes', '1Thes', 'I Thessalonians', 'I Thess'],
  },
  {
    name: '2 Thessalonians',
    testament: 'NT',
    chapters: 3,
    verseCount: 47,
    versesPerChapter: [12, 17, 18],
    abbreviations: ['2 Thess', '2Thess', '2 Th', '2Th', '2 Thes', '2Thes', 'II Thessalonians', 'II Thess'],
  },
  {
    name: '1 Timothy',
    testament: 'NT',
    chapters: 6,
    verseCount: 113,
    versesPerChapter: [20, 15, 16, 16, 25, 21],
    abbreviations: ['1 Tim', '1Tim', '1 Ti', '1Ti', 'I Timothy', 'I Tim'],
  },
  {
    name: '2 Timothy',
    testament: 'NT',
    chapters: 4,
    verseCount: 83,
    versesPerChapter: [18, 26, 17, 22],
    abbreviations: ['2 Tim', '2Tim', '2 Ti', '2Ti', 'II Timothy', 'II Tim'],
  },
  {
    name: 'Titus',
    testament: 'NT',
    chapters: 3,
    verseCount: 46,
    versesPerChapter: [16, 15, 15],
    abbreviations: ['Titus', 'Tit', 'Ti'],
  },
  {
    name: 'Philemon',
    testament: 'NT',
    chapters: 1,
    verseCount: 25,
    versesPerChapter: [25],
    abbreviations: ['Philem', 'Phm', 'Pm'],
  },
  {
    name: 'Hebrews',
    testament: 'NT',
    chapters: 13,
    verseCount: 303,
    versesPerChapter: [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25],
    abbreviations: ['Heb', 'He'],
  },
  {
    name: 'James',
    testament: 'NT',
    chapters: 5,
    verseCount: 108,
    versesPerChapter: [27, 26, 18, 17, 20],
    abbreviations: ['James', 'Jas', 'Jm'],
  },
  {
    name: '1 Peter',
    testament: 'NT',
    chapters: 5,
    verseCount: 105,
    versesPerChapter: [25, 25, 22, 19, 14],
    abbreviations: ['1 Pet', '1Pet', '1 Pe', '1Pe', '1 Pt', '1Pt', 'I Peter', 'I Pet'],
  },
  {
    name: '2 Peter',
    testament: 'NT',
    chapters: 3,
    verseCount: 61,
    versesPerChapter: [21, 22, 18],
    abbreviations: ['2 Pet', '2Pet', '2 Pe', '2Pe', '2 Pt', '2Pt', 'II Peter', 'II Pet'],
  },
  {
    name: '1 John',
    testament: 'NT',
    chapters: 5,
    verseCount: 105,
    versesPerChapter: [10, 29, 24, 21, 21],
    abbreviations: ['1 Jn', '1Jn', '1 Jo', '1Jo', '1 John', '1John', 'I John', 'I Jn'],
  },
  {
    name: '2 John',
    testament: 'NT',
    chapters: 1,
    verseCount: 13,
    versesPerChapter: [13],
    abbreviations: ['2 Jn', '2Jn', '2 Jo', '2Jo', '2 John', '2John', 'II John', 'II Jn'],
  },
  {
    name: '3 John',
    testament: 'NT',
    chapters: 1,
    verseCount: 15,
    versesPerChapter: [15],
    abbreviations: ['3 Jn', '3Jn', '3 Jo', '3Jo', '3 John', '3John', 'III John', 'III Jn'],
  },
  {
    name: 'Jude',
    testament: 'NT',
    chapters: 1,
    verseCount: 25,
    versesPerChapter: [25],
    abbreviations: ['Jude', 'Jud', 'Jd'],
  },
  {
    name: 'Revelation',
    testament: 'NT',
    chapters: 22,
    verseCount: 404,
    versesPerChapter: [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21],
    abbreviations: ['Rev', 'Re', 'Rv', 'Apocalypse'],
  },
];

// Precompute cumulative structures
let runningOrdinal = 1;
export const CANONICAL_BOOKS: readonly CanonicalBook[] = Object.freeze(
  RAW_BOOKS_DATA.map((book) => {
    const chapterOffsets: number[] = [0];
    for (let c = 0; c < book.versesPerChapter.length; c++) {
      chapterOffsets.push(chapterOffsets[c] + book.versesPerChapter[c]);
    }
    const startOrdinal = runningOrdinal;
    const endOrdinal = runningOrdinal + book.verseCount - 1;
    runningOrdinal += book.verseCount;

    return Object.freeze({
      name: book.name,
      testament: book.testament,
      chapters: book.chapters,
      verseCount: book.verseCount,
      versesPerChapter: Object.freeze([...book.versesPerChapter]),
      abbreviations: Object.freeze([...book.abbreviations]),
      startOrdinal,
      endOrdinal,
      chapterOffsets: Object.freeze(chapterOffsets),
    });
  })
);

export const TOTAL_CANONICAL_BOOKS = 66;
export const TOTAL_CANONICAL_CHAPTERS = 1189;
export const TOTAL_CANONICAL_VERSES = 31102;
export const OT_BOOKS_COUNT = 39;
export const NT_BOOKS_COUNT = 27;

// Starting ordinal mapping by canonical book name
export const BOOK_STARTING_ORDINALS: Record<string, number> = Object.freeze(
  CANONICAL_BOOKS.reduce<Record<string, number>>((acc, b) => {
    acc[b.name] = b.startOrdinal;
    return acc;
  }, {})
);

// Map for ultra-fast normalized book lookup
const BOOK_MAP = new Map<string, CanonicalBook>();

function registerLookup(key: string, book: CanonicalBook) {
  const normalized = key.trim().toLowerCase();
  BOOK_MAP.set(normalized, book);
  const stripped = normalized.replace(/[^a-z0-9]/g, '');
  if (stripped && stripped !== normalized) {
    BOOK_MAP.set(stripped, book);
  }
}

for (const book of CANONICAL_BOOKS) {
  registerLookup(book.name, book);
  for (const abbr of book.abbreviations) {
    registerLookup(abbr, book);
  }
}
// Special case aliases
registerLookup('Psalm', CANONICAL_BOOKS[18]); // Psalms
registerLookup('Song of Songs', CANONICAL_BOOKS[21]); // Song of Solomon

export function findCanonicalBook(input: string): CanonicalBook | undefined {
  if (!input || typeof input !== 'string') return undefined;
  const key = input.trim().toLowerCase();
  if (BOOK_MAP.has(key)) return BOOK_MAP.get(key);
  const stripped = key.replace(/[^a-z0-9]/g, '');
  return BOOK_MAP.get(stripped);
}
```

---

### 4.2 Proposed Implementation: `src/utils/bibleOrdinals.ts`
```typescript
/**
 * Bible Ordinal Conversion and Range Overlap Math
 * Authoritative source: ORIGINAL_REQUEST.md (R3), specs.md (§5.1, §5.6), PROJECT.md
 */

import {
  CANONICAL_BOOKS,
  findCanonicalBook,
  TOTAL_CANONICAL_VERSES,
  CanonicalBook,
} from '../constants/bibleData';

export interface ScriptureReference {
  book: string;
  chapter: number;
  verse: number;
}

export interface RangeOverlapResult {
  overlaps: boolean;
  overlapRange?: [number, number];
}

/**
 * Maps a passage reference across book, chapter, and verse ranges to a 1D ordinal pair [start, end].
 * Genesis 1:1 = Ordinal 1; Revelation 22:21 = Ordinal 31,102.
 */
export function referenceToOrdinals(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): [number, number] {
  const bookMeta = findCanonicalBook(book);
  if (!bookMeta) {
    throw new Error(`Unknown book: ${book}`);
  }

  if (startChapter < 1 || startChapter > bookMeta.chapters) {
    throw new Error(`Invalid start chapter ${startChapter} for ${bookMeta.name}`);
  }
  if (endChapter < startChapter || endChapter > bookMeta.chapters) {
    throw new Error(`Invalid end chapter ${endChapter} for ${bookMeta.name}`);
  }
  if (startVerse < 1 || endVerse < 1) {
    throw new Error(`Invalid verse boundaries [${startVerse}, ${endVerse}]`);
  }
  if (startChapter === endChapter && endVerse < startVerse) {
    throw new Error(`End verse ${endVerse} cannot be less than start verse ${startVerse}`);
  }

  const maxStartVerses = bookMeta.versesPerChapter[startChapter - 1];
  const maxEndVerses = bookMeta.versesPerChapter[endChapter - 1];
  if (startVerse > maxStartVerses || endVerse > maxEndVerses) {
    throw new Error(`Invalid verse boundaries [${startVerse}, ${endVerse}]`);
  }

  const startId = bookMeta.startOrdinal + bookMeta.chapterOffsets[startChapter - 1] + (startVerse - 1);
  const endId = bookMeta.startOrdinal + bookMeta.chapterOffsets[endChapter - 1] + (endVerse - 1);

  if (startId < 1 || endId > TOTAL_CANONICAL_VERSES || startId > endId) {
    throw new Error(`Computed invalid ordinal range [${startId}, ${endId}]`);
  }

  return [startId, endId];
}

/**
 * Maps a 1D continuous integer ordinal [1, 31,102] back to its canonical scripture reference.
 * Uses O(log N) binary search across books and chapters.
 */
export function ordinalToReference(ordinal: number): ScriptureReference {
  if (
    typeof ordinal !== 'number' ||
    !Number.isInteger(ordinal) ||
    ordinal < 1 ||
    ordinal > TOTAL_CANONICAL_VERSES
  ) {
    throw new Error(`Ordinal ${ordinal} is out of bounds [1, ${TOTAL_CANONICAL_VERSES}]`);
  }

  // 1. Binary search to locate book
  let low = 0;
  let high = CANONICAL_BOOKS.length - 1;
  let bookMeta: CanonicalBook | null = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = CANONICAL_BOOKS[mid];
    if (ordinal < candidate.startOrdinal) {
      high = mid - 1;
    } else if (ordinal > candidate.endOrdinal) {
      low = mid + 1;
    } else {
      bookMeta = candidate;
      break;
    }
  }

  if (!bookMeta) {
    throw new Error(`Could not locate book for ordinal ${ordinal}`);
  }

  // 2. Binary search to locate chapter within book
  const verseInBook = ordinal - bookMeta.startOrdinal; // 0-based
  let cLow = 0;
  let cHigh = bookMeta.chapters - 1;
  let chapterIndex = 0;

  while (cLow <= cHigh) {
    const mid = Math.floor((cLow + cHigh) / 2);
    const chStart = bookMeta.chapterOffsets[mid];
    const chEnd = bookMeta.chapterOffsets[mid + 1];

    if (verseInBook < chStart) {
      cHigh = mid - 1;
    } else if (verseInBook >= chEnd) {
      cLow = mid + 1;
    } else {
      chapterIndex = mid;
      break;
    }
  }

  const verse = verseInBook - bookMeta.chapterOffsets[chapterIndex] + 1;

  return {
    book: bookMeta.name,
    chapter: chapterIndex + 1,
    verse,
  };
}

/**
 * Closed-interval overlap calculation: max(s1, s2) <= min(e1, e2)
 */
export function checkRangeOverlap(
  rangeA: [number, number],
  rangeB: [number, number]
): RangeOverlapResult {
  if (!Array.isArray(rangeA) || rangeA.length !== 2 || !Array.isArray(rangeB) || rangeB.length !== 2) {
    throw new Error('Invalid range format: ranges must be [start, end] tuples');
  }

  const [s1, e1] = rangeA;
  const [s2, e2] = rangeB;

  if (typeof s1 !== 'number' || typeof e1 !== 'number' || typeof s2 !== 'number' || typeof e2 !== 'number') {
    throw new Error('Invalid range format: range boundaries must be numbers');
  }

  if (s1 > e1 || s2 > e2) {
    throw new Error(`Invalid range format: [${s1}, ${e1}] or [${s2}, ${e2}]`);
  }

  const overlapStart = Math.max(s1, s2);
  const overlapEnd = Math.min(e1, e2);

  if (overlapStart <= overlapEnd) {
    return {
      overlaps: true,
      overlapRange: [overlapStart, overlapEnd],
    };
  }

  return { overlaps: false };
}

/**
 * Returns total verses in a given book's chapter.
 */
export function getChapterVerseCount(book: string, chapter: number): number {
  const bookMeta = findCanonicalBook(book);
  if (!bookMeta) {
    throw new Error(`Unknown book: ${book}`);
  }
  if (chapter < 1 || chapter > bookMeta.chapters) {
    throw new Error(`Invalid chapter ${chapter} for ${bookMeta.name}`);
  }
  return bookMeta.versesPerChapter[chapter - 1];
}

/**
 * Returns metadata for a book by name or abbreviation.
 */
export function getBookMetadata(book: string): CanonicalBook | undefined {
  return findCanonicalBook(book);
}

/**
 * Validates whether an integer is within canonical ordinal bounds [1, 31102].
 */
export function isValidOrdinal(ordinal: number): boolean {
  return typeof ordinal === 'number' && Number.isInteger(ordinal) && ordinal >= 1 && ordinal <= TOTAL_CANONICAL_VERSES;
}

/**
 * Formats canonical reference summary string (e.g. "Romans 8:1–11" or "John 3:16").
 */
export function formatPassageSummary(
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): string {
  const meta = findCanonicalBook(book);
  const bookName = meta ? meta.name : book;
  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${bookName} ${startChapter}:${startVerse}`;
    }
    return `${bookName} ${startChapter}:${startVerse}–${endVerse}`;
  }
  return `${bookName} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
}
```

---

## 5. Verification Method
1. **Automated Unit Verification**:
   Execute:
   ```bash
   npm test
   ```
   All 12 existing test suites must continue to pass with 513/513 green tests.
2. **Dedicated Unit Tests Verification**:
   Create and execute:
   ```bash
   npx jest tests/unit/bibleOrdinals.test.ts tests/unit/overlapMath.test.ts
   ```
3. **Invalidation Conditions**:
   - Any total chapter sum other than 1,189.
   - Any total verse sum other than 31,102.
   - Genesis 1:1 mapping to anything other than `1`.
   - Revelation 22:21 mapping to anything other than `31,102`.
   - `ordinalToReference(referenceToOrdinals(book, ch, v, ch, v)[0])` failing to roundtrip to the original book, chapter, and verse.
   - Boundary overlap `[10, 20]` and `[20, 30]` evaluating to anything other than `{ overlaps: true, overlapRange: [20, 20] }`.
