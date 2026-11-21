import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import HeaderNotificationBell from '../../src/components/HeaderNotificationBell';
import { useIosPwaHeaderOptions } from '../../src/hooks/useIosPwaHeaderOptions';

export default function TabsLayout() {
  const { profile } = useAuth();
  const enableFriends = profile?.settings?.enable_friends !== false;
  const insets = useSafeAreaInsets();
  const iosPwaHeaderOptions = useIosPwaHeaderOptions();
  const isWeb = Platform.OS === 'web';
  const bottomInset = insets.bottom > 0 ? insets.bottom + (isWeb ? 4 : 0) : isWeb ? 12 : 8;

  return (
    <Tabs
      screenOptions={{
        ...iosPwaHeaderOptions,
        headerStyle: {
          backgroundColor: colors.bgSurface,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderHairline,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderHairline,
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 4,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 44,
        },
        tabBarActiveTintColor: colors.accentKeyIdea,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
          fontWeight: '500',
        },
        headerRight: () => <HeaderNotificationBell />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarLabel: 'Notes',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'library' : 'library-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
          tabBarLabel: 'Bible',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'book' : 'book-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="friends"
        options={{
          href: enableFriends ? '/(tabs)/friends' : null,
          title: 'Friends',
          tabBarLabel: 'Friends',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          headerRight: () => null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
