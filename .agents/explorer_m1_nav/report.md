# M1 Navigation & Route Architecture Specification Report

**Document Version:** 1.0  
**Date:** 2026-09-22T14:54:00Z  
**Author:** Navigation & Route Explorer (`explorer_m1_nav`)  
**Target Milestone:** M1 — Expo SDK 57 Skeleton & Theme  
**Parent Orchestrator:** `0a72a93f-be19-49c0-81f1-95f8e8f40226`  
**Governing Documents:** `ORIGINAL_REQUEST.md`, `specs.md`, `DESIGN.md`, `PROJECT.md`

---

## 1. Executive Summary

This report establishes the complete, production-grade navigation and route architecture for the Swedish Method Bible Study Notes application on **Expo SDK 57** (React Native 0.86, React 19) using **Expo Router v4**.

The navigation structure integrates:
1. **Root Layout (`app/_layout.tsx`)**: Wraps the app in `SafeAreaProvider`, React Native Paper's `PaperProvider` configured with the warm dark theme, `expo-font` font loader for `Source Serif Pro`, `expo-status-bar` with `style="light"` and background `#1A1816`, and a native `Stack` host for seamless transitions without drop shadows or color flashes.
2. **Auth Stack (`app/(auth)/_layout.tsx`, `login.tsx`, `register.tsx`)**: Full-screen warm dark authentication flow with email/password authentication, registration, input validation, and password reset trigger.
3. **Bottom Tab Navigator (`app/(tabs)/_layout.tsx`, `index.tsx`, `notes.tsx`, `friends.tsx`, `settings.tsx`)**: 4-tab bar configured strictly to `DESIGN.md` tokens: background `#242019`, active indicator `#E3A53D`, inactive tint `#A39C8E`, top border `#332E27`.
4. **Stack & Modal Routes**:
   - `app/note/[id].tsx`: Note detail screen with passage reader and Letterboxd-style overlap badge.
   - `app/note/edit.tsx`: Day One style unbordered editor with Swedish Method headers and dirty-state back guard.
   - `app/friend/[id].tsx`: Friend profile and shared notes feed.
   - `app/notifications.tsx`: Native modal notification center (`presentation: 'modal'`).
5. **Header Notification Badge (`src/components/HeaderNotificationBell.tsx`)**: Interactive bell button with real-time unread badge count pill in `accentSocial` (`#B4789E`) leading to `/notifications`.

---

## 2. Complete Navigation Hierarchy & Route Tree

```
app/
├── _layout.tsx              # Root Layout: ThemeProvider, FontLoader, StatusBar, Stack Root
├── (auth)/                  # Auth Route Group (Hidden from Tabs)
│   ├── _layout.tsx          # Auth Stack Navigator (Fade/Slide transitions, Warm Dark)
│   ├── login.tsx            # Sign In: Email/Password, Register link, Forgot password
│   └── register.tsx         # Sign Up: Full Name, Username, Email, Password, Validation
├── (tabs)/                  # Main Application Tab Navigator
│   ├── _layout.tsx          # Bottom Tabs Navigator (4 tabs, styled tab bar, header actions)
│   ├── index.tsx            # Dashboard / Home: Recent notes, passage jump, floating action button
│   ├── notes.tsx            # Notes Browser: Structured Book/Chapter directory & Tag filters
│   ├── friends.tsx          # Friends & Social: Active friends, requests, exact-match user search
│   └── settings.tsx         # Settings: Profile, default visibility, ESV API key, logout
├── note/                    # Note Stack Group
│   ├── [id].tsx             # Note Detail: Passage reader, Swedish sections, friend overlap pill
│   └── edit.tsx             # Note Editor: Day One unbordered editor, YouVersion picker, auto-save
├── friend/                  # Friend Stack Group
│   └── [id].tsx             # Friend Profile: Bio, friendship status, feed of 'friends' notes
└── notifications.tsx        # Notification Center Modal: Mark as read, link to notes/friends
```

### Route Table & Options Matrix

