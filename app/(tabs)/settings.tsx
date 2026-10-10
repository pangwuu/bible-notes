import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Divider,
  Portal,
  Dialog,
  Switch,
  HelperText,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import {
  updateUserProfile,
  updateUsername,
  deleteAccount,
} from '../../src/services/authService';
import { clearPassageCache, SUPPORTED_TRANSLATIONS } from '../../src/services/bibleService';
import {
  SUPPORTED_BIBLE_VERSIONS,
  DEFAULT_BIBLE_VERSION_ID,
  resolveVersionId,
  getVersionMetadata,
} from '../../src/constants/bibleVersions';
import { BUILT_IN_TEMPLATES } from '../../src/constants/templates';
import FontSizeControls from '../../src/components/FontSizeControls';
import safeStorage from '../../src/utils/safeStorage';
import { validateDisplayName, validateUsername } from '../../src/utils/validation';
import type { NoteVisibility, BibleTranslation } from '../../src/types/user';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  // Preferences state
  const [defaultVisibility, setDefaultVisibility] = useState<NoteVisibility>('friends');
  const [preferredVersionId, setPreferredVersionId] = useState<number>(DEFAULT_BIBLE_VERSION_ID);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>('swedish');
  const [enableFriends, setEnableFriends] = useState<boolean>(
    profile?.settings?.enable_friends ?? profile?.enable_friends ?? true
  );
  const [showVerseNumbers, setShowVerseNumbers] = useState<boolean>(true);
  const [defaultFontSize, setDefaultFontSize] = useState<number>(16);

  // Profile edit
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [profileEditError, setProfileEditError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // ESV API key
  const [esvApiKey, setEsvApiKey] = useState('');
  const [esvKeySavedMessage, setEsvKeySavedMessage] = useState<string | null>(null);
  const [isSavingEsvKey, setIsSavingEsvKey] = useState(false);

  // Clear cache state
  const [clearCacheDialogOpen, setClearCacheDialogOpen] = useState(false);
  const [cacheClearedMessage, setCacheClearedMessage] = useState<string | null>(null);

  // Logout confirmation dialog state
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Available templates (built-in + custom)
  const availableTemplates = useMemo(() => {
    return [...BUILT_IN_TEMPLATES, ...(profile?.custom_templates || [])];
  }, [profile?.custom_templates]);

  // Populate initial values when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.default_visibility) {
        setDefaultVisibility(profile.default_visibility);
      }
      const rawTrans =
        profile.preferred_version_id ||
        profile.settings?.preferred_version_id ||
        profile.preferred_translation ||
        profile.settings?.preferred_translation;
      if (rawTrans) {
        setPreferredVersionId(resolveVersionId(rawTrans));
      }
      if (profile.settings?.default_template_id) {
        setDefaultTemplateId(profile.settings.default_template_id);
      }
      const friendSetting =
        typeof profile.settings?.enable_friends === 'boolean'
          ? profile.settings.enable_friends
          : typeof profile.enable_friends === 'boolean'
          ? profile.enable_friends
          : true;
      setEnableFriends(friendSetting);
      if (profile.settings?.default_font_size) {
        setDefaultFontSize(profile.settings.default_font_size);
        safeStorage.setItem('bible_font_size', String(profile.settings.default_font_size)).catch(() => {});
      }
      const existingKey =
        profile.settings?.custom_esv_api_key || profile.custom_esv_api_key || '';
      setEsvApiKey(existingKey);
    }
  }, [profile]);

  // Read verse numbers and font size preferences from safeStorage
  useEffect(() => {
    safeStorage.getItem('bible_show_verse_numbers').then((val) => {
      if (val !== null) {
        try {
          setShowVerseNumbers(JSON.parse(val));
        } catch {
          setShowVerseNumbers(val !== 'false');
        }
      }
    });

    safeStorage.getItem('bible_font_size').then((stored) => {
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 12 && parsed <= 26) {
          setDefaultFontSize(parsed);
        }
      }
    });

    safeStorage.getItem('default_template_id').then((stored) => {
      if (stored) setDefaultTemplateId(stored);
    });

    // Purge legacy local storage key so AuthContext/Firestore remains single source of truth
    safeStorage.removeItem('enable_friends').catch(() => {});
  }, []);

  const handleToggleVerseNumbers = async (value: boolean) => {
    setShowVerseNumbers(value);
    await safeStorage.setItem('bible_show_verse_numbers', JSON.stringify(value));
  };

  const handleFontSizeChange = async (newSize: number) => {
    const clamped = Math.max(12, Math.min(26, newSize));
    setDefaultFontSize(clamped);
    await safeStorage.setItem('bible_font_size', String(clamped));
    if (user?.uid) {
      try {
        await updateUserProfile(user.uid, {
          settings: {
            ...profile?.settings,
            default_font_size: clamped,
          },
        });
      } catch (err) {
        console.warn('Failed to update default font size in profile:', err);
      }
    }
  };

  const handleTranslationChange = async (transOrId: BibleTranslation | number) => {
    const vId = resolveVersionId(transOrId);
    setPreferredVersionId(vId);
    const shortName = getVersionMetadata(vId).shortName as BibleTranslation;
    if (user?.uid) {
      try {
        await updateUserProfile(user.uid, {
          preferred_version_id: vId,
          preferred_translation: shortName,
          settings: {
            ...profile?.settings,
            preferred_version_id: vId,
            preferred_translation: shortName,
          },
        });
      } catch (err) {
        console.warn('Failed to update preferred translation:', err);
      }
    }
  };

  const handleClearCache = async () => {
    try {
      await clearPassageCache();
      setClearCacheDialogOpen(false);
      setCacheClearedMessage('Passage cache cleared');
      setTimeout(() => setCacheClearedMessage(null), 3000);
    } catch (err) {
      console.warn('Failed to clear passage cache:', err);
    }
  };

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

  const handleTemplateChange = async (templateId: string) => {
    setDefaultTemplateId(templateId);
    await safeStorage.setItem('default_template_id', templateId);
    if (user?.uid) {
      try {
        await updateUserProfile(user.uid, {
          default_template_id: templateId,
          settings: {
            ...profile?.settings,
            default_template_id: templateId,
          },
        });
      } catch (err) {
        console.warn('Failed to update default template in profile:', err);
      }
    }
  };

  const handleToggleEnableFriends = async (enabled: boolean) => {
    setEnableFriends(enabled);
    if (user?.uid) {
      try {
        await updateUserProfile(user.uid, {
          enable_friends: enabled,
          settings: {
            ...profile?.settings,
            enable_friends: enabled,
          },
        });
      } catch (err) {
        console.warn('Failed to update enable_friends in profile:', err);
      }
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

  const openEditProfile = () => {
    setEditDisplayName(profile?.display_name || profile?.full_name || user?.displayName || '');
    setEditUsername(profile?.username || '');
    setProfileEditError(null);
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;

    const nameVal = validateDisplayName(editDisplayName);
    if (!nameVal.isValid) {
      setProfileEditError(nameVal.error || 'Invalid display name');
      return;
    }
    const usernameVal = validateUsername(editUsername);
    if (!usernameVal.isValid) {
      setProfileEditError(usernameVal.error || 'Invalid username');
      return;
    }

    setIsSavingProfile(true);
    setProfileEditError(null);
    try {
      const trimmedName = editDisplayName.trim();
      if (trimmedName !== (profile?.display_name || profile?.full_name || '')) {
        await updateUserProfile(user.uid, {
          display_name: trimmedName,
          full_name: trimmedName,
        });
      }
      if (editUsername.trim().toLowerCase() !== (profile?.username || '')) {
        await updateUsername(user.uid, editUsername);
      }
      setEditProfileOpen(false);
    } catch (err: any) {
      setProfileEditError(err?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveEsvKey = async () => {
    if (!user?.uid) return;
    setIsSavingEsvKey(true);
    setEsvKeySavedMessage(null);
    try {
      const trimmed = esvApiKey.trim();
      await updateUserProfile(user.uid, {
        custom_esv_api_key: trimmed,
        settings: {
          ...profile?.settings,
          custom_esv_api_key: trimmed,
        },
      });
      setEsvKeySavedMessage(trimmed ? 'ESV API key saved' : 'ESV API key cleared');
      setTimeout(() => setEsvKeySavedMessage(null), 3000);
    } catch (err) {
      console.warn('Failed to save ESV API key:', err);
      setEsvKeySavedMessage('Failed to save key');
    } finally {
      setIsSavingEsvKey(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!user?.uid) return;
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await deleteAccount(user.uid);
      setDeleteDialogOpen(false);
      // Auth state change redirects to login.
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const displayName = profile?.display_name || profile?.full_name || user?.displayName || 'Bible Reader';
  const username = profile?.username ? `@${profile.username}` : '';
  const initialLetter = displayName.charAt(0).toUpperCase() || 'B';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Account Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initialLetter}</Text>
        </View>
        <View style={styles.profileDetails}>
          <Text style={styles.profileName}>{displayName}</Text>
          {username ? <Text style={styles.profileUsername}>{username}</Text> : null}
          <Text style={styles.profileEmail}>{user?.email || profile?.email || ''}</Text>
          <Button
            mode="text"
            compact
            textColor={colors.accentKeyIdea}
            style={styles.editProfileButton}
            labelStyle={styles.editProfileLabel}
            onPress={openEditProfile}
            accessibilityLabel="Edit profile"
          >
            Edit profile
          </Button>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Preferences</Text>

      {/* Friends & Social Features Toggle */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.cardTitle}>Social & Friends features</Text>
            <Text style={styles.cardDescription}>
              Enable friend reflections, shared notes, and the Friends tab. Disable if you prefer a solo study experience.
            </Text>
          </View>
          <Switch
            value={enableFriends}
            onValueChange={handleToggleEnableFriends}
            color={colors.accentKeyIdea}
            accessibilityLabel="Social & Friends features"
          />
        </View>
      </View>

      {/* Default note template */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Default note template</Text>
        <Text style={styles.cardDescription}>
          The template used when creating new study notes.
        </Text>
        <View style={styles.translationChipGrid}>
          {availableTemplates.map((t) => {
            const isSelected = t.id === defaultTemplateId;
            return (
              <Button
                key={t.id}
                mode={isSelected ? 'contained' : 'outlined'}
                buttonColor={isSelected ? colors.accentKeyIdea : undefined}
                textColor={isSelected ? colors.bgBase : colors.textPrimary}
                style={[
                  styles.translationChip,
                  !isSelected && styles.translationChipOutlined,
                ]}
                labelStyle={styles.translationChipLabel}
                onPress={() => handleTemplateChange(t.id)}
              >
                {t.name}
              </Button>
            );
          })}
        </View>
      </View>

      {/* Default note visibility */}
      {enableFriends && (
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
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferred Bible translation</Text>
        <Text style={styles.cardDescription}>
          Primary translation used for reading and study reflections.
        </Text>
        <View style={styles.translationChipGrid}>
          {SUPPORTED_BIBLE_VERSIONS.map((t) => {
            const isSelected = t.id === preferredVersionId;
            return (
              <Button
                key={t.id}
                mode={isSelected ? 'contained' : 'outlined'}
                buttonColor={isSelected ? colors.accentKeyIdea : undefined}
                textColor={isSelected ? colors.bgBase : colors.textPrimary}
                style={[
                  styles.translationChip,
                  !isSelected && styles.translationChipOutlined,
                ]}
                labelStyle={styles.translationChipLabel}
                onPress={() => handleTranslationChange(t.id)}
              >
                {t.shortName}
              </Button>
            );
          })}
        </View>
        <Button
          mode="text"
          icon="information-outline"
          textColor={colors.accentKeyIdea}
          style={styles.aboutVersionsButton}
          onPress={() => router.push('/bible-versions')}
        >
          About these versions
        </Button>
      </View>

      <Text style={styles.sectionHeader}>Bible display</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.cardTitle}>Show verse numbers</Text>
            <Text style={styles.cardDescription}>
              Display superscript verse numbers inline when reading Scripture passages.
            </Text>
          </View>
          <Switch
            value={showVerseNumbers}
            onValueChange={handleToggleVerseNumbers}
            color={colors.accentKeyIdea}
          />
        </View>

        <Divider style={styles.innerDivider} />

        {/* Default Scripture Font Size */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.cardTitle}>Default text size</Text>
            <Text style={styles.cardDescription}>
              Base font size for Scripture.
            </Text>
          </View>
          <FontSizeControls
            value={defaultFontSize}
            onSizeChange={handleFontSizeChange}
          />
        </View>

        {/* Live John 3:16 Preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewHeaderLabel}>Preview (John 3:16)</Text>
          <Text
            style={[
              styles.previewScriptureText,
              {
                fontSize: defaultFontSize,
                lineHeight: Math.round(defaultFontSize * 1.5),
              },
            ]}
          >
            {showVerseNumbers && <Text style={styles.previewVerseNum}>16 </Text>}
            For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Custom ESV API key</Text>
        <Text style={styles.cardDescription}>
          Optional Crossway ESV API token. Leave blank to use the app default.
        </Text>
        <TextInput
          mode="outlined"
          label="ESV API key"
          value={esvApiKey}
          onChangeText={setEsvApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={styles.input}
          outlineColor={colors.borderHairline}
          activeOutlineColor={colors.accentKeyIdea}
          textColor={colors.textPrimary}
          accessibilityLabel="ESV API key"
        />
        <View style={styles.saveKeyRow}>
          {esvKeySavedMessage ? (
            <Text style={styles.keySavedText}>{esvKeySavedMessage}</Text>
          ) : (
            <View />
          )}
          <Button
            mode="contained"
            buttonColor={colors.accentKeyIdea}
            textColor={colors.bgBase}
            style={styles.saveKeyButton}
            loading={isSavingEsvKey}
            disabled={isSavingEsvKey}
            onPress={handleSaveEsvKey}
            accessibilityLabel="Save ESV API key"
          >
            Save key
          </Button>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Passage offline cache</Text>
        <Text style={styles.cardDescription}>
          Remove downloaded Scripture passages from local device storage to free up space.
        </Text>
        <View style={styles.saveKeyRow}>
          {cacheClearedMessage ? (
            <Text style={styles.keySavedText}>{cacheClearedMessage}</Text>
          ) : (
            <View />
          )}
          <Button
            mode="outlined"
            textColor={colors.textSecondary}
            style={styles.clearCacheBtn}
            onPress={() => setClearCacheDialogOpen(true)}
          >
            Clear passage cache
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

      <Button
        mode="text"
        textColor={colors.accentDanger}
        style={styles.deleteAccountButton}
        onPress={() => {
          setDeleteError(null);
          setDeleteDialogOpen(true);
        }}
        accessibilityLabel="Delete account"
      >
        Delete account
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

        {/* Clear Cache Confirmation Dialog */}
        <Dialog
          visible={clearCacheDialogOpen}
          onDismiss={() => setClearCacheDialogOpen(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Clear passage cache</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogDescription}>
              Are you sure you want to remove all offline cached Bible passages from this device?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor={colors.textSecondary}
              onPress={() => setClearCacheDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              textColor={colors.accentDanger}
              onPress={handleClearCache}
            >
              Clear cache
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Edit Profile Dialog */}
        <Dialog
          visible={editProfileOpen}
          onDismiss={() => {
            if (!isSavingProfile) setEditProfileOpen(false);
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Edit profile</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Display name"
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              style={[styles.input, styles.dialogInput]}
              outlineColor={colors.borderHairline}
              activeOutlineColor={colors.accentKeyIdea}
              textColor={colors.textPrimary}
              accessibilityLabel="Display name"
            />
            <TextInput
              mode="outlined"
              label="Username"
              value={editUsername}
              onChangeText={setEditUsername}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              outlineColor={colors.borderHairline}
              activeOutlineColor={colors.accentKeyIdea}
              textColor={colors.textPrimary}
              accessibilityLabel="Username"
            />
            {profileEditError ? (
              <HelperText type="error" visible>
                {profileEditError}
              </HelperText>
            ) : (
              <HelperText type="info" visible style={styles.helperInfo}>
                Username: 3–20 lowercase letters, numbers, or underscores.
              </HelperText>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor={colors.textSecondary}
              onPress={() => setEditProfileOpen(false)}
              disabled={isSavingProfile}
            >
              Cancel
            </Button>
            <Button
              textColor={colors.accentKeyIdea}
              onPress={handleSaveProfile}
              loading={isSavingProfile}
              disabled={isSavingProfile}
              accessibilityLabel="Save profile"
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Account Confirmation Dialog */}
        <Dialog
          visible={deleteDialogOpen}
          onDismiss={() => {
            if (!isDeletingAccount) setDeleteDialogOpen(false);
          }}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Delete account</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogDescription}>
              This permanently deletes your account, notes, friendships, and notifications. This
              cannot be undone.
            </Text>
            {deleteError ? (
              <HelperText type="error" visible>
                {deleteError}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              textColor={colors.textSecondary}
              onPress={() => setDeleteDialogOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              textColor={colors.accentDanger}
              onPress={handleConfirmDeleteAccount}
              loading={isDeletingAccount}
              disabled={isDeletingAccount}
              accessibilityLabel="Confirm delete account"
            >
              Delete forever
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  editProfileButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginLeft: -spacing.sm,
  },
  editProfileLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 0,
  },
  dialogInput: {
    marginBottom: spacing.sm,
  },
  helperInfo: {
    color: colors.textSecondary,
  },
  deleteAccountButton: {
    marginTop: spacing.sm,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  innerDivider: {
    backgroundColor: colors.borderHairline,
    marginVertical: spacing.md,
  },
  previewContainer: {
    backgroundColor: colors.bgBase,
    borderRadius: radius.control,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  previewHeaderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  previewScriptureText: {
    fontFamily: typography.body.fontFamily,
    color: colors.textPrimary,
  },
  previewVerseNum: {
    fontFamily: typography.body.fontFamily,
    color: colors.accentKeyIdea,
    fontWeight: '700',
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
  translationChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  translationChip: {
    borderRadius: radius.control,
    minWidth: 70,
  },
  translationChipOutlined: {
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurfaceRaised,
  },
  translationChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  aboutVersionsButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  clearCacheBtn: {
    borderColor: colors.borderHairline,
    borderRadius: radius.control,
  },
});
