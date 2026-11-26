import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, LayoutChangeEvent } from 'react-native';
import { Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../constants/theme';

interface DockedActionBarProps {
  visible: boolean;
  children: React.ReactNode;
  onHeightChange?: (height: number) => void;
  /** Distance from the bottom of the window; defaults to just above the safe area. */
  bottomOffset?: number;
}

/**
 * Renders the verse action bar at the app root (via Paper's Portal) so it stays
 * pinned to the bottom of the screen instead of scrolling with the passage.
 */
export const DockedActionBar: React.FC<DockedActionBarProps> = ({
  visible,
  children,
  onHeightChange,
  bottomOffset,
}) => {
  const insets = useSafeAreaInsets();
  const bottom = bottomOffset ?? insets.bottom + spacing.sm;
  // With a custom offset the bar floats above other chrome (e.g. a tab bar), so only
  // the bar itself plus its gap overlaps the screen's scroll area.
  const overlapBelowBar = bottomOffset !== undefined ? spacing.sm : insets.bottom + spacing.sm;
  const translate = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      translate.setValue(24);
      opacity.setValue(0);
      onHeightChange?.(0);
      return;
    }
    Animated.parallel([
      Animated.timing(translate, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [visible, translate, opacity, onHeightChange]);

  useEffect(() => () => onHeightChange?.(0), [onHeightChange]);

  if (!visible) return null;

  const handleLayout = (e: LayoutChangeEvent) => {
    onHeightChange?.(e.nativeEvent.layout.height + overlapBelowBar);
  };

  return (
    <Portal>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Animated.View
          onLayout={handleLayout}
          style={[
            styles.dock,
            { bottom, opacity, transform: [{ translateY: translate }] },
          ]}
        >
          <View style={styles.inner}>{children}</View>
        </Animated.View>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 720,
  },
});
