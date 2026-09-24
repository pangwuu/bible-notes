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
  Switch,
} from 'react-native-paper';
import { colors, spacing, radius, typography } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { updateUserProfile } from '../../src/services/authService';
import { clearPassageCache, SUPPORTED_TRANSLATIONS } from '../../src/services/bibleService';
import FontSizeControls from '../../src/components/FontSizeControls';
import safeStorage from '../../src/utils/safeStorage';
import type { NoteVisibility, BibleTranslation } from '../../src/types/user';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();

  // Preferences state
  const [defaultVisibility, setDefaultVisibility] = useState<NoteVisibility>('friends');
  const [preferredTranslation, setPreferredTranslation] = useState<BibleTranslation>('ESV');
  const [showVerseNumbers, setShowVerseNumbers] = useState<boolean>(true);
  const [defaultFontSize, setDefaultFontSize] = useState<number>(16);
  const [esvKey, setEsvKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);

  // Clear cache state
  const [clearCacheDialogOpen, setClearCacheDialogOpen] = useState(false);
  const [cacheClearedMessage, setCacheClearedMessage] = useState<string | null>(null);

  // Logout confirmation dialog state
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Populate initial values when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.default_visibility) {
        setDefaultVisibility(profile.default_visibility);
      }
      if (profile.preferred_translation || profile.settings?.preferred_translation) {
        setPreferredTranslation(profile.preferred_translation || profile.settings?.preferred_translation || 'ESV');
      }
      if (profile.settings?.default_font_size) {
        setDefaultFontSize(profile.settings.default_font_size);
        safeStorage.setItem('bible_font_size', String(profile.settings.default_font_size)).catch(() => {});
      }
      const existingKey = profile.settings?.custom_esv_api_key || profile.custom_esv_api_key || '';
      setEsvKey(existingKey);
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

  const handleTranslationChange = async (trans: BibleTranslation) => {
    setPreferredTranslation(trans);
    if (user?.uid) {
      try {
        await updateUserProfile(user.uid, {
          preferred_translation: trans,
          settings: {
            ...profile?.settings,
            preferred_translation: trans,
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferred Bible translation</Text>
        <Text style={styles.cardDescription}>
          Primary translation used for reading and study reflections.
        </Text>
        <View style={styles.translationChipGrid}>
          {SUPPORTED_TRANSLATIONS.map((t) => {
            const isSelected = t.id === preferredTranslation;
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
              Base font size for reading Scripture across note reflections.
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

      <Text style={styles.sectionHeader}>Crossway ESV API</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crossway ESV custom API key</Text>
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
  clearCacheBtn: {
    borderColor: colors.borderHairline,
    borderRadius: radius.control,
  },
});
