# DISPATCH — M2 Firebase Configuration Explorer

## Milestone: M2 — Firebase Client Integration & Authentication
## Assignment
You are the Firebase Configuration Explorer for Milestone 2.

## Authoritative Files
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` verbatim.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/firestore.rules`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_domain_firebase/report.md`.

## Investigation Scope
Specify the exact file contents and configuration for:
1. `src/services/firebase.ts`:
   - Modular Firebase v11 initialization (`initializeApp`, `initializeAuth`, `getFirestore`).
   - Integration with `@react-native-async-storage/async-storage` via `getReactNativePersistence(AsyncStorage)`.
   - Credentials for project `bible-notes-sweedish` (`apiKey: AIzaSyC_sKH5ZPgT0J6ZvvB5isV0KIDi8xBNleE`, `appId: 1:641152478914:web:d2e49874c858749015955b`, `authDomain: bible-notes-sweedish.firebaseapp.com`, `projectId: bible-notes-sweedish`, `storageBucket: bible-notes-sweedish.firebasestorage.app`).
2. Node & Jest environment compatibility: ensure tests can run without native module errors (e.g. AsyncStorage mock or Jest setup).
3. Export clean `app`, `auth`, `db` instances.

## Deliverables
- Write recommendation to `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_firebase/report.md`.
- Write handoff to `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_firebase/handoff.md`.
- Send completion message to parent orchestrator (`0a72a93f-be19-49c0-81f1-95f8e8f40226`).

## 2026-09-22T15:26:09Z
You are the Firebase Configuration Explorer for Milestone 2 (M2: Firebase Client & Auth).
Your working directory is: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_firebase
Read your dispatch file at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_firebase/DISPATCH.md
Read the authoritative user request at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md
Read PROJECT.md at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md
Specify exact implementation for src/services/firebase.ts with modular Firebase v11, AsyncStorage auth persistence, and live project credentials for bible-notes-sweedish.
Write your report to /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_firebase/report.md and handoff to /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_firebase/handoff.md.
When finished, send a completion message to parent orchestrator (conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226).