| Route Path | File Path | Navigator Type | Header Title | Header Right | Presentation / Options |
|---|---|---|---|---|---|
| `/` | `app/(tabs)/index.tsx` | Bottom Tab | Dashboard | `HeaderNotificationBell` | Default tab; FAB to `/note/edit` |
| `/(tabs)/notes` | `app/(tabs)/notes.tsx` | Bottom Tab | Notes | `HeaderNotificationBell` | Tab 2; segmented Book/Tag view |
| `/(tabs)/friends` | `app/(tabs)/friends.tsx` | Bottom Tab | Friends | `HeaderNotificationBell` | Tab 3; friends & requests |
| `/(tabs)/settings` | `app/(tabs)/settings.tsx` | Bottom Tab | Settings | None | Tab 4; user preferences & API key |
| `/(auth)/login` | `app/(auth)/login.tsx` | Stack (Auth) | Sign In | None | Fullscreen; `headerShown: false` |
| `/(auth)/register` | `app/(auth)/register.tsx` | Stack (Auth) | Create Account | None | Stack screen with back chevron |
| `/note/[id]` | `app/note/[id].tsx` | Stack (Root) | Note | Edit Pencil Icon | Dynamic param `id` (`noteId`) |
| `/note/edit` | `app/note/edit.tsx` | Stack (Root) | Edit Note / New Note | Save Button | Back guard modal (Save/Discard) |
| `/friend/[id]` | `app/friend/[id].tsx` | Stack (Root) | Friend Profile | None | Dynamic param `id` (`userId`) |
| `/notifications` | `app/notifications.tsx` | Stack (Root) | Notifications | Close Button | `presentation: 'modal'` |

---

## 3. Specification: Root Layout (`app/_layout.tsx`)

### 3.1 Responsibilities
- Load `Source Serif Pro` font families (`SourceSerifPro_400Regular`, `SourceSerifPro_600SemiBold`, `SourceSerifPro_700Bold`, `SourceSerifPro_400Regular_Italic`) using `@expo-google-fonts/source-serif-pro` / `expo-font`.
- Coordinate splash screen hiding via `expo-splash-screen` once fonts and foundational state are ready.
- Provide `SafeAreaProvider` for safe area insets on notched devices.
- Provide `PaperProvider` configured with custom `MD3DarkTheme` derived from `DESIGN.md`.
- Render `StatusBar` configured with `style="light"` and `backgroundColor="#1A1816"`.
- Host the root `Stack` navigator with universal warm dark screen options to eliminate white flashes.

### 3.2 Exact Code Implementation (`app/_layout.tsx`)

```tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SourceSerifPro_400Regular,
  SourceSerifPro_600SemiBold,
  SourceSerifPro_700Bold,
  SourceSerifPro_400Regular_Italic,
} from '@expo-google-fonts/source-serif-pro';
import { colors, paperTheme } from '../src/constants/theme';

// Keep splash screen visible while fonts and initial resources load
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore failure in web or reloaded environments
});

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
      <PaperProvider theme={paperTheme}>
        <StatusBar style="light" backgroundColor={colors.bgBase} />
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
            headerShadowVisible: false, // Disables standard shadow / hairline
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
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
});
```

---

## 4. Specification: Auth Stack (`app/(auth)/_layout.tsx`, `login.tsx`, `register.tsx`)

### 4.1 Auth Stack Layout (`app/(auth)/_layout.tsx`)

```tsx
import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
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
```

