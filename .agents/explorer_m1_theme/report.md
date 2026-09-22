# Theme & Visual Design Specification Report (Milestone 1)

**Investigator:** Theme & Design Explorer (`explorer_m1_theme`)  
**Milestone:** M1 — Expo SDK 57 Skeleton & Theme  
**Date:** 2026-09-22T14:55:00Z  
**Target File:** `src/constants/theme.ts`  
**Governing Documents:** `DESIGN.md`, `specs.md`, `PROJECT.md`, `ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

This report establishes the complete, authoritative specification for the visual design system and theme implementation of the Swedish Method Bible Notes mobile app.

The design philosophy is strictly a **warm dark theme**, evoking a personal leather study journal under warm desk lamp light at night. It rejects standard AI-generated cold or near-black palettes, generic drop shadows, and arbitrary accent colors. Every accent color in the palette maps 1:1 to a real-world concept: the Swedish Method study symbols (💡 Key Idea, ❓ Question, 🏹 Application), human relationships (👥 Social / Overlap), or destructive caution (⚠️ Danger).

We provide:
1. Exact design tokens: colors (nested and flat backward-compatible), spacing (4px grid), radii (semantic meaning), and typography (two-family system).
2. Complete `React Native Paper` Material Design 3 (`MD3Theme`) adaptation with zero drop shadows.
3. React Navigation `DarkTheme` integration for Expo Router.
4. Typography loader specifications for `Source Serif Pro` via `expo-font` at 1.5x reading line-height.
5. Strict anti-pattern enforcement rules.
6. Ready-to-use source files (`theme.ts`, `swedishMethod.ts`, `theme.test.ts`).

---

## 2. Token Specification & Semantic Mapping

### 2.1 Color Palette (`colors`)

| Token Path | Flat Alias | Hex Value | Role & Semantic Justification | Anti-Pattern Rule |
|---|---|---|---|---|
| `colors.bg.base` | `colors.bgBase` | `#1A1816` | App background: warm charcoal-brown, reminiscent of desk wood / leather | NEVER `#0B0B0B`, `#111111`, or pure black |
| `colors.bg.surface` | `colors.bgSurface` | `#242019` | Content cards, modal backgrounds, input fields | Defines bounded surfaces above base |
| `colors.bg.surfaceRaised` | `colors.bgSurfaceRaised` | `#2E2921` | Active/pressed cards, bottom sheets, elevated state | Clearly reads above surface without shadow |
| `colors.text.primary` | `colors.textPrimary` | `#EDE7DD` | Headings, body reading text, titles | Warm parchment white; avoids harsh `#FFFFFF` glare |
| `colors.text.secondary` | `colors.textSecondary` | `#A39C8E` | Metadata, verse ranges, timestamps, placeholders | Desaturated warm parchment |
| `colors.text.disabled` | `colors.textDisabled` | `#6B655A` | Disabled button text, inactive controls | Low-contrast warm gray |
| `colors.border.hairline` | `colors.borderHairline` | `#332E27` | Dividers, card borders, input borders | Subtle warm structural line; never cold gray |
| `colors.accent.keyIdea` | `colors.accentKeyIdea` | `#E3A53D` | 💡 Key Idea section header, FAB fill, active tab | Amber/gold = illumination & central truth |
| `colors.accent.question` | `colors.accentQuestion` | `#5B93C4` | ❓ Question section header, inquiry tags | Cool blue = inquiry; coolest accent for contrast |
| `colors.accent.application` | `colors.accentApplication` | `#7BA05B` | 🏹 Application section header, action pills | Sage green = growth, life transformation |
| `colors.accent.social` | `colors.accentSocial` | `#B4789E` | 👥 Overlap badges, friend pills, notifications | Dusty plum = human warmth; never confused with study |
| `colors.accent.danger` | `colors.accentDanger` | `#C4664F` | ⚠️ Destructive actions (delete, unfriend) | Muted brick red; stays in warm palette |

**Dual-Export Compatibility:**  
To satisfy both `PROJECT.md` interface contracts (`colors.bg.base`, `colors.accent.keyIdea`) and `DESIGN.md` starter code (`colors.bgBase`, `colors.accentKeyIdea`), `src/constants/theme.ts` exports both simultaneously on the same `colors` object.

