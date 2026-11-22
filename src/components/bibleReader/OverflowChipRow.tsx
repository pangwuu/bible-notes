import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';

interface OverflowChipRowProps {
  children: React.ReactNode;
  /** Background the edge fades blend into; must match the container behind the row. */
  fadeColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const EDGE_EPSILON = 4;

export const OverflowChipRow: React.FC<OverflowChipRowProps> = ({
  children,
  fadeColor = colors.bg.surfaceRaised,
  style,
  testID,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const overflowRight = contentWidth - viewportWidth - scrollX > EDGE_EPSILON;
  const overflowLeft = scrollX > EDGE_EPSILON;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportWidth(e.nativeEvent.layout.width);
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  }, []);

  const page = useCallback(
    (direction: 1 | -1) => {
      const step = Math.max(viewportWidth * 0.75, 80);
      const maxX = Math.max(0, contentWidth - viewportWidth);
      const next = Math.min(maxX, Math.max(0, scrollX + direction * step));
      scrollRef.current?.scrollTo({ x: next, animated: true });
    },
    [viewportWidth, contentWidth, scrollX]
  );

  return (
    <View style={[styles.wrapper, style]} onLayout={onLayout} testID={testID}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      {overflowLeft && (
        <Pressable
          onPress={() => page(-1)}
          style={[styles.edge, styles.edgeLeft, { backgroundColor: fadeColor }]}
          accessibilityRole="button"
          accessibilityLabel="Scroll to previous options"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={16} color={colors.text.secondary} />
          <View pointerEvents="none" style={[styles.fade, styles.fadeLeft, { backgroundColor: fadeColor }]} />
        </Pressable>
      )}

      {overflowRight && (
        <Pressable
          onPress={() => page(1)}
          style={[styles.edge, styles.edgeRight, { backgroundColor: fadeColor }]}
          accessibilityRole="button"
          accessibilityLabel="Scroll to more options"
          hitSlop={8}
        >
          <View pointerEvents="none" style={[styles.fade, styles.fadeRight, { backgroundColor: fadeColor }]} />
          <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  edge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edgeLeft: {
    left: 0,
  },
  edgeRight: {
    right: 0,
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 12,
    opacity: 0.6,
  },
  fadeLeft: {
    left: 24,
  },
  fadeRight: {
    right: 24,
  },
});

export default OverflowChipRow;
