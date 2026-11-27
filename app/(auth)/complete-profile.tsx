/**
 * Completes username / display name after Apple or Google sign-in.
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { colors, spacing, radius } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import {
  checkUsernameAvailable,
  updateUserProfile,
  updateUsername,
} from '../../src/services/authService';
import { validateDisplayName, validateUsername } from '../../src/utils/validation';

export default function CompleteProfileScreen() {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState(
    profile?.display_name || profile?.full_name || user?.displayName || ''
  );
  const [username, setUsername] = useState(profile?.username || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.uid) return;
    setError(null);

    const nameVal = validateDisplayName(displayName);
    if (!nameVal.isValid) {
      setError(nameVal.error || 'Invalid display name');
      return;
    }
    const usernameVal = validateUsername(username);
    if (!usernameVal.isValid) {
      setError(usernameVal.error || 'Invalid username');
      return;
    }

    const available = await checkUsernameAvailable(username);
    if (!available) {
      setError('That username is already taken');
      return;
    }

    setSaving(true);
    try {
      const trimmed = displayName.trim();
      await updateUserProfile(user.uid, {
        display_name: trimmed,
        full_name: trimmed,
      });
      await updateUsername(user.uid, username);
      // Auth routing sends the user to tabs once profile.username is present.
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? undefined : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Finish your profile</Text>
        <Text style={styles.subtitle}>
          Choose a display name and username so friends can find you.
        </Text>

        <TextInput
          mode="outlined"
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
          textColor={colors.textPrimary}
          accessibilityLabel="Display name"
        />
        <TextInput
          mode="outlined"
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
          textColor={colors.textPrimary}
          accessibilityLabel="Username"
        />
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : (
          <HelperText type="info" visible style={styles.helper}>
            Username: 3–20 lowercase letters, numbers, or underscores.
          </HelperText>
        )}

        <Button
          mode="contained"
          buttonColor={colors.accentKeyIdea}
          textColor={colors.bgBase}
          style={styles.button}
          loading={saving}
          disabled={saving}
          onPress={handleSave}
          accessibilityLabel="Save profile and continue"
        >
          Continue
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgBase },
  container: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.bgSurface,
    marginBottom: spacing.sm,
  },
  helper: { color: colors.textSecondary },
  button: {
    marginTop: spacing.md,
    borderRadius: radius.control,
  },
});
