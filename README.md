# Bible Notes

A distraction-free Bible study journal for iOS, Android, and web. Built with **Expo (SDK 57)**, **React Native**, and **Firebase**, centered on structured reflection templates — starting with the **Swedish Method**.

| | |
|---|---|
| **Platforms** | iOS · Android · Web |
| **Auth** | Email / password (Firebase Auth) |
| **Data** | Cloud Firestore + AsyncStorage offline cache |
| **Design** | Warm dark “parchment” theme — see [`DESIGN.md`](./DESIGN.md) |

---

## What is the Swedish Method?

Each study note captures three kinds of reflection on a passage:

| Section | Meaning |
|---|---|
| **Key Idea** | Fresh understanding, insights, or what stands out |
| **Question** | Difficulties, hard sayings, or topics for further study |
| **Application** | Practical steps to live out the passage |

The app also ships other built-in templates (SOAP, Inductive, Head/Heart/Hands, Blank) and supports custom user templates.

---

## Features

### Study notes
- Structured editors with template sections, accent-colored headers, and markdown-friendly content
- Built-in templates: **Swedish Method**, **SOAP**, **Inductive**, **Head Heart Hands**, **Blank Note**
- Custom templates you create and reuse
- Auto-save, explicit Save, and save/discard/cancel when leaving a dirty editor
- Up to 5 tag chips with suggestions
- Per-note visibility (`friends` / `private`) plus a global default in Settings

### Passage selection & Scripture reader
- YouVersion-style picker: Book → Chapter → Verse (clean slate; no auto-selected verses)
- Fast single-chapter path and opt-in cross-chapter / multi-segment passages
- Embedded reader with translation switching, section headings, and adjustable font size
- Offline passage caching via AsyncStorage
- Interactive TOC for multi-passage and compound notes

### Friends & overlaps
- Exact-match search by username or email
- Mutual friend requests (pending → accepted) and unfriend
- Friend profile feeds of shared (`friends`-visibility) notes
- Letterboxd-style overlap badges when a friend noted intersecting verse ranges
- In-app notification center with unread badge

### Account & preferences
- Register / login / logout / password reset
- Username uniqueness (3–20 chars: lowercase, digits, underscore)
- Preferred Bible version, default template, reader font size, verse numbers
- Optional friends feature toggle and passage cache clear

---

## Tech stack

| Layer | Choice |
|---|---|
| App | React Native **0.86**, Expo **SDK 57**, New Architecture |
| Routing | Expo Router v5 (file-based, typed routes) |
| UI | React Native Paper + StyleSheet; Source Serif Pro for reading |
| Backend | Firebase JS SDK v11 — Auth, Cloud Firestore |
| Functions | Cloud Functions (v2) — overlap notifications on note create |
| Storage | AsyncStorage (with in-memory fallback) |
| Tests | Jest 29, Jest Expo, Testing Library, Firestore rules unit tests |

---

## Prerequisites

- **Node.js** 18+ (LTS recommended; Cloud Functions package targets Node 24)
- **npm** (lockfile is npm-based)
- **Expo Go** on a device, or an iOS Simulator / Android Emulator
- Access to the Firebase project `bible-notes-sweedish` (already wired in `src/services/firebase.ts`)

Optional:

