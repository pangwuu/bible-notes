# DISPATCH — M2 Auth Service & Validation Explorer

## Milestone: M2 — Firebase Client Integration & Authentication
## Assignment
You are the Auth Service & Validation Explorer for Milestone 2.

## Authoritative Files
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/ORIGINAL_REQUEST.md` verbatim.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/orchestrator_1/PROJECT.md`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/firestore.rules`.
- Read `/Users/johnnywu/Desktop/My-small-projects/bible_notes/specs.md`.

## Investigation Scope
Specify the exact file contents and design for:
1. `src/utils/validation.ts`:
   - `validateEmail(email: string): boolean`
   - `validatePassword(password: string): { isValid: boolean, error?: string }` (minimum 6 characters)
   - `validateUsername(username: string): { isValid: boolean, error?: string }` (3–20 lowercase/alphanumeric/underscore: `^[a-z0-9_]{3,20}$`)
   - `validateDisplayName(name: string): { isValid: boolean, error?: string }`
2. `src/services/authService.ts`:
   - `registerUser(email, password, username, displayName)`:
     - Check username uniqueness (query `users` where `username == normalizedUsername`).
     - Create user with `createUserWithEmailAndPassword`.
     - Create Firestore doc `users/{uid}` matching `firestore.rules` schema:
       ```typescript
       {
         uid: string,
         email: string,
         username: string, // lowercase
         display_name: string,
         created_at: Timestamp | string,
         settings?: { default_visibility?: 'private' | 'friends', custom_esv_api_key?: string }
       }
       ```
     - Update Firebase Auth profile `displayName`.
   - `loginUser(email, password)`: `signInWithEmailAndPassword`.
   - `logoutUser()`: `signOut`.
   - `sendPasswordReset(email)`: `sendPasswordResetEmail`.
   - `checkUsernameAvailable(username)`: Query Firestore for existing username.
3. Unit test plan for validation and auth services in `tests/unit/authValidation.test.ts`.

## Deliverables
- Write recommendation to `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_service/report.md`.
- Write handoff to `/Users/johnnywu/Desktop/My-small-projects/bible_notes/.agents/explorer_m2_auth_service/handoff.md`.
- Send completion message to parent orchestrator (`0a72a93f-be19-49c0-81f1-95f8e8f40226`).
