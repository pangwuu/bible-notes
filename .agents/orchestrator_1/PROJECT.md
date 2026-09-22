# Project: Swedish Method Bible Study Notes Mobile App

## Architecture
- **Framework**: Expo SDK 57 (React Native 0.86, React 19, TypeScript)
- **Routing**: Expo Router (file-based routing with typed routes)
- **UI & Design**: React Native Paper wired to custom Warm Dark Theme (`DESIGN.md`), `Source Serif Pro` via `expo-font` for reading text
- **Backend & Database**: Firebase JS SDK modular v11 (`firebase/auth`, `firebase/firestore`), `@react-native-async-storage/async-storage` for auth and data persistence
- **External Services**: Crossway ESV API (`https://api.esv.org/v3/passage/text/` with `Authorization: Token <key>`), WEB API (`https://bible-api.com/`) fallback
- **Testing**: Jest + TypeScript (`jest-expo` / `ts-jest`), unit test runner (`npm test`)

## Feature Inventory
Every feature from the Survey phase is assigned to a milestone.
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Expo SDK 57 Scaffolding | package.json, app.json, tsconfig.json, metro.config.js, dependencies | M1 | R1, Codebase Explorer |
| 2 | Design Tokens & Theme | Warm charcoal-brown #1A1816, surface #242019, parchment #EDE7DD, Swedish accents | M1 | R1, DESIGN.md |
| 3 | Typography Integration | Source Serif Pro via expo-font for body, system sans for UI | M1 | R1, DESIGN.md |
| 4 | Component Radii & Styling | Content 4px, controls 8px, sheet 16px top, no generic drop shadows | M1 | DESIGN.md |
| 5 | Route Tree & Navigation | (auth), (tabs), note/, friend/, notifications routes | M1 | R1, specs.md |
| 6 | Bottom Tab Navigation | Dashboard, Notes Browser, Friends, Settings | M1 | R1, specs.md |
| 7 | Firebase Modular v11 Setup | firebase/app, firebase/auth with AsyncStorage persistence | M2 | R2, firestore.rules |
| 8 | Email/Password Registration | User signup with input validation | M2 | R2, specs.md |
| 9 | Email/Password Login & Logout | User authentication and session lifecycle | M2 | R2, specs.md |
| 10 | Password Reset | Password reset email workflow | M2 | R2, specs.md |
| 11 | User Profile in Firestore | `users/{uid}` document creation and schema compliance | M2 | R2, firestore.rules |
| 12 | Username Uniqueness Enforcement | 3-20 lowercase/alphanumeric/underscore uniqueness validation | M2 | R2, specs.md |
| 13 | Auth State & Route Protection | AuthProvider context, auto-redirect to login/tabs | M2 | R2, specs.md |
| 14 | Canonical Verse Metadata | 66 books, 1,189 chapters, 31,102 verses table | M3 | R3, Domain Explorer |
| 15 | 1D Integer Ordinal Mapping | Genesis 1:1 (1) to Revelation 22:21 (31,102) two-way mapping | M3 | R3, specs.md |
| 16 | Range Overlap Math | Interval overlap: max(s1, s2) <= min(e1, e2) | M3 | R3, specs.md |
| 17 | Step-by-Step Passage Picker | Book grid -> Chapter grid -> Verse range selector | M3 | R3, specs.md |
| 18 | Unbordered Note Editor | Day One style unbordered editor with auto-grow | M3 | R3, DESIGN.md |
| 19 | Swedish Method Headers | 💡 Key Idea (#E3A53D), ❓ Question (#5B93C4), 🏹 Application (#7BA05B) | M3 | R3, DESIGN.md |
| 20 | Auto-Save & Explicit Save | Auto-save on blur/navigate away + explicit save button | M3 | R3, specs.md |
| 21 | Back Navigation Modal | Save / Discard / Cancel back confirmation dialog | M3 | R3, specs.md |
| 22 | Tag Chips & Suggestions | Up to 5 tag chips with suggestion dropdown | M3 | R3, specs.md |
| 23 | Note Visibility Setting | Private vs Friends toggle matching firestore.rules | M3 | R3, firestore.rules |
| 24 | Crossway ESV API Client | Passage fetching with `Authorization: Token <key>` | M4 | R4, Domain Explorer |
| 25 | Public Domain WEB Fallback | Failover to https://bible-api.com/ on 429/network error | M4 | R4, Domain Explorer |
| 26 | AsyncStorage Passage Cache | Local caching of fetched passages with key formatting | M4 | R4, specs.md |
| 27 | Custom User ESV Key Override | Settings override synced to user Firestore profile | M4 | R4, specs.md |
| 28 | Offline Passage Display | Cached display or non-blocking offline banner | M4 | R4, specs.md |
| 29 | Exact-Match User Search | Search users by username or email | M5 | R5, specs.md |
| 30 | Mutual Friendship Flow | Composite doc ID `${uidA}_${uidB}`, pending/accepted/unfriend | M5 | R5, firestore.rules |
| 31 | Friend Profile Shared Notes | Feed of friend's notes where visibility == 'friends' | M5 | R5, firestore.rules |
| 32 | Client-Side Overlap Engine | Detect mutual friend overlapping notes upon note save | M5 | R5, Domain Explorer |
| 33 | Overlap Notification Creation | Write `notifications` docs with deterministic ID | M5 | R5, firestore.rules |
| 34 | Inline Overlap Badge Pills | Letterboxd-style inline badge pills on notes | M5 | R5, DESIGN.md |
| 35 | Notification Center & Badge | Real-time unread badge count in header + notification modal | M5 | R5, specs.md |
| 36 | Core Unit Test Suite | Passes `npm test` for ordinals, overlap, API cache, auth validation | M6 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Expo SDK 57 Skeleton & Theme | Project scaffold, dependencies, theme tokens, fonts, route tree | none | DONE |
| M2 | Firebase Client & Auth | Modular v11, AsyncStorage persistence, login/register, profile, auth guards, pure auth routing | M1 | DONE |
| M3 | Swedish Note Editor & Domain | Canonical verse table, ordinals, passage picker, unbordered editor, auto-save | M1 | PLANNED |
| M4 | Bible Reader & Caching | ESV API client, WEB fallback, AsyncStorage cache, custom API key in Settings | M1, M2, M3 | PLANNED |
| M5 | Friends Social & Overlap | User search, friendships, friend notes feed, overlap detection, notifications | M1, M2, M3 | PLANNED |
| M6 | Final Acceptance & E2E Pass | 100% E2E test suite pass (Tiers 1-4) + adversarial hardening (Tier 5) | M1..M5, E2E Track | PLANNED |

## Parallel Track: E2E Testing Track
| Track | Scope | Dependencies | Status |
|-------|-------|-------------|--------|
| E2E Testing Track | Test infra, runner, Tiers 1-4 test suite derived from ORIGINAL_REQUEST.md & DESIGN.md | none | DONE (TEST_READY.md published) |

## Interface Contracts

### `src/constants/theme.ts`
- Exports `colors`:
  - `bg`: `{ base: '#1A1816', surface: '#242019', surfaceRaised: '#2E2921' }`
  - `text`: `{ primary: '#EDE7DD', secondary: '#A39C8E', disabled: '#6B655A' }`
  - `border`: `{ hairline: '#332E27' }`
  - `accent`: `{ keyIdea: '#E3A53D', question: '#5B93C4', application: '#7BA05B', social: '#B4789E', danger: '#C4664F' }`
- Exports `paperTheme`: custom React Native Paper MD3 theme object matching colors
- Exports `radii`: `{ content: 4, controls: 8, sheet: 16 }`

### `src/utils/bibleOrdinals.ts`
- `referenceToOrdinals(book: string, startChapter: number, startVerse: number, endChapter: number, endVerse: number): [number, number]`
- `ordinalToReference(ordinal: number): { book: string, chapter: number, verse: number }`
- `checkRangeOverlap(rangeA: [number, number], rangeB: [number, number]): { overlaps: boolean, overlapRange?: [number, number] }`

### `src/services/firebase.ts`
- Exports `app`, `auth`, `db`
- Configured with `projectId: 'bible-notes-sweedish'`, modular v11 with `getReactNativePersistence(AsyncStorage)`

### `src/services/bibleApiService.ts`
- `fetchPassage(book: string, startChapter: number, startVerse: number, endChapter: number, endVerse: number, customApiKey?: string): Promise<{ text: string, source: 'esv' | 'web' | 'cache' }>`

### `src/services/socialService.ts`
- `getFriendshipDocId(uidA: string, uidB: string): string` (enforces `uidA < uidB ? uidA + '_' + uidB : uidB + '_' + uidA`)
- `checkAndCreateOverlapNotifications(userId: string, note: Note): Promise<void>`

## Code Layout
```
/
├── app/                        # Expo Router file routes
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Dashboard / Home
│   │   ├── notes.tsx          # Notes Browser
│   │   ├── friends.tsx        # Friends / Social
│   │   └── settings.tsx       # Settings
│   ├── note/
│   │   ├── [id].tsx           # Note Detail Screen
│   │   └── edit.tsx           # Note Editor Screen
│   ├── friend/
│   │   └── [id].tsx           # Friend Profile & Shared Notes
│   ├── notifications.tsx      # Notifications Center Modal
│   └── _layout.tsx            # Root Layout (ThemeProvider, AuthProvider)
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── SwedishEditor.tsx  # Unbordered editor with Swedish sections
│   │   ├── PassagePicker.tsx  # Step-by-step Book/Chapter/Verse picker
│   │   ├── BibleReader.tsx    # Passage display component
│   │   ├── OverlapBadge.tsx   # Inline Letterboxd-style overlap pill
│   │   ├── NoteCard.tsx       # Card for notes list
│   │   └── NotificationItem.tsx
│   ├── constants/             # Design tokens & static data
│   │   ├── theme.ts           # Warm dark palette & paperTheme
│   │   ├── bibleData.ts       # 66 books, chapters, verse counts (31,102 verses)
│   │   └── swedishMethod.ts   # Symbols & labels (💡, ❓, 🏹)
│   ├── context/               # React contexts
│   │   └── AuthContext.tsx    # Firebase auth state & user profile
│   ├── services/              # External APIs & Firebase services
│   │   ├── firebase.ts        # Firebase app, auth, db initialization
│   │   ├── authService.ts     # Login, register, profile, username uniqueness
│   │   ├── notesService.ts    # Firestore notes CRUD
│   │   ├── socialService.ts   # Friendships, search, overlap detection
│   │   └── bibleApiService.ts # ESV API, WEB API fallback, AsyncStorage cache
│   ├── types/                 # TypeScript interfaces
│   │   ├── user.ts
│   │   ├── note.ts
│   │   ├── friendship.ts
│   │   └── notification.ts
│   └── utils/                 # Pure domain utilities
│       ├── bibleOrdinals.ts   # Ordinal mapping & interval overlap
│       └── validation.ts      # Auth & username validation
├── tests/                     # Unit & E2E test suites
│   ├── unit/
│   │   ├── bibleOrdinals.test.ts
│   │   ├── overlapMath.test.ts
│   │   ├── bibleApiService.test.ts
│   │   └── authValidation.test.ts
│   └── e2e/                   # Opaque-box E2E test suite (Tiers 1-4)
├── app.json
├── package.json
├── tsconfig.json
└── metro.config.js
```
