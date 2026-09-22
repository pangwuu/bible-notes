# BRIEFING — 2026-09-22T14:50:00Z

## Mission
Investigate technical algorithms, Bible metadata, ordinal mapping, APIs, and Firebase modular v11 architecture for the Swedish Method Bible study notes mobile app.

## 🔒 My Identity
- Archetype: explorer
- Roles: Domain & Architecture Explorer, Synthesis
- Working directory: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_domain_firebase
- Original parent: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Milestone: Exploration & Architectural Design

## 🔒 Key Constraints
- Read-only investigation — do NOT implement source code in project root
- Write only to own folder: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_domain_firebase
- Must produce detailed report.md and 5-component handoff.md
- Communicate results back via send_message to parent orchestrator

## Current Parent
- Conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `DESIGN.md`, `specs.md`, `ORIGINAL_REQUEST.md`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`
  - Crossway ESV API endpoint live tests with token authentication
  - Public domain WEB API (`bible-api.com`) multi-chapter queries
  - Protestant Canon 66-book 31,102 verses distribution & ordinal conversion logic
  - Firebase modular v11 initialization and Auth persistence via AsyncStorage
  - Firestore security rules query implications for mutual friends & overlap detection
- **Key findings**:
  - Crossway ESV API strictly requires `Authorization: Token <key>` (Bearer results in 401 error)
  - 66 books, 1,189 chapters, exactly 31,102 verses (Gen 1:1 = 1, Rev 22:21 = 31,102)
  - Interval overlap formula `max(s1, s2) <= min(e1, e2)` seamlessly handles cross-chapter ranges without edge cases
  - Firestore rules require querying notes by `where('user_id', 'in', friendUids)` to avoid `permission-denied`
  - Firebase web app ID: `1:641152478914:web:d2e49874c858749015955b` in `bible-notes-sweedish`
- **Unexplored areas**: None. All core domain, API, and Firebase questions investigated and resolved.

## Key Decisions Made
- Confirmed ESV auth header format `Authorization: Token <key>`
- Designed deterministic friendship doc ID `${minUid}_${maxUid}`
- Designed in-memory overlap evaluation over scoped friend book notes with idempotent notification IDs `${noteId}_${friendUid}`
- Documented complete architecture report in `report.md`

## Artifact Index
- DISPATCH.md — Assignment and instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- report.md — Comprehensive domain & architecture report
- handoff.md — 5-component self-contained handoff report
