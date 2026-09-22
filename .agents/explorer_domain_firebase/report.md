# Domain, Architecture & Firebase Technical Report

**Project**: Swedish Method Bible Study Notes Mobile App (`bible_notes`)  
**Target Platform**: Expo SDK 57, React Native, Firebase JS SDK Modular v11  
**Author**: Domain & Architecture Explorer  
**Date**: 2026-09-22  

---

## 1. Executive Summary

This report delivers the concrete technical architecture, mathematical algorithms, data schemas, API integration contracts, and security rules alignment required to implement the Swedish Method Bible study notes mobile app.

### Core Discoveries & Highlights:
1. **Canonical Bible Ordinal Index (1 to 31,102)**:
   - The 66-book Protestant canon comprises exactly 1,189 chapters (929 OT, 260 NT) and exactly 31,102 verses (23,145 OT, 7,957 NT).
   - Continuous ordinal mapping transforms multi-chapter verse intervals into 1D integer ranges $[s, e]$, allowing interval overlap calculation with the formula $\max(s_1, s_2) \le \min(e_1, e_2)$ with zero special-casing for book or chapter boundaries.
2. **Crossway ESV API Critical Authentication Requirement**:
   - **Crucial Finding**: Crossway's API server requires `Authorization: Token <API_KEY>` (Django REST format). Using `Authorization: Bearer <API_KEY>` results in HTTP 401 `{"detail": "Invalid application key in Authorization header."}`.
   - Fallback to `https://bible-api.com/` (World English Bible) provides seamless offline and quota resilience.
3. **Firebase Client & Configuration**:
   - Active Firebase project: `bible-notes-sweedish` (Web App ID: `1:641152478914:web:d2e49874c858749015955b`).
   - Modular v11 requires `initializeAuth` coupled with `getReactNativePersistence(AsyncStorage)`.
   - Deterministic friendship document IDs (`${minUid}_${maxUid}`) prevent race conditions and duplicate friendships.
   - Firestore security rules require notes queries to filter by `user_id in [friendUids]` to avoid `permission-denied` errors when checking for friend notes.

---

## 2. Canonical Bible Verse Metadata & Integer Ordinal Mapping

### 2.1 The Canon Structure
The Protestant biblical canon consists of:
- **Old Testament (OT)**: 39 books, 929 chapters, 23,145 verses.
  - Genesis 1:1 is **Ordinal 1**.
  - Malachi 4:6 is **Ordinal 23,145**.
- **New Testament (NT)**: 27 books, 260 chapters, 7,957 verses.
  - Matthew 1:1 is **Ordinal 23,146**.
  - John 3:16 is **Ordinal 26,137**.
  - Revelation 22:21 is **Ordinal 31,102**.
- **Total**: 66 books, 1,189 chapters, 31,102 verses.

### 2.2 Canonical Book Specifications & Verse Counts
The full 66 books with chapter counts and cumulative verse counts:

| ID | Book Name | Common Abbr | Testament | Chapters | Total Verses | Start Ordinal | End Ordinal |
|----|-----------|-------------|-----------|----------|--------------|---------------|-------------|
| 1 | Genesis | Gen | OT | 50 | 1,533 | 1 | 1,533 |
| 2 | Exodus | Exod | OT | 40 | 1,213 | 1,534 | 2,746 |
| 3 | Leviticus | Lev | OT | 27 | 859 | 2,747 | 3,605 |
| 4 | Numbers | Num | OT | 36 | 1,288 | 3,606 | 4,893 |
| 5 | Deuteronomy | Deut | OT | 34 | 959 | 4,894 | 5,852 |
| 6 | Joshua | Josh | OT | 24 | 658 | 5,853 | 6,510 |
| 7 | Judges | Judg | OT | 21 | 618 | 6,511 | 7,128 |
| 8 | Ruth | Ruth | OT | 4 | 85 | 7,129 | 7,213 |
| 9 | 1 Samuel | 1Sam | OT | 31 | 810 | 7,214 | 8,023 |
| 10 | 2 Samuel | 2Sam | OT | 24 | 695 | 8,024 | 8,718 |
| 11 | 1 Kings | 1Kgs | OT | 22 | 816 | 8,719 | 9,534 |
| 12 | 2 Kings | 2Kgs | OT | 25 | 719 | 9,535 | 10,253 |
| 13 | 1 Chronicles | 1Chr | OT | 29 | 942 | 10,254 | 11,195 |
| 14 | 2 Chronicles | 2Chr | OT | 36 | 822 | 11,196 | 12,017 |
| 15 | Ezra | Ezra | OT | 10 | 280 | 12,018 | 12,297 |
| 16 | Nehemiah | Neh | OT | 13 | 406 | 12,298 | 12,703 |
| 17 | Esther | Esth | OT | 10 | 167 | 12,704 | 12,870 |
| 18 | Job | Job | OT | 42 | 1,070 | 12,871 | 13,940 |
| 19 | Psalms | Ps | OT | 150 | 2,461 | 13,941 | 16,401 |
| 20 | Proverbs | Prov | OT | 31 | 915 | 16,402 | 17,316 |
| 21 | Ecclesiastes | Eccl | OT | 12 | 222 | 17,317 | 17,538 |
| 22 | Song of Solomon | Song | OT | 8 | 117 | 17,539 | 17,655 |
| 23 | Isaiah | Isa | OT | 66 | 1,292 | 17,656 | 18,947 |
| 24 | Jeremiah | Jer | OT | 52 | 1,364 | 18,948 | 20,311 |
| 25 | Lamentations | Lam | OT | 5 | 154 | 20,312 | 20,465 |
| 26 | Ezekiel | Ezek | OT | 48 | 1,273 | 20,466 | 21,738 |
| 27 | Daniel | Dan | OT | 12 | 357 | 21,739 | 22,095 |
| 28 | Hosea | Hos | OT | 14 | 197 | 22,096 | 22,292 |
| 29 | Joel | Joel | OT | 3 | 73 | 22,293 | 22,365 |
| 30 | Amos | Amos | OT | 9 | 146 | 22,366 | 22,511 |
| 31 | Obadiah | Obad | OT | 1 | 21 | 22,512 | 22,532 |
| 32 | Jonah | Jonah | OT | 4 | 48 | 22,533 | 22,580 |
| 33 | Micah | Mic | OT | 7 | 105 | 22,581 | 22,685 |
| 34 | Nahum | Nah | OT | 3 | 47 | 22,686 | 22,732 |
| 35 | Habakkuk | Hab | OT | 3 | 56 | 22,733 | 22,788 |
| 36 | Zephaniah | Zeph | OT | 3 | 53 | 22,789 | 22,841 |
| 37 | Haggai | Hag | OT | 2 | 38 | 22,842 | 22,879 |
| 38 | Zechariah | Zech | OT | 14 | 211 | 22,880 | 23,090 |
| 39 | Malachi | Mal | OT | 4 | 55 | 23,091 | 23,145 |
| 40 | Matthew | Matt | NT | 28 | 1,071 | 23,146 | 24,216 |
| 41 | Mark | Mark | NT | 16 | 678 | 24,217 | 24,894 |
| 42 | Luke | Luke | NT | 24 | 1,151 | 24,895 | 26,045 |
| 43 | John | John | NT | 21 | 879 | 26,046 | 26,924 |
| 44 | Acts | Acts | NT | 28 | 1,007 | 26,925 | 27,931 |
| 45 | Romans | Rom | NT | 16 | 433 | 27,932 | 28,364 |
| 46 | 1 Corinthians | 1Cor | NT | 16 | 437 | 28,365 | 28,801 |
| 47 | 2 Corinthians | 2Cor | NT | 13 | 257 | 28,802 | 29,058 |
| 48 | Galatians | Gal | NT | 6 | 149 | 29,059 | 29,207 |
| 49 | Ephesians | Eph | NT | 6 | 155 | 29,208 | 29,362 |
| 50 | Philippians | Phil | NT | 4 | 104 | 29,363 | 29,466 |
| 51 | Colossians | Col | NT | 4 | 95 | 29,467 | 29,561 |
| 52 | 1 Thessalonians | 1Thess | NT | 5 | 89 | 29,562 | 29,650 |
| 53 | 2 Thessalonians | 2Thess | NT | 3 | 47 | 29,651 | 29,697 |
| 54 | 1 Timothy | 1Tim | NT | 6 | 113 | 29,698 | 29,810 |
| 55 | 2 Timothy | 2Tim | NT | 4 | 83 | 29,811 | 29,893 |
| 56 | Titus | Titus | NT | 3 | 46 | 29,894 | 29,939 |
| 57 | Philemon | Phlm | NT | 1 | 25 | 29,940 | 29,964 |
| 58 | Hebrews | Heb | NT | 13 | 303 | 29,965 | 30,267 |
| 59 | James | Jas | NT | 5 | 108 | 30,268 | 30,375 |
| 60 | 1 Peter | 1Pet | NT | 5 | 105 | 30,376 | 30,480 |
| 61 | 2 Peter | 2Pet | NT | 3 | 61 | 30,481 | 30,541 |
| 62 | 1 John | 1John | NT | 5 | 105 | 30,542 | 30,646 |
| 63 | 2 John | 2John | NT | 1 | 13 | 30,647 | 30,659 |
| 64 | 3 John | 3John | NT | 1 | 14 | 30,660 | 30,673 |
| 65 | Jude | Jude | NT | 1 | 25 | 30,674 | 30,698 |
| 66 | Revelation | Rev | NT | 22 | 404 | 30,699 | 31,102 |

