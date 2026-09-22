# Swedish Method Bible Notes — Comprehensive Specification Survey Report

**Document Version:** 1.0  
**Survey Date:** 2026-09-22T14:47:00Z  
**Investigator:** Survey Specification Investigator (`spec_miner_survey`)  
**Project Working Directory:** `/Users/johnnywu/Desktop/My-small-projects/bible_notes`  
**Firebase Target Project:** `bible-notes-sweedish` (configured in `.firebaserc`)  

---

## 1. Executive Summary & Authoritative Source Survey

This specification report compiles the verified technical and visual specifications mined from the project repository's authoritative sources:
- `ORIGINAL_REQUEST.md`: High-level functional deliverables R1–R5 and acceptance criteria.
- `specs.md`: Product and technical specification (Native Mobile v2) detailing architecture, schemas, and user flows.
- `DESIGN.md`: Visual design system, exact color hex codes, typography rules, component constraints, and explicit AI anti-patterns.
- `firestore.rules`: Cloud Firestore security rules, authentication constraints, and friendship relation helpers.
- `firestore.indexes.json`: Composite index definitions for querying notes and friendships.
- `firebase.json`: Configuration for Firestore, Functions, Database, and Auth.
- `.firebaserc`: Active default Firebase project configuration.

---

## 2. Visual Design System & Design Tokens (`DESIGN.md`)

### 2.1 Design Philosophy
- **Atmosphere:** Warm dark theme. Evokes a personal leather study journal under warm desk lamp light at night, distinctly avoiding cold, sterile, or blue-black "tech" dark modes.
- **Functionality of Color:** Color is strictly semantic. Accents correspond directly to the Swedish Method study symbols:
  - 💡 **Key Idea**: Amber / Gold
  - ❓ **Question**: Cool Blue
  - 🏹 **Application**: Sage Green
  - 👥 **Social / Overlap**: Dusty Plum
  - ⚠️ **Destructive Actions**: Muted Brick Red
- Accent colors are reserved for icons, small badges/pills, active tab indicators, and thin left-borders on note cards. They must **never** be used as large surface fills.

### 2.2 Color Palette & Exact Hex Tokens

| Token Name | Hex Code | Visual Role | Semantic Justification |
|---|---|---|---|
| `bg.base` (`bgBase`) | `#1A1816` | App background | Warm charcoal-brown undertone. Never `#0B0B0B`, `#111111`, or pure black. |
| `bg.surface` (`bgSurface`) | `#242019` | Cards, sheets, modals, inputs | Subtle warmth one step above base; defines bounded surfaces. |
| `bg.surfaceRaised` (`bgSurfaceRaised`) | `#2E2921` | Active/pressed surface, bottom sheets | Elevated layer reading clearly above `bg.surface`. |
| `text.primary` (`textPrimary`) | `#EDE7DD` | Body text, headings, titles | Warm parchment white. Eliminates harsh contrast of `#FFFFFF` during reading. |
| `text.secondary` (`textSecondary`) | `#A39C8E` | Metadata, timestamps, placeholders | Warm desaturated parchment. |
| `text.disabled` (`textDisabled`) | `#6B655A` | Disabled controls, inactive borders | Low-contrast warm gray. |
| `border.hairline` (`borderHairline`) | `#332E27` | Dividers, subtle borders, input outlines | Warm-toned structural hair-line divider. |
| `accent.keyIdea` (`accentKeyIdea`) | `#E3A53D` | 💡 Key Idea headers, FAB fill | Amber / gold illumination. Also used for Floating Action Button. |
| `accent.question` (`accentQuestion`) | `#5B93C4` | ❓ Question headers, inquiry UI | Cool blue inquiry. Deliberately coolest accent in warm palette for contrast. |
| `accent.application` (`accentApplication`) | `#7BA05B` | 🏹 Application headers, action UI | Sage green representing personal growth and action. |
| `accent.social` (`accentSocial`) | `#B4789E` | Friends, overlap badges, notifications | Dusty plum. Warm and human; distinct from study categories. |
| `accent.danger` (`accentDanger`) | `#C4664F` | Destructive actions (delete, unfriend) | Muted brick red. Stays within warm palette while signaling hazard. |