- Firebase CLI — deploy rules/functions, run emulators
- A [YouVersion](https://www.youversion.com/) app key for additional translations (`EXPO_PUBLIC_YOUVERSION_APP_KEY`)
- A personal [Crossway ESV API](https://api.esv.org/) key (overridable in Settings)

---

## Getting started

```bash
git clone https://github.com/pangwuu/bible-notes.git
cd bible-notes
npm install
npm run start
```

Then open the app:

| Target | Command / action |
|---|---|
| Dev server + QR | `npm run start` |
| iOS Simulator | `npm run ios` |
| Android Emulator | `npm run android` |
| Web | `npm run web` |
| Physical device | Scan the Expo QR code (Camera on iOS, Expo Go on Android) |

Firebase client config lives in `src/services/firebase.ts` and points at project **`bible-notes-sweedish`**. No `.env` file is required for basic local runs.

### Optional environment variables

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_YOUVERSION_APP_KEY` | Enables YouVersion-backed translations beyond ESV / public-domain fallbacks |

Create a `.env` at the repo root if needed (gitignored):

```bash
EXPO_PUBLIC_YOUVERSION_APP_KEY=your_key_here
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run start` | Expo development server |
| `npm run ios` | Run on iOS |
| `npm run android` | Run on Android |
| `npm run web` | Run in the browser |
| `npm run build:web` | Static web export (`expo export -p web`) |
| `npm run test` | Jest unit + screen + e2e suites |
| `npm run test:watch` | Jest watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run test:rules` | Firestore security rules tests via emulator |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |

Cloud Functions (from `functions/`):

```bash
cd functions
npm install
npm test          # function unit tests
npm run deploy    # firebase deploy --only functions
```

---

## Project structure

```text
bible_notes/
├── app/                         # Expo Router screens
│   ├── (auth)/                  # Login, register
│   ├── (tabs)/                  # Dashboard, Notes, Friends, Settings
│   ├── note/                    # Note detail + editor
│   ├── friend/                  # Friend profile
│   ├── notifications.tsx        # Notification center
│   └── _layout.tsx              # Root layout, auth redirects
├── src/
│   ├── components/              # UI (BibleReader, PassagePicker, editors, cards, …)
│   ├── constants/               # Theme, templates, Bible metadata / versions
│   ├── context/                 # AuthContext
│   ├── hooks/                   # Reader font size, verse preview, downloads
│   ├── services/                # Firebase, notes, bible, friends, notifications, …
│   ├── types/                   # Domain TypeScript models
│   └── utils/                   # Ordinals, parsers, validation, safeStorage
├── functions/                   # Cloud Functions (onNoteCreated overlap notify)
├── tests/
│   ├── unit/                    # Service & component unit tests
│   ├── screens/                 # Screen-level tests
│   ├── e2e/                     # Tiered scenario suites
│   └── rules/                   # Firestore rules tests
├── scripts/                     # Seed / maintenance scripts
├── DESIGN.md                    # Visual design system (source of truth)
├── specs.md                     # Product & technical specification
├── firestore.rules              # Security rules
├── firestore.indexes.json       # Composite indexes
└── package.json
```

---

## Screens & navigation

```text
(auth)
  login · register

(tabs)
  Dashboard     Recent notes, greeting, jump into study
  Notes         Browse by book/chapter and tags
  Friends       Friends list, requests, search/add
  Settings      Profile prefs, Bible version, templates, cache, sign out

Stacks / modals
  note/[id]       Note detail + Scripture reader + overlap badges
  note/edit       Template editor, passage picker, tags, visibility
  friend/[id]     Friend profile + shared notes feed
  notifications   Unread badge + full notification list
```

Unauthenticated users are redirected to the auth group; authenticated users land on the tab navigator.

---

## Data model (Firestore)

| Collection | Purpose |
|---|---|
| `users/{uid}` | Profile, username, defaults, settings, custom templates |
| `notes/{noteId}` | Passage segments, template sections, tags, visibility, verse ordinals |
| `friendships/{uidA_uidB}` | Mutual friendship (`pending` \| `accepted`); ID is sorted UIDs |
| `notifications/{id}` | Friend requests, accepts, and passage-overlap alerts |

Notes store canonical **verse ordinals** (Genesis 1:1 → `1` … Revelation 22:21 → `31102`) so overlapping friend notes can be detected efficiently. Cloud Function `onNoteCreated` creates overlap notifications when a new `friends`-visible note intersects a mutual friend’s note.

Privacy is enforced in [`firestore.rules`](./firestore.rules): private notes are owner-only; friends-visible notes require an accepted friendship.

---

## Bible text sources

The reader resolves passages through a cascade (cache first, then network):

1. **Local cache** — AsyncStorage keys per translation + reference  
2. **ESV** — Crossway API (default version; optional user key in Settings)  
3. **YouVersion** — Additional licensed / public editions when `EXPO_PUBLIC_YOUVERSION_APP_KEY` is set  
4. **Public-domain fallbacks** — e.g. WEB via public APIs / seeded Firestore data  

Supported edition metadata lives in `src/constants/bibleVersions.ts` (ESV, NIV, NASB, NIrV, AMP, BSB, WEB, ASV, and other public-domain options).

---

## Design system

Visual decisions are governed by [`DESIGN.md`](./DESIGN.md). Highlights:

- Warm dark base `#1A1816`, surface `#242019`, parchment text `#EDE7DD`
- Functional accents: Key Idea amber, Question blue, Application sage, Social plum
- Serif for Scripture/notes; system sans for UI chrome
- No generic drop shadows; radius encodes content vs control vs sheet

Do not invent colors or component styles outside that document.

---

## Testing

```bash
npm run typecheck
npm run test
```

Suites cover ordinals & overlap math, Bible fetch/cache fallbacks, auth validation, passage picker, note services, friends, notifications, theme anti-patterns, screen flows, and (with emulators) Firestore rules:

```bash
npm run test:rules   # requires Firebase emulator tooling
```

See [`TEST_READY.md`](./TEST_READY.md) and [`TEST_INFRA.md`](./TEST_INFRA.md) for certification scope and infrastructure notes.

---

## Deploy notes

| Surface | How |
|---|---|
| **Mobile** | Expo / EAS builds from this repo (`app.json` scheme `biblenotes`) |
| **Web** | `npm run build:web`; `vercel.json` rewrites SPA routes to `index.html` |
| **Firestore** | `firebase deploy --only firestore:rules,firestore:indexes` |
| **Functions** | `cd functions && npm run deploy` |

Project alias: `.firebaserc` → `bible-notes-sweedish`.

---

## Further documentation

| Doc | Contents |
|---|---|
| [`DESIGN.md`](./DESIGN.md) | Colors, type, spacing, component rules |
| [`specs.md`](./specs.md) | Product goals, user stories, schemas, NFRs |
| [`ORIGINAL_REQUEST.md`](./ORIGINAL_REQUEST.md) | Original build requirements (R1–R5) |
| [`TEST_READY.md`](./TEST_READY.md) | E2E certification inventory |
| [`TEST_INFRA.md`](./TEST_INFRA.md) | Test infrastructure details |
| [`firestore.rules`](./firestore.rules) | Security rules source |

---

## License

Private project (`"private": true` in `package.json`). All rights reserved unless otherwise stated by the repository owner.
