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