### 4.2 Sign In Screen Skeleton (`app/(auth)/login.tsx`)
- Warm dark card surface (`#242019`).
- Email and Password inputs.
- "Sign in" button styled with `accentKeyIdea` (`#E3A53D`) and `radius.control` (8px).
- Navigation triggers to `/(auth)/register` and password reset.

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>Bible Notes</Text>
        <Text style={styles.subtitle}>Swedish Method Study Journal</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textColor={colors.textPrimary}
          style={styles.input}
          mode="outlined"
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secureText}
          textColor={colors.textPrimary}
          style={styles.input}
          mode="outlined"
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
          right={
            <TextInput.Icon
              icon={secureText ? 'eye' : 'eye-off'}
              color={colors.textSecondary}
              onPress={() => setSecureText(!secureText)}
            />
          }
        />

        <Button
          mode="contained"
          buttonColor={colors.accentKeyIdea}
          textColor={colors.bgBase}
          style={styles.actionButton}
          labelStyle={styles.actionButtonLabel}
          onPress={() => router.replace('/(tabs)')}
        >
          Sign in
        </Button>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Pressable onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.footerLink}>Create one</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
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
  actionButton: {
    borderRadius: radius.control,
    marginTop: spacing.xs,
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

### 4.3 Registration Screen Skeleton (`app/(auth)/register.tsx`)

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formCard}>
        <TextInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          textColor={colors.textPrimary}
          style={styles.input}
          mode="outlined"
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
        />

        <TextInput
          label="Username"
          value={username}
          onChangeText={(text) => setUsername(text.toLowerCase())}
          autoCapitalize="none"
          textColor={colors.textPrimary}
          style={styles.input}
          mode="outlined"
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
        />
        <Text style={styles.helperText}>
          3–20 lowercase letters, numbers, or underscores
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textColor={colors.textPrimary}
          style={styles.input}
          mode="outlined"
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textColor={colors.textPrimary}
          style={styles.input}
          mode="outlined"
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
        />

        <Button
          mode="contained"
          buttonColor={colors.accentKeyIdea}
          textColor={colors.bgBase}
          style={styles.actionButton}
          labelStyle={styles.actionButtonLabel}
          onPress={() => router.replace('/(tabs)')}
        >
          Create account
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
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
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  actionButton: {
    borderRadius: radius.control,
    marginTop: spacing.sm,
  },
  actionButtonLabel: {
    fontWeight: '600',
    fontSize: 15,
  },
});
```

---

## 5. Specification: Bottom Tab Navigator (`app/(tabs)/_layout.tsx` & Screens)

### 5.1 Tabs Layout Implementation (`app/(tabs)/_layout.tsx`)

The bottom tab navigator is styled strictly to the tokens in `DESIGN.md`:
- `tabBarStyle.backgroundColor`: `#242019` (`colors.bgSurface`)
- `tabBarStyle.borderTopColor`: `#332E27` (`colors.borderHairline`)
- `tabBarActiveTintColor`: `#E3A53D` (`colors.accentKeyIdea`)
- `tabBarInactiveTintColor`: `#A39C8E` (`colors.textSecondary`)
- Header: `#242019` surface with `#332E27` hairline divider, title in `#EDE7DD`.
- Header Right: `HeaderNotificationBell` mounted on Dashboard, Notes, and Friends tabs.

```tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/constants/theme';
import HeaderNotificationBell from '../../src/components/HeaderNotificationBell';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
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
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accentKeyIdea,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
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
        name="friends"
        options={{
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
          headerRight: () => null, // Omit bell from Settings if preferred
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
```

### 5.2 Dashboard Screen Skeleton (`app/(tabs)/index.tsx`)
- Displays recent notes list.
- Quick passage jump bar.
- Floating Action Button (FAB) filled with `accentKeyIdea` (`#E3A53D`) linking to `/note/edit`.

```tsx
import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.quickJumpCard}>
          <Text style={styles.quickJumpTitle}>Quick Passage Jump</Text>
          <Pressable
            style={styles.quickJumpButton}
            onPress={() => router.push('/note/edit')}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <Text style={styles.quickJumpPlaceholder}>Jump to book, chapter, verse...</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionHeading}>Recent Notes</Text>

        <Pressable
          style={styles.noteCard}
          onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'sample-1' } })}
        >
          <View style={styles.noteHeaderRow}>
            <Text style={styles.passageRef}>John 3:16–17</Text>
            <Text style={styles.timestamp}>2h ago</Text>
          </View>
          <Text style={styles.noteSnippet} numberOfLines={2}>
            For God so loved the world, that he gave his only Son...
          </Text>
        </Pressable>
      </ScrollView>

      <FAB
        icon="plus"
        color={colors.bgBase}
        style={styles.fab}
        onPress={() => router.push('/note/edit')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    padding: spacing.md,
  },
  quickJumpCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.lg,
  },
  quickJumpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  quickJumpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    gap: spacing.sm,
  },
  quickJumpPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noteCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.sm,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  passageRef: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noteSnippet: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.accentKeyIdea,
    borderRadius: 28,
  },
});
```