### 2.3 Typography & Type Scale
Two-family typographic system:
1. **Serif (Reading Content):** `Source Serif Pro` (loaded via `expo-font`, fallback to system serif). Applied to Scripture passages (ESV / WEB) and note body markdown at `lineHeight: 1.5` for comfortable sustained reading.
2. **Sans (UI Chrome):** System font (`San Francisco` on iOS, `Roboto` on Android). Applied to navigation headers, tabs, buttons, chips, form labels, and metadata.

| Style Name | Size (px) | Weight | Font Family | Usage |
|---|---|---|---|---|
| `display` | 28 | 600 | Sans | Primary screen titles (Dashboard, Note detail passage reference) |
| `title` | 20 | 600 | Sans | Card titles, modal headers, section headers |
| `body` | 16 | 400 | Serif (`Source Serif Pro`) | Note body markdown content, Scripture passage text |
| `label` | 14 | 500 | Sans | Buttons, tab bar labels, input field labels |
| `caption` | 12 | 400 | Sans | Timestamps, metadata, tag chips, Swedish section editor labels |

**Casing Rules:** Strict Sentence case across all screens, buttons, tabs, and headings. **Zero ALL-CAPS** text.

### 2.4 Spacing & Grid System
- **Base Grid Unit:** 4px.
- **Allowed Spacing Steps:** `xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`, `xxl: 48`.
- Screen horizontal margin/padding: `16px`.
- Space between unrelated sections: `24px`.
- Space between related label + control: `8px`.
- Line length cap for reading text on tablets: ~65–70 characters wide.

### 2.5 Radii, Elevation & Shadows
- **Readable Content** (note cards, passage text blocks): `borderRadius: 4`, **no drop shadows**. Hairline border (`#332E27`) only.
- **Interactive Controls** (buttons, tag chips, passage picker book/chapter tiles, overlap badge pill): `borderRadius: 8`, **no drop shadows**. States differentiated by fill color and `bg.surfaceRaised` on press.
- **Modals & Bottom Sheets** (passage picker sheet, tag input modal): `borderRadius: 16` at **top corners only** (`borderTopLeftRadius: 16`, `borderTopRightRadius: 16`), with `bg.surfaceRaised` fill.
- **FAB (Floating Action Button):** Fixed circular button filled with `accent.keyIdea` (`#E3A53D`).
- **Shadows Rule:** **Zero generic AI drop shadows** (`rgba(0,0,0,0.1)`). Shadows are ineffective and muddy on dark backgrounds. Elevation is represented through distinct surface tokens (`bg.surface` vs `bg.surfaceRaised`) and hairline borders.

### 2.6 Strict Anti-Patterns Checklist (Violations to Reject)
- ❌ Do NOT use cold near-black backgrounds (`#0B0B0B`, `#111111`) with neon/acid accents.
- ❌ Do NOT use generic AI terracotta/salmon accent (`#D97757`).
- ❌ Do NOT apply uniform rounded card styles with soft drop shadows across all components.
- ❌ Do NOT use ALL-CAPS tracked-out eyebrow labels above headings.
- ❌ Do NOT use middle-dot-joined metadata chains (e.g. `John 3:16 · 2 notes · 3 tags`) — use separate lines, chips, or icons.
- ❌ Do NOT append arrows (`→`) to button or navigation link text.
- ❌ Do NOT insert arbitrary sequence counters (`01 / 02 / 03`) unless displaying a literal sequence.
- ❌ Do NOT use monospace fonts for metadata or UI labels.

---

## 3. Architecture & Navigation Specifications (`specs.md`)

### 3.1 Technology Stack Matrix
- **Core Framework:** Expo SDK 57 (React Native Managed Workflow, TypeScript).
- **Navigation:** Expo Router (File-based native routing with native tabs and stacks).
- **Component Library:** React Native Paper (Card, Button, TextInput, Appbar, Chip, Surface, Modal, FAB, Divider, Badge) customized with the warm dark theme.
- **State & Storage:** Local state, React Context/Hooks, and `@react-native-async-storage/async-storage` for persistence.
- **Backend SDK:** Firebase JS SDK v11 (Modular) for Authentication and Cloud Firestore.
- **Markdown Parser:** `react-native-markdown-display` styled to parchment and Swedish accent colors.
- **Iconography:** `@expo/vector-icons` (`MaterialCommunityIcons` / `Ionicons`) or `lucide-react-native`.
- **Test Framework:** Jest, React Native Testing Library, `@firebase/rules-unit-testing`.

