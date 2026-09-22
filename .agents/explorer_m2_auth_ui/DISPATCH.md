# DISPATCH — M2 Auth Context & UI Explorer

## Milestone: M2 — Firebase Client Integration & Authentication
## Assignment
You are the Auth Context & UI Explorer for Milestone 2.

## Authoritative Files
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` verbatim.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/DESIGN.md`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/specs.md`.

## Investigation Scope
Specify the exact implementation for:
1. `src/context/AuthContext.tsx`:
   - State: `user: User | null`, `profile: UserProfile | null`, `loading: boolean`.
   - Listener: `onAuthStateChanged(auth, async (firebaseUser) => { ... })`. When user logs in, fetch doc `users/{uid}`.
   - Provider: `<AuthProvider>{children}</AuthProvider>`, hook `useAuth()`.
2. Auth Route Protection:
   - In `app/_layout.tsx`: Use `useAuth()` and `useSegments()` to automatically redirect unauthenticated users to `/(auth)/login`, and authenticated users away from `(auth)` to `/(tabs)`.
3. Screen Wiring:
   - `app/(auth)/login.tsx`: Email & password inputs, loading indicator, error message banners, link to register, password reset trigger.
   - `app/(auth)/register.tsx`: Display name, username (with live availability check / format validation), email, password, confirm password, submit button.
   - `app/(tabs)/settings.tsx`: Display user email, username, display name, and Logout button with confirmation dialog.

## Deliverables
- Write recommendation to `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_ui/report.md`.
- Write handoff to `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_ui/handoff.md`.

## 2026-09-22T15:27:00Z
You are the Auth Context & UI Explorer for Milestone 2 (M2: Firebase Client & Auth).
Your working directory is: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_ui
Read your dispatch file at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_ui/DISPATCH.md
Read the authoritative user request at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md
Read PROJECT.md at: /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md
Read DESIGN.md and specs.md.
Specify exact implementation for src/context/AuthContext.tsx, auth protection redirects in app/_layout.tsx, app/(auth)/login.tsx, app/(auth)/register.tsx, and app/(tabs)/settings.tsx.
Write your report to /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_ui/report.md and handoff to /Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_ui/handoff.md.
When finished, send a completion message to parent orchestrator (conversation ID: 0a72a93f-be19-49c0-81f1-95f8e8f40226).
