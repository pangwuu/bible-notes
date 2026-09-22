# Bible Notes — Design System

This file is the single source of truth for visual decisions. Read it before building any screen. Do not invent colors, spacing, or component styles outside what's defined here — if something isn't covered, flag it rather than guessing.

## Philosophy

Dark theme, warm rather than cold. The subject matter is a personal study journal — closer to reading by a desk lamp at night than to a productivity dashboard — so the background carries a warm undertone instead of the flat near-black most AI-generated dark UIs default to.

Color is functional, not decorative. Every accent in this app already has a real-world referent: the Swedish Method's own headers (💡 Key Idea, ❓ Question, 🏹 Application) give three of the four accent colors their meaning. Nothing is colored "because it needed a color."

## Do not do this (anti-patterns to actively avoid)

These are the tells of ungrounded, templated AI output. Antigravity should treat this list as a checklist to fail on purpose:
- No near-black (`#0B0B0B` / `#111111`) background with a single bright acid-green or vermilion accent.
- No `#D97757` or near-terracotta accent — it's a well-known AI-tool default, not a choice made for this app.
- No identical rounded cards everywhere with the same soft `rgba(0,0,0,.1)` drop shadow. Radius and elevation carry meaning here — see Components below.
- No ALL-CAPS tracked-out eyebrow labels above headings.
- No middle-dot-joined meta strings (`John 3:16 · 2 notes · 3 tags`) — use real separators (line breaks, icons) instead.
- No arrow (→) appended to button or link text.
- No numbered `01 / 02 / 03` markers unless the content is an actual sequence (it mostly isn't here).
- No monospace font for small labels — nothing in this app is code or data-table content.

## Color

| Token | Hex | Role | Why |
|---|---|---|---|
| `bg.base` | `#1A1816` | App background | Warm charcoal-brown, not blue-black — evokes a leather journal cover / desk under lamp light, not a "tech" dark mode |
| `bg.surface` | `#242019` | Cards, sheets, modals, input fields | One step up from base; distinguishes "a surface" from "the void behind it" |
| `bg.surfaceRaised` | `#2E2921` | Active/pressed surface, bottom sheets | For elevation that needs to read clearly above `surface` |
| `text.primary` | `#EDE7DD` | Body text, headings | Warm parchment white, not pure `#FFFFFF` — softer on the eyes for long reading sessions |
| `text.secondary` | `#A39C8E` | Metadata, timestamps, placeholder text | Desaturated version of primary, same warm family |
| `text.disabled` | `#6B655A` | Disabled controls | |
| `border.hairline` | `#332E27` | Dividers, input outlines | Barely-there, warm-toned, not grey |
| `accent.keyIdea` | `#E3A53D` | 💡 Key Idea headers, related UI | Amber/gold = illumination, matches the emoji's own meaning |
| `accent.question` | `#5B93C4` | ❓ Question headers, related UI | Cool blue = inquiry, clarity — deliberately the coolest accent in an otherwise warm palette, so questions visually stand apart from the rest |
| `accent.application` | `#7BA05B` | 🏹 Application headers, related UI | Sage green = growth, action |
| `accent.social` | `#B4789E` | Friends, friend requests, overlap badges, notifications | Dusty plum — warm and human, but clearly distinct from the three study accents so "a person did something" never gets confused with "a note category" |
| `accent.danger` | `#C4664F` | Destructive actions only (delete note, remove friend) | Muted brick red, not a bright alert red — stays inside the warm palette even as a warning |

Accent colors are used for: icons, small badges/pills, the active tab indicator, and thin left-borders on note cards indicating which Swedish Method section a snippet is from. They are never used as large background fills — a whole screen or card tinted gold/blue/green would fight the calm, warm base palette.

## Typography

Two-family system, each with a real job:

- **Serif — reading content.** Passage text (ESV/WEB) and note body content. Bible reading has a print tradition; serif at a slightly increased line-height (1.5) makes long passages and reflective writing comfortable. Use `Source Serif Pro` (bundle via `expo-font`) with system serif as fallback.
- **Sans — UI chrome.** Navigation, buttons, tab labels, tags, section headers, metadata. Use the system font (`San Francisco` / `Roboto`) — no bundling needed, and it keeps native platform conventions for anything interactive.

Type scale (sans, for UI; serif inherits the same sizes for body/passage text):

| Style | Size | Weight | Use |
|---|---|---|---|
| `display` | 28 | 600 | Screen titles (Dashboard, Note detail passage ref) |
| `title` | 20 | 600 | Card titles, modal headers |
| `body` | 16 | 400 | Note content, passage text (serif) |
| `label` | 14 | 500 | Buttons, tab labels, form labels |
| `caption` | 12 | 400 | Timestamps, tag chips, metadata |

Sentence case everywhere — headings, buttons, labels. No all-caps.

## Spacing & layout

4px base unit. All padding/margin values are multiples of 4: `4, 8, 12, 16, 24, 32, 48`.

- Screen horizontal padding: `16`
- Space between unrelated sections: `24`
- Space between related elements (label + input): `8`

Line length for passage/note reading content: cap at ~65-70 characters wide on tablet; on phone the screen width is the natural cap, so no action needed there.

## Components (React Native Paper + StyleSheet)

Radius and elevation are used to distinguish *what kind of thing* something is, not applied uniformly:

- **Readable content** (note cards, passage text blocks): `borderRadius: 4`, no shadow — a hairline `border.hairline` border only. These are things you read, so they stay quiet and flat.
- **Interactive controls** (buttons, chips, the passage-picker's book/chapter tiles, the overlap badge pill): `borderRadius: 8`, no shadow either — differentiate by fill color (accent tokens) and a slight `bg.surfaceRaised` treatment on press, not by drop shadow. Shadows read poorly on dark backgrounds and are a common AI-generated tell; use color and border changes for state instead.
- **Modals / bottom sheets** (passage picker, note editor's tag input): `borderRadius: 16` at the top corners only, `bg.surfaceRaised` background — the one place a heavier surface is justified, since it's temporarily covering the screen.

FAB (new note button): filled `accent.keyIdea`, since starting a new note is fundamentally "capturing an idea."

### Editor screen — model: Day One
Large, unbordered text area. The three Swedish Method section headers (`💡 Key Idea`, `❓ Question`, `🏹 Application`) render as small `caption`-style labels in their respective accent color, sitting quietly above each section — metadata-weight, not heading-weight. No visible input borders; only a hairline divider between sections.

### Passage picker — model: YouVersion
Drill-down flow, not nested dropdowns: Book grid → Chapter grid → verse range via drag-select on a single verse strip. Each step is its own full-screen sheet, not stacked pickers.

### Friends / overlap badge — model: Letterboxd
The "friend also noted this passage" badge is a small pill: circular avatar + one line of text, `accent.social` colored border, dismissible with a tap. It sits inline near the passage, never as a modal or full-width banner. Same treatment for the notification list rows — compact, avatar-led, one line, no card chrome.

## Starter theme object

Drop this into `constants/theme.ts` and wire it into `PaperProvider`:

```typescript
export const colors = {
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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  content: 4,
  control: 8,
  sheet: 16,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: '600' as const },
  title: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const, fontFamily: 'SourceSerifPro' },
  label: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;
```
