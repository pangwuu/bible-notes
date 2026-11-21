import React from 'react';
import { Platform, StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface TemplateIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

type Rect = readonly [left: number, top: number, width: number, height: number];

interface CrossGlyph {
  /** SVG path of the glyph outline, drawn as one shape on web. */
  path: string;
  /** The same shape as overlapping rects, for native where there is no SVG renderer. */
  rects: readonly Rect[];
}

/**
 * Units-per-em of the MaterialCommunityIcons font the cross glyphs were traced from.
 * Coordinates below are in that 512-unit em box, measured from its top-left corner.
 */
const EM = 512;
/** hhea ascent/descent of that font, which set where the glyph sat in its text line box. */
const ASCENT = 448;
const DESCENT = 64;

/**
 * MaterialCommunityIcons 'cross' (U+F0953) and 'cross-outline' (U+F0CF6), copied out of the
 * font so these two glyphs no longer require downloading the 1.3 MB icon font.
 * Rects overlap at every junction: anti-aliased edges that merely abut leave a faint light seam.
 */
const CROSS_GLYPHS: Record<string, CrossGlyph> = {
  cross: {
    path: 'M224 43H288V171H405V235H288V469H224V235H107V171H224Z',
    rects: [
      [224, 43, 64, 426],
      [107, 171, 298, 64],
    ],
  },
  'cross-outline': {
    path: 'M331 128V21H181V128H64V277H181V491H331V277H448V128ZM405 235H288V448H224V235H107V171H224V64H288V171H405Z',
    rects: [
      [181, 21, 150, 43],
      [181, 21, 43, 150],
      [288, 21, 43, 150],
      [64, 128, 160, 43],
      [288, 128, 160, 43],
      [64, 128, 43, 149],
      [405, 128, 43, 149],
      [64, 235, 160, 42],
      [288, 235, 160, 42],
      [181, 235, 43, 256],
      [288, 235, 43, 256],
      [181, 448, 150, 43],
    ],
  },
};

/**
 * Mirrors the box the font glyph occupied so icons line up exactly where they used to.
 * On web, Blink and WebKit round a font's ascent and descent to whole pixels separately: the
 * line box is round(ascent) + round(descent) tall (13px for a 12px icon) and the baseline sits at
 * round(ascent), so the glyph shifts by up to half a pixel. Native lays the glyph out unrounded.
 */
function glyphBox(size: number) {
  const ascent = (ASCENT / EM) * size;
  if (Platform.OS !== 'web') return { height: size, dy: 0 };
  const baseline = Math.round(ascent);
  return { height: baseline + Math.round((DESCENT / EM) * size), dy: baseline - ascent };
}

const CrossIcon: React.FC<{
  glyph: CrossGlyph;
  size: number;
  color: string;
  style?: StyleProp<TextStyle>;
}> = ({ glyph, size, color, style }) => {
  const { height, dy } = glyphBox(size);
  return (
    <View style={[{ width: size, height }, style]} pointerEvents="none">
      {Platform.OS === 'web'
        ? React.createElement(
            'svg',
            {
              width: size,
              height: size,
              viewBox: `0 0 ${EM} ${EM}`,
              style: { display: 'block', transform: `translateY(${dy}px)` },
              'aria-hidden': true,
            },
            React.createElement('path', { d: glyph.path, fill: color })
          )
        : (
          // Laid out at full em size and scaled as one layer, so edges aren't snapped rect by rect.
          <View style={[styles.em, { transform: [{ scale: size / EM }] }]}>
            {glyph.rects.map(([left, top, width, h], i) => (
              <View key={i} style={[styles.rect, { left, top, width, height: h, backgroundColor: color }]} />
            ))}
          </View>
        )}
    </View>
  );
};

/**
 * Hybrid Icon Component:
 * Draws the faith glyphs Ionicons lacks ('cross', 'cross-outline') from their traced outlines,
 * and defaults to Ionicons for standard UI iconography.
 */
export const TemplateIcon: React.FC<TemplateIconProps> = ({
  name,
  size = 16,
  color,
  style,
}) => {
  if (Object.prototype.hasOwnProperty.call(CROSS_GLYPHS, name)) {
    return <CrossIcon glyph={CROSS_GLYPHS[name]} size={size} color={color ?? 'black'} style={style} />;
  }

  return <Ionicons name={(name as any) || 'document-text-outline'} size={size} color={color} style={style} />;
};

const styles = StyleSheet.create({
  em: { position: 'absolute', left: 0, top: 0, width: EM, height: EM, transformOrigin: 'top left' },
  rect: { position: 'absolute' },
});

export default TemplateIcon;