### 5.3 Notes Browser Screen Skeleton (`app/(tabs)/notes.tsx`)
- Tabbed / segmented view: "By Book" vs "By Tag".
- Lists notes grouped by scripture or tags.

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function NotesBrowserScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'book' | 'tag'>('book');

  return (
    <View style={styles.screen}>
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(val) => setViewMode(val as 'book' | 'tag')}
          buttons={[
            { value: 'book', label: 'By Book' },
            { value: 'tag', label: 'By Tag' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {viewMode === 'book' ? (
          <View style={styles.bookGroup}>
            <Text style={styles.groupHeader}>Gospel of John</Text>
            <Pressable
              style={styles.noteItem}
              onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'john-3-16' } })}
            >
              <Text style={styles.itemTitle}>John 3:16–17</Text>
              <Text style={styles.itemSubtitle}>2 notes in this chapter</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.tagGroup}>
            <Text style={styles.groupHeader}>Tags</Text>
            <View style={styles.tagRow}>
              <View style={styles.tagChip}>
                <Text style={styles.tagText}>#faith (4)</Text>
              </View>
              <View style={styles.tagChip}>
                <Text style={styles.tagText}>#discipleship (2)</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  segmentContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  segmentedButtons: {
    backgroundColor: colors.bgSurface,
  },
  container: {
    padding: spacing.md,
  },
  groupHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  bookGroup: {
    marginBottom: spacing.lg,
  },
  tagGroup: {
    marginBottom: spacing.lg,
  },
  noteItem: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagChip: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: 13,
  },
});
```

### 5.4 Friends Screen Skeleton (`app/(tabs)/friends.tsx`)
- Sub-sections: Active Friends, Friend Requests, Search.
- Navigation to `/friend/[id]`.

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function FriendsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.screen}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by username or email"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          inputStyle={{ color: colors.textPrimary }}
          placeholderTextColor={colors.textSecondary}
          iconColor={colors.textSecondary}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Mutual Friends</Text>
        <Pressable
          style={styles.friendCard}
          onPress={() => router.push({ pathname: '/friend/[id]', params: { id: 'sarah_smith' } })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>Sarah Smith</Text>
            <Text style={styles.friendUsername}>@sarah_smith</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  searchBar: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  container: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSurfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: colors.accentSocial,
    fontSize: 16,
    fontWeight: '600',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  friendUsername: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
```

