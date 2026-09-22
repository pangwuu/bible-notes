import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SourceSerifPro_400Regular,
  SourceSerifPro_600SemiBold,
  SourceSerifPro_700Bold,
  SourceSerifPro_400Regular_Italic,
} from '@expo-google-fonts/source-serif-pro';
import { colors, paperTheme, navigationTheme } from '../src/constants/theme';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { getAuthRedirect } from '../src/utils/authRouting';

// Keep splash screen visible while fonts and initial resources load
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore failure in web or reloaded environments
});

function RootNavigationLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Wait until navigation container is fully mounted and auth check is done
    if (!navigationState?.key || loading) {
      return;
    }

    const redirectRoute = getAuthRedirect(Boolean(user), segments);
    if (redirectRoute) {
      router.replace(redirectRoute as any);
    }
  }, [user, loading, segments, navigationState?.key]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accentKeyIdea} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.bgSurface,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 17,
            color: colors.textPrimary,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.bgBase,
          },
          animation: 'slide_from_right',
        }}
      >
        {/* Main App Tabs */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        {/* Auth Flow Group */}
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />

        {/* Note Detail */}
        <Stack.Screen
          name="note/[id]"
          options={{
            title: 'Note',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />

        {/* Note Editor */}
        <Stack.Screen
          name="note/edit"
          options={{
            title: 'Edit Note',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />

        {/* Friend Profile */}
        <Stack.Screen
          name="friend/[id]"
          options={{
            title: 'Friend Profile',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />

        {/* Notification Center Modal */}
        <Stack.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            presentation: 'modal',
            headerShown: true,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SourceSerifPro: SourceSerifPro_400Regular,
    'SourceSerifPro-Regular': SourceSerifPro_400Regular,
    'SourceSerifPro-SemiBold': SourceSerifPro_600SemiBold,
    'SourceSerifPro-Bold': SourceSerifPro_700Bold,
    'SourceSerifPro-Italic': SourceSerifPro_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <PaperProvider theme={paperTheme}>
          <AuthProvider>
            <RootNavigationLayout />
          </AuthProvider>
        </PaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
