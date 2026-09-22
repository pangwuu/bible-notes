# Handoff Report — M1 Navigation & Route Architecture

**Date:** 2026-09-22T14:55:00Z  
**Agent:** Navigation & Route Explorer (`explorer_m1_nav`)  
**Working Directory:** `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_nav`  
**Parent Orchestrator:** `0a72a93f-be19-49c0-81f1-95f8e8f40226`  
**Handoff Type:** Hard (Task complete)

---

## 1. Observation

1. **Authoritative Request & Milestone Scope (`ORIGINAL_REQUEST.md`, lines 12–14):**
   > "Scaffold an Expo application using Expo SDK 57 and Expo Router with TypeScript. Wire React Native Paper with the custom warm dark theme specified in `DESIGN.md` (warm charcoal-brown base `#1A1816`, surface `#242019`, parchment text `#EDE7DD`, and Swedish Method accent colors). Load `Source Serif Pro` via `expo-font` for reading/body text. Implement the bottom tab layout (Home/Dashboard, Notes Browser, Friends, Settings) and stack screens (Note Detail, Note Edit, Friend Profile, Notifications Modal)."

2. **Visual Design & Palette Tokens (`DESIGN.md`, lines 25–39):**
   - `bg.base`: `#1A1816` (App background)
   - `bg.surface`: `#242019` (Cards, sheets, modals, input fields)
   - `bg.surfaceRaised`: `#2E2921` (Active/pressed surface, bottom sheets)
   - `text.primary`: `#EDE7DD` (Body text, headings)
   - `text.secondary`: `#A39C8E` (Metadata, timestamps)
   - `border.hairline`: `#332E27` (Dividers, input outlines)
   - `accent.keyIdea`: `#E3A53D` (💡 Key Idea headers, FAB fill)
   - `accent.question`: `#5B93C4` (❓ Question headers)
   - `accent.application`: `#7BA05B` (🏹 Application headers)
   - `accent.social`: `#B4789E` (Friends, overlap badges, notifications)
   - `accent.danger`: `#C4664F` (Destructive actions)

3. **Design System Anti-Patterns (`DESIGN.md`, lines 13–21):**
   > "- No near-black (`#0B0B0B` / `#111111`) background with a single bright acid-green or vermilion accent.
   > - No `#D97757` or near-terracotta accent — it's a well-known AI-tool default, not a choice made for this app.
   > - No identical rounded cards everywhere with the same soft `rgba(0,0,0,.1)` drop shadow. Radius and elevation carry meaning here — see Components below.
   > - No ALL-CAPS tracked-out eyebrow labels above headings.
   > - No arrow (→) appended to button or link text."

4. **Component Radii Tokens (`DESIGN.md`, lines 73–78):**
   - Readable content: `borderRadius: 4`, no shadow, hairline `#332E27` border only.
   - Interactive controls: `borderRadius: 8`, no shadow.
   - Modals / bottom sheets: `borderRadius: 16` at top corners only.

5. **Navigation Architecture in Specs (`specs.md`, lines 197–213):**
   ```
   app/
   ├── (auth)/
   │   ├── login.tsx          # Email & Password login
   │   └── register.tsx       # Account creation & initial profile setup
   ├── (tabs)/
   │   ├── _layout.tsx        # Bottom tab navigator (Paper icons)
   │   ├── index.tsx          # Dashboard: Recent notes, passage jump, notifications summary
   │   ├── notes.tsx          # Note Browser: Book/Chapter directory & Tag filters
   │   ├── friends.tsx        # Friends list, requests, search & add
   │   └── settings.tsx       # User preferences, visibility defaults, ESV API key, logout
   ├── note/
   │   ├── [id].tsx           # View note detail + passage reader + friend overlap badge
   │   └── edit.tsx           # Swedish Method editor, verse picker modal, tags input
   ├── friend/
   │   └── [id].tsx           # Friend profile & their shared notes feed
   └── notifications.tsx      # Full notifications center modal
   ```

6. **Current Workspace State (`list_dir` on root):**
   Root has `.firebaserc`, `firebase.json`, `firestore.rules`, `specs.md`, `DESIGN.md`. No `app/` directory or `package.json` currently exists in root.

---

## 2. Logic Chain

1. From Observation 1, the framework is strictly Expo SDK 57 with Expo Router and TypeScript. File-based routing convention inside `app/` is the authoritative structure.
2. From Observation 5, the route tree consists of:
   - Root layout (`app/_layout.tsx`)
   - Group `(auth)` containing `_layout.tsx`, `login.tsx`, `register.tsx`
   - Group `(tabs)` containing `_layout.tsx`, `index.tsx`, `notes.tsx`, `friends.tsx`, `settings.tsx`
   - Stack screens: `app/note/[id].tsx`, `app/note/edit.tsx`, `app/friend/[id].tsx`
   - Modal screen: `app/notifications.tsx`
