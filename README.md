# Bible Notes (Swedish Method Bible Study App)

A thoughtful, distraction-free mobile Bible study application built with **React Native (Expo SDK 57)** and **Firebase**, designed around the **Swedish Method**:
- 💡 **Light Bulb (Key Idea)**: Fresh understanding, key insights, or what stands out.
- ❓ **Question (Difficulties)**: Hard sayings, questions, or things requiring further study.
- 🏹 **Arrow (Personal Application)**: Practical, tangible steps to live out God's Word.

More note templates coming soon!

---

## Features

- **Swedish Method Note Editor**: Structured markdown reflection editor with tag management and real-time offline caching.
- **Passage Picker**:
  - Clean-slate selection (no auto-selected verses).
  - Fast-path 3-tap single-chapter selection (`Book` → `Chapter` → `Verse`).
  - Opt-in cross-chapter and compound multi-segment support.
- **Embedded Scripture Reader**:
  - Live Scripture rendering supporting multi-translation switching (**ESV**, **NIV**, **NLT**, **WEB**, **BBE**).
  - Section subheading extraction and 3-tier typography hierarchy (Passage Title > Subheadings > Verses).
  - Non-collapsing, smooth loading overlays with offline caching.
  - Interactive Table of Contents for multi-passage and compound notes.
- **Letterboxd-style Friend Overlaps**: Discover mutual friends who have taken notes on the same Scripture passages.
- **Dark Parchment Aesthetic**: Warm dark color palette governed strictly by typography principles and high-contrast accessibility.

---

## Tech Stack

- **Framework**: React Native 0.86 with Expo SDK 57 (New Architecture enabled)
- **Routing**: Expo Router v5 (file-based navigation with typed routes)
- **Backend & Auth**: Firebase Modular JS SDK v11 (Auth, Cloud Firestore)
- **Typography & UI**: Source Serif Pro (`@expo-google-fonts/source-serif-pro`), React Native Paper, React Native Vector Icons
- **Storage**: AsyncStorage with in-memory resilient fallback
- **Testing**: Jest 29, Jest Expo preset

---

## Prerequisites

Before running the application, make sure you have installed:
- **Node.js**: v18.0.0 or later (LTS recommended)
- **npm** or **yarn** / **pnpm**
- **Expo Go** app on your physical iOS/Android device, or an iOS Simulator (macOS) / Android Emulator

---

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd bible_notes
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run start
   ```

4. **Launch on your target device**:
   - **iOS Simulator** (macOS with Xcode):
     ```bash
     npm run ios
     ```
   - **Android Emulator** (Android Studio):
     ```bash
     npm run android
     ```
   - **Physical Device**:
     Scan the QR code displayed in the terminal with the **Camera app** (iOS) or **Expo Go** (Android).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run start` | Starts the Expo development server |
| `npm run ios` | Opens the app in the iOS Simulator |
| `npm run android` | Opens the app in the Android Emulator |
| `npm run test` | Runs the full Jest unit and integration test suite |
| `npm run test:watch` | Runs Jest in interactive watch mode |
| `npm run test:coverage` | Generates a test code coverage report |
| `npm run typecheck` | Checks TypeScript compilation without emitting output |

---

## Project Structure

```text
bible_notes/
├── app/                      # Expo Router file-based screens
│   ├── (auth)/               # Authentication flow (Login, Register)
│   ├── (tabs)/               # Bottom tab screens (Dashboard, Friends, Notes, Settings)
│   ├── note/                 # Note detail and Swedish Method editor screens
│   └── _layout.tsx           # Root navigation layout and auth redirects
├── src/
│   ├── components/           # Reusable UI components (BibleReader, PassagePicker, NoteCard, etc.)
│   ├── constants/            # Design tokens, Swedish Method definitions, canonical Bible metadata
│   ├── context/              # Global React Context providers (AuthContext)
│   ├── services/             # API & Firebase services (notesService, bibleService, authService, etc.)
│   ├── types/                # TypeScript data interfaces and models
│   └── utils/                # Utility helpers (safeStorage, validation, passageParser)
├── tests/
│   ├── unit/                 # Unit tests (PassagePicker, BibleService, NoteService, Auth, etc.)
│   └── e2e/                  # Scenario integration tests
├── DESIGN.md                 # Design system guidelines and rules
└── package.json
```

---

## Testing & Quality Assurance

To verify that the code compiles and all test suites pass:

```bash
# Verify TypeScript types
npm run typecheck

# Run all automated tests
npm run test
```
