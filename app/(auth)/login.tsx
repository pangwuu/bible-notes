import React, { useEffect, useState } from 'react';
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
  Divider,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, spacing, radius } from '../../src/constants/theme';
import { loginUser, sendPasswordReset } from '../../src/services/authService';
import {
  isAppleAuthAvailable,
  isGoogleAuthConfigured,
  signInWithAppleIdentityToken,
  signInWithGoogleIdToken,
} from '../../src/services/socialAuthService';
import { validateEmail } from '../../src/utils/validation';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialSubmitting, setSocialSubmitting] = useState<'google' | 'apple' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const googleConfigured = isGoogleAuthConfigured();
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params?.id_token;
    if (!idToken) {
      setErrorMessage('Google sign-in did not return an ID token.');
      return;
    }
    setSocialSubmitting('google');
    signInWithGoogleIdToken(idToken)
      .catch((err: any) => {
        setErrorMessage(err?.message || 'Google sign-in failed');
      })
      .finally(() => setSocialSubmitting(null));
  }, [googleResponse]);

  // Password reset dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    if (!googleConfigured) {
      setErrorMessage(
        'Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_* client IDs and enable Google in Firebase Auth.'
      );
      return;
    }
    try {
      await promptGoogle();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in failed');
    }
  };

  const handleAppleSignIn = async () => {
    setErrorMessage(null);
    if (!isAppleAuthAvailable()) {
      setErrorMessage('Apple sign-in is available on iOS devices only.');
      return;
    }
    setSocialSubmitting('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple sign-in did not return an identity token.');
      }
      await signInWithAppleIdentityToken(credential.identityToken, credential.fullName);
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      setErrorMessage(err?.message || 'Apple sign-in failed');
    } finally {
      setSocialSubmitting(null);
    }
  };

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
      behavior={Platform.OS === 'ios' ? undefined : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerArea}>
          <Text style={styles.title}>Bible Notes</Text>
          <Text style={styles.subtitle}>Scripture study journal</Text>
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
            disabled={isSubmitting || socialSubmitting !== null}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>

          <View style={styles.orRow}>
            <Divider style={styles.orDivider} />
            <Text style={styles.orText}>or</Text>
            <Divider style={styles.orDivider} />
          </View>

          <Button
            mode="outlined"
            icon="google"
            textColor={colors.textPrimary}
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            loading={socialSubmitting === 'google'}
            disabled={
              isSubmitting ||
              socialSubmitting !== null ||
              (googleConfigured && !googleRequest)
            }
            accessibilityLabel="Continue with Google"
          >
            Continue with Google
          </Button>

          {isAppleAuthAvailable() ? (
            <Button
              mode="outlined"
              icon="apple"
              textColor={colors.textPrimary}
              style={styles.socialButton}
              onPress={handleAppleSignIn}
              loading={socialSubmitting === 'apple'}
              disabled={isSubmitting || socialSubmitting !== null}
              accessibilityLabel="Continue with Apple"
            >
              Continue with Apple
            </Button>
          ) : null}
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
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
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
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  orDivider: {
    flex: 1,
    backgroundColor: colors.borderHairline,
  },
  orText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  socialButton: {
    borderRadius: radius.control,
    borderColor: colors.borderHairline,
    marginBottom: spacing.sm,
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
