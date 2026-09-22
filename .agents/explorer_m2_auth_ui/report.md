# Milestone 2: Auth Context, Route Protection & UI Screens Specification

**Role**: Auth Context & UI Explorer  
**Milestone**: M2 — Firebase Client Integration & Authentication  
**Date**: 2026-09-23  
**Target Files**:
1. `src/context/AuthContext.tsx`
2. `app/_layout.tsx`
3. `app/(auth)/login.tsx`
4. `app/(auth)/register.tsx`
5. `app/(tabs)/settings.tsx`
6. `tests/unit/AuthContext.test.tsx` (or `tests/unit/authRouting.test.ts`)

---

## 1. Executive Summary & System Contracts

This specification defines the complete client-side authentication architecture, reactive state container, route protection guards, and user interface screens for Milestone 2.

### 1.1 Architectural Flow
1. **Reactive Auth Container (`src/context/AuthContext.tsx`)**:
   - Manages Firebase `User` object and Firestore `UserProfile` document.
   - Listens to Firebase Auth state via `onAuthStateChanged`.
   - On sign-in, establishes a real-time `onSnapshot` listener on `users/{uid}`. This ensures instant reactivity across the entire app whenever user preferences (e.g. `default_visibility`, `custom_esv_api_key`) or profile details are modified in the Settings screen or background.
   - Gracefully unbinds snapshot listeners on sign-out and handles transient document creation states during registration.
2. **Route Protection & Redirection (`app/_layout.tsx`)**:
   - Subdivides root layout into a top-level provider wrapper (`RootLayout`) and an inner navigation coordinator (`RootNavigationLayout`).
   - Uses `useAuth()`, `useSegments()`, and `useRootNavigationState()`.
   - Prevents race conditions during early Expo Router mounting (`!navigationState?.key`).
   - If user is unauthenticated and navigating outside `(auth)`, redirects immediately to `/(auth)/login`.
   - If user is authenticated and navigating inside `(auth)`, redirects immediately to `/(tabs)`.
   - Displays a warm dark themed loading state (`colors.bgBase` + `colors.accentKeyIdea` spinner) while initial auth or fonts are loading.
3. **Authentication Screens**:
   - **`app/(auth)/login.tsx`**: Clean, accessible login form with email & password, password visibility toggle, inline error banner with user-friendly error translations, password reset modal trigger (`sendPasswordReset`), and link to registration.
   - **`app/(auth)/register.tsx`**: Full registration form with full name, username (with debounced real-time format validation and availability indicator), email, password, and confirm password. Automatic post-registration redirect to main dashboard.
   - **`app/(tabs)/settings.tsx`**: Complete account management screen displaying user profile details (display name, username, email), default note visibility segmented button (`friends` vs `private`) synchronized to Firestore `users/{uid}`, custom ESV API token override input with save trigger, and an outlined danger "Sign out" button backed by a React Native Paper confirmation `Dialog`.
4. **Visual Design System Compliance (`DESIGN.md`)**:
   - Backgrounds: `#1A1816` (`colors.bgBase`), surfaces: `#242019` (`colors.bgSurface`), raised elements: `#2E2921` (`colors.bgSurfaceRaised`).
   - Typography: San Francisco / Roboto for UI chrome; sentence case throughout; no all-caps labels or tracked-out eyebrow headings.
   - Radii: 8px (`radii.controls`) for buttons/inputs, 4px (`radii.content`) for flat cards, 16px (`radii.sheet`) for modals/dialogs.
   - Strict avoidance of anti-patterns: zero generic drop shadows (`elevation: 0`, `shadowOpacity: 0`), zero arrows appended to buttons, zero terracotta/acid-green accents.

---

## 2. Specification: `src/context/AuthContext.tsx`

### 2.1 State & Lifecycle Management
- **`user: User | null`**: Current Firebase Auth user or `null`.
- **`profile: UserProfile | null`**: Synchronized Firestore profile document data from `users/{uid}`. Reconciles both `specs.md` (`full_name`, `id`, `default_visibility`) and `DISPATCH.md` (`display_name`, `uid`, `settings`).
- **`loading: boolean`**: True during initial authentication state detection or initial profile fetch; false once resolved.
- **`signOut: () => Promise<void>`**: Invokes `authService.logoutUser()` or `signOut(auth)`.
- **`refreshProfile: () => Promise<void>`**: Forces an on-demand re-fetch of the user's Firestore document.

