import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/constants/theme';
import { useIosPwaHeaderOptions } from '../../src/hooks/useIosPwaHeaderOptions';

export default function AuthLayout() {
  const iosPwaHeaderOptions = useIosPwaHeaderOptions();

  return (
    <Stack
      screenOptions={{
        ...iosPwaHeaderOptions,
        headerStyle: {
          backgroundColor: colors.bgBase,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.bgBase,
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Create Account',
          headerShown: true,
          headerBackTitle: 'Sign In',
        }}
      />
    </Stack>
  );
}
