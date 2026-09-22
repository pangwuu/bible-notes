# DISPATCH — M1 Iteration 2 Explorer 1 (Bundler & Navigation Imports)

## Context
Milestone 1 Gate failed on Iteration 1 due to Expo SDK 57 Metro bundler compatibility with react-navigation imports.

## Error Output
`npx expo export --platform ios --no-minify` failed with:
`Error: As of SDK 56, expo-router is no longer compatible with react-navigation. For more information, see https://docs.expo.dev/router/migrate/sdk-55-to-56/.`
Cause: `@react-navigation/native` is directly imported in `app/_layout.tsx:7` and `src/constants/theme.ts:14`.

## Authoritative Files
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/reviewer_m1_2/report.md`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/challenger_m1_1/report.md`.

## Task
Recommend the exact code adjustments in `app/_layout.tsx`, `src/constants/theme.ts`, and `metro.config.js` to eliminate this error and ensure `npx expo export` bundles cleanly.

## Deliverables
- Write recommendation to `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_iter2_1/report.md`.
- Write handoff to `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_iter2_1/handoff.md`.
- Send completion message to parent orchestrator (`0a72a93f-be19-49c0-81f1-95f8e8f40226`).