### 2.3 Data Structure Design (`constants/bibleData.ts`)
To maximize runtime efficiency and minimize memory footprint, the entire canon metadata can be structured into:
1. `BookMeta`: `{ id, name, abbr, testament, chapterVerses: number[], startOrdinal: number, endOrdinal: number }`.
2. A normalized lookup table that supports book names, lowercase names, and aliases (e.g., "Psalm" -> "Psalms", "Song of Songs" -> "Song of Solomon").
The entire data structure compiles to under 9 KB in JS, incurring zero network overhead.

### 2.4 Mathematical Algorithms

#### Function 1: `referenceToOrdinals`
Maps a human passage reference (including single-verse, multi-verse, and cross-chapter passages) to a 1D ordinal range $[startVerseId, endVerseId]$.

```typescript
export function referenceToOrdinals(
  bookName: string,
  chapterStart: number,
  verseStart: number,
  chapterEnd: number,
  verseEnd: number
): [number, number] {
  const book = findBook(bookName);
  if (!book) throw new Error(`Invalid book name: ${bookName}`);

  // Validation
  if (chapterStart < 1 || chapterStart > book.chapterVerses.length) {
    throw new Error(`Invalid start chapter ${chapterStart} for book ${book.name}`);
  }
  if (chapterEnd < 1 || chapterEnd > book.chapterVerses.length) {
    throw new Error(`Invalid end chapter ${chapterEnd} for book ${book.name}`);
  }
  if (chapterStart > chapterEnd) {
    throw new Error(`Start chapter ${chapterStart} cannot exceed end chapter ${chapterEnd}`);
  }

  const maxStartVerse = book.chapterVerses[chapterStart - 1];
  if (verseStart < 1 || verseStart > maxStartVerse) {
    throw new Error(`Invalid start verse ${verseStart} for ${book.name} ${chapterStart}`);
  }

  const maxEndVerse = book.chapterVerses[chapterEnd - 1];
  if (verseEnd < 1 || verseEnd > maxEndVerse) {
    throw new Error(`Invalid end verse ${verseEnd} for ${book.name} ${chapterEnd}`);
  }

  if (chapterStart === chapterEnd && verseStart > verseEnd) {
    throw new Error(`Start verse ${verseStart} cannot exceed end verse ${verseEnd}`);
  }

  // Precomputed chapter offsets inside book
  let startOffset = 0;
  for (let c = 0; c < chapterStart - 1; c++) {
    startOffset += book.chapterVerses[c];
  }
  const startOrdinal = book.startOrdinal + startOffset + (verseStart - 1);

  let endOffset = 0;
  for (let c = 0; c < chapterEnd - 1; c++) {
    endOffset += book.chapterVerses[c];
  }
  const endOrdinal = book.startOrdinal + endOffset + (verseEnd - 1);

  return [startOrdinal, endOrdinal];
}
```

#### Function 2: `ordinalToReference`
Inverts any integer in $[1, 31102]$ back to `{ book, chapter, verse }`.

```typescript
export function ordinalToReference(ordinal: number): {
  book: string;
  chapter: number;
  verse: number;
} {
  if (ordinal < 1 || ordinal > 31102 || !Number.isInteger(ordinal)) {
    throw new Error(`Ordinal ${ordinal} is out of bounds [1, 31102]`);
  }

  // Binary search or indexed lookup across 66 books
  const book = BIBLE_BOOKS.find(b => ordinal >= b.startOrdinal && ordinal <= b.endOrdinal);
  if (!book) throw new Error(`Book not found for ordinal ${ordinal}`);

  let remaining = ordinal - book.startOrdinal + 1;
  for (let i = 0; i < book.chapterVerses.length; i++) {
    const count = book.chapterVerses[i];
    if (remaining <= count) {
      return {
        book: book.name,
        chapter: i + 1,
        verse: remaining,
      };
    }
    remaining -= count;
  }

  throw new Error(`Failed to resolve ordinal ${ordinal}`);
}
```