### 2.2 Radii & Shape System (`radii` / `radius`)

In this system, radius communicates **what kind of thing** an element is:

| Token | Value | Applied To | Justification |
|---|---|---|---|
| `radii.content` | `4px` | Readable content (note cards, Bible passage text blocks) | Flat, quiet, book-like. Bound with hairline border (`#332E27`), zero shadow. |
| `radii.controls` (alias `radii.control`) | `8px` | Interactive controls (buttons, tag chips, book/chapter picker tiles, overlap badge pill) | Clearly communicates clickability; state changes via color/surface fill. |
| `radii.sheet` | `16px` | Modals and bottom sheets (top corners only: `borderTopLeftRadius: 16`, `borderTopRightRadius: 16`) | Heavier temporary sheet overlaying screen content. Background: `bg.surfaceRaised`. |

### 2.3 Spacing System (`spacing` & `layout`)

Based strictly on a **4px base grid unit**:
- `spacing.xs`: `4px`
- `spacing.sm`: `8px`
- `spacing.md`: `16px`
- `spacing.lg`: `24px`
- `spacing.xl`: `32px`
- `spacing.xxl`: `48px`

**Layout Rules:**
- Screen horizontal margin: `layout.screenPadding = 16px` (`spacing.md`)
- Space between unrelated sections: `layout.sectionSpacing = 24px` (`spacing.lg`)
- Space between related label + control: `layout.elementSpacing = 8px` (`spacing.sm`)
- Tablet reading line-length cap: `layout.readingMaxWidth = 680px` (keeps passage text to ~65–70 characters for sustained reading comfort)

### 2.4 Typography System (`typography`)

A two-family system with distinct roles:
1. **Reading Content (Serif):** `Source Serif Pro` (bundled via `expo-font`). Line height is increased to 1.5x (`lineHeight: 24` on 16px font) for print-like comfort during long Bible reading and journaling sessions.
2. **UI Chrome (System Sans):** `San Francisco` (iOS) / `Roboto` (Android). Native, crisp, interactive.

| Style | Font Family | Size | Weight | Line Height | Semantic Usage |
|---|---|---|---|---|---|
| `display` | System Sans | 28px | 600 | 34px | Screen titles (Dashboard, Note detail passage header) |
| `title` | System Sans | 20px | 600 | 26px | Card titles, modal headers, section labels |
| `body` | `Source Serif Pro` | 16px | 400 | 24px (1.5x) | Bible passage scripture text, note body markdown |
| `label` | System Sans | 14px | 500 | 20px | Buttons, tab bar labels, input field labels |
| `caption` | System Sans | 12px | 400 | 16px | Timestamps, metadata, tag chips, Swedish section editor labels |

**Casing Rules:** Strict Sentence case across all screens, buttons, tabs, and headings. **Zero ALL-CAPS** text.

---

## 3. React Native Paper MD3 Integration (`paperTheme`)

React Native Paper v5 utilizes Material Design 3 (`MD3DarkTheme`). Standard MD3 relies heavily on surface elevation tints and soft shadows. We adapt MD3 to enforce our calm, warm desk-lamp aesthetic:

```typescript
export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent.keyIdea,        // #E3A53D
    onPrimary: colors.bg.base,             // #1A1816
    primaryContainer: colors.bg.surfaceRaised, // #2E2921
    onPrimaryContainer: colors.accent.keyIdea,
    secondary: colors.accent.application,  // #7BA05B
    onSecondary: colors.bg.base,
    secondaryContainer: colors.bg.surfaceRaised,
    onSecondaryContainer: colors.accent.application,
    tertiary: colors.accent.question,      // #5B93C4
    onTertiary: colors.bg.base,
    tertiaryContainer: colors.bg.surfaceRaised,
    onTertiaryContainer: colors.accent.question,
    error: colors.accent.danger,           // #C4664F
    onError: colors.bg.base,
    errorContainer: colors.bg.surfaceRaised,
    onErrorContainer: colors.accent.danger,
    background: colors.bg.base,            // #1A1816
    onBackground: colors.text.primary,     // #EDE7DD
    surface: colors.bg.surface,            // #242019
    onSurface: colors.text.primary,        // #EDE7DD
    surfaceVariant: colors.bg.surfaceRaised,// #2E2921
    onSurfaceVariant: colors.text.secondary, // #A39C8E
    outline: colors.border.hairline,       // #332E27
    outlineVariant: colors.border.hairline,
    shadow: 'transparent',                 // STRICT: Zero drop shadows
    scrim: 'rgba(26, 24, 22, 0.8)',        // Warm charcoal backdrop for modals
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
  roundness: 2, // 2 * 4px = 8px default control roundness
};
```

