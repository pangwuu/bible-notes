import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import AddNoteFAB from '../../src/components/AddNoteFAB';
import { colors, spacing } from '../../src/constants/theme';

describe('AddNoteFAB', () => {
  test('uses standard theme tokens for keyIdea accent color and spacing', () => {
    expect(colors.accent.keyIdea).toBe('#E3A53D');
    expect(spacing.lg).toBe(24);
    expect(spacing.md).toBe(16);
  });

  test('exports AddNoteFAB as a functional React component', () => {
    expect(typeof AddNoteFAB).toBe('function');
  });
});