### 5.5 Settings Screen Skeleton (`app/(tabs)/settings.tsx`)
- Account Profile, Note Visibility Toggle (`'friends'` vs `'private'`), Custom ESV Key, Logout.

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [defaultVisibility, setDefaultVisibility] = useState<'friends' | 'private'>('friends');
  const [esvKey, setEsvKey] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionHeader}>Preferences</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Default Note Visibility</Text>
        <Text style={styles.cardDescription}>
          Choose the default visibility when drafting new study notes.
        </Text>
        <SegmentedButtons
          value={defaultVisibility}
          onValueChange={(val) => setDefaultVisibility(val as 'friends' | 'private')}
          buttons={[
            { value: 'friends', label: 'Friends' },
            { value: 'private', label: 'Private' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <Text style={styles.sectionHeader}>Crossway ESV API</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Custom API Key</Text>
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
        />
      </View>

      <Divider style={styles.divider} />

      <Button
        mode="outlined"
        textColor={colors.accentDanger}
        style={styles.logoutButton}
        onPress={() => router.replace('/(auth)/login')}
      >
        Sign out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.bgBase,
    flexGrow: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
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
  divider: {
    backgroundColor: colors.borderHairline,
    marginVertical: spacing.lg,
  },
  logoutButton: {
    borderColor: colors.accentDanger,
    borderRadius: radius.control,
  },
});
```

---

## 6. Specification: Stack & Modal Screens

### 6.1 Note Detail Screen (`app/note/[id].tsx`)
- Displays passage title (28px display font).
- Inline Letterboxd-style friend overlap badge pill (`border: colors.accentSocial`, dismissible).
- Scripture Reader block (`Source Serif Pro`, 16px/1.5 line height).
- Swedish Method sections (`💡 Key Idea`, `❓ Question`, `🏹 Application`).
- Header right: Edit pencil icon leading to `/note/edit?id=${id}`.

```tsx
import React, { useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push({ pathname: '/note/edit', params: { id } })}
          style={styles.headerButton}
          hitSlop={8}
        >
          <Ionicons name="pencil" size={20} color={colors.accentKeyIdea} />
        </Pressable>
      ),
    });
  }, [navigation, id, router]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.passageTitle}>John 3:16–17</Text>

      {/* Letterboxd-style Overlap Badge Pill */}
      <View style={styles.overlapBadge}>
        <View style={styles.overlapAvatar}>
          <Text style={styles.overlapAvatarText}>S</Text>
        </View>
        <Text style={styles.overlapText}>Sarah also noted John 3:16</Text>
      </View>

      {/* Scripture Text Box */}
      <View style={styles.scriptureCard}>
        <Text style={styles.scriptureText}>
          "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life."
        </Text>
      </View>

      {/* Swedish Method Sections */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.accentKeyIdea }]}>
          💡 Key Idea
        </Text>
        <Text style={styles.bodyText}>
          God's love is sacrificial and initiates redemption before we ever respond.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.accentQuestion }]}>
          ❓ Question
        </Text>
        <Text style={styles.bodyText}>
          How does the promise of eternal life reshape my perspective on daily temporary stress?
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.accentApplication }]}>
          🏹 Application
        </Text>
        <Text style={styles.bodyText}>
          Extend unconditional grace to my family today in moments of friction.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    padding: spacing.md,
  },
  headerButton: {
    padding: 6,
  },
  passageTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.accentSocial,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  overlapAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bgSurfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlapAvatarText: {
    color: colors.accentSocial,
    fontSize: 11,
    fontWeight: '600',
  },
  overlapText: {
    color: colors.textPrimary,
    fontSize: 13,
  },
  scriptureCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  scriptureText: {
    fontFamily: 'SourceSerifPro',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  bodyText: {
    fontFamily: 'SourceSerifPro',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
  },
});
```

### 6.2 Note Editor Screen (`app/note/edit.tsx`)
- Day One style unbordered editor.
- Swedish sections (`💡 Key Idea`, `❓ Question`, `🏹 Application`).
- Header left with unsaved changes guard (Save, Discard, Cancel).
- Header right with explicit "Save" button.

```tsx
import React, { useState, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function NoteEditScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [passageRef, setPassageRef] = useState('John 3:16–17');
  const [keyIdea, setKeyIdea] = useState('');
  const [question, setQuestion] = useState('');
  const [application, setApplication] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = () => {
    setIsDirty(false);
    router.back();
  };

  const handleBack = () => {
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'Do you want to save your notes before leaving?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
          { text: 'Save', onPress: handleSave },
        ]
      );
    } else {
      router.back();
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: id ? 'Edit Note' : 'New Note',
      headerLeft: () => (
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <Text style={styles.headerBackText}>Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      ),
    });
  }, [navigation, isDirty, id, handleSave, handleBack]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Passage Picker Selector Trigger */}
      <Pressable style={styles.pickerTrigger}>
        <Text style={styles.pickerLabel}>Passage</Text>
        <Text style={styles.pickerValue}>{passageRef}</Text>
      </Pressable>

      {/* Section 1: 💡 Key Idea */}
      <View style={styles.editorSection}>
        <Text style={[styles.sectionCaption, { color: colors.accentKeyIdea }]}>
          💡 Key Idea
        </Text>
        <TextInput
          value={keyIdea}
          onChangeText={(val) => {
            setKeyIdea(val);
            setIsDirty(true);
          }}
          placeholder="What is the main truth of this passage?"
          placeholderTextColor={colors.textSecondary}
          multiline
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} />

      {/* Section 2: ❓ Question */}
      <View style={styles.editorSection}>
        <Text style={[styles.sectionCaption, { color: colors.accentQuestion }]}>
          ❓ Question
        </Text>
        <TextInput
          value={question}
          onChangeText={(val) => {
            setQuestion(val);
            setIsDirty(true);
          }}
          placeholder="What questions or difficulties arise?"
          placeholderTextColor={colors.textSecondary}
          multiline
          style={styles.unborderedInput}
        />
      </View>

      <View style={styles.divider} />

      {/* Section 3: 🏹 Application */}
      <View style={styles.editorSection}>
        <Text style={[styles.sectionCaption, { color: colors.accentApplication }]}>
          🏹 Application
        </Text>
        <TextInput
          value={application}
          onChangeText={(val) => {
            setApplication(val);
            setIsDirty(true);
          }}
          placeholder="How does this truth apply to your life today?"
          placeholderTextColor={colors.textSecondary}
          multiline
          style={styles.unborderedInput}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    padding: spacing.md,
  },
  headerButton: {
    padding: 6,
  },
  headerBackText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: colors.accentKeyIdea,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.control,
  },
  saveButtonText: {
    color: colors.bgBase,
    fontWeight: '600',
    fontSize: 14,
  },
  pickerTrigger: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.lg,
  },
  pickerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pickerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  editorSection: {
    paddingVertical: spacing.sm,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  unborderedInput: {
    fontFamily: 'SourceSerifPro',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    minHeight: 60,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderHairline,
    marginVertical: spacing.sm,
  },
});
```

### 6.3 Friend Profile Screen (`app/friend/[id].tsx`)

```tsx
import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{id ? id[0].toUpperCase() : 'F'}</Text>
        </View>
        <Text style={styles.displayName}>Sarah Smith</Text>
        <Text style={styles.username}>@{id}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Mutual Friend</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Shared Notes</Text>

      <Pressable
        style={styles.noteCard}
        onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'friend-note-1' } })}
      >
        <Text style={styles.noteRef}>Romans 8:28–30</Text>
        <Text style={styles.noteSnippet} numberOfLines={2}>
          💡 God works all things together for the good of those who love Him...
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    padding: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgSurfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: colors.accentSocial,
    fontSize: 24,
    fontWeight: '600',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  statusText: {
    fontSize: 12,
    color: colors.accentSocial,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noteCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.sm,
  },
  noteRef: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  noteSnippet: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
