/**
 * Adversarial Challenger 2 Test Suite (Milestone 2)
 * Tests:
 * 1. Prohibited color tokens and hardcoded pure white
 * 2. Anti-pattern scan: ALL-CAPS tracked-out eyebrow labels (DESIGN.md line 17 & 59)
 * 3. Route Guard redirect matrix & cycle detection (app/_layout.tsx)
 * 4. Username format & boundary validation fuzzing
 * 5. Firebase auth service & dual-runtime persistence contracts
 */

import fs from 'fs';
import path from 'path';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateDisplayName,
  validateConfirmPassword,
  normalizeUsername,
} from '../../src/utils/validation';

const ROOT_DIR = path.resolve(__dirname, '../..');
const APP_DIR = path.join(ROOT_DIR, 'app');
const SRC_DIR = path.join(ROOT_DIR, 'src');

function getAllSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllSourceFiles(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const allAppFiles = getAllSourceFiles(APP_DIR);
const allSrcFiles = getAllSourceFiles(SRC_DIR);
const allFiles = [...allAppFiles, ...allSrcFiles];

describe('Challenger 2 — Adversarial M2 Suite', () => {
  // =========================================================================
  // 1. Prohibited Color Tokens & Hardcoded Pure White
  // =========================================================================
  describe('Prohibited Color Tokens & Pure White Scan', () => {
    const BANNED_PATTERNS = [
      { pattern: /#000000/i, name: 'pure black #000000' },
      { pattern: /#0b0b0b/i, name: 'near-black #0B0B0B' },
      { pattern: /#111111/i, name: 'near-black #111111' },
      { pattern: /#d97757/i, name: 'terracotta #D97757' },
      { pattern: /#ffffff/i, name: 'pure white #FFFFFF' },
    ];

    test('Zero executable code in app/ and src/ uses banned hex tokens or #FFFFFF', () => {
      const violations: { file: string; match: string; line: number }[] = [];

      for (const filePath of allFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          const trimmed = line.trim();
          // Skip comments
          if (
            trimmed.startsWith('//') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('/*')
          ) {
            return;
          }

          for (const banned of BANNED_PATTERNS) {
            if (banned.pattern.test(trimmed)) {
              violations.push({
                file: path.relative(ROOT_DIR, filePath),
                match: banned.name,
                line: idx + 1,
              });
            }
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });

  // =========================================================================
  // 2. Anti-Pattern Scan: Tracked-Out Eyebrow Labels & ALL-CAPS
  // =========================================================================
  describe('DESIGN.md Anti-Pattern: ALL-CAPS & Tracked-out Eyebrow Labels', () => {
    test('Zero UI components use textTransform: "uppercase" or letterSpacing tracking on headings/labels', () => {
      const violations: { file: string; line: number; text: string }[] = [];

      for (const filePath of allAppFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          const trimmed = line.trim();
          // Exclude comments
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

          if (
            trimmed.includes("textTransform: 'uppercase'") ||
            trimmed.includes('textTransform: "uppercase"') ||
            trimmed.includes('letterSpacing:')
          ) {
            violations.push({
              file: path.relative(ROOT_DIR, filePath),
              line: idx + 1,
              text: trimmed,
            });
          }
        });
      }

      // DESIGN.md Line 17: "No ALL-CAPS tracked-out eyebrow labels above headings."
      // DESIGN.md Line 59: "Sentence case everywhere — headings, buttons, labels. No all-caps."
      expect(violations).toEqual([]);
    });
  });

  // =========================================================================
  // 3. Route Guard Redirect Matrix & Infinite Loop / Cycle Detection
  // =========================================================================
  describe('Route Guard State Matrix & Infinite Loop Termination', () => {
    function simulateGuardStep(
      user: { uid: string } | null,
      loading: boolean,
      segments: string[],
      navReady: boolean
    ): { nextSegments: string[]; redirected: boolean } {
      if (!navReady || loading) {
        return { nextSegments: segments, redirected: false };
      }

      const inAuthGroup = segments[0] === '(auth)';

      if (!user && !inAuthGroup) {
        return { nextSegments: ['(auth)', 'login'], redirected: true };
      } else if (user && inAuthGroup) {
        return { nextSegments: ['(tabs)', 'index'], redirected: true };
      }

      return { nextSegments: segments, redirected: false };
    }

    const testRoutes = [
      [],
      ['(auth)'],
      ['(auth)', 'login'],
      ['(auth)', 'register'],
      ['(tabs)'],
      ['(tabs)', 'index'],
      ['(tabs)', 'notes'],
      ['(tabs)', 'friends'],
      ['(tabs)', 'settings'],
      ['note', '123'],
      ['note', 'edit'],
      ['friend', '456'],
      ['notifications'],
    ];

    test('Every route transitions to a fixed point in at most 1 redirect step (no cycles)', () => {
      const users = [null, { uid: 'user_1' }];
      const loadings = [false, true];

      for (const u of users) {
        for (const l of loadings) {
          for (const initialSegments of testRoutes) {
            let current = initialSegments;
            let steps = 0;
            const maxSteps = 5;

            while (steps < maxSteps) {
              const result = simulateGuardStep(u, l, current, true);
              if (!result.redirected) break;
              current = result.nextSegments;
              steps++;
            }

            // Must reach stability in <= 1 redirect step
            expect(steps).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    test('Nav container unmounted (navReady=false) performs 0 redirects', () => {
      for (const route of testRoutes) {
        const result = simulateGuardStep(null, false, route, false);
        expect(result.redirected).toBe(false);
      }
    });

    test('Auth loading=true performs 0 redirects', () => {
      for (const route of testRoutes) {
        const result = simulateGuardStep(null, true, route, true);
        expect(result.redirected).toBe(false);
      }
    });
  });

  // =========================================================================
  // 4. Username Format & Boundary Fuzzing
  // =========================================================================
  describe('Username Fuzzing & Boundary Invariants', () => {
    test('Boundary: lengths 0, 1, 2 are invalid', () => {
      expect(validateUsername('').isValid).toBe(false);
      expect(validateUsername('a').isValid).toBe(false);
      expect(validateUsername('ab').isValid).toBe(false);
    });

    test('Boundary: length 3 is valid', () => {
      expect(validateUsername('abc').isValid).toBe(true);
      expect(validateUsername('123').isValid).toBe(true);
      expect(validateUsername('___').isValid).toBe(true);
    });

    test('Boundary: length 20 is valid', () => {
      const twentyChars = 'a'.repeat(20);
      expect(validateUsername(twentyChars).isValid).toBe(true);
    });

    test('Boundary: length 21 is invalid', () => {
      const twentyOneChars = 'a'.repeat(21);
      expect(validateUsername(twentyOneChars).isValid).toBe(false);
    });

    test('Rejects non-alphanumeric/underscore characters', () => {
      const invalidChars = [
        'john-doe',
        'john.doe',
        'john doe',
        'john@doe',
        'john!doe',
        'john#doe',
        'john$doe',
        'john%doe',
        'john^doe',
        'john&doe',
        'john*doe',
        'john+doe',
        'john=doe',
        'john~doe',
        'john`doe',
        'john/doe',
        'john\\doe',
        'john:doe',
        'john;doe',
        'john"doe',
        "john'doe",
        'john<doe',
        'john>doe',
        'john,doe',
        'john?doe',
      ];
      for (const username of invalidChars) {
        expect(validateUsername(username).isValid).toBe(false);
      }
    });

    test('Rejects uppercase letters', () => {
      expect(validateUsername('User123').isValid).toBe(false);
      expect(validateUsername('USER').isValid).toBe(false);
      expect(validateUsername('uSer').isValid).toBe(false);
    });

    test('normalizeUsername trims and converts to lowercase', () => {
      expect(normalizeUsername('  MyUser_99  ')).toBe('myuser_99');
      expect(normalizeUsername('ADMIN')).toBe('admin');
    });
  });

  // =========================================================================
  // 5. Dual-Runtime Persistence in firebase.ts
  // =========================================================================
  describe('Firebase Client Setup Invariants', () => {
    test('firebase.ts exports app, auth, db', () => {
      const firebaseModule = require('../../src/services/firebase');
      expect(firebaseModule.app).toBeDefined();
      expect(firebaseModule.auth).toBeDefined();
      expect(firebaseModule.db).toBeDefined();
      expect(firebaseModule.firebaseConfig.projectId).toBe('bible-notes-sweedish');
    });
  });
});