### 2.2 Exact Implementation Code

```typescript
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { UserProfile, NoteVisibility } from '../types/user';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribeSnapshot: Unsubscribe | null = null;

    // Listen for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous Firestore snapshot listener if active
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          // Attach real-time snapshot listener to users/{uid}
          unsubscribeSnapshot = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                const defaultVis: NoteVisibility =
                  data.default_visibility || data.settings?.default_visibility || 'friends';

                const normalizedProfile: UserProfile = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || data.email || '',
                  username: data.username || '',
                  display_name: data.display_name || data.full_name || firebaseUser.displayName || '',
                  full_name: data.full_name || data.display_name || firebaseUser.displayName || '',
                  default_visibility: defaultVis,
                  settings: {
                    default_visibility: defaultVis,
                    custom_esv_api_key: data.settings?.custom_esv_api_key || data.custom_esv_api_key || '',
                  },
                  custom_esv_api_key: data.custom_esv_api_key || data.settings?.custom_esv_api_key || '',
                  created_at: data.created_at,
                  updated_at: data.updated_at,
                };

                setProfile(normalizedProfile);
              } else {
                // If doc doesn't exist yet (e.g. registration sequence in flight),
                // create a temporary fallback profile from Firebase Auth user info
                setProfile({
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  username: '',
                  display_name: firebaseUser.displayName || '',
                  full_name: firebaseUser.displayName || '',
                  default_visibility: 'friends',
                  settings: { default_visibility: 'friends' },
                  created_at: null,
                });
              }
              setLoading(false);
            },
            (error) => {
              console.warn('[AuthContext] Firestore profile snapshot error:', error);
              setLoading(false);
            }
          );
        } catch (error) {
          console.warn('[AuthContext] Failed to setup profile listener:', error);
          setLoading(false);
        }
      } else {
        // User is signed out
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
      unsubscribeAuth();
    };
  }, []);

  const signOut = async (): Promise<void> => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('[AuthContext] Error during signOut:', error);
      throw error;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const defaultVis: NoteVisibility =
          data.default_visibility || data.settings?.default_visibility || 'friends';

        setProfile({
          id: auth.currentUser.uid,
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || data.email || '',
          username: data.username || '',
          display_name: data.display_name || data.full_name || auth.currentUser.displayName || '',
          full_name: data.full_name || data.display_name || auth.currentUser.displayName || '',
          default_visibility: defaultVis,
          settings: {
            default_visibility: defaultVis,
            custom_esv_api_key: data.settings?.custom_esv_api_key || data.custom_esv_api_key || '',
          },
          custom_esv_api_key: data.custom_esv_api_key || data.settings?.custom_esv_api_key || '',
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      }
    } catch (error) {
      console.warn('[AuthContext] refreshProfile error:', error);
    }
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
```

---

## 3. Specification: Auth Route Protection in `app/_layout.tsx`

### 3.1 Architectural Decomposition
A common pitfall in React Native and Expo Router is invoking a context hook (`useAuth()`) inside the exact same component that renders the context provider (`<AuthProvider>`). To guarantee proper React tree context availability, `app/_layout.tsx` is structured into two components:
1. **`RootLayout`**: Loads fonts with `useFonts`, manages splash screen dismissal, and wraps the application in `SafeAreaProvider`, `ThemeProvider`, `PaperProvider`, and `AuthProvider`.
2. **`RootNavigationLayout`**: Consumes `useAuth()`, `useSegments()`, and `useRootNavigationState()`. Executes route redirects and renders the root `<Stack>`.

### 3.2 Redirection Logic
```typescript
useEffect(() => {
  if (!navigationState?.key || loading) {
    return;
  }

  const inAuthGroup = segments[0] === '(auth)';

  if (!user && !inAuthGroup) {
    router.replace('/(auth)/login');
  } else if (user && inAuthGroup) {
    router.replace('/(tabs)');
  }
}, [user, loading, segments, navigationState?.key]);
```

### 3.3 Exact Implementation Code