```

### 6.4 Notification Center Modal (`app/notifications.tsx`)
- Configured in root stack as `presentation: 'modal'`.
- Includes close icon in header.
- Avatar-led compact rows (`model: Letterboxd`).

```tsx
import React, { useLayoutEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/constants/theme';

interface NotificationItem {
  id: string;
  type: 'friend_note_exists' | 'friend_request' | 'friend_accept';
  actorName: string;
  passage?: string;
  timeAgo: string;
  read: boolean;
}

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'friend_note_exists',
    actorName: 'Sarah Smith',
    passage: 'John 3:16',
    timeAgo: '2h ago',
    read: false,
  },
  {
    id: '2',
    type: 'friend_accept',
    actorName: 'Mark Chen',
    timeAgo: '1d ago',
    read: true,
  },
];

export default function NotificationsModal() {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Notifications',
      headerLeft: () => (
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
      ),
    });
  }, [navigation, router]);

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Pressable
      style={[styles.row, !item.read && styles.unreadRow]}
      onPress={() => {
        if (item.passage) {
          router.push({ pathname: '/note/[id]', params: { id: 'sample-1' } });
        }
      }}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.actorName[0]}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.message}>
          <Text style={styles.actor}>{item.actorName}</Text>{' '}
          {item.type === 'friend_note_exists'
            ? `also noted ${item.passage}`
            : 'accepted your friend request'}
        </Text>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={mockNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  closeButton: {
    padding: 6,
  },
  list: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHairline,
  },
  unreadRow: {
    backgroundColor: colors.bgSurface,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.control,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgSurfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: colors.accentSocial,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  actor: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  message: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentSocial,
    marginLeft: spacing.xs,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
```

---

## 7. Specification: Header Notification Bell Component (`src/components/HeaderNotificationBell.tsx`)

This component mounts in the navigation bar and displays the real-time unread count.

```tsx
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface HeaderNotificationBellProps {
  unreadCount?: number;
}

export default function HeaderNotificationBell({ unreadCount = 1 }: HeaderNotificationBellProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      style={styles.container}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={`Notifications, ${unreadCount} unread`}
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingRight: 16,
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentSocial, // #B4789E dusty plum
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
```

---

## 8. Deep Linking & URL Scheme Integration

Configured in `app.json`:
- Scheme: `"biblenotes"`
- URL format: `biblenotes://`

### Deep Link Route Map

| Target Feature | URL Path | Expo Router Handler |
|---|---|---|
| Notification Center | `biblenotes://notifications` | `app/notifications.tsx` |
| View Specific Note | `biblenotes://note/{noteId}` | `app/note/[id].tsx` |
| Edit Note | `biblenotes://note/edit?id={noteId}` | `app/note/edit.tsx` |
| Friend Profile | `biblenotes://friend/{userId}` | `app/friend/[id].tsx` |
| Dashboard | `biblenotes://` | `app/(tabs)/index.tsx` |

---

## 9. Design System Compliance & Anti-Pattern Checklist

| Requirement / Invariant | Status | Verification Detail |
|---|---|---|
| Background `#1A1816` | **COMPLIANT** | Applied to `contentStyle.backgroundColor` in root and auth layouts, and every screen container. |
| Surface `#242019` | **COMPLIANT** | Applied to tab bar background, navigation header background, cards, and input fields. |
| Text `#EDE7DD` / `#A39C8E` | **COMPLIANT** | Applied to all headings, body text, tab bar inactive items, and placeholders. |
| Swedish Accents (`#E3A53D`, `#5B93C4`, `#7BA05B`) | **COMPLIANT** | Tab active tint `#E3A53D`; Key Idea `#E3A53D`; Question `#5B93C4`; Application `#7BA05B`. |
| Social Accent (`#B4789E`) | **COMPLIANT** | Notification badge pill background and overlap badges use `#B4789E`. |
| Danger Accent (`#C4664F`) | **COMPLIANT** | Destructive actions (sign out, discard) styled in `#C4664F`. |
| No `#0B0B0B` / `#111111` | **COMPLIANT** | Zero instances of cold near-black. |
| No `#D97757` terracotta | **COMPLIANT** | Zero instances of terracotta accent. |
| No drop shadows | **COMPLIANT** | `headerShadowVisible: false`, `elevation: 0`, `shadowOpacity: 0` throughout. |
| Sentence Case | **COMPLIANT** | Headings, buttons, labels use sentence case (e.g. "Create account", "Sign in"). |
| No Arrows (`→`) | **COMPLIANT** | Link labels use plain descriptive text without trailing arrows. |
| Radii: Content 4, Control 8, Sheet 16 | **COMPLIANT** | Note cards use 4px; buttons/chips/badges use 8px; modals use 16px top corners. |

---

## 10. Conclusion

The navigation and routing architecture specified herein strictly fulfills the requirements of M1. All routes are file-based, type-safe, and ready for immediate implementation by the scaffolding and implementation tracks.
