import React from 'react';
import { StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../constants/theme';

interface AddNoteFABProps {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export default function AddNoteFAB({
  style,
  onPress,
  accessibilityLabel = 'Create note',
}: AddNoteFABProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/note/edit');
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        pressed && styles.pressed,
        style,
      ]}
      onPress={handlePress}
    >
      <Ionicons name="add" size={28} color={colors.bg.base} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: spacing.lg, // 24px above bottom edge
    right: spacing.md,  // 16px from right edge
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.keyIdea,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
