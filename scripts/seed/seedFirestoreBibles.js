/**
 * seedFirestoreBibles.js
 * 
 * Seeding script to populate Cloud Firestore with complete, public-domain Bible translations:
 * - BSB (Berean Standard Bible) - CC0 Public Domain, includes section headings from official USJ source
 * - KJV (King James Version) - Public Domain
 * 
 * Writes chapter documents to Firestore collection:
 *   bibles/{translation}/chapters/{BOOK_ABBR}_{chapter}
 * 
 * Usage:
 *   node scripts/seed/seedFirestoreBibles.js --translation=BSB --book=LUK
 *   node scripts/seed/seedFirestoreBibles.js --translation=BSB
 *   node scripts/seed/seedFirestoreBibles.js --translation=KJV
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

// Dynamic resolution of firebase-admin (works whether installed at repo root or in functions)
let admin;
try {
  const adminPath = require.resolve('firebase-admin', {
    paths: [process.cwd(), path.join(process.cwd(), 'functions')],
  });
  admin = require(adminPath);
} catch (err) {
  console.error('Failed to locate firebase-admin package:', err);
  process.exit(1);
}

// Service Account Credentials path
const DEFAULT_CRED_PATH = path.join(
  process.cwd(),
  'bible-notes-sweedish-firebase-adminsdk-fbsvc-3db1311d9d.json'
);

const FIRESTORE_BOOK_ABBREVIATIONS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];

const CANONICAL_BOOK_NAMES = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah',
  'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians',
  '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
  '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const BSB_ZIP_URL =
  'https://github.com/BSB-publishing/bsb2usfm/releases/download/v5.16/BSB_usj.zip';
const KJV_JSON_URL =
  'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json';

function initFirestore() {
  if (admin.apps.length) {
    return admin.firestore();
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_CRED_PATH;
  if (fs.existsSync(credPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(credPath),
    });
  } else {
    console.warn(`Credentials file not found at ${credPath}. Trying default app initialization...`);
    admin.initializeApp();
  }

  return admin.firestore();
}

/**
 * Extracts plain text recursively from USJ node, omitting footnotes and cross references.
 */
function extractUsjText(node) {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  // Skip footnotes and cross-references (f, fe, x)
  if (['f', 'fe', 'x'].includes(node.marker)) return '';
  if (Array.isArray(node.content)) {
    return node.content.map(extractUsjText).join('');
  }
  return '';
}

/**
 * Parses a single book's USJ JSON into an array of chapters with verses and headings.
 */
function parseUsjBook(usjData) {
  const chapters = [];
  let currentChapterNumber = null;
  let currentVerses = [];
  let currentVerseNumber = null;
  let currentVerseText = '';
  let currentVerseHeading = null;
  let pendingHeading = null;

  function flushVerse() {
    if (currentVerseNumber !== null) {
      currentVerses.push({
        verseNumber: currentVerseNumber,
        text: currentVerseText.trim(),
        ...(currentVerseHeading ? { heading: currentVerseHeading } : {}),
      });
    }
    currentVerseNumber = null;
    currentVerseText = '';
    currentVerseHeading = null;
  }

  function flushChapter() {
    flushVerse();
    if (currentChapterNumber !== null && currentVerses.length > 0) {
      chapters.push({
        chapterNumber: currentChapterNumber,
        verses: currentVerses,
      });
    }
    currentChapterNumber = null;
    currentVerses = [];
  }

  const content = usjData.content || [];
  for (const item of content) {
    if (item.type === 'chapter') {
      flushChapter();
      currentChapterNumber = parseInt(item.number, 10);
      continue;
    }

    if (currentChapterNumber === null) continue;

    // Pericope section heading markers (s1, s2, s)
    if (item.type === 'para' && (item.marker === 's1' || item.marker === 's2' || item.marker === 's')) {
      const headingText = (item.content || []).map(extractUsjText).join('').trim();
      if (headingText) {
        pendingHeading = headingText;
      }
      continue;
    }

    // Paragraph containing verses
    if (item.type === 'para' && Array.isArray(item.content)) {
      for (const piece of item.content) {
        if (typeof piece === 'object' && piece.type === 'verse') {
          flushVerse();
          currentVerseNumber = parseInt(piece.number, 10);
          currentVerseHeading = pendingHeading;
          pendingHeading = null;
        } else if (currentVerseNumber !== null) {
          currentVerseText += extractUsjText(piece);
        }
      }
    }
  }

  flushChapter();
  return chapters;
}