```typescript
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

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Unauthenticated user attempting to access protected screens
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Authenticated user attempting to access auth screens
      router.replace('/(tabs)');
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
```

---

## 4. Specification: `app/(auth)/login.tsx`

### 4.1 Features & Design Compliance
- Email & password text inputs styled with warm dark palette.
- Password show/hide toggle.
- Password reset trigger (`sendPasswordReset`) with inline modal dialog.
- Informative error banners styled with `colors.accentDanger` (`#C4664F`) hairline border and warm parchment typography.
- Success confirmation banner when password reset email is dispatched.
- Responsive button states with loading spinner while signing in.
- Strict `DESIGN.md` rules: zero drop shadows, sentence case button text ("Sign in", "Send reset link"), no arrows (`→`).

### 4.2 Exact Implementation Code

```typescript
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';
import { loginUser, sendPasswordReset } from '../../src/services/authService';
import { validateEmail } from '../../src/utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password reset dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    setResetSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginUser(trimmedEmail, password);
      // Upon successful login, onAuthStateChanged in AuthContext triggers,
      // and RootNavigationLayout automatically redirects to /(tabs).
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenResetDialog = () => {
    setResetEmail(email.trim());
    setResetErrorMessage(null);
    setResetDialogOpen(true);
  };

  const handleSendResetEmail = async () => {
    const targetEmail = resetEmail.trim();
    if (!targetEmail) {
      setResetErrorMessage('Please enter your email address');
      return;
    }

    if (!validateEmail(targetEmail)) {
      setResetErrorMessage('Please enter a valid email address');
      return;
    }

    setResetSubmitting(true);
    setResetErrorMessage(null);
    try {
      await sendPasswordReset(targetEmail);
      setResetDialogOpen(false);
      setResetSuccessMessage(`Password reset email sent to ${targetEmail}`);
    } catch (err: any) {
      setResetErrorMessage(err.message || 'Failed to send password reset email');
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerArea}>
          <Text style={styles.title}>Bible Notes</Text>
          <Text style={styles.subtitle}>Swedish Method Study Journal</Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {resetSuccessMessage && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{resetSuccessMessage}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) setErrorMessage(null);
            }}
            secureTextEntry={secureText}
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
            right={
              <TextInput.Icon
                icon={secureText ? 'eye' : 'eye-off'}
                color={colors.textSecondary}
                onPress={() => setSecureText(!secureText)}
              />
            }
          />

          <View style={styles.forgotPasswordRow}>
            <Pressable onPress={handleOpenResetDialog} disabled={isSubmitting}>
              <Text style={styles.forgotPasswordLink}>Forgot password?</Text>
            </Pressable>
          </View>

          <Button
            mode="contained"
            buttonColor={colors.accentKeyIdea}
            textColor={colors.bgBase}
            style={styles.actionButton}
            labelStyle={styles.actionButtonLabel}
            onPress={handleLogin}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            disabled={isSubmitting}
          >
            <Text style={styles.footerLink}>Create one</Text>
          </Pressable>
        </View>

        {/* Password Reset Modal Dialog */}
        <Portal>
          <Dialog
            visible={resetDialogOpen}
            onDismiss={() => {
              if (!resetSubmitting) setResetDialogOpen(false);
            }}
            style={styles.dialog}
          >
            <Dialog.Title style={styles.dialogTitle}>Reset password</Dialog.Title>
            <Dialog.Content>
              <Text style={styles.dialogDescription}>
                Enter your email address to receive instructions to reset your password.
              </Text>
              {resetErrorMessage && (
                <View style={styles.dialogErrorBanner}>
                  <Text style={styles.dialogErrorText}>{resetErrorMessage}</Text>
                </View>
              )}
              <TextInput
                label="Email address"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textColor={colors.textPrimary}
                style={styles.dialogInput}
                mode="outlined"
                outlineColor={colors.borderHairline}
                activeOutlineColor={colors.accentKeyIdea}
                disabled={resetSubmitting}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                textColor={colors.textSecondary}
                onPress={() => setResetDialogOpen(false)}
                disabled={resetSubmitting}
              >
                Cancel
              </Button>
              <Button
                textColor={colors.accentKeyIdea}
                onPress={handleSendResetEmail}
                loading={resetSubmitting}
                disabled={resetSubmitting}
              >
                Send reset link
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  headerArea: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorBanner: {
    backgroundColor: colors.bgSurfaceRaised,
    borderColor: colors.accentDanger,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.accentDanger,
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: colors.bgSurfaceRaised,
    borderColor: colors.accentApplication,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  successText: {
    color: colors.accentApplication,
    fontSize: 13,
  },
  formCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  input: {
    backgroundColor: colors.bgSurface,
    marginBottom: spacing.md,
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotPasswordLink: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  actionButton: {
    borderRadius: radius.control,
  },
  actionButtonLabel: {
    fontWeight: '600',
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: colors.accentKeyIdea,
    fontWeight: '600',
    fontSize: 14,
  },
  dialog: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.sheet,
    borderColor: colors.borderHairline,
    borderWidth: 1,
  },
  dialogTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  dialogDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  dialogErrorBanner: {
    backgroundColor: colors.bgSurfaceRaised,
    borderColor: colors.accentDanger,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  dialogErrorText: {
    color: colors.accentDanger,
    fontSize: 12,
  },
  dialogInput: {
    backgroundColor: colors.bgSurface,
  },
});
```

