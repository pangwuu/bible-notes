# DISPATCH — Domain & Architecture Explorer

## Assignment
You are the Domain & Architecture Explorer for the Swedish Method Bible study notes mobile app project.

## Authoritative User Request
Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` verbatim before starting.

## Scope of Work
Investigate technical design, algorithms, and architectural patterns for:
1. Canonical Bible verse metadata & integer ordinal mapping:
   - Genesis 1:1 (ordinal 1) to Revelation 22:21 (ordinal 31,102).
   - How to structure the canon (66 books, chapter counts, verse counts per chapter).
   - Functions needed: `referenceToOrdinals(book, chapter, startVerse, endVerse) -> [start, end]`, `ordinalToReference(ordinal) -> {book, chapter, verse}`.
   - Exact overlap calculation math: intervals [s1, e1] and [s2, e2] overlap iff `max(s1, s2) <= min(e1, e2)`.
2. Bible API Client & Caching:
   - Crossway ESV API endpoint (`https://api.esv.org/v3/passage/text/`) with Bearer token `6182e9590f01e9ab567fcaad00c18a7ca0cfd4ba`.
   - Fallback public domain WEB API (`https://bible-api.com/`).
   - AsyncStorage caching strategy (keys, TTL/invalidation, fallback on network error).
   - Custom user ESV API key override stored in Firestore profile.
3. Firebase Client Architecture:
   - Firebase JS SDK modular v11 initialization with React Native AsyncStorage auth persistence.
   - Firestore schema & data access layer: `users`, `notes`, `friendships`, `notifications`.
   - Username uniqueness validation & transaction/query design.
   - Mutual friendship workflow (pending request, accept, reject, unfriend, shared notes query).
   - Overlap detection engine: when friend note shares range, write notification doc client-side.
4. Proposed modular code structure and separation of concerns.

## Deliverables
- Detailed report at `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_domain_firebase/report.md`
- Self-contained handoff at `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_domain_firebase/handoff.md`
- Send completion message to parent orchestrator.

## 2026-09-22T14:45:38Z
You are the Domain & Architecture Explorer for the Swedish Method Bible study notes mobile app project.
Your working directory is: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_domain_firebase
Read your full dispatch instructions at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_domain_firebase/DISPATCH.md
Read the authoritative user request at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md
Investigate technical algorithms and architectural patterns:
1. Canonical Bible verse metadata & integer ordinal mapping (Genesis 1:1 [1] to Revelation 22:21 [31,102]), range overlap math.
2. Crossway ESV API + fallback WEB API + AsyncStorage caching + user custom ESV API key override.
3. Firebase modular v11 setup, Firestore schema/rules alignment, username uniqueness, mutual friendship, overlap detection notifications.
Document your findings in /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_domain_firebase/report.md and create a self-contained /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_domain_firebase/handoff.md.
When finished, send a completion message to parent orchestrator (conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226).
