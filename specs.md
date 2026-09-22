# Bible Notes App — Product & Technical Specification (Native Mobile v2)

## 1. Overview
A native cross-platform mobile application (iOS & Android) built with **Expo**, **React Native**, and **Firebase** for personal Bible study notes using the **Swedish Method** — each note captures key ideas, questions, and applications for a passage using a Markdown editor pre-filled with Swedish Method template headers. Notes are organized both by structured Bible reference (Book > Chapter Range > Verse Range) and by freeform tags. Users can add mutual friends and view each other's non-private notes; when a friend has also noted an overlapping passage, the user gets a lightweight in-app notification and live passage badge.

## 2. Goals for v1
- Fast, frictionless native note capture with Swedish Method template headers (💡 Key Idea, ❓ Question, 🏹 Application).
- Structured + tag-based organization and browsing (with support for cross-chapter passage ranges).
- Mutual-friend social layer with sensible privacy defaults and dedicated friend profile note feeds.
- Realtime live passage badge + notification center when friends note overlapping passages.
- ESV Bible text integration via API Key, with seamless fallback to WEB (World English Bible) via public domain API.
- Native mobile UI utilizing **React Native Paper** (Material Design pre-built components) and native **StyleSheet** styling.
- Secure, scalable cloud backend powered by **Firebase Authentication** and **Cloud Firestore** with robust security rules.
- Local offline persistence for user notes and cached Bible text using `@react-native-async-storage/async-storage`.

## 3. Scope Boundaries for v1

### In Scope for v1:
- Native iOS & Android app using Expo Managed Workflow & Expo Router.
- Firebase JS SDK (v11 modular) with AsyncStorage auth persistence.
- 1:1 mutual friendships (request / accept / unfriend).
- Markdown note editor pre-populated with Swedish Method sections.
- ESV API passage fetching with public domain WEB fallback.
- Overlap detection based on standardized verse indexing.
- Cloud Firestore security rules securing user privacy and friendship reads.

### Explicitly out of scope for v1 (see Section 12 for later):
- Web app / PWA distribution (focus is strictly native mobile app).
- Group / Bible study circles (only 1:1 mutual friends in v1).
- Side-by-side or threaded comparison of notes.
- Reading plans, streaks, reminders.
- Comments or threaded discussion on shared notes.
- Third-party social logins (Apple/Google Sign-In) — v1 uses Email/Password auth.

## 4. User Stories
- As a user, I want to create an account and log in securely on my mobile phone using my email and password.
- As a user, I want to write a note on a passage using Markdown pre-filled with Swedish Method headers (💡 Key Idea, ❓ Question, 🏹 Application).
- As a user, I want to tag a note with a single or cross-chapter Bible reference and custom topic tags.
- As a user, I want to browse my notes by book/chapter, by tag, or view shared notes on a friend's profile.
- As a user, I want to add friends via email/username search (mutual accept).
- As a user, I want my notes visible to friends by default (configurable in Settings), with per-note private toggles.
- As a user, I want to see a live badge when viewing a passage if a friend has noted an overlapping verse range, and receive notifications when new notes are added.
- As a user, I want to read ESV passage text alongside my note editor, falling back to WEB if needed.
- As a user, I want cached notes and passage text accessible even on slow or intermittent mobile networks.

## 5. Core Features

### 5.1 Notes (Swedish Method Native Editor)
Each note contains:
- **Passage Reference**: `book`, `chapter_start`, `verse_start`, `chapter_end`, `verse_end`.
- **Verse Ordinals**: `start_verse_id` and `end_verse_id` (standardized integer index from 1 to 31,102 across Genesis 1:1 to Revelation 22:21) for efficient Firestore overlap queries.
- **Content**: Freeform Markdown string pre-populated with Swedish Method headers:
  - `### 💡 Key Idea(s)`
  - `### ❓ Question(s)`
  - `### 🏹 Application(s)`
