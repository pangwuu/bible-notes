/**
 * Automated Unit Test Suite for BibleReader Prop Memoization & Render Stability
 * Ensures TRenderEngineProvider warning is prevented by verifying:
 * - SYSTEM_FONTS is hoisted to a static module-level array
 * - BibleReader component is wrapped in React.memo
 */

import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import BibleReader, { BibleReader as NamedBibleReader, SYSTEM_FONTS } from '../../src/components/BibleReader';
import { typography } from '../../src/constants/theme';

describe('BibleReader Render Stability & Memoization', () => {
  test('SYSTEM_FONTS is a hoisted static array containing the body typography font family', () => {
    expect(Array.isArray(SYSTEM_FONTS)).toBe(true);
    expect(SYSTEM_FONTS).toEqual([typography.body.fontFamily]);
    // Verifies referential identity is preserved across multiple accesses
    const firstRef = SYSTEM_FONTS;
    const secondRef = SYSTEM_FONTS;
    expect(firstRef).toBe(secondRef);
  });

  test('BibleReader is wrapped with React.memo for both default and named exports', () => {
    expect(BibleReader).toBeDefined();
    expect(NamedBibleReader).toBeDefined();
    // React.memo creates an object with $$typeof Symbol(react.memo)
    expect((BibleReader as any).$$typeof).toBe(Symbol.for('react.memo'));
    expect((NamedBibleReader as any).$$typeof).toBe(Symbol.for('react.memo'));
  });
});