### 2.5 Range Overlap Math
Given two closed intervals $I_1 = [s_1, e_1]$ and $I_2 = [s_2, e_2]$ where $s_1 \le e_1$ and $s_2 \le e_2$:
- **Theorem**: $I_1 \cap I_2 \neq \emptyset \iff \max(s_1, s_2) \le \min(e_1, e_2)$.
- **Intersection Interval**: $[\max(s_1, s_2), \min(e_1, e_2)]$.
- **Overlap Verse Count**: $\min(e_1, e_2) - \max(s_1, s_2) + 1$.

```typescript
export interface OverlapResult {
  overlaps: boolean;
  startOrdinal: number;
  endOrdinal: number;
  verseCount: number;
}

export function checkRangeOverlap(
  rangeA: [number, number],
  rangeB: [number, number]
): OverlapResult {
  const start = Math.max(rangeA[0], rangeB[0]);
  const end = Math.min(rangeA[1], rangeB[1]);
  if (start <= end) {
    return {
      overlaps: true,
      startOrdinal: start,
      endOrdinal: end,
      verseCount: end - start + 1,
    };
  }
  return {
    overlaps: false,
    startOrdinal: 0,
    endOrdinal: 0,
    verseCount: 0,
  };
}
```

#### Why Continuous Ordinals Solve Edge Cases:
1. **Cross-chapter notes**: A study covering John 2:23 to John 3:21 has ordinal interval $[26119, 26142]$. Another note covering John 3:16 $[26137, 26137]$ is cleanly evaluated: $\max(26119, 26137) = 26137 \le \min(26142, 26137) = 26137 \implies$ **Overlap detected**!
2. **Different Books**: Because books occupy non-overlapping ordinal segments (Genesis $[1, 1533]$ vs Exodus $[1534, 2746]$), notes in different books mathematically cannot overlap: $\max(1, 1534) = 1534 > \min(1533, 2746) = 1533 \implies$ **No overlap**.

---

## 3. Bible API Client & Caching Strategy

### 3.1 Crossway ESV API Integration
- **Endpoint**: `https://api.esv.org/v3/passage/text/`
- **Default Application Key**: `6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba`
- **HTTP Header**:
  ```http
  Authorization: Token 6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba
  ```
  *(Note: Must use prefix `Token`, NOT `Bearer`).*
- **Recommended Query Parameters for Swedish Method UI**:
  ```
  q: string; // e.g. "John 3:16" or "Romans 8:28-39"
  include-passage-references: false // Reference is styled in screen header
  include-verse-numbers: true      // Retains [16] verse markers
  include-first-verse-numbers: true// Ensures first verse also has [1]
  include-footnotes: false          // Strips footnote markers
  include-footnote-body: false     // Strips footnote section
  include-headings: false          // Day One clean unbordered aesthetic
  include-short-copyright: false   // Clean reader text
  ```
- **Response Format**:
  ```json
  {
    "query": "John 3:16",
    "canonical": "John 3:16",
    "parsed": [[43003016, 43003016]],
    "passage_meta": [...],
    "passages": [
      "  [16] “For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.\n\n"
    ]
  }
  ```

### 3.2 Public Domain WEB Fallback API
- **Endpoint**: `https://bible-api.com/{passage}`
- **Example**: `https://bible-api.com/john+3:16` or `https://bible-api.com/john+2:23-3:3`
- **Authentication**: None (Public domain World English Bible).
- **Response Format**:
  ```json
  {
    "reference": "John 3:16",
    "verses": [
      {
        "book_id": "JHN",
        "book_name": "John",
        "chapter": 3,
        "verse": 16,
        "text": "\nFor God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.\n\n"
      }
    ],
    "text": "...",
    "translation_id": "web",
    "translation_name": "World English Bible"
  }
  ```

### 3.3 AsyncStorage Caching Architecture
- **Cache Key Format**: `@bible_cache:${translation.toLowerCase()}:${normalizedPassage}`
  - Example: `@bible_cache:esv:John_3_16`
  - Example: `@bible_cache:web:Romans_8_28-39`
- **Cache Entry Structure**:
  ```typescript
  export interface CachedPassage {
    text: string;
    translation: 'ESV' | 'WEB';
    cachedAt: number; // Date.now()
    reference: string;
  }
  ```
- **Cache Invalidation & TTL**:
  Scriptural text is immutable; therefore, an indefinite TTL (or 90-day retention with LRU eviction) is optimal.
