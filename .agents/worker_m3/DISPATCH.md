# DISPATCH — Milestone 3 Implementation Worker

## Mission
You are the Implementation Worker for Milestone 3 (R3: Swedish Method Note Editor & Domain Utilities).
Implement the complete domain, components, service, and screens:
1. `src/constants/bibleData.ts` (from `.agents/explorer_m3_1/handoff.md`)
2. `src/utils/bibleOrdinals.ts` (from `.agents/explorer_m3_1/handoff.md`)
3. `src/types/note.ts` (from `.agents/explorer_m3_3/handoff.md`)
4. `src/services/notesService.ts` (from `.agents/explorer_m3_3/handoff.md`)
5. `src/components/PassagePicker.tsx` (from `.agents/explorer_m3_2/handoff.md` and `.agents/explorer_m3_2/proposed_PassagePicker.tsx`)
6. `src/components/SwedishEditor.tsx` (from `.agents/explorer_m3_3/handoff.md`)
7. `app/note/edit.tsx` (from `.agents/explorer_m3_3/handoff.md`)
8. `app/note/[id].tsx` (from `.agents/explorer_m3_3/handoff.md`)
9. `app/(tabs)/notes.tsx` (from `.agents/explorer_m3_3/handoff.md`)
10. Unit tests for ordinals & notes: e.g. `tests/unit/bibleOrdinals.test.ts` and `tests/unit/notesService.test.ts`.

## Input Files
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` (authoritative user request)
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/DESIGN.md`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/specs.md`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/firestore.rules`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m3_1/handoff.md`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m3_2/handoff.md`
- `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m3_3/handoff.md`

## Ownership & Boundaries
You exclusively own:
- `src/constants/bibleData.ts`
- `src/utils/bibleOrdinals.ts`
- `src/types/note.ts`
- `src/services/notesService.ts`
- `src/components/PassagePicker.tsx`
- `src/components/SwedishEditor.tsx`
- `app/note/edit.tsx`
- `app/note/[id].tsx`
- `app/(tabs)/notes.tsx`
- `tests/unit/bibleOrdinals.test.ts`
- `tests/unit/notesService.test.ts`

## Design & Negative Constraints
- Zero banned colors: `#000000`, `#0B0B0B`, `#111111`, `#D97757`.
- Zero generic drop shadows (`rgba(0,0,0,0.1)`, `elevation`).
- Zero ALL-CAPS tracked labels. Sentence case everywhere.
- Zero trailing arrows (`→`).
- Radii: content 4px, controls 8px, modal sheet top 16px.
- Typography: `SourceSerifPro` for body / reading text.

## Verification Requirements
You MUST run:
1. `npm test` — all test suites must pass (all existing 12 suites + new unit tests).
2. `npm run typecheck` — 0 errors.
3. `npx expo export -p ios --no-minify` — exit 0 with Hermes bytecode.

## Mandatory Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverables
- Write detailed implementation report to `.agents/worker_m3/report.md`
- Write handoff to `.agents/worker_m3/handoff.md` with explicit Verdict `DONE`.
- Send a completion message to the parent orchestrator (conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226).

## 2026-09-23T05:01:02Z
You are the Implementation Worker for Milestone 3 (R3: Swedish Method Note Editor & Domain Utilities).
Your working directory is: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m3