### 3.2 Navigation Hierarchy & Route Tree
```
app/
├── (auth)/
│   ├── login.tsx            # Email & Password sign-in screen
│   └── register.tsx         # Account registration & initial username/profile creation
├── (tabs)/
│   ├── _layout.tsx          # Bottom tab bar navigator (Paper icons & label tokens)
│   ├── index.tsx            # Dashboard: Recent notes feed, quick passage jump, notification summary
│   ├── notes.tsx            # Notes Browser: Structured Book/Chapter directory & Tag filter list
│   ├── friends.tsx          # Friends System: Active friends, Incoming/Outgoing requests, User search
│   └── settings.tsx         # Settings: Profile info, default visibility toggle, ESV API key override, Logout
├── note/
│   ├── [id].tsx             # Note Detail: Note view + Passage reader + Friend overlap badge pill
│   └── edit.tsx             # Note Editor: Swedish Method Day One editor, Passage Picker modal, Tag chips
├── friend/
│   └── [id].tsx             # Friend Profile: Friend bio and feed of their 'friends' visibility notes
└── notifications.tsx        # Notification Center: Modal list of notifications, unread marks, note links
```

---

## 4. Cloud Firestore Data Models & Security Constraints

### 4.1 Schema Definitions

#### 4.1.1 Collection: `users/{userId}`
- **Document ID:** `userId` (strictly matches Firebase Auth `request.auth.uid`).
- **Fields:**
  - `id`: `string` — User UID.
  - `username`: `string` — Unique lowercase alphanumeric + underscore string (3–20 chars).
  - `full_name`: `string` — User display name.
  - `email`: `string` — Normalized user email.
  - `default_visibility`: `'friends' | 'private'` — Default visibility applied to newly drafted notes (defaults to `'friends'`).
  - `custom_esv_api_key` *(optional)*: `string` — User-supplied Crossway ESV Bearer token.
  - `created_at`: `FirebaseFirestore.Timestamp` — Document creation timestamp.
  - `updated_at`: `FirebaseFirestore.Timestamp` — Document modification timestamp.

#### 4.1.2 Collection: `friendships/{friendshipId}`
- **Document ID Convention:** Lexicographically sorted composite ID: `${smallerUid}_${largerUid}` (e.g. `uidA < uidB ? uidA + '_' + uidB : uidB + '_' + uidA`).  
  *Critical Invariant:* The Firestore Security Rules function `friendshipDocId(uidA, uidB)` computes this exact deterministic ID. If documents do not follow this ID format, friendship verification fails and friends cannot read each other's shared notes.
- **Fields:**
  - `id`: `string` — Identical to document ID (`${smallerUid}_${largerUid}`).
  - `user_ids`: `[string, string]` — Array containing both user UIDs.
  - `status`: `'pending' | 'accepted'` — State of the relationship.
  - `requested_by`: `string` — UID of the user who initiated the request.
  - `created_at`: `FirebaseFirestore.Timestamp` — Timestamp when request was sent.
  - `updated_at`: `FirebaseFirestore.Timestamp` — Timestamp when accepted or updated.

#### 4.1.3 Collection: `notes/{noteId}`
- **Document ID:** Auto-generated Firestore document ID.
- **Fields:**
  - `id`: `string` — Note document ID.
  - `user_id`: `string` — Author's Firebase Auth UID.
  - `book`: `string` — Canonical Bible book name (e.g. `"John"`, `"Genesis"`).
  - `chapter_start`: `number` — Starting chapter integer.
  - `verse_start`: `number` — Starting verse integer.
  - `chapter_end`: `number` — Ending chapter integer.
  - `verse_end`: `number` — Ending verse integer.
  - `start_verse_id`: `number` — Standardized global canonical verse ordinal (1 to 31,102).
  - `end_verse_id`: `number` — Standardized global canonical verse ordinal (1 to 31,102).
  - `content`: `string` — Markdown text containing the Swedish Method sections.
  - `tags`: `string[]` — Array of up to 5 lowercase strings.
  - `visibility`: `'private' | 'friends'` — Note privacy toggle.
  - `created_at`: `FirebaseFirestore.Timestamp` — Creation timestamp.
  - `updated_at`: `FirebaseFirestore.Timestamp` — Last modified timestamp.

