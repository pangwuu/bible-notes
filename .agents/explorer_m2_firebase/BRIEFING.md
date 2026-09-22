# BRIEFING — 2026-09-22T15:34:00Z

## Mission
Specify the exact, production-ready, Node/Jest-compatible implementation of `src/services/firebase.ts` with modular Firebase v11, AsyncStorage persistence, and project credentials for `bible-notes-sweedish`.

## 🔒 My Identity
- Archetype: explorer
- Roles: Firebase Configuration Explorer, Synthesizer
- Working directory: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_firebase
- Original parent: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Milestone: M2 — Firebase Client & Auth

## 🔒 Key Constraints
- Read-only investigation — do NOT directly modify application source code (only write to our own `.agents/explorer_m2_firebase` directory)
- Specify exact implementation for `src/services/firebase.ts` with modular Firebase v11, AsyncStorage auth persistence, and live project credentials for `bible-notes-sweedish`
- Ensure Node & Jest test runner compatibility without native module failures
- Cleanly export `app`, `auth`, `db` instances with idempotent initialization
- Write comprehensive `report.md` and standard 5-component `handoff.md`
- Send completion message to parent orchestrator (`0a72a93f-be19-49c0-81f1-95f8e8f40226`)

## Current Parent
- Conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226
- Updated: 2026-09-22T15:34:00Z

## Investigation State
- **Explored paths**: `PROJECT.md`, `ORIGINAL_REQUEST.md`, `firestore.rules`, `explorer_domain_firebase/report.md`, `package.json`, `jest.config.js`, `node_modules/firebase`, `node_modules/@firebase/auth`, `node_modules/@react-native-async-storage/async-storage`.
- **Key findings**:
  1. `firebase/auth` root types omit `getReactNativePersistence` (which is in `dist/rn/index.rn.d.ts`). Requires companion declaration in `src/types/firebase.d.ts` and `// @ts-ignore`.
  2. In Node/Jest (`testEnvironment: 'node'`), `getReactNativePersistence` is undefined. Unconditional call throws TypeError. Guarding with `typeof getReactNativePersistence === 'function'` allows seamless mobile persistence AND mock-free Jest test suite execution.
  3. `@react-native-async-storage/async-storage` v3.1.1 mock path is `require('@react-native-async-storage/async-storage/jest')`.
  4. Idempotent singleton initialization prevents duplicate app and already-initialized auth errors on Fast Refresh.
- **Unexplored areas**: None. Implementation fully verified in Node, Jest, and TypeScript.

## Key Decisions Made
- Guard `getReactNativePersistence` with runtime check `typeof getReactNativePersistence === 'function' ? getReactNativePersistence(AsyncStorage) : undefined` to enable dual-runtime compatibility (Expo native vs Jest node runner).
- Supply companion `src/types/firebase.d.ts` for clean TypeScript compilation under `tsc --noEmit`.
- Finalized exact contents for `src/services/firebase.ts`, `report.md`, and `handoff.md`.

## Artifact Index
- `.agents/explorer_m2_firebase/report.md` — Full technical analysis and code specification
- `.agents/explorer_m2_firebase/handoff.md` — 5-component handoff report for implementer
- `.agents/explorer_m2_firebase/progress.md` — Liveness heartbeat and milestone tracking
- `.agents/explorer_m2_firebase/DISPATCH.md` — Log of incoming dispatches and instructions
