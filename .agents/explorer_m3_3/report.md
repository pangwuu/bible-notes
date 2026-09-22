# Milestone 3 Architecture & Investigation Report: Swedish Editor, Note Screens, & Firestore Service

**Author**: Explorer 3 (Milestone 3)  
**Date**: 2026-09-23  
**Status**: Complete  
**Working Directory**: `.agents/explorer_m3_3`  
**Parent Orchestrator ID**: `0a72a93f-be19-49c0-81f1-95f8e8f40226`

---

## 1. Executive Summary

Milestone 3 delivers the core note-taking engine for the Swedish Method Bible study application. This includes:
1. **Domain & Document Types (`src/types/note.ts`)**: Bridging the application domain model and Cloud Firestore schemas while strictly adhering to `firestore.rules` and `specs.md`.
2. **Notes Data Service (`src/services/notesService.ts`)**: Managing CRUD operations in Cloud Firestore (`notes/{noteId}`), index-optimized querying (`user_id`, `book`, `chapter_start`), and offline local persistence via `@react-native-async-storage/async-storage`.
3. **Day One Unbordered Editor (`src/components/SwedishEditor.tsx`)**: Minimalist, distraction-free editing surface with Swedish Method headers (💡 Key Idea `#E3A53D`, ❓ Question `#5B93C4`, 🏹 Application `#7BA05B`), tag chip pills (max 5 tags with prefix suggestions), and visibility toggles (`friends` / `private`).
4. **Note Edit Screen (`app/note/edit.tsx`)**: Complete integration of `PassagePicker`, `SwedishEditor`, debounced auto-save, explicit save button, and dirty-state back confirmation modal (Save / Discard / Cancel).
5. **Note Detail Screen (`app/note/[id].tsx`)**: Viewing notes with Swedish section formatting, Scripture reading card, Letterboxd-style friend overlap badge, and author-only edit/delete actions.
6. **Notes Browser Screen (`app/(tabs)/notes.tsx`)**: Filterable notes directory supporting By Book (grouped by book with chapter counts) and By Tag, Swedish symbol indicator dots, search filtering, and an `accentKeyIdea`-filled FAB.

All designs strictly comply with `DESIGN.md` (warm charcoal `#1A1816`, surface `#242019`, surfaceRaised `#2E2921`, text `#EDE7DD`, hairline borders `#332E27`, control radius 8px, content radius 4px, sheet radius 16px, zero drop shadows).

---

## 2. Key Problem Boundaries & Schema Reconciliation

### 2.1 Critical Security Rule Finding: `user_id` vs `userId`
In `firestore.rules`:
```javascript
match /notes/{noteId} {
  allow read: if isAuthenticated() && (
    resource.data.user_id == request.auth.uid ||
    (resource.data.visibility == 'friends' && areFriends(request.auth.uid, resource.data.user_id))
  );
  allow create: if isAuthenticated() && request.resource.data.user_id == request.auth.uid;
  allow update, delete: if isAuthenticated() && resource.data.user_id == request.auth.uid;
}
```
**CRITICAL**: Cloud Firestore rules strictly require `request.resource.data.user_id == request.auth.uid`. If a client writes `userId` instead of `user_id`, Firestore will reject the write with `PERMISSION_DENIED`.

**Solution**:
The `NoteDocument` stored in Firestore uses `user_id`. The client-side `Note` entity provides **both** `userId` and `user_id` (as dual properties or alias getters) and flat passage fields (`book`, `chapter_start`, `verse_start`, `chapter_end`, `verse_end`, `start_verse_id`, `end_verse_id`) alongside a structured `passage: PassageReference` object. This provides 100% compatibility with all test suites (`tier1`–`tier4`), `specs.md` §6.3, and `firestore.rules`.

### 2.2 Visibility Enum Reconciliation
- `specs.md` §5.5 & `tests/e2e/tier1_features.test.ts` lines 810–834 define visibility as `'friends' | 'private'` (defaulting to `'friends'`).
- `DISPATCH.md` mentions `'public' | 'friends' | 'private'`.
- `firestore.rules` permits read only if `resource.data.user_id == request.auth.uid` OR `(resource.data.visibility == 'friends' && areFriends(...))`. Note that `firestore.rules` does NOT currently contain a rule granting world-readable access for `'public'` notes.

