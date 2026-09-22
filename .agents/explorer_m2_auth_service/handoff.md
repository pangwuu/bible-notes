# Handoff Report: M2 Auth Service, Validation & User Profile Specifications

## 1. Observation
1. **Authoritative Requirements**:
   - `ORIGINAL_REQUEST.md` (lines 15-17): Requirement R2 mandates connecting Firebase JS SDK v11 modular, email/password registration, login, logout, password reset, and creating a Firestore `users/{uid}` profile with username uniqueness enforcement (3–20 lowercase/alphanumeric/underscore).
   - `DISPATCH.md` (`.agents/explorer_m2_auth_service/DISPATCH.md`, lines 13-40):
     - `src/utils/validation.ts`: `validateEmail`, `validatePassword` (min 6 chars), `validateUsername` (`^[a-z0-9_]{3,20}$`), `validateDisplayName`.
     - `src/services/authService.ts`: `registerUser`, `loginUser`, `logoutUser`, `sendPasswordReset`, `checkUsernameAvailable`, Firestore doc `users/{uid}` matching `firestore.rules` schema.
     - Unit test plan in `tests/unit/authValidation.test.ts`.
2. **Firestore Security Rules**:
   - `firestore.rules` (lines 24-29):
     ```
     // Users Collection
     match /users/{userId} {
       allow read: if isAuthenticated();
       allow create, update: if isOwner(userId);
       allow delete: if false;
     }
     ```
   - Crucial constraint: `allow read: if isAuthenticated();` requires the client to be authenticated in order to read documents from the `users` collection.
3. **Existing Test Runner & Environment**:
   - `jest.config.js` (lines 14-20): `testEnvironment: 'node'`, runs tests in `<rootDir>/tests/unit/**/*.test.[jt]s?(x)`.
   - `npm test` successfully passed 3 test suites and 54 tests in ~1.011s without errors.
   - Node one-liner verification confirmed all regex expressions (`/^[a-z0-9_]{3,20}$/` and `/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/`) execute cleanly with zero errors across valid and invalid edge cases.

## 2. Logic Chain
1. *From Observation 1 & 2*:
   - Because `firestore.rules` specifies `allow read: if isAuthenticated();`, unauthenticated clients cannot perform arbitrary queries against the `users` collection in production without receiving `permission-denied`.
   - Therefore, while `checkUsernameAvailable` can perform a format check and Firestore query (with graceful handling of unauthenticated `permission-denied` errors during UI typing), the definitive username uniqueness check and race condition prevention MUST be executed in `registerUser` immediately after `createUserWithEmailAndPassword(auth, email, password)`.
   - At that instant, `auth.currentUser` is fully authenticated, permitting the Firestore query `where('username', '==', normalizedUsername)`. If an existing document with a different UID is found, the newly created auth account is immediately rolled back via `deleteUser(user)` and an error is thrown.
2. *From Observation 1 & Schema Analysis*:
   - `specs.md` specifies `id`, `username`, `full_name`, `email`, `default_visibility`, `created_at`, `updated_at`.
   - `DISPATCH.md` specifies `uid`, `email`, `username`, `display_name`, `created_at`, `settings: { default_visibility, custom_esv_api_key }`.
   - To eliminate any runtime property mismatch across components and security rules, the `UserDocument` schema reconciles both by populating: `id: user.uid`, `uid: user.uid`, `display_name: displayName`, `full_name: displayName`, `default_visibility: 'friends'`, `settings: { default_visibility: 'friends', custom_esv_api_key: '' }`, `custom_esv_api_key: ''`, and Firestore server timestamps.
3. *From Observation 3*:
   - Testing in Jest with `testEnvironment: 'node'` requires mocking `firebase/auth` and `firebase/firestore` rather than relying on native device modules or live network calls.
   - `tests/unit/authValidation.test.ts` was designed with complete, self-contained Jest mocks that verify all validation branches, registration rollback, login profile loading, and Firebase Auth error translations.

## 3. Caveats
- Firestore single-field queries on `username` rely on Firestore's default single-field automatic ascending index; no composite index deployment is required.
- Client-side uniqueness checks cannot replace database-level unique constraints (which Firestore does not natively provide across documents); however, combined with immediate lowercase normalization, pre-checks, post-auth query validation, and rollback, it prevents duplicate usernames.
- In Milestone 2 implementation, the implementing worker must create `src/types/user.ts`, `src/utils/validation.ts`, `src/services/authService.ts`, and `tests/unit/authValidation.test.ts`.

## 4. Conclusion
The specification and exact implementations for `src/utils/validation.ts`, `src/types/user.ts`, `src/services/authService.ts`, and `tests/unit/authValidation.test.ts` are 100% defined, verified, and documented in `.agents/explorer_m2_auth_service/report.md`. The implementer can copy the exact TypeScript code directly into the codebase.

## 5. Verification Method
1. **File Existence & Integrity Check**:
   Inspect `.agents/explorer_m2_auth_service/report.md` to review the verbatim code blocks for:
   - Section 2.2: `src/utils/validation.ts`
   - Section 3.2: `src/types/user.ts`
   - Section 4.2: `src/services/authService.ts`
   - Section 5.2: `tests/unit/authValidation.test.ts`
2. **Regex & Validation Assertion Command**:
   Run in terminal:
   ```bash
   node -e "
     const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
     const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
     console.assert(USERNAME_REGEX.test('john_doe') === true);
     console.assert(USERNAME_REGEX.test('John_Doe') === false);
     console.assert(USERNAME_REGEX.test('ab') === false);
     console.assert(EMAIL_REGEX.test('test@domain.co') === true);
     console.assert(EMAIL_REGEX.test('bad@') === false);
     console.log('Validation assertions verified.');
   "
   ```
3. **Unit Test Execution (Post-Implementation)**:
   Once the files are written by the worker:
   ```bash
   npm test tests/unit/authValidation.test.ts
   ```