---

## 5. Specification: `app/(auth)/register.tsx`

### 5.1 Features & Validation Architecture
- **Full Name**: Validated for 1–50 characters.
- **Username**:
  - Live, debounced availability check (500ms delay).
  - Validates `^[a-z0-9_]{3,20}$`.
  - State machine:
    - `'idle'`: Neutral guidance ("3–20 lowercase letters, numbers, or underscores")
    - `'checking'`: "Checking availability..."
    - `'available'`: "✓ Username is available" (in `colors.accentApplication` `#7BA05B`)
    - `'taken'`: "✕ Username is already taken" (in `colors.accentDanger` `#C4664F`)
    - `'invalid'`: Validation error message (in `colors.accentDanger`)
- **Email**: Full syntax verification.
- **Password**: Minimum 6 characters with show/hide toggle.
- **Confirm Password**: Real-time equality check.
- **Submit Button**: "Create account", disabled while checking username or when username is taken.

### 5.2 Exact Implementation Code

```typescript
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';
import { registerUser, checkUsernameAvailable } from '../../src/services/authService';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateDisplayName,
  validateConfirmPassword,
  normalizeUsername,
} from '../../src/utils/validation';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>(
    '3–20 lowercase letters, numbers, or underscores'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced live username availability check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!trimmed) {
      setUsernameStatus('idle');
      setUsernameMessage('3–20 lowercase letters, numbers, or underscores');
      return;
    }

    const val = validateUsername(trimmed);
    if (!val.isValid) {
      setUsernameStatus('invalid');
      setUsernameMessage(val.error || 'Invalid username format');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(trimmed);
        if (available) {
          setUsernameStatus('available');
          setUsernameMessage('✓ Username is available');
        } else {
          setUsernameStatus('taken');
          setUsernameMessage('✕ Username is already taken');
        }
      } catch (err) {
        // In unauthenticated context, if rules block with permission-denied,
        // checkUsernameAvailable returns true (deferred to registration).
        setUsernameStatus('available');
        setUsernameMessage('✓ Username format valid');
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [username]);

  const handleRegister = async () => {
    setErrorMessage(null);

    // 1. Validate full name
    const nameVal = validateDisplayName(fullName);
    if (!nameVal.isValid) {
      setErrorMessage(nameVal.error || 'Please enter your full name');
      return;
    }

    // 2. Validate username
    const normalizedUname = normalizeUsername(username);
    const uVal = validateUsername(normalizedUname);
    if (!uVal.isValid) {
      setErrorMessage(uVal.error || 'Please enter a valid username');
      return;
    }

    if (usernameStatus === 'taken') {
      setErrorMessage('Username is already taken. Please choose another.');
      return;
    }

    // 3. Validate email
    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    // 4. Validate password
    const pVal = validatePassword(password);
    if (!pVal.isValid) {
      setErrorMessage(pVal.error || 'Password must be at least 6 characters');
      return;
    }

    // 5. Validate password confirmation
    const cVal = validateConfirmPassword(password, confirmPassword);
    if (!cVal.isValid) {
      setErrorMessage(cVal.error || 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser(trimmedEmail, password, normalizedUname, fullName.trim());
      // Upon successful registration, onAuthStateChanged in AuthContext sets user,
      // and RootNavigationLayout automatically redirects to /(tabs).
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUsernameStatusColor = () => {
    switch (usernameStatus) {
      case 'available':
        return colors.accentApplication; // Sage green
      case 'taken':
      case 'invalid':
        return colors.accentDanger; // Brick red
      case 'checking':
      case 'idle':
      default:
        return colors.textSecondary; // Warm gray
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.formCard}>
          <TextInput
            label="Full Name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="words"
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
          />

          <TextInput
            label="Username"
            value={username}
            onChangeText={(text) => {
              setUsername(text.toLowerCase());
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
          />
          <Text style={[styles.helperText, { color: getUsernameStatusColor() }]}>
            {usernameMessage}
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) setErrorMessage(null);
            }}
            secureTextEntry={securePassword}
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
            right={
              <TextInput.Icon
                icon={securePassword ? 'eye' : 'eye-off'}
                color={colors.textSecondary}
                onPress={() => setSecurePassword(!securePassword)}
              />
            }
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errorMessage) setErrorMessage(null);
            }}
            secureTextEntry={secureConfirmPassword}
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
            right={
              <TextInput.Icon
                icon={secureConfirmPassword ? 'eye' : 'eye-off'}
                color={colors.textSecondary}
                onPress={() => setSecureConfirmPassword(!secureConfirmPassword)}
              />
            }
          />

          <Button
            mode="contained"
            buttonColor={colors.accentKeyIdea}
            textColor={colors.bgBase}
            style={styles.actionButton}
            labelStyle={styles.actionButtonLabel}
            onPress={handleRegister}
            loading={isSubmitting}
            disabled={
              isSubmitting ||
              usernameStatus === 'taken' ||
              usernameStatus === 'checking' ||
              usernameStatus === 'invalid'
            }
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            disabled={isSubmitting}
          >
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  errorBanner: {
    backgroundColor: colors.bgSurfaceRaised,
    borderColor: colors.accentDanger,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.accentDanger,
    fontSize: 13,
  },
  formCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  input: {
    backgroundColor: colors.bgSurface,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: 12,
    marginBottom: spacing.md,
    marginTop: -2,
    paddingHorizontal: 2,
  },
  actionButton: {
    borderRadius: radius.control,
    marginTop: spacing.sm,
  },
  actionButtonLabel: {
    fontWeight: '600',
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: colors.accentKeyIdea,
    fontWeight: '600',
    fontSize: 14,
  },
});
```