**Solution**:
Define `export type NoteVisibility = 'friends' | 'private' | 'public'`. In UI selectors, `'friends'` and `'private'` are the primary choices, with default set to `'friends'`. If `'public'` is passed, it is typed correctly, but notes default to `'friends'` to stay completely secure under current rules.

### 2.3 Swedish Content Representation: Unified Markdown vs Discrete Sections
- `specs.md` §6.3 states `content: string` is a Markdown string pre-filled with Swedish Method headers:
  ```markdown
  ### 💡 Key Idea(s)
  
  
  ### ❓ Question(s)
  
  
  ### 🏹 Application(s)
  ```
- `DISPATCH.md` mentions `lightContent: string`, `questionContent: string`, `arrowContent: string`.
- `tests/e2e/tier1_features.test.ts` line 652 verifies `typeof noteDoc.content === 'string'`.
- `tests/e2e/tier2_boundaries.test.ts` line 770 verifies header detection and section parsing.

**Solution**:
Bi-directional parsing and serialization utilities:
- `parseSwedishMarkdown(content: string)`: Extracts `{ lightContent, questionContent, arrowContent }` from markdown even if headers are reordered or missing.
- `assembleSwedishMarkdown(light, question, arrow)`: Formats discrete sections into the canonical `SWEDISH_TEMPLATE_MARKDOWN` string.
- Storing `light_content`, `question_content`, `arrow_content` alongside `content` in `NoteDocument` provides fast indexing and instant rendering without repeated regex parsing.

---

## 3. Detailed Component & Module Specifications

### 3.1 `src/types/note.ts`
Exports:
1. `PassageReference`:
   ```typescript
   export interface PassageReference {
     book: string;
     startChapter: number;
     startVerse: number;
     endChapter: number;
     endVerse: number;
     startOrdinal: number;
     endOrdinal: number;
   }
   ```
2. `NoteVisibility`: `'friends' | 'private' | 'public'`
3. `NoteDocument` (Firestore schema matching `specs.md` §6.3):
   - `id: string`
   - `user_id: string`
   - `author_username?: string`
   - `author_display_name?: string`
   - `book: string`
   - `chapter_start: number`
   - `verse_start: number`
   - `chapter_end: number`
   - `verse_end: number`
   - `start_verse_id: number`
   - `end_verse_id: number`
   - `content: string`
   - `light_content?: string`
   - `question_content?: string`
   - `arrow_content?: string`
   - `tags: string[]`
   - `visibility: NoteVisibility`
   - `created_at: any`
   - `updated_at: any`
4. `Note` (Rich domain entity):
   - Includes all camelCase (`userId`, `passage`, `lightContent`, `questionContent`, `arrowContent`, `createdAt`, `updatedAt`) and flat snake_case properties (`user_id`, `book`, `chapter_start`, `start_verse_id`, `end_verse_id`, `created_at`, `updated_at`).
5. Converter and helper functions:
   - `parseSwedishMarkdown(content: string)`
   - `assembleSwedishMarkdown(light, question, arrow)`
   - `noteDocumentToNote(docData, id)`
   - `noteToNoteDocument(note)`
   - `formatPassageDisplay(passage)`

### 3.2 `src/services/notesService.ts`
Exports:
- `createNote(input: CreateNoteInput): Promise<Note>`
  - Resolves `uid = auth.currentUser?.uid || input.userId`.
  - Enforces `user_id: uid`.
  - Assembles `content` markdown.
  - Writes to Firestore `notes/{noteId}` with `serverTimestamp()`.
  - Caches to `AsyncStorage` key `note_${id}`.
  - If offline/network failure occurs, writes to `pending_offline_save_${id}` and caches locally.
- `updateNote(noteId: string, updates: UpdateNoteInput): Promise<Note>`
  - Validates `noteId` via `parseNoteId`.
  - Serializes updates with `updated_at: serverTimestamp()`.
  - Updates Firestore and updates local `AsyncStorage` cache.
- `deleteNote(noteId: string): Promise<void>`
  - Validates `noteId`.
  - Deletes from Firestore `notes/{noteId}`.
  - Clears `note_${noteId}` from `AsyncStorage`.
- `getNote(noteId: string): Promise<Note | null>`
  - Validates `noteId` via `parseNoteId(noteId)`.
  - Fetches from Firestore with offline fallback to `AsyncStorage`.
- `getUserNotes(userId: string): Promise<Note[]>`
  - Queries `collection(db, 'notes')` where `user_id == userId`.
  - Sorts client-side by `updated_at` desc.
