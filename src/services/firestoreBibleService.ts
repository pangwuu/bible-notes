import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { VerseSegment } from './bibleService';
import { BibleTranslation } from '../types/user';
import { findCanonicalBook, CANONICAL_BOOKS } from '../constants/bibleData';

/**
 * Standard 3-letter uppercase book abbreviations for Firestore document keys:
 * Matches bibles/{translation}/chapters/{BOOK_ABBR}_{chapterNum}
 */
export const FIRESTORE_BOOK_ABBREVIATIONS: readonly string[] = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];

/**
 * Resolves a book name (or alias/abbreviation) to its standard 3-letter uppercase key.
 * 1-indexed: Book 1 (Genesis) maps to GEN, Book 66 (Revelation) maps to REV.
 */
export function getFirestoreBookAbbr(bookName: string): string {
  const canonical = findCanonicalBook(bookName);
  if (!canonical) {
    return bookName.slice(0, 3).toUpperCase();
  }
  const index = CANONICAL_BOOKS.findIndex((b) => b.name === canonical.name);
  if (index >= 0 && index < FIRESTORE_BOOK_ABBREVIATIONS.length) {
    return FIRESTORE_BOOK_ABBREVIATIONS[index];
  }
  return canonical.name.slice(0, 3).toUpperCase();
}

/**
 * Builds the canonical Firestore chapter document ID.
 * Format: {BOOK_ABBR}_{chapterNum} e.g. JHN_3, GEN_1
 */
export function buildFirestoreChapterDocId(bookName: string, chapter: number): string {
  const abbr = getFirestoreBookAbbr(bookName);
  return `${abbr}_${chapter}`;
}

/**
 * Fetches a single chapter from Firestore for a given translation.
 * Document path: bibles/{translation}/chapters/{BOOK_ABBR}_{chapter}
 */
export async function fetchChapterFromFirestore(
  translation: BibleTranslation,
  bookName: string,
  chapter: number
): Promise<VerseSegment[]> {
  const docId = buildFirestoreChapterDocId(bookName, chapter);
  const docRef = doc(db, 'bibles', String(translation), 'chapters', docId);

  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    throw new Error(`[FirestoreBible] Chapter not found in Firestore: bibles/${translation}/chapters/${docId}`);
  }

  const data = snapshot.data();
  const rawVerses = Array.isArray(data?.verses) ? data.verses : [];

  return rawVerses.map((v: any, index: number) => ({
    verseNumber: typeof v.verseNumber === 'number' ? v.verseNumber : index + 1,
    text: (v.text || '').trim(),
    heading: v.heading ? String(v.heading).trim() : undefined,
  }));
}

/**
 * Fetches a verse range from Firestore (supports single-chapter and cross-chapter spans).
 */
export async function fetchPassageFromFirestore(
  translation: BibleTranslation,
  bookName: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): Promise<VerseSegment[]> {
  const allVerses: VerseSegment[] = [];

  for (let ch = startChapter; ch <= endChapter; ch++) {
    const chapterVerses = await fetchChapterFromFirestore(translation, bookName, ch);

    const filtered = chapterVerses.filter((v) => {
      if (startChapter === endChapter) {
        return v.verseNumber >= startVerse && v.verseNumber <= endVerse;
      }
      if (ch === startChapter) {
        return v.verseNumber >= startVerse;
      }
      if (ch === endChapter) {
        return v.verseNumber <= endVerse;
      }
      return true;
    });

    allVerses.push(...filtered);
  }

  if (allVerses.length === 0) {
    throw new Error(`[FirestoreBible] No matching verses found in range ${bookName} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`);
  }

  return allVerses;
}
