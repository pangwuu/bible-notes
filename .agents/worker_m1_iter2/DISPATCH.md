# DISPATCH — Milestone 1 Iteration 2 Worker (Remediation & Build Fix)

## Role & Working Directory
- Role: Implementation Worker (`teamwork_preview_worker`)
- Working Directory: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1_iter2`

## Authoritative Request & Specifications
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`.
- Read Explorer Reports:
  - `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_iter2_1/report.md`
  - `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_iter2_2/report.md`
  - `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_iter2_3/report.md` (and patch `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_iter2_3/build_export_fix.patch`)

## File Ownership
You exclusively own and will edit:
- `metro.config.js`: Add `process.env.EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK = '1';`
- `app.json`: Set `"platforms": ["ios", "android"]` and remove web configuration block
- `src/components/HeaderNotificationBell.tsx`: Replace `#FFFFFF` on line 55 with `colors.bgBase` (`#1A1816`)
- `tests/unit/adversarial.test.ts`: Harden the `#FFFFFF` test to assert `expect(whiteUsages).toEqual([])`

## Tasks
1. Apply the fixes to `metro.config.js`, `app.json`, `HeaderNotificationBell.tsx`, and `adversarial.test.ts`.
2. Run `npm test` and verify all tests pass (54/54).
3. Run `npm run typecheck` (`npx tsc --noEmit`) and verify 0 errors.
4. Run `npx expo export -p ios --no-minify` and `npx expo export` to verify clean build/bundle with exit code 0.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverables
- Fully working, cleanly bundling Expo SDK 57 skeleton.
- Detailed implementation report in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1_iter2/report.md`.
- Self-contained handoff in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1_iter2/handoff.md` with build/test execution output.
- Send completion message to parent orchestrator (`0a72a93f-be19-49c0-81f1-95f8e8f40226`).

## 2026-09-22T15:20:38Z
You are the Implementation Worker for Milestone 1 Iteration 2 (Remediation & Build Fix).
Your working directory is: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1_iter2
Read your dispatch file at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1_iter2/DISPATCH.md
Read the authoritative user request at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md
Read PROJECT.md at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md
Apply the fixes to metro.config.js, app.json, HeaderNotificationBell.tsx, and adversarial.test.ts.
Verify with:
- npm test (all tests pass)
- npm run typecheck (0 errors)
- npx expo export -p ios --no-minify (exit 0)
- npx expo export (exit 0)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write report to /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1_iter2/report.md and handoff to /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1_iter2/handoff.md.
When finished, send a completion message to parent orchestrator (conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226).

