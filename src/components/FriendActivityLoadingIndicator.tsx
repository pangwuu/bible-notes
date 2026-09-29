import React from 'react';
import { View, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing, radius } from '../constants/theme';

export interface FriendActivityLoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export const FriendActivityLoadingIndicator: React.FC<FriendActivityLoadingIndicatorProps> = ({
  message = 'Loading friend activity...',
  size = 'small',
  color = colors.accentSocial,
  style,
  compact = false,
}) => {
  if (compact) {
    return (
      <View
        style={[styles.compactContainer, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={message}
      >
        <ActivityIndicator size={size} color={color} />
        <Text style={styles.compactText} numberOfLines={1}>
          {message}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator size={size} color={color} />
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    borderRadius: radius.content,
    padding: spacing.md,
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(180, 120, 158, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(180, 120, 158, 0.3)',
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  messageText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  compactText: {
    fontSize: 12,
    color: colors.accentSocial,
    fontWeight: '500',
  },
});

export default FriendActivityLoadingIndicator;
