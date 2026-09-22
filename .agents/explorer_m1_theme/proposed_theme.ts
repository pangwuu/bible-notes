/**
 * Bible Notes — Single Source of Truth for Visual Design Tokens & Themes
 * Governed strictly by DESIGN.md and PROJECT.md.
 * 
 * ANTI-PATTERNS ENFORCED:
 * - NO cold near-black backgrounds (#0B0B0B, #111111)
 * - NO terracotta/salmon accent (#D97757)
 * - NO generic drop shadows (rgba(0,0,0,0.1), shadowColor, elevation > 0)
 * - NO all-caps text
 * - NO monospace fonts for UI
 */

import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';

// ---------------------------------------------------------------------------
// 1. Color Palette Tokens
// ---------------------------------------------------------------------------

export const colors = {
  // Nested structure matching PROJECT.md Interface Contracts
  bg: {
    base: '#1A1816',         // Warm charcoal-brown app background (desk under lamp)
    surface: '#242019',      // Cards, sheets, modals, input fields
    surfaceRaised: '#2E2921',// Active/pressed surface, bottom sheets, elevated layers
  },
  text: {
    primary: '#EDE7DD',      // Warm parchment white for body & headings
    secondary: '#A39C8E',    // Desaturated warm parchment for metadata & placeholders
    disabled: '#6B655A',     // Low-contrast warm gray for disabled controls
  },
  border: {
    hairline: '#332E27',     // Barely-there warm-toned divider & input border
  },
  accent: {
    keyIdea: '#E3A53D',      // 💡 Amber / gold illumination (Swedish Method & FAB)
    question: '#5B93C4',     // ❓ Cool blue inquiry (deliberate cool accent)
    application: '#7BA05B',  // 🏹 Sage green growth & personal action
    social: '#B4789E',       // 👥 Dusty plum for friends, overlap badges, notifications
    danger: '#C4664F',       // ⚠️ Muted brick red for destructive actions only
  },

  // Flat token aliases matching DESIGN.md starter theme object
  bgBase: '#1A1816',
  bgSurface: '#242019',
  bgSurfaceRaised: '#2E2921',
  textPrimary: '#EDE7DD',
  textSecondary: '#A39C8E',
  textDisabled: '#6B655A',
  borderHairline: '#332E27',
  accentKeyIdea: '#E3A53D',
  accentQuestion: '#5B93C4',
  accentApplication: '#7BA05B',
  accentSocial: '#B4789E',
  accentDanger: '#C4664F',
} as const;

// ---------------------------------------------------------------------------
// 2. Spacing & Layout Tokens (4px base unit)
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const layout = {
  screenPadding: spacing.md,      // 16px screen horizontal margin
  sectionSpacing: spacing.lg,     // 24px between unrelated sections
  elementSpacing: spacing.sm,     // 8px between related label + control
  readingMaxWidth: 680,           // Cap at ~65-70 characters wide on tablet
} as const;

// ---------------------------------------------------------------------------
// 3. Radii & Shape Tokens
// ---------------------------------------------------------------------------

export const radii = {
  content: 4,   // Readable content: note cards, passage blocks (flat, hairline border)
  controls: 8,  // Interactive controls: buttons, chips, tiles, overlap badge pills
  control: 8,   // Alias for DESIGN.md radius.control
  sheet: 16,    // Modals & bottom sheets: top corners only (borderTopLeft/RightRadius)
} as const;

export const radius = radii; // Alias for DESIGN.md export

// ---------------------------------------------------------------------------
// 4. Typography Scale & System Definitions
// ---------------------------------------------------------------------------

export const typography = {
  // UI Chrome: System sans (San Francisco on iOS, Roboto on Android)
  display: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  // Reading Content: Source Serif Pro (loaded via expo-font) with 1.5x line height
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: 'SourceSerifPro',
    lineHeight: 24, // 16 * 1.5 = 24 for sustained reading comfort
  },
} as const;

// ---------------------------------------------------------------------------
// 5. React Native Paper MD3 Custom Theme (paperTheme)
// ---------------------------------------------------------------------------

