#!/usr/bin/env node
/**
 * Downloads OpenBible.info cross-references (CC BY 4.0) and writes compact
 * per-book JSON assets consumed by src/services/crossReferenceService.ts.
 *
 * Source: https://www.openbible.info/labs/cross-references/
 * Mirror used when the official zip is unavailable:
 *   https://raw.githubusercontent.com/LetsChurch/crossref.bible/main/cross_references.txt
 *
 * Encoding per target ref (always 6 ints):
 *   [bookIndex, startChapter, startVerse, endChapter, endVerse, votes]
 * Book index matches CANONICAL_BOOKS order (0 = Genesis … 65 = Revelation).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const OUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'crossrefs');
const SOURCE_URL =
  process.env.CROSSREF_SOURCE_URL ||
  'https://raw.githubusercontent.com/LetsChurch/crossref.bible/main/cross_references.txt';
const MIN_VOTES = 2;
const MAX_REFS_PER_VERSE = 8;

/** OpenBible abbreviations → 0-based CANONICAL_BOOKS index */
const OPENBIBLE_TO_INDEX = {
  Gen: 0,
  Exod: 1,
  Lev: 2,
  Num: 3,
  Deut: 4,
  Josh: 5,
  Judg: 6,
  Ruth: 7,
  '1Sam': 8,
  '2Sam': 9,
  '1Kgs': 10,
  '2Kgs': 11,
  '1Chr': 12,
  '2Chr': 13,
  Ezra: 14,
  Neh: 15,
  Esth: 16,
  Job: 17,
  Ps: 18,
  Prov: 19,
  Eccl: 20,
  Song: 21,
  Isa: 22,
  Jer: 23,
  Lam: 24,
  Ezek: 25,
  Dan: 26,
  Hos: 27,
  Joel: 28,
  Amos: 29,
  Obad: 30,
  Jonah: 31,
  Mic: 32,
  Nah: 33,
  Hab: 34,
  Zeph: 35,
  Hag: 36,
  Zech: 37,
  Mal: 38,
  Matt: 39,
  Mark: 40,
  Luke: 41,
  John: 42,
  Acts: 43,
  Rom: 44,
  '1Cor': 45,
  '2Cor': 46,
  Gal: 47,
  Eph: 48,
  Phil: 49,
  Col: 50,
  '1Thess': 51,
  '2Thess': 52,
  '1Tim': 53,
  '2Tim': 54,
  Titus: 55,
  Phlm: 56,
  Heb: 57,
  Jas: 58,
  '1Pet': 59,
  '2Pet': 60,
  '1John': 61,
  '2John': 62,
  '3John': 63,
  Jude: 64,
  Rev: 65,
};