---

## 4. React Navigation Integration (`navigationTheme`)

For Expo Router's `<ThemeProvider value={navigationTheme}>` in `app/_layout.tsx`:

```typescript
export const navigationTheme: NavigationTheme = {
  ...NavigationDarkTheme,
  dark: true,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: colors.accent.keyIdea,        // #E3A53D
    background: colors.bg.base,            // #1A1816
    card: colors.bg.surface,               // #242019
    text: colors.text.primary,             // #EDE7DD
    border: colors.border.hairline,        // #332E27
    notification: colors.accent.social,    // #B4789E
  },
};
```

This guarantees that navigation headers, stack card transitions, and bottom tab bars inherit the warm palette without flashes of default cold gray or blue.

---

## 5. Anti-Patterns & Prohibited Code Checklist

The following anti-patterns must fail linting and tests:

| Anti-Pattern | Reason | Enforcement |
|---|---|---|
| `#0B0B0B`, `#111111`, `#000000` | Cold, sterile, generic AI dark mode | Unit tests verify absence in theme serializations |
| `#D97757` (terracotta / salmon) | Known AI tool default accent | Unit tests verify absence |
| Generic drop shadows (`rgba(0,0,0,0.1)`, `shadowOffset`, `elevation > 0`) | Muddy on dark backgrounds; AI tell | `paperTheme.colors.shadow = 'transparent'`; component styles set `shadowOpacity: 0` |
| ALL-CAPS eyebrow labels | Excessive visual noise; against Scandinavian calm | All UI labels use Sentence case |
| Middle-dot joined chains (`John 3:16 · 2 notes`) | Lazy metadata layout | Use explicit line breaks, chips, or icons |
| Arrow suffixes (`Save →`, `Next →`) | Clutters clean button text | Standard button text only |
| Arbitrary sequence markers (`01 / 02 / 03`) | Fake structure | Disallowed unless displaying literal sequence |
| Monospace fonts for UI labels | The app is not a developer console | Use system sans for UI chrome |

---

## 6. Implementation Reference Files

The following proposed files are saved directly in `.agents/explorer_m1_theme/` for instant deployment:

1. `proposed_theme.ts` → destination `src/constants/theme.ts`
2. `proposed_swedishMethod.ts` → destination `src/constants/swedishMethod.ts`
3. `proposed_theme.test.ts` → destination `tests/unit/theme.test.ts`

---

## 7. Downstream Coordination Guide

- **For Scaffolding Implementer (`explorer_m1_scaffold` / implementer):**
  Install `@expo-google-fonts/source-serif-pro` and `react-native-paper` in `package.json`.
- **For Navigation Implementer (`explorer_m1_nav` / implementer):**
  In `app/_layout.tsx`, wrap the app in `<PaperProvider theme={paperTheme}>` and `<ThemeProvider value={navigationTheme}>`.
  In `app/(tabs)/_layout.tsx`, style the tab bar with:
  `backgroundColor: colors.bg.surface`, `tabBarActiveTintColor: colors.accent.keyIdea`, `tabBarInactiveTintColor: colors.text.secondary`, `borderTopColor: colors.border.hairline`.
- **For Editor Implementer (M3):**
  Use `radii.content` for reading note cards, unbordered inputs with `colors.border.hairline` section dividers for Day One editor, and `SWEDISH_SECTIONS` from `src/constants/swedishMethod.ts`.