- `getNotesByBook(userId: string, book: string): Promise<Note[]>`
  - Uses composite query `user_id == userId` and `book == book` (supported by `firestore.indexes.json`).
- `getNotesByTag(userId: string, tag: string): Promise<Note[]>`
  - Uses `where('tags', 'array-contains', tag.toLowerCase())`.
- `parseNoteId(param?: string): string`
  - Throws `'Note ID is required'` if empty/undefined (verified in `tier2_boundaries.test.ts` line 208).

### 3.3 `src/components/SwedishEditor.tsx`
Implements the Day One unbordered editor:
1. **Swedish Method Headers**:
   - `💡 Key Idea`: `#E3A53D` (`colors.accent.keyIdea`)
   - `❓ Question`: `#5B93C4` (`colors.accent.question`)
   - `🏹 Application`: `#7BA05B` (`colors.accent.application`)
   - Rendered as small caption-style labels (12px, font weight 600, sentence case).
2. **Text Inputs**:
   - Unbordered `TextInput`, no outline, no elevation, no border box.
   - Font: `SourceSerifPro` (16px, line height 24px).
   - Text color: `#EDE7DD`, placeholder: `#A39C8E`.
   - Hairline divider: `height: 1`, `#332E27`, with `accessibilityRole="none"`, `importantForAccessibility="no"`.
3. **Tag Chips Management**:
   - Input field + Add button, triggers on Enter/Submit.
   - Sanitizes tags: trimmed, lowercase alphanumeric + hyphen.
   - Caps at 5 tags maximum (`maxTags = 5`).
   - Removable pills: `#2E2921` (`bgSurfaceRaised`), text `#EDE7DD`, radius 8px (`radii.controls`), hairline border `#332E27`.
   - Prefix suggestions dropdown from curated tag pool (`filter(t => t.startsWith(query))`).
4. **Visibility Selector**:
   - Compact toggle / segmented pills for `friends` vs `private`.
   - `accessibilityRole="switch"`, `accessibilityLabel="Note visibility: friends"`.

### 3.4 `app/note/edit.tsx`
Orchestrator Screen for Editing Notes:
1. **Passage Selection**:
   - Tapping passage trigger card opens `PassagePicker` modal sheet.
   - Shows formatted reference (e.g. `John 3:16–17`).
2. **Dirty Tracking**:
   - Any change to passage, light, question, arrow, tags, or visibility sets `isDirty = true`.
3. **Auto-Save & Explicit Save**:
   - Explicit "Save" button in header (`accentKeyIdea` fill, 8px radius, dark text).
   - Blur / navigate auto-save trigger (`onBlur` / `navigation.addListener('blur')`).
   - `isSaving` mutex lock to serialize concurrent saves (tier2 846).
   - If clean (`!isDirty`), skips save operation (tier2 826).
   - Save error handling: retains `isDirty = true` and displays error banner:
     `"Failed to save note. Changes retained locally."` (tier2 837).
4. **Dirty Back Confirmation**:
   - Intercepts back navigation if `isDirty === true`.
   - Shows confirmation alert with 3 actions:
     - `Save`: commits note to Firestore & cache, resets dirty, navigates back.
     - `Discard`: resets dirty, navigates back immediately.
     - `Cancel`: dismisses modal, keeps user on editor.

### 3.5 `app/note/[id].tsx`
Note Detail Screen:
1. **Validation & Loading**:
   - Validates `id` via `parseNoteId`.
   - Fetches note via `notesService.getNote(id)`.
2. **Presentation**:
   - Passage title: `display` typography (28px, 600 weight, `#EDE7DD`).
   - Letterboxd-style Overlap Badge Pill: circular avatar + text (e.g. "Sarah also noted John 3:16") with `accentSocial` (`#B4789E`) border and `bgSurfaceRaised` fill.
   - Scripture Card: `readableCard` styling, `SourceSerifPro` reading font (16px, 1.5 line height).
   - Swedish sections: 💡 Key Idea, ❓ Question, 🏹 Application with accent headers.
   - Tag chips row and visibility badge.
3. **Author Actions**:
   - If current user is author:
     - Edit button (pencil icon) in header navigating to `/note/edit?id=${note.id}`.
     - Delete button with confirmation alert, calling `notesService.deleteNote(id)` and navigating back.
   - If current user is friend:
     - Shows author username badge, read-only mode (no edit/delete buttons).

