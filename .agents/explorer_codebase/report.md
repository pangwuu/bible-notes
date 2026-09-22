# Codebase Architecture & Repository Investigation Report

**Project**: Swedish Method Bible Study Notes Mobile App  
**Working Directory**: `/Users/johnnywu/Desktop/My-small-projects/bible_notes`  
**Date**: 2026-09-22T14:51:00Z  
**Author**: Codebase Explorer (`explorer_codebase`)  
**Parent Orchestrator**: `0a72a93f-be19-49c0-81f1-95f8e8f40226`

---

## 1. Executive Summary

A comprehensive investigation of `/Users/johnnywu/Desktop/My-small-projects/bible_notes` was conducted to assess the repository's current state, configuration, and implementation status against requirements **R1–R5** in `ORIGINAL_REQUEST.md`, visual specifications in `DESIGN.md`, and technical specifications in `specs.md`.

### Core Findings
1. **Repository Stage**: The repository is in an **initial backend-configured state**. Firebase project binding, Cloud Firestore security rules, Firestore composite indexes, Realtime Database default rules, and Cloud Functions boilerplate have been prepared.
2. **Missing Mobile App Scaffolding**: There is **no root `package.json`**, no `app.json`, no `tsconfig.json`, no `app/` navigation directory, no test runner setup, and no application source code. The mobile frontend application has not yet been initialized.
3. **Active Firebase Credentials Extracted**: The Firebase CLI is authenticated to project `bible-notes-sweedish`. We successfully retrieved the exact SDK credentials for the registered web app (`Bible Notes Mobile`), which enables immediate frontend client SDK integration without external friction.
4. **Environment Readiness**: The local environment is modern and compatible:
   - Node: `v22.17.1`
   - npm: `11.19.0`
   - Expo CLI: `57.0.20`
   - Firebase CLI: `15.30.2`
   - Git: `2.x` on branch `main`

---

## 2. Inventory of Workspace Root Files & Directories

| Path | Type | Size / Status | Purpose & Description |
|---|---|---|---|
| `.firebaserc` | File | 62 bytes | Links default Firebase project to `"bible-notes-sweedish"`. |
| `firebase.json` | File | 584 bytes | Configures Firestore (`firestore.rules`, `firestore.indexes.json`), Functions (`functions`), Database (`database.rules.json`), and Auth provider (`emailPassword: true`). |
| `firestore.rules` | File | 2,118 bytes | Security rules for `users/{userId}`, `friendships/{friendshipId}`, `notes/{noteId}`, `notifications/{notificationId}`. Uses `rules_version = '2'`. |
| `firestore.indexes.json` | File | 788 bytes | Composite indexes for `notes` (`user_id` + `book` + `chapter_start`; `book` + `start_verse_id`) and `friendships` (`user_ids` array-contains + `status` ASC). |
| `database.rules.json` | File | 161 bytes | RTDB rules locked (`.read: false`, `.write: false`). |
| `DESIGN.md` | File | 8,499 bytes | Single source of truth for visual design: dark warm palette, typography (`Source Serif Pro`), spacing (4px unit), component radii, and anti-patterns. |
| `ORIGINAL_REQUEST.md` | File | 3,319 bytes | Authoritative prompt specifying R1–R5 and acceptance criteria. |
| `specs.md` | File | 13,543 bytes | Full product & technical spec (v2) detailing data models, APIs, and screens. |
| `skills-lock.json` | File | 3,456 bytes | Lockfile tracking 13 Firebase skills. |
| `.gitignore` | File | 4 bytes | Contains only `.env`. **Needs expansion for Expo/Node**. |
| `functions/` | Directory | 5 files, 1 dir | Cloud Functions boilerplate (`index.js`, `package.json`, `.eslintrc.js`, `node_modules`). |
| `.agents/` | Directory | Metadata | Teamwork agent metadata directories (`orchestrator_1`, `explorer_codebase`, etc.) and `.agents/skills`. |
| `.claude/` | Directory | Metadata | Claude skill symlinks/pointers. |
| `.git/` | Directory | Version control | Git repository on `main` branch (3 commits). |