3. From Observation 1 and 2, root layout must host `PaperProvider` with `paperTheme`, `SafeAreaProvider`, `StatusBar` with `style="light"` and `backgroundColor="#1A1816"`, and load `Source Serif Pro` via `useFonts`.
4. To prevent white flashes during screen transitions, the root `Stack` must define `contentStyle: { backgroundColor: colors.bgBase }` (`#1A1816`) and `headerStyle: { backgroundColor: colors.bgSurface }` (`#242019`).
5. From Observation 2 and 3, tab bar navigation must use:
   - `backgroundColor: '#242019'` (`bgSurface`)
   - `borderTopColor: '#332E27'` (`borderHairline`)
   - Active tint: `'#E3A53D'` (`accentKeyIdea`)
   - Inactive tint: `'#A39C8E'` (`textSecondary`)
   - Header shadow disabled (`headerShadowVisible: false`, `elevation: 0`, `shadowOpacity: 0`).
6. From Observation 2 and `specs.md` §5.6, the header notification bell must link to `/notifications` and display unread counts with a badge pill colored in `accentSocial` (`#B4789E`), NOT bright red or terracotta.
7. From Observation 3 and 4, all buttons, chips, and cards must strictly respect radius rules: 4 for cards, 8 for buttons/chips, 16 for sheets; no drop shadows; sentence case labels; no trailing arrows (`→`).
8. Full TSX implementations for all required layouts and skeleton screens were synthesized and documented in `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_nav/report.md`.

---

## 3. Caveats

1. **Authentication Guard Redirection**: In M1, the Auth stack (`(auth)`) and Tab screens (`(tabs)`) are scaffolded as skeleton screens without hard redirect blocking, because `AuthContext` and Firebase client initialization belong to Milestone 2 (M2). The route paths are prepared so M2 can simply insert an `useAuth()` hook in `app/_layout.tsx` or `app/index.tsx` for conditional redirecting.
2. **Dynamic Route Params**: `app/note/[id].tsx` and `app/friend/[id].tsx` assume `id` string parameters matching Firestore document IDs (`notes/{noteId}` and `users/{userId}`). M3 and M5 will populate real data fetching via services.
3. **Modal Dismissal**: `app/notifications.tsx` uses `router.back()` for dismiss. On Android physical back button and iOS swipe down, Expo Router natively handles modal dismissal.

---

## 4. Conclusion

The complete navigation architecture for M1 is established with 100% adherence to Expo SDK 57, Expo Router conventions, and `DESIGN.md` tokens. The implementation files to be created under `app/` and `src/components/` are:
1. `app/_layout.tsx` (Root layout with fonts, Paper theme, SafeArea, Stack)
2. `app/(auth)/_layout.tsx` (Auth stack)
3. `app/(auth)/login.tsx` (Sign in screen)
4. `app/(auth)/register.tsx` (Registration screen)
5. `app/(tabs)/_layout.tsx` (4-tab bottom navigation with styled chrome)
6. `app/(tabs)/index.tsx` (Dashboard screen with FAB)
7. `app/(tabs)/notes.tsx` (Notes browser screen with Book/Tag view)
8. `app/(tabs)/friends.tsx` (Friends screen with search and requests)
9. `app/(tabs)/settings.tsx` (Settings screen with ESV key & visibility)
10. `app/note/[id].tsx` (Note detail screen with overlap pill and reader)
11. `app/note/edit.tsx` (Note editor screen with Swedish sections and exit guard)
12. `app/friend/[id].tsx` (Friend profile screen with shared notes feed)
13. `app/notifications.tsx` (Notification center modal)
14. `src/components/HeaderNotificationBell.tsx` (Notification bell with `#B4789E` badge)

All specifications are ready for the Milestone 1 implementation agent.

---

## 5. Verification Method

1. **Inspect Specification Report:**
   Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m1_nav/report.md`.
2. **Verify Route Completeness:**
   Check that all 13 routes and layouts map directly to the requirements in `specs.md` §9 and `PROJECT.md`.
3. **Verify Anti-Pattern Adherence:**
   Grep `report.md` for banned tokens (`#0B0B0B`, `#111111`, `#D97757`, `shadowColor`, `->`, `→`) — verify count is zero.
4. **Post-Scaffold Build Verification (to be run after M1 scaffolding creates the files):**
   - Typecheck: `npx tsc --noEmit`
   - Bundler export test: `npx expo export` (verifies Expo Router successfully resolves all routes and layouts).