#### 4.1.4 Collection: `notifications/{notificationId}`
- **Document ID:** Auto-generated Firestore document ID.
- **Fields:**
  - `id`: `string` — Notification document ID.
  - `user_id`: `string` — Recipient user UID.
  - `type`: `'friend_note_exists' | 'friend_request' | 'friend_accept'` — Notification type.
  - `related_note_id` *(optional)*: `string` — Note ID that triggered the notification (for `friend_note_exists`).
  - `related_user_id`: `string` — Author of the note or sender of the friend request.
  - `related_user_name`: `string` — Display name or username of the actor.
  - `passage_summary` *(optional)*: `string` — Formatted reference (e.g. `"John 3:16–17"`).
  - `read`: `boolean` — Flag indicating whether the notification has been viewed.
  - `created_at`: `FirebaseFirestore.Timestamp` — Creation timestamp.

### 4.2 Security Rules Invariants (`firestore.rules`)
1. **Authentication Guard:** Every read/write requires `request.auth != null`.
2. **User Profiles (`/users/{userId}`):**
   - Read: Allowed for any authenticated user (enables user search by username/email).
   - Create & Update: Allowed only if `request.auth.uid == userId`.
   - Delete: Blocked (`allow delete: if false`).
3. **Friendships (`/friendships/{friendshipId}`):**
   - Read: User must be a member (`request.auth.uid in resource.data.user_ids`).
   - Create: Requester must be auth user (`request.auth.uid == request.resource.data.requested_by`), auth user must be in `user_ids`, and initial status must be `'pending'`.
   - Update & Delete: Auth user must be in `resource.data.user_ids`.
4. **Notes (`/notes/{noteId}`):**
   - Read: Allowed if caller is author (`resource.data.user_id == request.auth.uid`) OR note visibility is `'friends'` AND `areFriends(request.auth.uid, resource.data.user_id)` returns true.
   - Create: Caller must be the author (`request.resource.data.user_id == request.auth.uid`).
   - Update & Delete: Caller must be author (`resource.data.user_id == request.auth.uid`).
5. **Notifications (`/notifications/{notificationId}`):**
   - Read, Update, Delete: Allowed only if recipient matches caller (`resource.data.user_id == request.auth.uid`).
   - Create: Allowed for any authenticated user (permits client-side notification generation for friends upon note creation).

### 4.3 Composite Indexes (`firestore.indexes.json`)
The following composite indexes are configured:
1. `notes`: `user_id ASC`, `book ASC`, `chapter_start ASC` (for structured book/chapter note browser for a user).
2. `notes`: `book ASC`, `start_verse_id ASC` (for passage-based overlap queries within a book).
3. `friendships`: `user_ids CONTAINS`, `status ASC` (for fetching active or pending friendships for a user).

---

## 5. Domain Logic & Functional Specifications

### 5.1 Canonical Verse Ordinal Mapping & Overlap Math
- **Standardized Verse Index:** Every verse in the Protestant Bible canon (Genesis 1:1 through Revelation 22:21; 66 books; 1,189 chapters; 31,102 verses) maps to a unique sequential integer ordinal from `1` to `31,102`.
  - Genesis 1:1 = `1`
  - Genesis 1:2 = `2`
  - Revelation 22:21 = `31,102`
- **Passage Range:** Any passage is bounded by `[start_verse_id, end_verse_id]`, with invariant `1 <= start_verse_id <= end_verse_id <= 31,102`.
- **Overlap Formula:** Two passage ranges A and B in the same book overlap if and only if:
  $$\text{Overlap}(A, B) = (\text{start\_verse\_id}_A \le \text{end\_verse\_id}_B) \land (\text{end\_verse\_id}_A \ge \text{start\_verse\_id}_B)$$
- **Cross-Chapter References:** Supported seamlessly (e.g. John 1:50 to John 2:5) because verse ordinals are continuous across chapter boundaries.

### 5.2 Swedish Method Note Editor Flow
- **Interaction Model:** Day One style frictionless writing experience.
  - Large unbordered editor area.
  - Hairline divider (`#332E27`) separating sections.
  - Pre-populated markdown template headers on creation:
    ```markdown
    ### 💡 Key Idea(s)

    ### ❓ Question(s)

    ### 🏹 Application(s)
    ```
  - Headers render in editor chrome with small `caption` weight tags in their respective token colors (`accentKeyIdea`, `accentQuestion`, `accentApplication`).