---

## 3. Firebase Backend Configuration & SDK Credentials

The repository has an active Firebase configuration linked to project `bible-notes-sweedish`.

### 3.1 Registered Firebase Web App
Running `firebase apps:sdkconfig web 1:641152478914:web:d2e49874c858749015955b` returned the live credentials:

```json
{
  "projectId": "bible-notes-sweedish",
  "appId": "1:641152478914:web:d2e49874c858749015955b",
  "databaseURL": "https://bible-notes-sweedish-default-rtdb.asia-southeast1.firebasedatabase.app",
  "storageBucket": "bible-notes-sweedish.firebasestorage.app",
  "apiKey": "AIzaSyC_sKH5ZPgT0J6ZvvB5isV0KIDi8xBNleE",
  "authDomain": "bible-notes-sweedish.firebaseapp.com",
  "messagingSenderId": "641152478914",
  "projectNumber": "641152478914",
  "version": "2"
}
```

### 3.2 Firestore Security Rules Audit
In `firestore.rules`:
- **`users/{userId}`**:
  - `allow read: if isAuthenticated();`
  - `allow create, update: if isOwner(userId);`
  - `allow delete: if false;`
- **`friendships/{friendshipId}`**:
  - Friendship ID convention: `friendshipDocId(uidA, uidB) = uidA < uidB ? uidA + '_' + uidB : uidB + '_' + uidA;`
  - Creation requires `request.auth.uid == request.resource.data.requested_by && request.resource.data.status == 'pending'`.
- **`notes/{noteId}`**:
  - Readable if `resource.data.user_id == request.auth.uid` OR (`resource.data.visibility == 'friends' && areFriends(...)`).
  - Create/Update/Delete only if `user_id == request.auth.uid`.
- **`notifications/{notificationId}`**:
  - Read/Update/Delete if recipient is owner (`user_id == request.auth.uid`).
  - Create if authenticated.

---

## 4. Package & Configuration Inspection

### 4.1 Root `package.json`
- **Status**: **Missing**.
- Needs to be initialized with Expo SDK 57 dependencies.

### 4.2 Dependency Versions for Expo SDK 57
From npm registry inspection:
- `expo`: `~57.0.24`
- `react`: `19.2.3`
- `react-native`: `0.86.3`
- `expo-router`: `~57.0.22`
- `expo-status-bar`: `~57.0.1`
- `expo-font`: `~57.0.4`
- `react-native-safe-area-context`: `~5.10.0`
- `react-native-screens`: `~4.28.0`
- `react-native-paper`: `^5.15.3`
- `@expo/vector-icons`: `~15.1.1`
- `firebase`: `^11.10.0` (modular SDK v11 as requested in R2)
- `@react-native-async-storage/async-storage`: `^3.1.1`
- `react-native-markdown-display`: `^7.0.2`

### 4.3 Configurations Missing at Root
- `app.json` / `app.config.js`: Required for Expo Router (`"scheme": "biblenotes"`, `"plugins": ["expo-router", "expo-font"]`).
- `tsconfig.json`: Required for TypeScript compilation (`"extends": "expo/tsconfig.base"`).
- `metro.config.js`: Required for Expo Router & Firebase resolution.
- `babel.config.js`: Required if custom babel plugins (e.g. for Paper or presets) are applied.
- `.gitignore`: Currently only contains `.env`. Needs to ignore `node_modules/`, `.expo/`, `dist/`, `coverage/`.

---

## 5. Source Code & Architecture Inspection