- **Tags**: Array of strings (e.g. `["faith", "sermon-notes", "Romans study"]`).
- **Visibility**: `'private'` or `'friends'` (defaults to user's global setting, which defaults to `'friends'`).
- **Timestamps**: `created_at`, `updated_at`.

### 5.2 Passage Reference & Bible Text
- **Passage Picker**: Native modal/picker sheet for selecting Book → Chapter/Verse start → Chapter/Verse end.
- **ESV Bible API**: Passage text fetched via Crossway ESV API (`https://api.esv.org/v3/passage/text/`) using Bearer Token.
- **Fallback API**: Free public domain World English Bible (`https://bible-api.com/{book}+{chapter}:{verse}`).
- **Local Caching**: Fetched passages are cached in `AsyncStorage` to conserve API quota and ensure fast offline access.

### 5.3 Organization & Browsing
- **Structured View**: Native list/accordion grouped by Book → Chapter showing all notes spanning that chapter.
- **Tag View**: Filterable list of notes matching selected custom tag chips.
- **Friend Profile View**: Feed showing all `'friends'` visibility notes written by a specific friend.
- **Global Search**: Filter notes by passage keywords, tag, or book.

### 5.4 Friends System
- Search users by exact email or username.
- Mutual friend request system (`'pending'` | `'accepted'`).
- Dedicated Friends screen with tabs for:
  - Active Friends list.
  - Incoming requests (Accept / Decline).
  - Outgoing pending requests.
  - Search / Add Friend.

### 5.5 Sharing & Privacy
- **Default visibility**: Configurable in User Settings (default: `'friends'`).
- Per-note toggle to flip between `'private'` and `'friends'` at any time.
- Friends can view (read-only) non-private notes via passage view, tag search, or friend profile feed.
- Enforced at database level via **Cloud Firestore Security Rules** — private notes are strictly non-queryable and non-readable by unauthorized users.

### 5.6 Overlap Detection & Notification System
- **Passage Overlap Detection**: Overlap occurs if two notes in the same book have intersecting verse bounds (`noteA.start_verse_id <= noteB.end_verse_id && noteA.end_verse_id >= noteB.start_verse_id`).
- **Live Passage Badge**: When viewing a passage or writing a note, a badge informs the user: *"Sarah also noted John 3:16"*.
- **In-App Notifications**: When a user creates a note, an in-app notification document is generated for any mutual friend who has a note overlapping that passage.
- **Notification Center**: Bell icon in the native navigation bar showing unread badge count with mark-as-read and tap-to-view navigation.

### 5.7 Auth & User Preferences
- **Firebase Authentication**: Email & Password sign-up, sign-in, password reset, and session management.
- Persistent session via `@react-native-async-storage/async-storage`.
- User Settings screen:
  - Account info, username, display name.
  - Global default note visibility (`'friends'` vs. `'private'`).
  - Custom ESV API key override.
  - Sign out / delete account actions.

## 6. Cloud Firestore Data Model

### 6.1 `users/{userId}`
User profile and preference document.
```typescript
interface UserDocument {
  id: string; // matches Firebase Auth uid
  username: string; // unique lowercase username
  full_name: string;
  email: string;
  default_visibility: 'friends' | 'private';
  created_at: FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.Timestamp;
}
```

### 6.2 `friendships/{friendshipId}`
Composite document ID: `${smallerUid}_${largerUid}` to guarantee a single friendship document per pair.
```typescript
interface FriendshipDocument {
  id: string; // e.g. "uidA_uidB" sorted alphabetically
  user_ids: [string, string]; // [uidA, uidB]
  status: 'pending' | 'accepted';
  requested_by: string; // uid of requester
  created_at: FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.Timestamp;
}
```

### 6.3 `notes/{noteId}`
Root collection storing all user notes.
```typescript
interface NoteDocument {
  id: string;
  user_id: string;
  book: string; // e.g. "John"
  chapter_start: number;
  verse_start: number;
  chapter_end: number;
  verse_end: number;
  start_verse_id: number; // 1 to 31102
  end_verse_id: number; // 1 to 31102
  content: string; // Markdown pre-filled with Swedish Method
  tags: string[]; // e.g. ["faith", "salvation"]
  visibility: 'private' | 'friends';
  created_at: FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.Timestamp;
}
```

### 6.4 `notifications/{notificationId}`
Root collection storing notifications.
```typescript
interface NotificationDocument {
  id: string;
  user_id: string; // recipient uid
  type: 'friend_note_exists' | 'friend_request' | 'friend_accept';
  related_note_id?: string;
  related_user_id: string; // author or requester uid
  related_user_name: string;
  passage_summary?: string; // e.g. "John 3:16"
  read: boolean;
  created_at: FirebaseFirestore.Timestamp;
}
```

## 7. Cloud Firestore Security Rules

Enforced server-side via `firestore.rules`:
- **`users` collection**:
  - `read`: Any authenticated user can read public profile fields (`username`, `full_name`).
  - `write`: Users can only create and update their own document (`request.auth.uid == userId`).
- **`friendships` collection**:
  - `read`: Allowed if `request.auth.uid in resource.data.user_ids`.
  - `create`: Allowed if `request.auth.uid == request.resource.data.requested_by` and `request.auth.uid in request.resource.data.user_ids`.
  - `update`: Allowed if `request.auth.uid in resource.data.user_ids` (e.g. accepting a request).
  - `delete`: Allowed if `request.auth.uid in resource.data.user_ids` (unfriending or canceling).
- **`notes` collection**:
  - `read`: Allowed if `request.auth.uid == resource.data.user_id` OR (`resource.data.visibility == 'friends'` AND exists(/databases/$(database)/documents/friendships/$(friendshipId))).
  - `create`: Allowed if `request.auth.uid == request.resource.data.user_id`.
  - `update` / `delete`: Allowed only if `request.auth.uid == resource.data.user_id`.
- **`notifications` collection**:
  - `read` / `update` / `delete`: Allowed only if `request.auth.uid == resource.data.user_id`.
  - `create`: Allowed for authenticated users sending valid notifications to mutual friends.

## 8. Bible Text Integration & Caching
- **Primary Source**: ESV API (`https://api.esv.org/v3/passage/text/`) using Bearer Token.
- **Fallback Source**: `https://bible-api.com/{book}+{chapter}:{verse}` serving public domain World English Bible.
- **Client Cache**: Passage text cached locally in `AsyncStorage` with keys `bible_cache_${translation}_${passageRef}` to avoid duplicate network requests and support offline reading.

## 9. Screens & Navigation Architecture (Expo Router)

The mobile app utilizes **Expo Router** with a bottom tab layout and native stack screens:

```
app/
├── (auth)/
│   ├── login.tsx          # Email & Password login
│   └── register.tsx       # Account creation & initial profile setup
├── (tabs)/
│   ├── _layout.tsx        # Bottom tab navigator (Paper icons)
│   ├── index.tsx          # Dashboard: Recent notes, passage jump, notifications summary
│   ├── notes.tsx          # Note Browser: Book/Chapter directory & Tag filters
│   ├── friends.tsx        # Friends list, requests, search & add
│   └── settings.tsx       # User preferences, visibility defaults, ESV API key, logout
├── note/
│   ├── [id].tsx           # View note detail + passage reader + friend overlap badge
│   └── edit.tsx           # Swedish Method editor, verse picker modal, tags input
├── friend/
│   └── [id].tsx           # Friend profile & their shared notes feed
└── notifications.tsx      # Full notifications center modal
```

## 10. Tech Stack & Libraries
- **Framework**: Expo SDK (React Native, Managed Workflow).
- **Navigation**: Expo Router (file-based native navigation).
- **Backend**: Firebase JS SDK (v11 modular) — Firebase Auth & Cloud Firestore.
- **Auth Persistence**: `@react-native-async-storage/async-storage`.
- **UI Components**: **React Native Paper** (Card, Button, TextInput, Appbar, Chip, Surface, Modal, FAB, Divider, Badge) for consistent, accessible, pre-built components.
- **Styling**: React Native **StyleSheet** with a shared design token/theme file (`constants/theme.ts`).
- **Icons**: `@expo/vector-icons` (MaterialCommunityIcons / Ionicons) or `lucide-react-native`.
- **Markdown Rendering**: `react-native-markdown-display`.
- **Testing**: Jest, React Native Testing Library, and `@firebase/rules-unit-testing`.

## 11. Non-Functional Requirements
- **Cross-Platform Compatibility**: Tested and optimized for both iOS and Android.
- **Offline Resilience**: Notes and fetched Bible passages cached locally; graceful notification when network operations fail.
- **Security**: Strict Firestore rules prevent unauthorized access to private notes and user profiles.
- **Code Quality**: Strict TypeScript types, modular services, thorough unit tests for verse range overlap logic and Firestore rules.

## 12. Future Enhancements (v2+)
- Group Bible study circles beyond 1:1 friends.
- Push notifications via Expo Notifications (FCM / APNs).
- Social login providers (Apple Sign-In, Google Sign-In).
- Side-by-side or split-pane tablet view for iPad/Android tablets.
- Audio Bible playback integration.