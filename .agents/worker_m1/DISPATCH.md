# DISPATCH — Milestone 1 Worker (Expo SDK 57 Skeleton & Theme)

## Role & Working Directory
- Role: Implementation Worker (`teamwork_preview_worker`)
- Working Directory: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1`

## Authoritative Request & Specifications
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` verbatim before starting.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`.
- Read Explorer Reports:
  - Scaffolding: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_scaffold/report.md`
  - Theme: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_theme/report.md` (and proposed artifacts `proposed_theme.ts`, `proposed_swedishMethod.ts`, `proposed_theme.test.ts`)
  - Navigation: `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_nav/report.md`

## File Ownership
You exclusively own and will create:
- Root config: `package.json`, `app.json`, `tsconfig.json`, `metro.config.js`, `babel.config.js`, `jest.config.js`, `.gitignore`
- Theme constants: `src/constants/theme.ts`, `src/constants/swedishMethod.ts`
- Components: `src/components/HeaderNotificationBell.tsx`
- Navigation layouts & screens:
  - `app/_layout.tsx`
  - `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`
  - `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/notes.tsx`, `app/(tabs)/friends.tsx`, `app/(tabs)/settings.tsx`
  - `app/note/[id].tsx`, `app/note/edit.tsx`
  - `app/friend/[id].tsx`
  - `app/notifications.tsx`
- Tests: `tests/unit/theme.test.ts`

## Tasks
1. Write the root config files (`package.json`, `app.json`, `tsconfig.json`, `metro.config.js`, `babel.config.js`, `jest.config.js`, `.gitignore`).
2. Run `npm install` to install all dependencies.
3. Create `src/constants/theme.ts` and `src/constants/swedishMethod.ts` following `DESIGN.md` strictly (warm dark base `#1A1816`, surface `#242019`, surfaceRaised `#2E2921`, text `#EDE7DD`, `#A39C8E`, `#6B655A`, hairline `#332E27`, Swedish accents, no generic shadows, radii 4/8/16).
4. Create `src/components/HeaderNotificationBell.tsx` with unread badge in `#B4789E`.
5. Create all layouts and screens under `app/` according to `explorer_m1_nav/report.md`.
6. Create `tests/unit/theme.test.ts` and verify theme tokens and anti-patterns.
7. Run tests (`npm test`) and type checking (`npx tsc --noEmit`). Ensure 100% pass with 0 errors.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverables
- Fully working, cleanly building Expo SDK 57 skeleton.
- Detailed implementation report in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1/report.md`.
- Self-contained handoff in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1/handoff.md` with build/test execution output.
- Send completion message to parent orchestrator (`0a72a93f-be19-49c0-81f1-95f8e8f40226`).

## 2026-09-22T14:57:31Z
You are the Implementation Worker for Milestone 1 (M1: Expo SDK 57 Skeleton & Theme).
Your working directory is: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1
Read your full dispatch instructions at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1/DISPATCH.md
Read the authoritative user request at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md
Read PROJECT.md at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md
Implement the full Expo SDK 57 scaffolding, dependencies, theme constants, navigation tree, and theme tests.
Run npm install, npm test, and npx tsc --noEmit.
Verify everything passes.
Write your report and handoff to /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/worker_m1/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

When finished, send a completion message to parent orchestrator (conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226).