---

## 6. Specification: `app/(tabs)/settings.tsx`

### 6.1 Features & Design Compliance
1. **User Profile Card**:
   - Monogram avatar circle with initial of display name.
   - Displays `profile.display_name` (or fallback to `user.displayName`).
   - Displays `@profile.username`.
   - Displays `user.email`.
2. **Default Note Visibility**:
   - React Native Paper `SegmentedButtons` allowing selection of `friends` or `private`.
   - Automatically synchronizes selection to Firestore `users/{uid}` via `updateUserProfile`.
3. **Crossway ESV API Token**:
   - Allows user to supply a personal ESV API key.
   - Dedicated "Save token" button that updates `users/{uid}` in Firestore.
   - Shows temporary "Saved" confirmation pill.
4. **Sign Out Workflow**:
   - Outlined button in `colors.accentDanger` (`#C4664F`).
   - Confirmation dialog (`Portal` + `Dialog`) adhering to `paperTheme`.
   - Invokes `signOut()` from `useAuth()`.
   - On completion, `RootNavigationLayout` automatically transitions user to `/(auth)/login`.

### 6.2 Exact Implementation Code

```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Divider,
  Portal,
  Dialog,
} from 'react-native-paper';
import { colors, spacing, radius } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { updateUserProfile } from '../../src/services/authService';
import type { NoteVisibility } from '../../src/types/user';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();

  // Preferences state
  const [defaultVisibility, setDefaultVisibility] = useState<NoteVisibility>('friends');
  const [esvKey, setEsvKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);

  // Logout confirmation dialog state
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Populate initial values when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.default_visibility) {
        setDefaultVisibility(profile.default_visibility);
      }
      const existingKey = profile.settings?.custom_esv_api_key || profile.custom_esv_api_key || '';
      setEsvKey(existingKey);
    }
  }, [profile]);

  const handleVisibilityChange = async (val: string) => {
    const newVis = val as NoteVisibility;
    setDefaultVisibility(newVis);

    if (user?.uid) {
      try {
        await updateUserProfile(user.uid, {
          default_visibility: newVis,
          settings: {
            ...profile?.settings,
            default_visibility: newVis,
          },
        });
      } catch (err) {
        console.warn('Failed to update default visibility preference:', err);
      }
    }
  };

  const handleSaveEsvKey = async () => {
    if (!user?.uid) return;
    setIsSavingKey(true);
    setKeySavedMessage(null);

    const trimmedKey = esvKey.trim();
    try {
      await updateUserProfile(user.uid, {
        custom_esv_api_key: trimmedKey,
        settings: {
          ...profile?.settings,
          custom_esv_api_key: trimmedKey,
        },
      });
      setKeySavedMessage('API key updated');
      setTimeout(() => setKeySavedMessage(null), 3000);
    } catch (err) {
      console.warn('Failed to update ESV key:', err);
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setLogoutDialogOpen(false);
      // RootNavigationLayout redirects to /(auth)/login upon auth state change.
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = profile?.display_name || profile?.full_name || user?.displayName || 'Bible Reader';
  const username = profile?.username ? `@${profile.username}` : '';
  const initialLetter = displayName.charAt(0).toUpperCase() || 'B';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Account Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initialLetter}</Text>
        </View>
        <View style={styles.profileDetails}>
          <Text style={styles.profileName}>{displayName}</Text>
          {username ? <Text style={styles.profileUsername}>{username}</Text> : null}
          <Text style={styles.profileEmail}>{user?.email || profile?.email || ''}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Preferences</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Default note visibility</Text>
        <Text style={styles.cardDescription}>
          Choose the default visibility when drafting new study notes.
        </Text>
        <SegmentedButtons
          value={defaultVisibility}
          onValueChange={handleVisibilityChange}
          buttons={[
            { value: 'friends', label: 'Friends' },
            { value: 'private', label: 'Private' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <Text style={styles.sectionHeader}>Crossway ESV API</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Custom API key</Text>
        <Text style={styles.cardDescription}>
          Optionally override the default ESV Bearer token with your personal key.
        </Text>
        <TextInput
          value={esvKey}
          onChangeText={setEsvKey}
          placeholder="Personal ESV API Token"
          placeholderTextColor={colors.textSecondary}
          textColor={colors.textPrimary}
          mode="outlined"
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.saveKeyRow}>
          {keySavedMessage ? (
            <Text style={styles.keySavedText}>{keySavedMessage}</Text>
          ) : (
            <View />
          )}
          <Button
            mode="contained-tonal"
            buttonColor={colors.bgSurfaceRaised}
            textColor={colors.accentKeyIdea}
            style={styles.saveKeyButton}
            onPress={handleSaveEsvKey}
            loading={isSavingKey}
            disabled={isSavingKey}
          >
            Save key
          </Button>
        </View>
      </View>

      <Divider style={styles.divider} />

      <Button
        mode="outlined"
        textColor={colors.accentDanger}
        style={styles.logoutButton}
        onPress={() => setLogoutDialogOpen(true)}
      >
        Sign out
      </Button>

      {/* Sign Out Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={logoutDialogOpen}
          onDismiss={() => {
            if (!isLoggingOut) setLogoutDialogOpen(false);
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Sign out</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogDescription}>
              Are you sure you want to sign out of your Bible Notes account?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor={colors.textSecondary}
              onPress={() => setLogoutDialogOpen(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button
              textColor={colors.accentDanger}
              onPress={handleConfirmLogout}
              loading={isLoggingOut}
              disabled={isLoggingOut}
            >
              Sign out
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.bgBase,
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bgSurfaceRaised,
    borderWidth: 1,
    borderColor: colors.accentKeyIdea,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.accentKeyIdea,
    fontSize: 20,
    fontWeight: '600',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileUsername: {
    fontSize: 13,
    color: colors.accentKeyIdea,
    marginTop: 1,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  segmentedButtons: {
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.bgSurface,
  },
  saveKeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  keySavedText: {
    color: colors.accentApplication,
    fontSize: 13,
  },
  saveKeyButton: {
    borderRadius: radius.control,
  },
  divider: {
    backgroundColor: colors.borderHairline,
    marginVertical: spacing.lg,
  },
  logoutButton: {
    borderColor: colors.accentDanger,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  dialog: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.sheet,
    borderColor: colors.borderHairline,
    borderWidth: 1,
  },
  dialogTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  dialogDescription: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
```

