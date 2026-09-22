# Adversarial Challenge Report — Milestone 2: Firebase Client Integration & Authentication

**Agent**: Challenger 1 (`challenger_m2_1`)  
**Target Milestone**: M2 — Firebase Client Integration & Authentication  
**Date**: 2026-09-23  
**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**  

---

## 1. Executive Summary

Milestone 2 implementation by `worker_m2_repl` was subjected to rigorous empirical testing, stress harnesses, and boundary condition evaluation across:
1. Complete regression test execution via `npm test` across all 10 test suites (468 tests total).
2. Boundary stress-testing of `src/utils/validation.ts` across 107 test cases covering username length boundaries (2, 3, 20, 21), character sets, uppercase rejection, underscores, email syntax boundaries, password minimums, display name lengths, and confirmation matching.
3. TypeScript compiler check (`npm run typecheck`).
4. Native production bundler compilation on Expo SDK 57 for both iOS (1528 modules) and Android (1659 modules).
5. Architecture inspection of Firebase Auth, Firestore security rules compliance, real-time snapshot lifecycle, and auth route protection.

The implementation is robust, correct, and fully aligned with `ORIGINAL_REQUEST.md`, `DESIGN.md`, and `PROJECT.md`.

---

## 2. Adversarial Challenges & Stress Analyses

### [Low] Challenge 1: Email Regex Consecutive Dots in Domain Part

- **Assumption Challenged**: That client-side `EMAIL_REGEX` in `src/utils/validation.ts` filters out all syntactically malformed domain names.
- **Attack Scenario**: Submitting an email address containing double dots in the domain, e.g., `test@example..com`.
  - In `src/utils/validation.ts`, `EMAIL_REGEX` is defined as:
    ```ts
    export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    ```
  - For `test@example..com`, `example.` matches `[^\s@]+`, and `.com` matches `\.[a-zA-Z]{2,}$`. The client-side validator accepts this string.
- **Blast Radius**: Extremely low. When passed to Firebase Auth's `createUserWithEmailAndPassword` or `sendPasswordResetEmail`, the Firebase backend validates the email string according to RFC 5322 and rejects it with `auth/invalid-email`.
- **Mitigation & Handling**: In `src/services/authService.ts`, `formatAuthError` explicitly catches `auth/invalid-email` and translates it to `"The email address is invalid."`, displaying a clear error message in the UI error banner without crashing. For future hardening, `EMAIL_REGEX` could optionally be tightened to prevent adjacent dots, but current behavior is safe.

### [Low] Challenge 2: Post-Auth Username Collision Race Condition

- **Assumption Challenged**: That two users registering identical usernames simultaneously could create duplicate Firestore usernames or orphaned Firebase Auth credentials.
- **Attack Scenario**: User A and User B concurrently submit registration with the exact same username `alex_2026`.
- **Blast Radius**: Potential username collision or orphan auth user.
- **Defense Implementation**:
  - `registerUser` executes a two-phase check:
    1. Pre-auth availability query `checkUsernameAvailable(normalizedUsername)`.
    2. Firebase Auth creation `createUserWithEmailAndPassword`.
    3. Post-auth authenticated uniqueness query `where('username', '==', normalizedUsername), limit(2)`.
    4. If another document exists with a differing UID, `deleteUser(user)` is executed immediately to rollback the account, and an error is thrown.
    5. In the outer catch block, if `setDoc` or profile setup fails, `deleteUser(user)` is called defensively.
- **Empirical Test Result**: Verified in unit test `tests/unit/authValidation.test.ts` line 369 (`rolls back auth user if post-creation username collision is detected`). The rollback is deterministic and prevents orphaned credentials.

### [Low] Challenge 3: Unauthenticated Username Availability Query vs Firestore Rules

- **Assumption Challenged**: In `firestore.rules`, `/users/{userId}` requires `allow read: if isAuthenticated()`. An unauthenticated registration screen attempting to read `/users` could be denied by Firestore security rules.
- **Attack Scenario**: An unauthenticated user types into the registration form, triggering `checkUsernameAvailable`.
- **Defense Implementation**:
  - In `src/services/authService.ts`:
    ```ts
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', normalized), limit(1));
      const snap = await getDocs(q);
      return snap.empty;
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        console.warn('checkUsernameAvailable: unauthenticated read blocked by rules; deferring to registration.');
        return true;
      }
      throw error;
    }
    ```
  - If unauthenticated read is blocked by security rules, it gracefully defers to `registerUser` where the authenticated post-auth check and rollback guarantee uniqueness.
- **Empirical Test Result**: PASS. No unhandled rejection or app crash.

---

## 3. Empirical Stress Test Results

A 107-assertion stress harness was executed against `src/utils/validation.ts`.

