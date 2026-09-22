/**
 * Adversarial Stress Tests for Milestone 1 Theme & Tokens
 * Challenger 1 Suite
 */

import {
  colors,
  radii,
  spacing,
  typography,
  paperTheme,
  navigationTheme,
  layout,
  componentStyles,
  markdownStyles,
} from '../../src/constants/theme';
import {
  SWEDISH_SECTIONS,
  SWEDISH_TEMPLATE_MARKDOWN,
} from '../../src/constants/swedishMethod';

describe('Adversarial Theme & Token Stress Tests', () => {
  describe('Hex Format and Contrast Validation', () => {
    test('All hex color values are valid 7-character #RRGGBB strings', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;

      // Nested tokens
      Object.values(colors.bg).forEach((val) => expect(val).toMatch(hexRegex));
      Object.values(colors.text).forEach((val) => expect(val).toMatch(hexRegex));
      Object.values(colors.border).forEach((val) => expect(val).toMatch(hexRegex));
      Object.values(colors.accent).forEach((val) => expect(val).toMatch(hexRegex));

      // Flat tokens
      const flatHexTokens = [
        colors.bgBase,
        colors.bgSurface,
        colors.bgSurfaceRaised,
        colors.textPrimary,
        colors.textSecondary,
        colors.textDisabled,
        colors.borderHairline,
        colors.accentKeyIdea,
        colors.accentQuestion,
        colors.accentApplication,
        colors.accentSocial,
        colors.accentDanger,
      ];
      flatHexTokens.forEach((val) => expect(val).toMatch(hexRegex));
    });

    test('Background surfaces have strictly ascending luminance (base < surface < surfaceRaised)', () => {
      const parseLuminance = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const lumBase = parseLuminance(colors.bg.base);
      const lumSurface = parseLuminance(colors.bg.surface);
      const lumSurfaceRaised = parseLuminance(colors.bg.surfaceRaised);

      expect(lumBase).toBeLessThan(lumSurface);
      expect(lumSurface).toBeLessThan(lumSurfaceRaised);
    });

    test('Text primary has high luminance for dark background readability', () => {
      const parseLuminance = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const lumText = parseLuminance(colors.text.primary);
      const lumBase = parseLuminance(colors.bg.base);
      // Contrast ratio should be > 7:1 for AAA
      const contrast = (lumText + 0.05) / (lumBase + 0.05);
      expect(contrast).toBeGreaterThan(7);
    });
  });

  describe('Component Styles and Radii Invariants', () => {
    test('Zero drop shadow rule is strictly enforced across all component styles', () => {
      expect(componentStyles.readableCard.shadowOpacity).toBe(0);
      expect(componentStyles.readableCard.elevation).toBe(0);
      expect(componentStyles.control.shadowOpacity).toBe(0);
      expect(componentStyles.control.elevation).toBe(0);
      expect(componentStyles.sheet.shadowOpacity).toBe(0);
      expect(componentStyles.sheet.elevation).toBe(0);
    });

    test('Sheet radius applies exclusively to top corners', () => {
      expect(componentStyles.sheet.borderTopLeftRadius).toBe(radii.sheet);
      expect(componentStyles.sheet.borderTopRightRadius).toBe(radii.sheet);
      expect((componentStyles.sheet as any).borderBottomLeftRadius).toBeUndefined();
      expect((componentStyles.sheet as any).borderBottomRightRadius).toBeUndefined();
    });

    test('Readable content radius is 4px, controls radius is 8px', () => {
      expect(componentStyles.readableCard.borderRadius).toBe(4);
      expect(componentStyles.control.borderRadius).toBe(8);
      expect(componentStyles.overlapBadge.borderRadius).toBe(8);
    });
  });

  describe('Swedish Method Invariants', () => {
    test('Swedish sections contain exactly 3 unique keys and symbols', () => {
      expect(SWEDISH_SECTIONS.length).toBe(3);
      const keys = new Set(SWEDISH_SECTIONS.map((s) => s.key));
      const symbols = new Set(SWEDISH_SECTIONS.map((s) => s.symbol));
      expect(keys.size).toBe(3);
      expect(symbols.size).toBe(3);
      expect(keys.has('keyIdea')).toBe(true);
      expect(keys.has('question')).toBe(true);
      expect(keys.has('application')).toBe(true);
    });

    test('Swedish template markdown contains all headers with symbols', () => {
      SWEDISH_SECTIONS.forEach((s) => {
        expect(SWEDISH_TEMPLATE_MARKDOWN).toContain(s.headerMarkdown);
      });
    });
  });

  describe('Typography & Markdown Rules', () => {
    test('Body text font size is 16 and line height is exactly 1.5x (24)', () => {
      expect(typography.body.fontSize).toBe(16);
      expect(typography.body.lineHeight).toBe(24);
      expect(typography.body.fontFamily).toBe('SourceSerifPro');
    });

    test('Markdown body, paragraph, and list_item match typography body', () => {
      expect(markdownStyles.body.fontSize).toBe(16);
      expect(markdownStyles.body.lineHeight).toBe(24);
      expect(markdownStyles.body.fontFamily).toBe('SourceSerifPro');
      expect(markdownStyles.paragraph.fontSize).toBe(16);
      expect(markdownStyles.paragraph.lineHeight).toBe(24);
      expect(markdownStyles.paragraph.fontFamily).toBe('SourceSerifPro');
      expect(markdownStyles.list_item.fontSize).toBe(16);
      expect(markdownStyles.list_item.lineHeight).toBe(24);
      expect(markdownStyles.list_item.fontFamily).toBe('SourceSerifPro');
    });
  });
});