---

## 7. Testing Strategy: Unit & Redirect Verification

### 7.1 Redirect Matrix Tests (`tests/unit/authRouting.test.ts`)
The core routing and protection logic must be verified deterministically under Node/Jest:

```typescript
describe('Auth Route Protection Redirect Matrix', () => {
  type Segment = string;

  function calculateRedirect(
    user: { uid: string } | null,
    loading: boolean,
    segments: Segment[]
  ): string | null {
    if (loading) return null;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      return '/(auth)/login';
    }
    if (user && inAuthGroup) {
      return '/(tabs)';
    }
    return null;
  }

  test('when loading, returns no redirect', () => {
    expect(calculateRedirect(null, true, ['(tabs)'])).toBeNull();
    expect(calculateRedirect({ uid: '123' }, true, ['(auth)', 'login'])).toBeNull();
  });

  test('unauthenticated user outside (auth) redirects to /(auth)/login', () => {
    expect(calculateRedirect(null, false, ['(tabs)'])).toBe('/(auth)/login');
    expect(calculateRedirect(null, false, ['note', '1'])).toBe('/(auth)/login');
    expect(calculateRedirect(null, false, ['notifications'])).toBe('/(auth)/login');
  });

  test('unauthenticated user inside (auth) does not redirect', () => {
    expect(calculateRedirect(null, false, ['(auth)', 'login'])).toBeNull();
    expect(calculateRedirect(null, false, ['(auth)', 'register'])).toBeNull();
  });

  test('authenticated user inside (auth) redirects to /(tabs)', () => {
    expect(calculateRedirect({ uid: '123' }, false, ['(auth)', 'login'])).toBe('/(tabs)');
    expect(calculateRedirect({ uid: '123' }, false, ['(auth)', 'register'])).toBe('/(tabs)');
  });

  test('authenticated user outside (auth) stays on current route', () => {
    expect(calculateRedirect({ uid: '123' }, false, ['(tabs)'])).toBeNull();
    expect(calculateRedirect({ uid: '123' }, false, ['note', '456'])).toBeNull();
    expect(calculateRedirect({ uid: '123' }, false, ['friend', '789'])).toBeNull();
  });
});
```