async function ensureBsbData() {
  const dataDir = path.join(__dirname, 'data');
  const usjDir = path.join(dataDir, 'usj');
  const zipPath = path.join(dataDir, 'BSB_usj.zip');

  if (fs.existsSync(usjDir) && fs.readdirSync(usjDir).length >= 66) {
    return usjDir;
  }

  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Downloading BSB USJ release from ${BSB_ZIP_URL}...`);
  execSync(`curl -s -L -o "${zipPath}" "${BSB_ZIP_URL}"`);
  console.log(`Extracting BSB USJ zip...`);
  execSync(`unzip -q -o "${zipPath}" -d "${usjDir}"`);
  return usjDir;
}

async function seedBsb(db, targetBookAbbr) {
  const usjDir = await ensureBsbData();
  const booksToSeed = targetBookAbbr
    ? [targetBookAbbr.toUpperCase()]
    : FIRESTORE_BOOK_ABBREVIATIONS;

  console.log(`\n=== Seeding BSB into Firestore (${booksToSeed.length} book(s)) ===`);
  let totalChapters = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const bookAbbr of booksToSeed) {
    const bIndex = FIRESTORE_BOOK_ABBREVIATIONS.indexOf(bookAbbr);
    if (bIndex === -1) {
      console.warn(`Skipping unknown book abbreviation: ${bookAbbr}`);
      continue;
    }

    const bookName = CANONICAL_BOOK_NAMES[bIndex];
    const bookNumber = bIndex + 1;
    const usjFilePath = path.join(usjDir, `${bookAbbr}.usj`);

    if (!fs.existsSync(usjFilePath)) {
      console.warn(`USJ file not found for ${bookAbbr}: ${usjFilePath}`);
      continue;
    }

    const rawUsj = JSON.parse(fs.readFileSync(usjFilePath, 'utf8'));
    const chapters = parseUsjBook(rawUsj);
    console.log(`Processing ${bookName} (${bookAbbr}): ${chapters.length} chapters...`);

    for (const ch of chapters) {
      const docId = `${bookAbbr}_${ch.chapterNumber}`;
      const docRef = db.collection('bibles').doc('BSB').collection('chapters').doc(docId);

      batch.set(docRef, {
        translation: 'BSB',
        book: bookName,
        bookAbbr,
        bookNumber,
        chapter: ch.chapterNumber,
        verses: ch.verses,
      });

      totalChapters++;
      batchCount++;

      if (batchCount >= 400) {
        console.log(`  Writing batch of ${batchCount} chapters... (Total: ${totalChapters})`);
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    console.log(`  Writing final batch of ${batchCount} chapters...`);
    await batch.commit();
  }

  console.log(`Successfully seeded ${totalChapters} BSB chapter(s) into Firestore!\n`);
}

async function seedKjv(db, targetBookAbbr) {
  console.log(`\n=== Seeding KJV into Firestore ===`);
  console.log(`Downloading KJV JSON from ${KJV_JSON_URL}...`);

  const response = await fetch(KJV_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to download KJV source: ${response.status} ${response.statusText}`);
  }

  const rawBooks = await response.json();
  let totalChapters = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (let bIndex = 0; bIndex < rawBooks.length; bIndex++) {
    const rawBook = rawBooks[bIndex];
    const bookAbbr = FIRESTORE_BOOK_ABBREVIATIONS[bIndex];
    if (targetBookAbbr && bookAbbr !== targetBookAbbr.toUpperCase()) {
      continue;
    }

    const bookName = CANONICAL_BOOK_NAMES[bIndex] || rawBook.name;
    const bookNumber = bIndex + 1;
    const chapters = rawBook.chapters;

    console.log(`Processing ${bookName} (${bookAbbr}): ${chapters.length} chapters...`);

    for (let cIndex = 0; cIndex < chapters.length; cIndex++) {
      const chapterNumber = cIndex + 1;
      const rawVerses = chapters[cIndex];

      const verses = rawVerses.map((verseText, vIdx) => ({
        verseNumber: vIdx + 1,
        text: typeof verseText === 'string' ? verseText.trim() : String(verseText || '').trim(),
      }));

      const docId = `${bookAbbr}_${chapterNumber}`;
      const docRef = db.collection('bibles').doc('KJV').collection('chapters').doc(docId);

      batch.set(docRef, {
        translation: 'KJV',
        book: bookName,
        bookAbbr,
        bookNumber,
        chapter: chapterNumber,
        verses,
      });

      totalChapters++;
      batchCount++;

      if (batchCount >= 400) {
        console.log(`  Writing batch of ${batchCount} chapters... (Total: ${totalChapters})`);
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    console.log(`  Writing final batch of ${batchCount} chapters...`);
    await batch.commit();
  }

  console.log(`Successfully seeded ${totalChapters} KJV chapter(s) into Firestore!\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const translationArg = args.find((a) => a.startsWith('--translation='))?.split('=')[1] || 'BSB';
  const bookArg = args.find((a) => a.startsWith('--book='))?.split('=')[1] || null;

  const db = initFirestore();

  if (translationArg.toUpperCase() === 'BSB') {
    await seedBsb(db, bookArg);
  } else if (translationArg.toUpperCase() === 'KJV') {
    await seedKjv(db, bookArg);
  } else {
    console.error(`Unsupported translation: ${translationArg}. Choose BSB or KJV.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
