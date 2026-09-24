/**
 * FontSizeControls.tsx
 * Reusable font size stepper (A- [size] A+) for BibleReader scripture text.
 * Persists size to safeStorage ('bible_font_size') and syncs across views.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radii } from '../constants/theme';
import safeStorage from '../utils/safeStorage';

interface FontSizeControlsProps {
  initialSize?: number;
  onSizeChange?: (size: number) => void;
  style?: any;
}

export const FontSizeControls: React.FC<FontSizeControlsProps> = ({
  initialSize = 16,
  onSizeChange,
  style,
}) => {
  const [fontSize, setFontSize] = useState<number>(initialSize);

  useEffect(() => {
    let isMounted = true;
    safeStorage.getItem('bible_font_size').then((stored) => {
      if (isMounted && stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 26) {
          setFontSize(parsed);
          onSizeChange?.(parsed);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateSize = (newSize: number) => {
    const clamped = Math.max(12, Math.min(26, newSize));
    setFontSize(clamped);
    safeStorage.setItem('bible_font_size', String(clamped)).catch(() => {});
    onSizeChange?.(clamped);
  };

  return (
    <View style={[styles.fontSizeControls, style]}>
      <Pressable
        onPress={() => updateSize(fontSize - 2)}
        style={styles.fontBtn}
        accessibilityRole="button"
        accessibilityLabel="Decrease Bible font size"
        hitSlop={6}
      >
        <Text style={styles.fontBtnText}>A-</Text>
      </Pressable>
      <Text style={styles.fontSizeLabel}>{fontSize}</Text>
      <Pressable
        onPress={() => updateSize(fontSize + 2)}
        style={styles.fontBtn}
        accessibilityRole="button"
        accessibilityLabel="Increase Bible font size"
        hitSlop={6}
      >
        <Text style={styles.fontBtnText}>A+</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surfaceRaised,
    borderRadius: radii.controls,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  fontBtn: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  fontBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  fontSizeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginHorizontal: 3,
  },
});

export default FontSizeControls;