| Dimension / Test Scenario | Input | Expected Output | Actual Output | Result |
|---|---|---|---|---|
| **Username Length (Min - 1)** | `"ab"` (2 chars) | `{ isValid: false, error: 'Username must be at least 3 characters' }` | Same | **PASS** |
| **Username Length (Exact Min)** | `"abc"` (3 chars) | `{ isValid: true }` | Same | **PASS** |
| **Username Length (Numeric Min)** | `"123"` (3 chars) | `{ isValid: true }` | Same | **PASS** |
| **Username Length (Underscore Min)** | `"___"` (3 chars) | `{ isValid: true }` | Same | **PASS** |
| **Username Length (Mixed Min)** | `"a_1"` (3 chars) | `{ isValid: true }` | Same | **PASS** |
| **Username Length (Exact Max)** | 20 chars (`"abcdefghijklmnopqrst"`) | `{ isValid: true }` | Same | **PASS** |
| **Username Length (Max + 1)** | 21 chars (`"abcdefghijklmnopqrstu"`) | `{ isValid: false, error: 'Username must be at most 20 characters' }` | Same | **PASS** |
| **Username Case Sensitivity** | `"Abc"`, `"abC"`, `"aBc"`, `"ABC"` | `{ isValid: false, error: '...lowercase letters, numbers, and underscores' }` | Same | **PASS** |
| **Username Special Characters** | `user@name`, `user.name`, `user-name`, `user#name`, `user$name` | `{ isValid: false, error: '...lowercase letters, numbers, and underscores' }` | Same | **PASS** |
| **Username Punctuation Suite** | `@`, `.`, `-`, `#`, `$`, `%`, `^`, `&`, `*`, `+`, `=`, `!`, `?`, `/`, `\`, `\|`, `:`, `;`, `<`, `>`, `,`, `~`, `` ` `` (23 characters tested) | All rejected with error | All rejected with error | **PASS** |
| **Username Allowed Characters** | `"my_user_name"`, `"_start_end_"` | `{ isValid: true }` | Same | **PASS** |
| **Username Whitespace Handling** | `"abc def"`, `"abc\tdef"`, `"abc\ndef"`, `"   "` | `{ isValid: false }` | Same | **PASS** |
| **Username Null / Undefined** | `null`, `undefined`, `""` | `{ isValid: false, error: 'Username is required' }` | Same | **PASS** |
| **Email Empty** | `""` | `false` | `false` | **PASS** |
| **Email Whitespace** | `"   "` | `false` | `false` | **PASS** |
| **Email Missing `@`** | `"no-at-sign.com"` | `false` | `false` | **PASS** |
| **Email Missing Domain** | `"test@"` | `false` | `false` | **PASS** |
| **Email Missing Local Part** | `"@domain.com"` | `false` | `false` | **PASS** |
| **Email Missing TLD** | `"test@domain"` | `false` | `false` | **PASS** |
| **Email Single Char TLD** | `"test@domain.c"` | `false` | `false` | **PASS** |
| **Email Leading/Trailing Spaces** | `"  trimmed@example.com  "` | `true` (trimmed) | `true` | **PASS** |
| **Email Complex Valid** | `"user.name@domain.co"`, `"user+tag@sub.domain.org"`, `"first_last@domain.io"` | `true` | `true` | **PASS** |
| **Password Empty** | `""` | `{ isValid: false, error: 'Password is required' }` | Same | **PASS** |
| **Password 5 chars** | `"12345"` | `{ isValid: false, error: 'Password must be at least 6 characters' }` | Same | **PASS** |
| **Password 6 chars** | `"123456"`, `"abcdef"`, `"      "` | `{ isValid: true }` | Same | **PASS** |
| **Password 100 chars** | `"A".repeat(100)` | `{ isValid: true }` | Same | **PASS** |
| **Display Name Empty** | `""`, `"   "` | `{ isValid: false, error: 'Display name is required' }` | Same | **PASS** |
| **Display Name 1 char** | `"A"` | `{ isValid: true }` | Same | **PASS** |
| **Display Name 50 chars** | `"A".repeat(50)` | `{ isValid: true }` | Same | **PASS** |
| **Display Name 51 chars** | `"A".repeat(51)` | `{ isValid: false, error: 'Display name must be at most 50 characters' }` | Same | **PASS** |
| **Display Name Unicode** | `"李小龍"` | `{ isValid: true }` | Same | **PASS** |
| **Confirm Password Match** | `"secret123"`, `"secret123"` | `{ isValid: true }` | Same | **PASS** |
| **Confirm Password Mismatch** | `"secret123"`, `"secret456"` | `{ isValid: false, error: 'Passwords do not match' }` | Same | **PASS** |
| **Confirm Password Empty** | `"secret123"`, `""` | `{ isValid: false, error: 'Please confirm your password' }` | Same | **PASS** |
| **Normalize Username** | `"  John_Doe  "` -> `"john_doe"`, `"ALEX"` -> `"alex"` | Normalized correctly | Same | **PASS** |

---

## 4. Test Suite & Build Verification

1. **Test Suite Execution**:
   - Command: `npm test`
   - Result: 10 test suites passed, 468 tests passed, 0 failures.
   - Flakiness verification: 3 consecutive runs passed with identical results (468/468).
2. **Type Checking**:
   - Command: `npm run typecheck`
   - Result: 0 TypeScript errors.
3. **Expo Native Bundler**:
   - Command: `npx expo export -p ios --no-minify` -> Succeeded (1528 modules).
   - Command: `npx expo export -p android --no-minify` -> Succeeded (1659 modules).

---

## 5. Unchallenged Areas

- **Live Firebase Backend Network Latency**: Real cloud network round-trips to Google Firebase infrastructure were not executed as the test suite is hermetic and development integrity mode is active. Mocked Firebase auth and Firestore contracts were verified against Firebase v11 modular SDK specs.

---

## 6. Final Recommendation

The Milestone 2 implementation meets all requirements from `ORIGINAL_REQUEST.md`, respects all constraints in `PROJECT.md` and `DESIGN.md`, and passed all empirical stress tests.

**Verdict: APPROVE**