const REF_TOKEN =
  /^([A-Za-z0-9]+)\.(\d+)\.(\d+)(?:-([A-Za-z0-9]+)\.(\d+)\.(\d+))?$/;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, { headers: { 'User-Agent': 'bible-notes-crossref-builder/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

function parseFromToken(token) {
  const m = REF_TOKEN.exec(token);
  if (!m) return null;
  const idx = OPENBIBLE_TO_INDEX[m[1]];
  if (idx === undefined) return null;
  return {
    bookIndex: idx,
    chapter: parseInt(m[2], 10),
    verse: parseInt(m[3], 10),
  };
}

function parseToToken(token) {
  const m = REF_TOKEN.exec(token);
  if (!m) return null;
  const startAbbr = m[1];
  const endAbbr = m[4] || startAbbr;
  const startIdx = OPENBIBLE_TO_INDEX[startAbbr];
  const endIdx = OPENBIBLE_TO_INDEX[endAbbr];
  if (startIdx === undefined) return null;
  // If the range crosses books, keep only the starting book segment.
  const bookIndex = startIdx;
  const startChapter = parseInt(m[2], 10);
  const startVerse = parseInt(m[3], 10);
  let endChapter = m[5] ? parseInt(m[5], 10) : startChapter;
  let endVerse = m[6] ? parseInt(m[6], 10) : startVerse;
  if (endIdx !== undefined && endIdx !== startIdx) {
    endChapter = startChapter;
    endVerse = startVerse;
  }
  return { bookIndex, startChapter, startVerse, endChapter, endVerse };
}

async function main() {
  console.log(`Fetching cross references from ${SOURCE_URL}...`);
  const text = await fetchText(SOURCE_URL);
  const lines = text.split(/\r?\n/);
  const byFrom = new Map();

  let kept = 0;
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('From Verse')) continue;
    const parts = line.split('\t');
    if (parts.length < 3) {
      skipped++;
      continue;
    }
    const votes = parseInt(parts[2], 10);
    if (!Number.isFinite(votes) || votes < MIN_VOTES) {
      skipped++;
      continue;
    }
    const from = parseFromToken(parts[0]);
    const to = parseToToken(parts[1]);
    if (!from || !to) {
      skipped++;
      continue;
    }
    const key = `${from.bookIndex}:${from.chapter}:${from.verse}`;
    if (!byFrom.has(key)) byFrom.set(key, []);
    byFrom.get(key).push([
      to.bookIndex,
      to.startChapter,
      to.startVerse,
      to.endChapter,
      to.endVerse,
      votes,
    ]);
    kept++;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  /** @type {Record<number, Record<string, Record<string, number[][]>>>} */
  const books = {};
  for (let bi = 0; bi < 66; bi++) books[bi] = {};

  let refsWritten = 0;
  for (const [key, refs] of byFrom.entries()) {
    const [biStr, chStr, vStr] = key.split(':');
    const bi = parseInt(biStr, 10);
    refs.sort((a, b) => b[5] - a[5]);
    const top = refs.slice(0, MAX_REFS_PER_VERSE);
    if (!books[bi][chStr]) books[bi][chStr] = {};
    books[bi][chStr][vStr] = top;
    refsWritten += top.length;
  }

  const requireLines = [];
  let totalBytes = 0;
  for (let bi = 0; bi < 66; bi++) {
    const filePath = path.join(OUT_DIR, `${bi}.json`);
    const raw = JSON.stringify(books[bi]);
    fs.writeFileSync(filePath, raw);
    totalBytes += Buffer.byteLength(raw);
    requireLines.push(`  ${bi}: () => require('./${bi}.json') as CrossRefBookData,`);
  }

  const indexTs = `/**
 * Auto-generated by scripts/buildCrossReferences.js — do not edit by hand.
 * Cross-reference data © OpenBible.info, CC BY 4.0
 * https://www.openbible.info/labs/cross-references/
 */

export type CrossRefTuple = [
  bookIndex: number,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number,
  votes: number,
];

export type CrossRefBookData = Record<string, Record<string, CrossRefTuple[]>>;

const loaders: Record<number, () => CrossRefBookData> = {
${requireLines.join('\n')}
};

export function loadCrossRefBook(bookIndex: number): CrossRefBookData | null {
  const loader = loaders[bookIndex];
  if (!loader) return null;
  return loader();
}

export const CROSSREF_ATTRIBUTION =
  'Cross references from OpenBible.info (CC BY 4.0)';

export const CROSSREF_BOOK_COUNT = 66;
`;

  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), indexTs);
  fs.writeFileSync(
    path.join(OUT_DIR, 'ATTRIBUTION.txt'),
    [
      'Bible Cross References',
      'Source: OpenBible.info — https://www.openbible.info/labs/cross-references/',
      'License: Creative Commons Attribution 4.0 International (CC BY 4.0)',
      'Primary underlying source: Treasury of Scripture Knowledge (public domain)',
      'Built by scripts/buildCrossReferences.js',
      '',
    ].join('\n')
  );

  console.log(
    `Wrote ${refsWritten} refs across ${byFrom.size} verses (${(totalBytes / 1e6).toFixed(2)} MB JSON). Skipped ${skipped}.`
  );
  console.log(`Output: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