export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent.keyIdea,
    onPrimary: colors.bg.base,
    primaryContainer: colors.bg.surfaceRaised,
    onPrimaryContainer: colors.accent.keyIdea,
    secondary: colors.accent.application,
    onSecondary: colors.bg.base,
    secondaryContainer: colors.bg.surfaceRaised,
    onSecondaryContainer: colors.accent.application,
    tertiary: colors.accent.question,
    onTertiary: colors.bg.base,
    tertiaryContainer: colors.bg.surfaceRaised,
    onTertiaryContainer: colors.accent.question,
    error: colors.accent.danger,
    onError: colors.bg.base,
    errorContainer: colors.bg.surfaceRaised,
    onErrorContainer: colors.accent.danger,
    background: colors.bg.base,
    onBackground: colors.text.primary,
    surface: colors.bg.surface,
    onSurface: colors.text.primary,
    surfaceVariant: colors.bg.surfaceRaised,
    onSurfaceVariant: colors.text.secondary,
    outline: colors.border.hairline,
    outlineVariant: colors.border.hairline,
    shadow: 'transparent', // STRICT: No generic drop shadows
    scrim: 'rgba(26, 24, 22, 0.8)', // Warm charcoal backdrop for modals
    inverseSurface: colors.text.primary,
    inverseOnSurface: colors.bg.base,
    inversePrimary: colors.accent.keyIdea,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: 'transparent',
      level1: colors.bg.surface,
      level2: colors.bg.surfaceRaised,
      level3: '#332E27',
      level4: '#3D372E',
      level5: '#474036',
    },
    surfaceDisabled: 'rgba(107, 101, 90, 0.12)',
    onSurfaceDisabled: colors.text.disabled,
    backdrop: 'rgba(26, 24, 22, 0.6)',
  },
  roundness: 2, // Multiplier for MD3 base unit (2 * 4px = 8px for controls)
};

// ---------------------------------------------------------------------------
// 6. React Navigation Theme (navigationTheme for Expo Router)
// ---------------------------------------------------------------------------

export const navigationTheme: NavigationTheme = {
  ...NavigationDarkTheme,
  dark: true,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: colors.accent.keyIdea,
    background: colors.bg.base,
    card: colors.bg.surface,
    text: colors.text.primary,
    border: colors.border.hairline,
    notification: colors.accent.social,
  },
};

// ---------------------------------------------------------------------------
// 7. Component Style Helpers (Strict DESIGN.md Enforcement)
// ---------------------------------------------------------------------------

export const componentStyles = {
  // Readable Content: note cards, passage text blocks
  readableCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Interactive Controls: buttons, chips, tiles
  control: {
    borderRadius: radii.controls,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Bottom Sheets & Modals: 16px top corners only
  sheet: {
    backgroundColor: colors.bg.surfaceRaised,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderColor: colors.border.hairline,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Floating Action Button: filled with accentKeyIdea
  fab: {
    backgroundColor: colors.accent.keyIdea,
    borderRadius: 28,
  },
  // Inline Overlap Badge Pill: Letterboxd style
  overlapBadge: {
    borderRadius: radii.controls,
    borderWidth: 1,
    borderColor: colors.accent.social,
    backgroundColor: colors.bg.surfaceRaised,
  },
  // Bottom Tab Bar: warm charcoal surface with hairline top border
  tabBar: {
    backgroundColor: colors.bg.surface,
    borderTopColor: colors.border.hairline,
    borderTopWidth: 1,
  },
} as const;

// ---------------------------------------------------------------------------
// 8. Markdown Display Stylesheet (react-native-markdown-display)
// ---------------------------------------------------------------------------

export const markdownStyles = {
  body: {
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'SourceSerifPro',
    lineHeight: 24,
  },
  heading1: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600' as const,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heading2: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600' as const,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  heading3: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paragraph: {
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'SourceSerifPro',
    lineHeight: 24,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  hr: {
    backgroundColor: colors.border.hairline,
    height: 1,
    marginVertical: spacing.md,
  },
  blockquote: {
    backgroundColor: colors.bg.surfaceRaised,
    borderColor: colors.border.hairline,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
  },
  bullet_list: {
    marginVertical: spacing.xs,
  },
  ordered_list: {
    marginVertical: spacing.xs,
  },
  list_item: {
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'SourceSerifPro',
    lineHeight: 24,
    marginVertical: 2,
  },
} as const;

// ---------------------------------------------------------------------------
// 9. Type Declarations & Custom Hook
// ---------------------------------------------------------------------------

export interface AppTheme extends MD3Theme {
  customColors: typeof colors;
  radii: typeof radii;
  spacing: typeof spacing;
  customTypography: typeof typography;
  componentStyles: typeof componentStyles;
  markdownStyles: typeof markdownStyles;
}

export const appTheme: AppTheme = {
  ...paperTheme,
  customColors: colors,
  radii,
  spacing,
  customTypography: typography,
  componentStyles,
  markdownStyles,
};

export const useAppTheme = () => useTheme<AppTheme>();

export default appTheme;