- **YouVersion-Style Passage Picker:**
  - 3-step modal sheet drill-down:
    1. Book grid (select from 66 books, Old / New Testament categories).
    2. Chapter grid (select chapter count for chosen book).
    3. Verse range selector (drag-select or tap start & end on verse strip).
- **Auto-Save & Exit Guard:**
  - Auto-save on navigate away.
  - Explicit "Save" button in header bar.
  - Dirty-state confirmation alert on back navigation: "Save Changes", "Discard", or "Cancel".
- **Tags System:**
  - Maximum of 5 tags per note.
  - Input with autocomplete suggestions derived from previously used tags.
  - Styled as `borderRadius: 8` chips.

### 5.3 Bible Text Integration & Caching Protocol
- **Primary Source:** Crossway ESV API
  - Endpoint: `https://api.esv.org/v3/passage/text/?q={passage}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-short-copyright=false&include-passage-references=false`
  - Authorization: HTTP Header `Authorization: Token {bearer_token}`.
  - Default Token: `6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba`.
  - User Override: Users can provide their own ESV API key in Settings, which is stored in their profile and overrides the default.
- **Fallback Source:** World English Bible (WEB)
  - Endpoint: `https://bible-api.com/{book}+{chapter}:{verse_start}-{verse_end}`
  - Format: JSON response with `text` and verse list. Public domain, no token required.
- **Local Persistence Strategy:**
  - Storage: `@react-native-async-storage/async-storage`.
  - Cache Key Format: `bible_cache_${translation}_${sanitizedPassageRef}`.
  - Read Path: Memory / AsyncStorage cache check -> ESV API fetch -> fallback to WEB API -> store successful response into AsyncStorage.

### 5.4 Friends Social Layer, Overlap Detection & Notifications
- **Friend Search & Addition:**
  - Search by exact username or exact email address.
  - Mutual friend request cycle:
    1. User A initiates: Creates document in `friendships/` with `status: 'pending'`, `requested_by: A`, `user_ids: [A, B]`. Creates notification for User B.
    2. User B accepts: Updates document in `friendships/` to `status: 'accepted'`. Creates notification for User A.
    3. Unfriend / Decline: Deletes document from `friendships/`.
- **Passage Overlap Detection & Live Badge:**
  - Model: Letterboxd-style compact inline badge pill.
  - Displays avatar + text: *"Sarah also noted John 3:16"*.
  - Styled with `borderRadius: 8`, `accentSocial` border (`#B4789E`), and dismissible on tap.
- **Notification Generation:**
  - Generated client-side whenever a user creates a new note with visibility `'friends'`.
  - Client queries notes belonging to accepted mutual friends where `book == note.book` and ranges overlap.
  - For each overlapping friend, a document is added to `/notifications` with `type: 'friend_note_exists'`.
- **Notification Center & Header Bell:**
  - Bell icon in top navigation bar displaying real-time unread count badge.
  - Modal sheet listing notifications in reverse chronological order.
  - Tap notification navigates to the overlapping note detail screen and marks notification `read: true`.

---

