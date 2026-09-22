# Original User Request

## 2026-09-22T14:44:06Z

Build a cross-platform native mobile app for personal Bible study notes using the Swedish Method, built with Expo (SDK 57), React Native, and Firebase. Visual design is governed strictly by DESIGN.md.

Working directory: /Users/johnnywu/Desktop/My-small-projects/bible_notes
Integrity mode: development

## Requirements

### R1. Expo SDK 57 & Native Navigation Skeleton
Scaffold an Expo application using Expo SDK 57 and Expo Router with TypeScript. Wire React Native Paper with the custom warm dark theme specified in `DESIGN.md` (warm charcoal-brown base `#1A1816`, surface `#242019`, parchment text `#EDE7DD`, and Swedish Method accent colors). Load `Source Serif Pro` via `expo-font` for reading/body text. Implement the bottom tab layout (Home/Dashboard, Notes Browser, Friends, Settings) and stack screens (Note Detail, Note Edit, Friend Profile, Notifications Modal).

### R2. Firebase Client Integration & Authentication
Connect the Firebase JS SDK (v11 modular) to the existing linked Firebase project `bible-notes-sweedish` using `@react-native-async-storage/async-storage` for persistence. Support email/password registration, login, logout, and password reset. Create a Firestore `users/{uid}` profile with username uniqueness enforcement (3–20 lowercase/alphanumeric/underscore).

### R3. Swedish Method Note Editor & Domain Utilities
Implement canonical verse metadata and utilities mapping references across Genesis 1:1 to Revelation 22:21 to integer ordinals (1–31,102) and calculating range overlaps. Build a YouVersion-style step-by-step passage picker (Book grid → Chapter grid → Verse range). Build a Day One style unbordered editor pre-populated with Swedish Method headers (💡 Key Idea, ❓ Question, 🏹 Application) in their respective accent colors. Support auto-save on navigate away, explicit Save button, save/discard/cancel back confirmation, and up to 5 tag chips with suggestions.

### R4. Bible Text Reader & Caching
Fetch passage text using Crossway ESV API (`https://api.esv.org/v3/passage/text/`) with the provided default Bearer token (`6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba`), falling back to public domain WEB (`https://bible-api.com/`). Cache fetched passages in `AsyncStorage`. Allow users to override their ESV API key in Settings, synced to their Firestore profile.

### R5. Friends Social Layer, Overlap Detection & Notifications
Implement exact-match user search (by username or email), mutual friendship requests (pending/accepted/unfriend), and friend profile shared note feeds. Detect when mutual friends have notes with overlapping verse ranges and write `notifications` documents client-side. Display Letterboxd-style inline overlap badge pills on notes. Provide a real-time unread notification count badge in the header and a full notification center.

## Acceptance Criteria

### Core Functionality & Test Suite
- [ ] Automated unit test suite passes (`npm test`) covering verse ordinal mapping, range overlap math, Bible API caching/fallback, and auth validation.
- [ ] Expo project builds cleanly on Expo SDK 57 without TypeScript or bundler errors.
- [ ] Strict compliance with `DESIGN.md` (no near-black backgrounds, no light mode, proper border radii, no generic AI-style shadows, exact hex codes).