- **Failover Execution Flow**:
  1. Check `AsyncStorage` for `@bible_cache:esv:${ref}`. If hit, return immediately.
  2. If miss, fetch from Crossway ESV API using active key (custom key from user profile or default app key).
  3. If ESV succeeds $\to$ write to `@bible_cache:esv:${ref}` $\to$ return ESV text.
  4. If ESV fails (network timeout, rate limit 429, invalid key 401, or offline):
     - Check `AsyncStorage` for `@bible_cache:web:${ref}`. If hit, return WEB text.
     - If miss and online, fetch from `https://bible-api.com/${ref}` $\to$ write to `@bible_cache:web:${ref}` $\to$ return WEB text.
  5. If both fail and device is offline, surface a clean offline banner with retry option.

### 3.4 Custom ESV API Key Override
- **Storage**:
  - Cloud: Stored in Firestore document `users/{uid}.esv_api_key`.
  - Local: Cached in `AsyncStorage` (`@user_esv_api_key`) to eliminate async Firestore fetch delay on reader launch.
- **Settings Screen Flow**:
  - Shows current status ("Using Default App Key" vs "Custom Key configured: `6182...`").
  - "Test Key" button validates the key with a lightweight query (`John 1:1`) before saving.
  - "Revert to Default" button clears `esv_api_key` in Firestore and deletes local `@user_esv_api_key`.

---

## 4. Firebase Client Architecture (Modular v11 & Firestore)

### 4.1 Verified Project Configuration
From linked Firebase project `bible-notes-sweedish`:
```typescript
export const firebaseConfig = {
  projectId: "bible-notes-sweedish",
  appId: "1:641152478914:web:d2e49874c858749015955b",
  apiKey: "AIzaSyC_sKH5ZPgT0J6ZvvB5isV0KIDi8xBNleE",
  authDomain: "bible-notes-sweedish.firebaseapp.com",
  databaseURL: "https://bible-notes-sweedish-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "bible-notes-sweedish.firebasestorage.app",
  messagingSenderId: "641152478914",
};
```

### 4.2 React Native Modular v11 Initialization
```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from '../constants/config';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  db = getFirestore(app);
}

export { app, auth, db };
```

### 4.3 Firestore Schema & Data Access Layer

#### 1. `users/{userId}`
- **Document ID**: Matches Firebase Auth UID (`auth.currentUser.uid`).
```typescript
export interface UserDocument {
  id: string;                      // Firebase Auth UID
  username: string;                // lowercase, 3-20 chars: ^[a-z0-9_]{3,20}$
  full_name: string;               // Display name
  email: string;                   // User email address
  default_visibility: 'friends' | 'private'; // default: 'friends'
  esv_api_key?: string;            // Optional custom ESV API key override
  created_at: any;                 // FieldValue.serverTimestamp()
  updated_at: any;                 // FieldValue.serverTimestamp()
}
```

#### 2. `friendships/{friendshipId}`
- **Document ID**: Composite key `${smallerUid}_${largerUid}` using alphabetical sort:
  ```typescript
  export function getFriendshipId(uidA: string, uidB: string): string {
    return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
  }
  ```
- **Document Structure**:
```typescript
export interface FriendshipDocument {
  id: string;                      // "uidA_uidB"
  user_ids: [string, string];      // Sorted array [smallerUid, largerUid]
  status: 'pending' | 'accepted';
  requested_by: string;            // UID of requester
  created_at: any;                 // FieldValue.serverTimestamp()
  updated_at: any;                 // FieldValue.serverTimestamp()
}
```

#### 3. `notes/{noteId}`
- **Document Structure**:
```typescript
export interface NoteDocument {
  id: string;                      // auto-generated doc ID
  user_id: string;                 // Author UID
  book: string;                    // e.g. "John"
  chapter_start: number;
  verse_start: number;
  chapter_end: number;
  verse_end: number;
  start_verse_id: number;          // 1 to 31102
  end_verse_id: number;            // 1 to 31102
  content: string;                 // Markdown formatted with Swedish Method
  tags: string[];                  // max 5 tags, e.g. ["grace", "faith"]
  visibility: 'private' | 'friends';
  created_at: any;
  updated_at: any;
}
```

#### 4. `notifications/{notificationId}`
- **Document Structure**:
```typescript
export interface NotificationDocument {
  id: string;                      // doc ID
  user_id: string;                 // Recipient UID
  type: 'friend_note_exists' | 'friend_request' | 'friend_accept';
  related_note_id?: string;        // ID of note causing overlap
  related_user_id: string;         // Author or requester UID
  related_user_name: string;       // Display name of author/requester
  passage_summary?: string;        // e.g. "John 3:16"
  read: boolean;                   // false initially
  created_at: any;
}
```