### 5.1 Architecture Plan (from `specs.md` Section 9)
The application architecture calls for the following structure:
```
app/
├── _layout.tsx            # Root layout: ThemeProvider, PaperProvider, AuthProvider, Font Loader
├── (auth)/
│   ├── _layout.tsx        # Auth stack navigator
│   ├── login.tsx          # Email & Password login
│   └── register.tsx       # Account creation & username assignment
├── (tabs)/
│   ├── _layout.tsx        # Bottom tab navigator (Home, Notes, Friends, Settings)
│   ├── index.tsx          # Dashboard: Recent notes, passage jump, notifications pill
│   ├── notes.tsx          # Note Browser: Book/Chapter directory & Tag filters
│   ├── friends.tsx        # Friends list, requests, search & add
│   └── settings.tsx       # User preferences, default visibility, ESV API key, logout
├── note/
│   ├── [id].tsx           # View note detail + passage reader + friend overlap badge
│   └── edit.tsx           # Swedish Method Day-One editor, passage picker, tags
├── friend/
│   └── [id].tsx           # Friend profile & their shared notes feed
└── notifications.tsx      # Notifications center modal
```

### 5.2 Supporting Modules Needed
- `constants/theme.ts`: Implementation of exact color palette and typography from `DESIGN.md`.
- `services/firebase.ts`: Modular Firebase v11 initialization using AsyncStorage persistence.
- `services/authService.ts` / `contexts/AuthContext.tsx`: Session management, username uniqueness checks, auth state.
- `services/bible/verseOrdinal.ts`: Exact 31,102 verse ordinal map (Genesis 1:1 = 1 to Revelation 22:21 = 31,102) and range overlap calculations.
- `services/bible/bibleService.ts`: ESV API client with default Bearer token (`6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba`), WEB fallback, and AsyncStorage caching.
- `services/notesService.ts`: Note CRUD operations and Firestore queries.
- `services/friendService.ts`: Mutual friend queries, requests, and profile feeds.
- `services/overlapService.ts`: Overlap detection and client-side notification generation.
- `components/`: UI components including Day One editor sections, YouVersion-style passage picker, Letterboxd-style overlap badge pill, Paper card items.

---

## 6. Test Setup & Runner Status

### 6.1 Current Test Infrastructure
- **Root Test Setup**: Completely absent. No test files, no test config.
- **Functions Test Setup**: `functions/` has devDependencies for `firebase-functions-test` and `eslint`, but no unit tests for mobile app logic.

### 6.2 Acceptance Criteria Test Requirements
Acceptance criteria requires `npm test` to pass with unit tests covering:
1. **Verse Ordinal Mapping**:
   - Total verse count verification: exactly 31,102 verses across 66 canonical books.
   - Specific landmarks: Genesis 1:1 -> `1`, Malachi 4:6 -> `23,145`, Matthew 1:1 -> `23,146`, Revelation 22:21 -> `31,102`.
   - Bidirectional mapping: `getVerseOrdinal` and `getVerseFromOrdinal`.
2. **Range Overlap Math**:
   - `noteA.start_verse_id <= noteB.end_verse_id && noteA.end_verse_id >= noteB.start_verse_id`.
   - Comprehensive test cases: identical range, subset, superset, left overlap, right overlap, disjoint adjacent, disjoint distant.
3. **Bible API Caching & Fallback**:
   - ESV API request with default Bearer token `6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba`.
   - User custom ESV API key override.
   - Fallback to WEB (`https://bible-api.com/`) when ESV returns error or 401.
   - AsyncStorage cache hit verification: returns cached passage without network request.
4. **Auth Validation**:
   - Username regex: 3–20 lowercase alphanumeric characters and underscores (`^[a-z0-9_]{3,20}$`).
   - Email format validation.
   - Password minimum length (e.g. 6 characters for Firebase Auth).

### 6.3 Recommended Test Configuration
Install `jest`, `@types/jest`, `ts-jest` (or `babel-jest` with `jest-expo`). Since domain logic (verse ordinals, overlap math, API caching, auth validation) consists of pure TypeScript functions and async logic with mockable storage/fetch, a dedicated Jest suite will execute cleanly and rapidly (<2 seconds).

---

## 7. Detailed Gap Analysis against Requirements (R1 - R5)