### 3.6 `app/(tabs)/notes.tsx`
Notes Directory Screen:
1. **Navigation & Modes**:
   - Header with search input (filters by book, tag, content).
   - Segmented buttons for `By Book` vs `By Tag`.
2. **Notes List**:
   - Real-time/on-focus reload of user's notes.
   - "By Book": Groups notes by biblical book (e.g. "Gospel of John (3)", "Romans (1)").
   - "By Tag": Lists tag pills with counts (e.g. `#faith (4)`), tapping a tag filters the list.
3. **Note Card**:
   - `readableCard` styling (4px radius, surface `#242019`, hairline border `#332E27`, zero shadow).
   - Swedish symbol indicators:
     - 💡 (lit if Key Idea has text)
     - ❓ (lit if Question has text)
     - 🏹 (lit if Application has text)
   - Snippet preview in `SourceSerifPro`, tag pills, and relative date.
4. **FAB**:
   - Positioned at bottom-right (`bottom: 24, right: 16`).
   - Filled with `colors.accent.keyIdea` (`#E3A53D`), icon `+`.
   - Navigates to `/note/edit` to capture a new note.

---

## 4. E2E Test Suite Traceability

| Feature / Test | E2E Location | Verification in Proposed Design |
|---|---|---|
| **18.1–18.5: Unbordered Note Editor** | `tier1_features.test.ts:628–654` | `NoteEditScreen` route exists, unbordered styling, hairline divider `#332E27`, `SourceSerifPro`, markdown string model |
| **19.1–19.5: Swedish Method Headers** | `tier1_features.test.ts:659–690` | 💡 `#E3A53D`, ❓ `#5B93C4`, 🏹 `#7BA05B`, exact symbols & headings |
| **20.1–20.5: Auto-Save & Explicit Save** | `tier1_features.test.ts:693–735` | Explicit save button, blur auto-save, `updated_at` timestamp bump, canonical ordinals in payload, `user_id == request.auth.uid` |
| **21.1–21.5: Back Navigation Modal** | `tier1_features.test.ts:740–769` | `isDirty` state triggers confirmation with `['save', 'discard', 'cancel']` actions |
| **22.1–22.5: Tag Chips & Suggestions** | `tier1_features.test.ts:774–804` | Tag addition, max 5 tags, control radius 8px, prefix suggestions, tag removal |
| **23.1–23.5: Note Visibility** | `tier1_features.test.ts:809–834` | `'friends' \| 'private'` support, default `'friends'`, compliance with `firestore.rules` |
| **Boundary 5.1: Missing Note ID** | `tier2_boundaries.test.ts:207–214` | `parseNoteId` throws `'Note ID is required'` |
| **Boundary 18.1–18.5: Editor Boundaries** | `tier2_boundaries.test.ts:735–762` | Handles empty content, 100k chars, emojis, accessibilityRole='none' on divider |
| **Boundary 20.1–20.5: Auto-Save Boundaries** | `tier2_boundaries.test.ts:805–850` | Debounce typing, offline AsyncStorage queue, clean note skips write, error banner retention, serialized save |
| **Combination 2: Note Creation** | `tier3_combinations.test.ts:70–115` | Computes ordinals, initializes Swedish template, sets `'friends'` visibility |
| **Combination 9: Note Editor Dirty State** | `tier3_combinations.test.ts:380–415` | Content edit & tag additions mark dirty; modal save commits all fields |
| **Scenario 1: Full Note Lifecycle** | `tier4_scenarios.test.ts:40–120` | Write note in editor, tags, explicit save, local AsyncStorage persistence `note_${id}` |

---

## 5. Implementation Recommendations for Worker

1. Create `src/types/note.ts` first. Ensure bi-directional support for `user_id` / `userId` and Swedish markdown parser/serializer.
2. Implement `src/services/notesService.ts` with Firestore SDK methods and AsyncStorage cache fallback.
3. Implement `src/components/SwedishEditor.tsx` adhering to DESIGN.md tokens and tag chip restrictions.
4. Update `app/note/edit.tsx` with `PassagePicker` trigger, `SwedishEditor`, auto-save, and dirty back dialog.
5. Update `app/note/[id].tsx` with Swedish section viewers, scripture block, overlap badge pill, and author actions.
6. Update `app/(tabs)/notes.tsx` with segmented book/tag views, Swedish dot indicators, and `accentKeyIdea` FAB.
7. Run `npm test` to verify 100% pass across all 12 test suites.