### 4.4 Username Uniqueness Validation
1. **Format Validation**:
   - Regex: `/^[a-z0-9_]{3,20}$/`
   - Disallow uppercase, spaces, and special symbols.
2. **Availability Query**:
   - Before account registration or username change:
     ```typescript
     const q = query(
       collection(db, 'users'),
       where('username', '==', cleanUsername),
       limit(1)
     );
     const snap = await getDocs(q);
     if (!snap.empty) {
       throw new Error('Username is already taken');
     }
     ```
   - Firestore security rule allows this query because `allow read: if isAuthenticated();` grants read access to all authenticated users. During registration, the user authenticates with email/password first, checks username availability, and immediately writes their `users/{uid}` profile doc.

### 4.5 Mutual Friendship Workflow State Machine

```
   [User A searches User B]
              │
              ▼
   [Check existing friendship doc]
              │
   ┌──────────┴──────────┐
   │ Not found           │ Found
   ▼                     ▼
[Create pending doc]   [Examine status]
(requested_by = A)       ├── status: 'accepted' -> Already friends
                         ├── status: 'pending' && requested_by == A -> Awaiting B's response
                         └── status: 'pending' && requested_by == B -> Prompt A to Accept!

   [User B views Requests Tab]
              │
   ┌──────────┴──────────┐
   ▼                     ▼
[Accept Request]      [Decline Request]
update status='accepted' deleteDoc(friendshipDoc)
notify User A          
```

1. **Send Request**:
   `setDoc(doc(db, 'friendships', friendshipId), { id: friendshipId, user_ids: [uidA, uidB].sort(), status: 'pending', requested_by: uidA, created_at: serverTimestamp(), updated_at: serverTimestamp() })`
   Also writes notification to `notifications` collection for User B.
2. **Accept Request**:
   `updateDoc(doc(db, 'friendships', friendshipId), { status: 'accepted', updated_at: serverTimestamp() })`
   Also writes notification to `notifications` for User A.
3. **Decline / Cancel / Unfriend**:
   `deleteDoc(doc(db, 'friendships', friendshipId))`

### 4.6 Overlap Detection Engine & Firestore Rules Alignment

#### The Firestore Security Rule Constraint:
In `firestore.rules`:
```
match /notes/{noteId} {
  allow read: if isAuthenticated() && (
    resource.data.user_id == request.auth.uid ||
    (resource.data.visibility == 'friends' && areFriends(request.auth.uid, resource.data.user_id))
  );
}
```
**CRITICAL ARCHITECTURAL FACT**:
Firestore security rules evaluate queries against the *query constraints*, NOT document-by-document filters.
A global query `query(collection(db, 'notes'), where('book', '==', 'John'))` **WILL FAIL WITH PERMISSION DENIED** because the query could potentially return notes from non-friends or private notes.

#### The Safe Query & Overlap Engine Architecture:
To detect overlaps and query friend notes cleanly without security rule violations:
1. **Maintain Friend List**: The client maintains the user's active mutual friend UIDs (`friendUids: string[]`) via a real-time listener on `friendships`.
2. **Scoped Friend Notes Query**:
   To find notes written by friends for a specific book:
   ```typescript
   // Firestore supports up to 30 elements in an 'in' query
   const chunks = chunkArray(friendUids, 30);
   for (const chunk of chunks) {
     const q = query(
       collection(db, 'notes'),
       where('user_id', 'in', chunk),
       where('book', '==', targetBook),
       where('visibility', '==', 'friends')
     );
     const snap = await getDocs(q);
     // ... process documents
   }
   ```
   Because `user_id in chunk` guarantees all returned documents belong to mutual friends and `visibility == 'friends'`, the query **strictly satisfies** the Firestore security rule!
3. **Client-Side In-Memory Overlap Check**:
   For each friend note returned in the same book:
   ```typescript
   const { overlaps } = checkRangeOverlap(
     [note.start_verse_id, note.end_verse_id],
     [friendNote.start_verse_id, friendNote.end_verse_id]
   );
   ```
   Since a book typically contains only dozens of friend notes, this in-memory check executes in `< 1ms`.
4. **Idempotent Notification Writing**:
   When saving a note with `visibility === 'friends'`, if an overlap with a friend's note is detected:
   ```typescript
   // Deterministic doc ID ensures no duplicate notifications on auto-save
   const notifId = `overlap_${note.id}_${friendNote.user_id}`;
   await setDoc(doc(db, 'notifications', notifId), {
     id: notifId,
     user_id: friendNote.user_id, // Friend receives notification
     type: 'friend_note_exists',
     related_note_id: note.id,
     related_user_id: auth.currentUser.uid,
     related_user_name: userProfile.full_name || userProfile.username,
     passage_summary: `${note.book} ${note.chapter_start}:${note.verse_start}...`,
     read: false,
     created_at: serverTimestamp(),
   });
   ```