| Requirement | Description | Current State | Missing Items to Build |
|---|---|---|---|
| **R1** | **Expo SDK 57 & Native Navigation Skeleton** | Absent | • Root `package.json` with Expo SDK 57 dependencies<br>• `app.json`, `tsconfig.json`, `metro.config.js`<br>• `constants/theme.ts` (DESIGN.md exact tokens)<br>• Font setup: `Source Serif Pro`<br>• Full Expo Router hierarchy: `(auth)`, `(tabs)`, `note/`, `friend/`, `notifications.tsx`<br>• PaperProvider with custom warm dark theme |
| **R2** | **Firebase Client Integration & Auth** | Backend ready, SDK credentials verified | • Client Firebase config module (`services/firebase.ts`) using v11 modular SDK<br>• AsyncStorage persistence for Auth<br>• `AuthContext` and hooks for login, register, logout, reset<br>• `users/{uid}` profile creation with username uniqueness check (`^[a-z0-9_]{3,20}$`) |
| **R3** | **Swedish Method Note Editor & Domain Utilities** | Specs ready | • Verse ordinal mapping database (1–31,102) & bidirectional utility<br>• Range overlap calculation logic<br>• YouVersion-style step-by-step passage picker (Book grid → Chapter grid → Verse range)<br>• Day One unbordered editor with 3 Swedish Method sections (`💡 Key Idea`, `❓ Question`, `🏹 Application`) with accent colors<br>• Auto-save on unmount, explicit save, discard confirmation, up to 5 tag chips |
| **R4** | **Bible Text Reader & Caching** | Specs ready | • Crossway ESV API client with Bearer token `6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba`<br>• Public domain WEB API fallback (`https://bible-api.com/`)<br>• AsyncStorage caching (`bible_cache_${translation}_${passageRef}`)<br>• Custom ESV API key override setting synced to user profile<br>• Reader UI in `Source Serif Pro` with 1.5 line height |
| **R5** | **Friends Social Layer, Overlap & Notifications** | Firestore rules & indexes ready | • User search by exact username/email<br>• Mutual friend requests (pending/accepted/unfriend)<br>• Friend profile view with shared notes feed<br>• Client-side overlap detection triggering `notifications` docs<br>• Letterboxd-style inline overlap badge pill on notes<br>• Unread notification badge count in header + notification center modal |

---

## 8. Build & Verification Commands

Once scaffolding and source code are created by the implementation track:
1. **Typecheck**: `npx tsc --noEmit`
2. **Automated Unit Tests**: `npm test`
3. **Expo Static Export / Bundler Verification**: `npx expo export` (verifies Expo SDK 57 bundle compiles cleanly without errors)

---

## 9. Conclusion & Recommendations

The repository is clean, with well-formed specifications, strict design tokens, and a configured Firebase backend with live SDK credentials. 

To execute the project efficiently:
1. **Milestone 1 (Scaffolding & Core Architecture)**: Create root `package.json`, `app.json`, `tsconfig.json`, `metro.config.js`, `.gitignore`, install dependencies, load `Source Serif Pro`, and wire `constants/theme.ts` with `PaperProvider`.
2. **Milestone 2 (Domain Logic & Unit Tests)**: Implement verse ordinals (1–31,102), overlap math, API caching/fallback, auth validation, and write full passing unit test suite (`npm test`).
3. **Milestone 3 (Firebase Auth & Profile)**: Implement Firebase v11 client with AsyncStorage persistence, login/register screens, username uniqueness checks, and AuthContext.
4. **Milestone 4 (Passage Picker & Note Editor)**: Implement YouVersion-style passage picker, Day One unbordered Swedish Method editor with auto-save and tag chips, and ESV/WEB Bible reader.
5. **Milestone 5 (Friends, Overlap Detection & Notifications)**: Implement friend search, mutual requests, friend profile shared feed, overlap notification generation, inline Letterboxd badge pill, and notifications modal.
6. **Milestone 6 (Verification & Hardening)**: Run all test suites, typechecks, Expo export builds, and verify visual compliance with `DESIGN.md`.