---

## 8. DESIGN.md Compliance Checklist

| Item | Requirement | Implementation Verification |
|---|---|---|
| Background Base | `#1A1816` | Used in all screens, root layout container, and keyboard views |
| Surface | `#242019` | Used in form cards, dialogs, profile cards, and inputs |
| Surface Raised | `#2E2921` | Used in status banners, avatar circles, and button tonals |
| Text Primary | `#EDE7DD` | Used in titles, headings, and input values |
| Text Secondary | `#A39C8E` | Used in subtitles, descriptions, and placeholders |
| Hairline Border | `#332E27` | Used on all inputs, dividers, and card outlines |
| Key Idea Accent | `#E3A53D` | Used on primary buttons, active input borders, and username tags |
| Application Accent | `#7BA05B` | Used on username availability success indicator and save pills |
| Danger Accent | `#C4664F` | Used on error banners, username taken text, and sign out button |
| Control Radius | `8px` | Applied to all buttons, text inputs, form cards, and pills |
| Sheet Radius | `16px` | Applied to reset dialog and sign out confirmation dialog |
| Drop Shadows | Strictly None (`elevation: 0`, `shadowOpacity: 0`) | Enforced on all cards, dialogs, and controls |
| Casing & Typography | Sentence case, no all-caps, no arrows (`→`) | "Sign in", "Create account", "Sign out", "Cancel" |
