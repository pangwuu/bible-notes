/**
 * Automated Unit Test Suite for Theme Tokens & Anti-Pattern Compliance
 * Verifies strict alignment with DESIGN.md and PROJECT.md.
 */

import {
  colors,
  radii,
  spacing,
  typography,
  paperTheme,
  navigationTheme,
  layout,
} from '../../src/constants/theme';
import { SWEDISH_SECTIONS, SWEDISH_TEMPLATE_MARKDOWN } from '../../src/constants/swedishMethod';

describe('Design Tokens & Palette Compliance', () => {
  test('Exact hex codes match DESIGN.md specification', () => {
    // Backgrounds
    expect(colors.bg.base).toBe('#1A1816');
    expect(colors.bg.surface).toBe('#242019');
    expect(colors.bg.surfaceRaised).toBe('#2E2921');

    // Text
    expect(colors.text.primary).toBe('#EDE7DD');
    expect(colors.text.secondary).toBe('#A39C8E');
    expect(colors.text.disabled).toBe('#6B655A');

    // Border
    expect(colors.border.hairline).toBe('#332E27');

    // Accents
    expect(colors.accent.keyIdea).toBe('#E3A53D');
    expect(colors.accent.question).toBe('#5B93C4');
    expect(colors.accent.application).toBe('#7BA05B');
    expect(colors.accent.social).toBe('#B4789E');
    expect(colors.accent.danger).toBe('#C4664F');

    // Flat aliases backward compatibility
    expect(colors.bgBase).toBe('#1A1816');
    expect(colors.bgSurface).toBe('#242019');
    expect(colors.bgSurfaceRaised).toBe('#2E2921');
    expect(colors.textPrimary).toBe('#EDE7DD');
    expect(colors.textSecondary).toBe('#A39C8E');
    expect(colors.textDisabled).toBe('#6B655A');
    expect(colors.borderHairline).toBe('#332E27');
    expect(colors.accentKeyIdea).toBe('#E3A53D');
    expect(colors.accentQuestion).toBe('#5B93C4');
    expect(colors.accentApplication).toBe('#7BA05B');
    expect(colors.accentSocial).toBe('#B4789E');
    expect(colors.accentDanger).toBe('#C4664F');
  });

  test('Anti-pattern enforcement: Prohibited hex codes are completely absent', () => {
    const serialized = JSON.stringify(colors).toLowerCase();

    // Prohibited cold black palettes
    expect(serialized).not.toContain('#0b0b0b');
    expect(serialized).not.toContain('#111111');
    expect(serialized).not.toContain('#000000');

    // Prohibited AI terracotta/salmon default
    expect(serialized).not.toContain('#d97757');
  });

  test('Radii tokens match semantic roles in DESIGN.md', () => {
    expect(radii.content).toBe(4);
    expect(radii.controls).toBe(8);
    expect(radii.control).toBe(8);
    expect(radii.sheet).toBe(16);
  });

  test('Spacing tokens adhere to 4px base grid', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
    expect(spacing.xxl).toBe(48);

    Object.values(spacing).forEach((val) => {
      expect(val % 4).toBe(0);
    });

    expect(layout.screenPadding).toBe(16);
    expect(layout.sectionSpacing).toBe(24);
    expect(layout.elementSpacing).toBe(8);
    expect(layout.readingMaxWidth).toBe(680);
  });

  test('Typography scale and font family rules', () => {
    expect(typography.display.fontSize).toBe(28);
    expect(typography.display.fontWeight).toBe('600');

    expect(typography.title.fontSize).toBe(20);
    expect(typography.title.fontWeight).toBe('600');

    expect(typography.body.fontSize).toBe(16);
    expect(typography.body.fontWeight).toBe('400');
    expect(typography.body.fontFamily).toBe('SourceSerifPro');
    expect(typography.body.lineHeight).toBe(24); // 1.5x of 16px

    expect(typography.label.fontSize).toBe(14);
    expect(typography.label.fontWeight).toBe('500');

    expect(typography.caption.fontSize).toBe(12);
    expect(typography.caption.fontWeight).toBe('400');
  });

  test('React Native Paper MD3 theme integration', () => {
    expect(paperTheme.dark).toBe(true);
    expect(paperTheme.colors.background).toBe('#1A1816');
    expect(paperTheme.colors.surface).toBe('#242019');
    expect(paperTheme.colors.surfaceVariant).toBe('#2E2921');
    expect(paperTheme.colors.primary).toBe('#E3A53D');
    expect(paperTheme.colors.onPrimary).toBe('#1A1816');
    expect(paperTheme.colors.secondary).toBe('#7BA05B');
    expect(paperTheme.colors.tertiary).toBe('#5B93C4');
    expect(paperTheme.colors.error).toBe('#C4664F');
    expect(paperTheme.colors.outline).toBe('#332E27');
    expect(paperTheme.colors.shadow).toBe('transparent'); // Zero drop shadow
  });

  test('React Navigation dark theme integration', () => {
    expect(navigationTheme.dark).toBe(true);
    expect(navigationTheme.colors.background).toBe('#1A1816');
    expect(navigationTheme.colors.card).toBe('#242019');
    expect(navigationTheme.colors.text).toBe('#EDE7DD');
    expect(navigationTheme.colors.border).toBe('#332E27');
    expect(navigationTheme.colors.primary).toBe('#E3A53D');
    expect(navigationTheme.colors.notification).toBe('#B4789E');
  });

  test('Swedish Method section symbols, colors, and templates', () => {
    expect(SWEDISH_SECTIONS).toHaveLength(3);
    const [keyIdea, question, application] = SWEDISH_SECTIONS;

    expect(keyIdea.symbol).toBe('💡');
    expect(keyIdea.color).toBe('#E3A53D');

    expect(question.symbol).toBe('❓');
    expect(question.color).toBe('#5B93C4');

    expect(application.symbol).toBe('🏹');
    expect(application.color).toBe('#7BA05B');

    expect(SWEDISH_TEMPLATE_MARKDOWN).toContain('💡');
    expect(SWEDISH_TEMPLATE_MARKDOWN).toContain('❓');
    expect(SWEDISH_TEMPLATE_MARKDOWN).toContain('🏹');
  });
});