---

## 5. Proposed Modular Code Structure & Separation of Concerns

```
bible_notes/
├── app/                                 # Expo Router routes
│   ├── _layout.tsx                      # Root layout (PaperProvider, AuthProvider, Fonts)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx                    # Email/Password login
│   │   ├── register.tsx                 # Account registration & username validation
│   │   └── forgot-password.tsx          # Password reset flow
│   ├── (tabs)/
│   │   ├── _layout.tsx                  # Bottom tab navigator with warm dark theme
│   │   ├── index.tsx                    # Dashboard (Recent notes, quick passage, unread badge)
│   │   ├── notes.tsx                    # Notes directory (Book/Chapter accordion & Tags)
│   │   ├── friends.tsx                  # Friends Hub (Active, Requests, User search)
│   │   └── settings.tsx                 # User settings (Default visibility, Custom ESV key)
│   ├── note/
│   │   ├── [id].tsx                     # Note detail + passage reader + Letterboxd overlap badge
│   │   └── edit.tsx                     # Swedish Method editor (Day One style) + Passage picker
│   ├── friend/
│   │   └── [id].tsx                     # Friend profile + shared notes feed
│   └── notifications.tsx                # Notifications center modal
├── src/
│   ├── constants/
│   │   ├── theme.ts                     # Warm dark palette tokens, spacing, radius, typography
│   │   ├── bibleData.ts                 # 66-book canon metadata, chapter verse counts, offsets
│   │   └── config.ts                    # ESV default token, API endpoints, cache prefixes
│   ├── types/
│   │   ├── bible.ts                     # BookMeta, VerseRef, OrdinalRange
│   │   ├── note.ts                      # NoteDocument, SwedishMethodSections
│   │   ├── user.ts                      # UserDocument, UserPreferences
│   │   ├── friendship.ts                # FriendshipDocument, FriendRequest
│   │   └── notification.ts              # NotificationDocument
│   ├── services/
│   │   ├── firebase.ts                  # Firebase v11 modular app, auth (AsyncStorage), db
│   │   ├── authService.ts               # register, login, logout, resetPassword, checkUsername
│   │   ├── noteService.ts               # saveNote, updateNote, deleteNote, getNotesByUser
│   │   ├── friendshipService.ts         # sendRequest, acceptRequest, unfriend, searchUsers
│   │   ├── overlapService.ts            # checkOverlaps, triggerOverlapNotifications
│   │   ├── bibleApiService.ts           # fetchPassageText (ESV Token -> WEB fallback -> Cache)
│   │   └── cacheService.ts              # AsyncStorage helper with namespacing
│   ├── utils/
│   │   ├── bibleOrdinals.ts             # referenceToOrdinals, ordinalToReference, checkOverlap
│   │   ├── passageFormatter.ts          # formatPassageReference, parseReference
│   │   └── validation.ts                # username, email, password regex & validators
│   ├── hooks/
│   │   ├── useAuth.ts                   # Current user & profile state
│   │   ├── useNotes.ts                  # Real-time user notes listener
│   │   ├── useFriends.ts                # Real-time friendships & friend profiles
│   │   ├── useNotifications.ts          # Real-time unread count & notification stream
│   │   └── usePassageText.ts            # Hook for fetching/caching passage text
│   └── components/
│       ├── common/
│       │   ├── AppHeader.tsx            # Header with notification bell & unread badge
│       │   ├── ScreenContainer.tsx      # bg.base (#1A1816) safe container
│       │   └── TagChip.tsx              # Radius.control (8) chip
│       ├── editor/
│       │   ├── SwedishSection.tsx        # Section header (💡, ❓, 🏹) + unbordered input
│       │   └── TagInputModal.tsx        # Tag input with suggestions
│       ├── picker/
│       │   ├── PassagePickerModal.tsx   # YouVersion drill-down sheet (Book -> Ch -> Verses)
│       │   ├── BookGrid.tsx             # 66-book categorized grid
│       │   ├── ChapterGrid.tsx          # Numbered chapter tiles
│       │   └── VerseSelector.tsx        # Verse range selector
│       ├── reader/
│       │   └── BibleReader.tsx          # Source Serif Pro passage text display
│       ├── social/
│       │   ├── OverlapBadge.tsx         # Letterboxd inline pill: avatar + "Friend also noted..."
│       │   ├── FriendRow.tsx            # Friend list item with actions
│       │   └── NotificationRow.tsx      # Compact avatar-led notification row
│       └── notes/
│           ├── NoteCard.tsx             # Hairline border card with Swedish accent border
│           └── NoteFilterBar.tsx        # Book/Chapter accordion + Tag filter pills
```