## 6. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Navigation | Expo Router Tab Navigator | 4-tab bottom navigation (Home, Notes, Friends, Settings) | User tab tap | Route transition, active tab accent indicator | Fallback to Home if invalid route | `specs.md` §9, `ORIGINAL_REQUEST.md` R1 |
| 2 | Navigation | Native Stack Screens | Note Detail, Note Edit, Friend Profile, Notifications Modal | Route params (`id`, `passage`) | Fullscreen or modal presentation | Redirect to previous screen if record missing | `specs.md` §9, `ORIGINAL_REQUEST.md` R1 |
| 3 | Theme | Custom Warm Dark Theme | PaperProvider with warm charcoal base (`#1A1816`) and surface (`#242019`) | Theme object in `constants/theme.ts` | Unified styling across all Paper components | System fallback if theme fails to load | `DESIGN.md` §2, `ORIGINAL_REQUEST.md` R1 |
| 4 | Typography | Source Serif Pro Font Loader | Load `Source Serif Pro` via `expo-font` for reading/body text | TTF/OTF font assets | Serif font applied to Scripture and note content | Fallback to native system serif (`Georgia`/`Serif`) | `DESIGN.md` §Typography, `ORIGINAL_REQUEST.md` R1 |
| 5 | Auth | Email/Password Registration | Account creation with email, password, username, full name | Email, password, username, full name | New Firebase Auth user + Firestore `users/{uid}` doc | Displays form validation error / Auth error code | `specs.md` §5.7, §6.1, `ORIGINAL_REQUEST.md` R2 |
| 6 | Auth | Email/Password Login | Authenticate existing user | Email, password | Persistent session in AsyncStorage | Displays invalid credentials message | `specs.md` §5.7, `ORIGINAL_REQUEST.md` R2 |
| 7 | Auth | Session Persistence | Native AsyncStorage session persistence | Firebase Auth token | Kept logged in across app restarts | Clears token on expiration / invalidation | `specs.md` §10, `ORIGINAL_REQUEST.md` R2 |
| 8 | Auth | Password Reset | Send password reset email via Firebase Auth | Email string | Success confirmation alert | Displays user-not-found or invalid email error | `specs.md` §5.7, `ORIGINAL_REQUEST.md` R2 |
| 9 | Auth / Profile | Username Validation & Uniqueness | Ensure username is 3–20 lowercase alphanumeric/underscore and unique | Username string | Validated username saved to profile | Throws validation error if invalid regex or taken | `ORIGINAL_REQUEST.md` R2, `specs.md` §6.1 |
| 10 | Profile | User Settings Configuration | Update full name, default note visibility, custom ESV API key | User preference inputs | Updated `users/{uid}` document | Reverts UI state on Firestore error | `specs.md` §5.7, `ORIGINAL_REQUEST.md` R4 |
| 11 | Domain | Canonical Verse Ordinal Mapping | Maps 66 books, Genesis 1:1 to Rev 22:21 to ordinals 1–31,102 | Book, chapter, verse | Global integer ordinal `1..31102` | Throws out-of-range error on invalid chapter/verse | `specs.md` §5.1, `ORIGINAL_REQUEST.md` R3 |
| 12 | Domain | Verse Range Overlap Calculation | Determines if two verse ranges intersect | `(startA, endA, startB, endB)` | Boolean `isOverlapping` | Returns false if inputs invalid or disjoint | `specs.md` §5.6, `ORIGINAL_REQUEST.md` R3 |
| 13 | Note Editor | YouVersion-style Passage Picker | 3-step modal sheet (Book grid → Chapter grid → Verse range drag) | User selections | Selected passage reference & ordinals | Disallows end < start; bounds within chapter | `DESIGN.md` §Passage Picker, `specs.md` §5.2 |
| 14 | Note Editor | Day One Style Unbordered Editor | Unbordered text inputs with caption-styled Swedish headers | Text input by user | Formatted markdown document | Prompts on navigation if unsaved | `DESIGN.md` §Editor, `ORIGINAL_REQUEST.md` R3 |
| 15 | Note Editor | Swedish Template Header Prepopulation | Pre-fills new notes with 💡 Key Idea, ❓ Question, 🏹 Application | New note action | Editor initialized with Swedish headers | Defaults to blank if template disabled | `specs.md` §5.1, `ORIGINAL_REQUEST.md` R3 |
| 16 | Note Editor | Auto-Save on Navigate Away | Automatically persists note when leaving edit screen | Blur / screen unfocus event | Note document written to Firestore | Flags error banner if write fails | `ORIGINAL_REQUEST.md` R3 |
| 17 | Note Editor | Save / Discard / Cancel Confirmation | Alerts user of unsaved changes when pressing back | Back action with dirty state | Confirmation dialog options | Stays on screen if Cancel is chosen | `ORIGINAL_REQUEST.md` R3 |
| 18 | Note Editor | Tag Chips & Autocomplete | Support up to 5 tag chips per note with autocomplete | Tag text input | Tag chip appended to note | Blocks input if 5 tags already present | `specs.md` §5.1, `ORIGINAL_REQUEST.md` R3 |
| 19 | Note Editor | Visibility Toggle | Toggle per-note visibility between `'private'` and `'friends'` | Switch / segment control | Sets `visibility` field on note doc | Defaults to user's global preference | `specs.md` §5.5, `ORIGINAL_REQUEST.md` R3 |
| 20 | Bible Text | ESV API Passage Fetching | Fetch passage text using Crossway Bearer token | Passage string query | ESV Scripture text string | Falls back to WEB on HTTP error/timeout | `specs.md` §8, `ORIGINAL_REQUEST.md` R4 |
| 21 | Bible Text | WEB Public Domain Fallback | Fetch public domain World English Bible passage | Book, chapter, verse | WEB Scripture text string | Displays offline/error state if both fail | `specs.md` §8, `ORIGINAL_REQUEST.md` R4 |
| 22 | Bible Text | Local Scripture Caching | Cache fetched passages in AsyncStorage | Translation, passage, text | Cached entry stored with key `bible_cache_*` | Logs warning if cache storage full | `specs.md` §8, `ORIGINAL_REQUEST.md` R4 |
| 23 | Bible Text | Custom ESV Key Override | Allow users to supply and use their own Crossway API key | API key string in settings | Custom key used for all ESV API calls | Falls back to default key if custom is invalid | `specs.md` §5.7, `ORIGINAL_REQUEST.md` R4 |
| 24 | Notes Browser | Structured Book/Chapter Accordion | Browse user notes grouped hierarchically by Book → Chapter | Collection of user notes | Grouped accordion list of notes | Empty state placeholder when no notes | `specs.md` §5.3, `ORIGINAL_REQUEST.md` R1 |
| 25 | Notes Browser | Tag Filter Browser | Browse and filter notes matching selected tag chips | Selected tag chip(s) | Filtered list of notes | Empty state when no notes match tag | `specs.md` §5.3, `ORIGINAL_REQUEST.md` R1 |
| 26 | Social | Exact-Match User Search | Find users by exact username or exact email address | Query string | Matching user summary card | "User not found" if no exact match | `specs.md` §5.4, `ORIGINAL_REQUEST.md` R5 |
| 27 | Social | Mutual Friend Request Flow | Send, accept, or decline friend requests | Target user ID | `friendships/` document created/updated | Rejects duplicate or self-requests | `specs.md` §5.4, `firestore.rules` |
| 28 | Social | Friend Profile Note Feed | View profile and public `'friends'` notes of a friend | Friend UID | List of friend's non-private notes | Security rule blocks if not mutual friends | `specs.md` §5.3, `firestore.rules` |
| 29 | Social | Unfriend / Cancel Request | Remove an existing friend or cancel a pending request | Friendship document ID | Deletes `friendships/{id}` document | Fails if user not in `user_ids` | `specs.md` §5.4, `firestore.rules` |
| 30 | Overlap | Client Overlap Detection | Scan friend notes for overlapping verse ranges upon note save | Saved note's book & ordinals | List of overlapping friend notes | Skips if note visibility is `'private'` | `specs.md` §5.6, `ORIGINAL_REQUEST.md` R5 |
| 31 | Overlap | Letterboxd-Style Overlap Badge | Inline dismissible pill: Avatar + *"Sarah also noted John 3:16"* | Overlap event data | Compact badge pill with `accentSocial` border | Dismisses from screen on tap | `DESIGN.md` §Overlap, `specs.md` §5.6 |
| 32 | Notifications | In-App Overlap Notification Creation | Writes notification doc for overlapping mutual friends | Overlap detection result | New doc in `/notifications` collection | Silently fails/logs if write fails | `specs.md` §5.6, `ORIGINAL_REQUEST.md` R5 |
| 33 | Notifications | Header Realtime Unread Count Badge | Badge on bell icon displaying number of unread notifications | Firestore realtime snapshot | Integer badge count on bell icon | Hides badge when unread count is 0 | `specs.md` §5.6, `ORIGINAL_REQUEST.md` R5 |
| 34 | Notifications | Full Notification Center Modal | List notifications with avatar, timestamp, tap to navigate | Bell icon tap | Modal sheet with notification items | Empty state placeholder when no notifications | `specs.md` §5.6, §9, `ORIGINAL_REQUEST.md` R5 |
| 35 | Markdown | Swedish Section Markdown Rendering | Render note content with custom styling for Swedish sections | Markdown text | Styled text with colored section dividers | Graceful fallback to raw text on parse error | `specs.md` §10, `DESIGN.md` §Typography |

