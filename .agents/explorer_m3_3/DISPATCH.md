# DISPATCH — Explorer 3 (Milestone 3: Swedish Editor, Notes Screen, & Firestore Service)

## Mission
You are Explorer 3 for Milestone 3 (R3: Swedish Method Note Editor & Domain Utilities).
Investigate and design:
1. `src/types/note.ts`:
   - Note data interface matching `specs.md` and `firestore.rules`:
     `id: string`, `userId: string`, `authorUsername: string`, `authorDisplayName: string`,
     `passage: { book: string, startChapter: number, startVerse: number, endChapter: number, endVerse: number, startOrdinal: number, endOrdinal: number }`,
     `lightContent: string`, `questionContent: string`, `arrowContent: string`,
     `tags: string[]`, `visibility: 'public' | 'friends' | 'private'`,
     `createdAt: Timestamp | string`, `updatedAt: Timestamp | string`.
2. `src/services/notesService.ts`:
   - Firestore methods: `createNote`, `updateNote`, `deleteNote`, `getNote`, `getUserNotes(userId)`.
   - Security rule compliance: `firestore.rules` requires `resource.data.authorId == request.auth.uid` (or `userId == request.auth.uid` — check exact field names in `firestore.rules`).
3. `src/components/SwedishEditor.tsx`:
   - Day One unbordered minimalist editor with Swedish headers:
     - 💡 Light / Key Idea (`#E3A53D`)
     - ❓ Question / Hard Saying (`#5B93C4`)
     - 🏹 Arrow / Personal Application (`#7BA05B`)
   - Tag chip management (add tag with Enter/comma, removable chip pills with `#2E2921` background, `#EDE7DD` text).
   - Visibility selector (`private`, `friends`, `public`).
4. Screens:
   - `app/note/edit.tsx`: Integration of PassagePicker, SwedishEditor, auto-save on blur/navigate, explicit save, dirty back confirmation dialog (`Alert.alert` or custom dialog).
   - `app/note/[id].tsx`: Display note with Swedish sections, passage reference, tags, edit/delete actions for author.
   - `app/(tabs)/notes.tsx`: User notes list with search/filter by tag or book, Swedish symbol indicators, FAB to navigate to `/note/edit`.

## Input Files
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` (authoritative user request)
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/DESIGN.md`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/specs.md`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/firestore.rules`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`

## Deliverables
- Detailed report at `.agents/explorer_m3_3/report.md`
- Hard handoff at `.agents/explorer_m3_3/handoff.md` with complete proposed code for types, service, editor component, and screen integrations.
- Send a completion message to the parent orchestrator (conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226).

## 2026-09-22T18:51:44Z
You are Explorer 3 for Milestone 3 (Swedish Editor, Note Screens, & Firestore Service).
Your working directory is: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m3_3
Read your dispatch file at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m3_3/DISPATCH.md
Read the authoritative user request at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md
Read DESIGN.md at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/DESIGN.md
Read specs.md at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/specs.md
Read firestore.rules at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/firestore.rules
Read PROJECT.md at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md

Design:
- src/types/note.ts: Note domain interface.
- src/services/notesService.ts: Firestore operations compatible with security rules.
- src/components/SwedishEditor.tsx: Day One unbordered editor with 💡/❓/🏹, tag chips, visibility selector.
- app/note/edit.tsx: Auto-save, dirty back confirmation, PassagePicker + SwedishEditor integration.
- app/note/[id].tsx: Note detail viewer.
- app/(tabs)/notes.tsx: User notes list with Swedish indicators and FAB.
Write report to /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m3_3/report.md and handoff to /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m3_3/handoff.md.
When finished, send a completion message to the parent orchestrator (conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226).