---

## 6. Automated Unit Testing Blueprint (`npm test`)

The unit test suite must cover three critical domains without requiring live network access:

### 6.1 `bibleOrdinals.test.ts`
- Canonical bounds verification:
  - Genesis 1:1 $\to$ Ordinal `1`
  - Genesis 1:31 $\to$ Ordinal `31`
  - Genesis 2:1 $\to$ Ordinal `32`
  - Malachi 4:6 $\to$ Ordinal `23,145` (End of Old Testament)
  - Matthew 1:1 $\to$ Ordinal `23,146` (Start of New Testament)
  - John 3:16 $\to$ Ordinal `26,137`
  - Revelation 22:21 $\to$ Ordinal `31,102` (End of Canon)
- Inverse lookup `ordinalToReference`:
  - `1` $\to$ `{ book: 'Genesis', chapter: 1, verse: 1 }`
  - `23145` $\to$ `{ book: 'Malachi', chapter: 4, verse: 6 }`
  - `23146` $\to$ `{ book: 'Matthew', chapter: 1, verse: 1 }`
  - `26137` $\to$ `{ book: 'John', chapter: 3, verse: 16 }`
  - `31102` $\to$ `{ book: 'Revelation', chapter: 22, verse: 21 }`
- Cross-chapter ranges:
  - `John 2:23` to `John 3:21` $\to$ start: `26119`, end: `26142`
- Input error handling:
  - Chapter out of range (e.g. Genesis 51:1) throws error.
  - Verse out of range (e.g. John 3:37) throws error.
  - Inverted range (e.g. John 3:16-10) throws error.
- Range overlap math:
  - Exact match $[26137, 26137]$ vs $[26137, 26137]$ $\to$ `overlaps: true`
  - Subset $[26119, 26142]$ vs $[26137, 26137]$ $\to$ `overlaps: true`
  - Boundary touch $[1, 10]$ vs $[10, 20]$ $\to$ `overlaps: true`
  - Disjoint adjacent $[1, 10]$ vs $[11, 20]$ $\to$ `overlaps: false`
  - Different books Genesis $[1, 50]$ vs Exodus $[1534, 1550]$ $\to$ `overlaps: false`

### 6.2 `bibleApi.test.ts`
- Mock `AsyncStorage` and `fetch`:
  - Returns cached text immediately on cache hit without calling `fetch`.
  - On cache miss, calls Crossway ESV API with header `Authorization: Token <key>`.
  - On ESV 200, parses text and caches into `AsyncStorage`.
  - On ESV 401/429/network failure, falls back to `https://bible-api.com/` and caches result.
  - When user provides custom ESV key, uses custom key instead of default key.

### 6.3 `validation.test.ts`
- Username validation:
  - Valid: `john_doe`, `alex2026`, `sarah_` (3-20 chars lowercase/numbers/underscore).
  - Invalid: `ab` (too short), `this_username_is_way_too_long_for_system` (too long), `John_Doe` (uppercase), `john.doe` (period not allowed), `john@doe` (special char).
- Email and password validation according to specifications.

---

## 7. Verification Method

To independently verify all findings:
1. **Canon & Ordinal Verification**: Run the verification script:
   ```bash
   node -e "
     const { referenceToOrdinals, ordinalToReference } = require('./src/utils/bibleOrdinals');
     console.assert(referenceToOrdinals('Genesis', 1, 1, 1, 1)[0] === 1);
     console.assert(referenceToOrdinals('Revelation', 22, 21, 22, 21)[1] === 31102);
     console.assert(referenceToOrdinals('John', 3, 16, 3, 16)[0] === 26137);
     console.log('Bible Ordinals Verified.');
   "
   ```
2. **ESV Header Verification**: Test live endpoint with Token vs Bearer:
   ```bash
   # Works (HTTP 200)
   curl -s -H "Authorization: Token 6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba" "https://api.esv.org/v3/passage/text/?q=John+3:16"
   # Fails (HTTP 401)
   curl -s -H "Authorization: Bearer 6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba" "https://api.esv.org/v3/passage/text/?q=John+3:16"
   ```
3. **Firebase Apps List**:
   ```bash
   npx firebase apps:list
   npx firebase apps:sdkconfig WEB 1:641152478914:web:d2e49874c858749015955b
   ```