---

## 7. Edge Cases & Constraints Matrix

| # | Feature | Edge Case / Input | Expected / Observed Behavior | Source Authority |
|---|---|---|---|---|
| 1 | Verse Ordinals | Genesis 1:1 (Lower Bound) | `start_verse_id = 1`. Invariant: minimum valid ID is 1. | `specs.md` §5.1, §6.3 |
| 2 | Verse Ordinals | Revelation 22:21 (Upper Bound) | `end_verse_id = 31102`. Invariant: maximum valid ID is 31,102. | `specs.md` §5.1, §6.3 |
| 3 | Verse Ordinals | Single verse note (e.g. John 3:16) | `start_verse_id == end_verse_id`. Overlap math evaluates correctly without division by zero or off-by-one. | `specs.md` §5.1, §5.6 |
| 4 | Verse Ordinals | Cross-chapter passage (e.g. John 1:50 to John 2:5) | Correctly computes continuous global ordinals across the chapter boundary. | `specs.md` §5.1 |
| 5 | Overlap Detection | Notes in different books | Must NOT trigger overlap. Overlap is scoped to matching `book` (or verified by disjoint global ordinal ranges). | `specs.md` §5.6 |
| 6 | Overlap Detection | Touching / Boundary verses (Note A: v1–5, Note B: v5–8) | Overlap is TRUE at verse 5 (`5 <= 8 && 5 >= 1`). Matches mathematical definition $\le$ and $\ge$. | `specs.md` §5.6 |
| 7 | Overlap Detection | Disjoint adjacent verses (Note A: v1–4, Note B: v5–8) | Overlap is FALSE (`end_verse_id_A = 4 < start_verse_id_B = 5`). | `specs.md` §5.6 |
| 8 | Friendship ID | Deterministic Document ID | Must be sorted alphabetically (`uidA < uidB ? uidA + '_' + uidB : uidB + '_' + uidA`). A reversed ID causes `areFriends()` in `firestore.rules` to return false, blocking note reads. | `firestore.rules` lines 14–22, `specs.md` §6.2 |
| 9 | Friendship Rules | Self-friend request (`uidA == uidB`) | Must be blocked client-side and prevented in search results. | `specs.md` §5.4 |
| 10 | Friendship Rules | Creating duplicate request | Firestore document ID collision occurs; cannot overwrite existing pending or accepted friendship. | `specs.md` §6.2 |
| 11 | Note Privacy | Private note with mutual friend | Overlap notification must NOT be generated, and `areFriends()` rule prevents unauthorized friend read. | `firestore.rules` lines 44–47 |
| 12 | Note Tags | Adding more than 5 tags | Editor UI disables adding a 6th tag chip; limits array to $\le 5$ strings. | `specs.md` §5.1, `ORIGINAL_REQUEST.md` R3 |
| 13 | Note Editor | Navigating back with unsaved edits | Triggers modal prompt with Save, Discard, and Cancel options. | `ORIGINAL_REQUEST.md` R3 |
| 14 | Bible API | ESV API offline or rate-limited (HTTP 429/500/Timeout) | Silently and seamlessly falls back to public domain WEB API (`bible-api.com`). | `specs.md` §8, `ORIGINAL_REQUEST.md` R4 |
| 15 | Bible API | Device completely offline | Loads Scripture text from `AsyncStorage` cache. If not cached, shows graceful offline notice without crashing. | `specs.md` §8, §11 |
| 16 | Bible API | Custom API key invalid/revoked | Falls back to default Bearer token, then falls back to WEB. | `ORIGINAL_REQUEST.md` R4, `specs.md` §8 |
| 17 | User Profile | Deleting user document from client | `allow delete: if false;` in `firestore.rules` line 28 explicitly forbids client-side user document deletion. | `firestore.rules` line 28 |
| 18 | Username Uniqueness | Registering with existing username | Client checks username collection / query; registration errors if taken. | `ORIGINAL_REQUEST.md` R2, `specs.md` §6.1 |
| 19 | UI Styling | Attempting light mode or cold black background | Strictly prohibited by `DESIGN.md`. Must strictly render `#1A1816` warm charcoal base. | `DESIGN.md` §Philosophy, §Do not do this |
| 20 | UI Styling | Adding drop shadows to cards | Forbidden by `DESIGN.md`. Border radius must be 4 for content, 8 for controls, 16 for sheets; no shadows. | `DESIGN.md` §Components |

---

## 8. Verification & Alignment Checklist

- [x] All 5 primary requirements (R1 through R5) analyzed and cross-referenced.
- [x] Design tokens, color hex codes, and typography specifications captured without omission.
- [x] Firestore security rules evaluated for helper functions, access controls, and document ID invariants.
- [x] Firestore indexes mapped to respective query requirements.
- [x] Mathematical definitions for canonical verse ordinals and range intersections documented.
- [x] Complete edge cases, constraints, and error behaviors tabulated.
