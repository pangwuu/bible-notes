import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
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
  const passwordInputRef = useRef<RNTextInput>(null);
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
    if (isSubmitting) return;
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
    if (resetSubmitting) return;
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
          <Text style={styles.title} accessibilityRole="header">
            Bible Notes
          </Text>
          <Text style={styles.subtitle}>Bible study journal</Text>
        </View>

        {errorMessage && (
          <View
            style={styles.errorBanner}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {resetSuccessMessage && (
          <View
            style={styles.successBanner}
            accessibilityLiveRegion="polite"
          >
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
            spellCheck={false}
            autoComplete="username"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            blurOnSubmit={false}
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
          />

          <TextInput
            ref={passwordInputRef}
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) setErrorMessage(null);
            }}
            secureTextEntry={secureText}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
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
                accessibilityLabel={secureText ? 'Show password' : 'Hide password'}
                onPress={() => setSecureText(!secureText)}
              />
            }
          />

          <View style={styles.forgotPasswordRow}>
            <Pressable
              onPress={handleOpenResetDialog}
              disabled={isSubmitting}
              style={styles.linkTouchTarget}
              accessibilityRole="button"
              accessibilityLabel="Forgot password?"
            >
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
            style={styles.linkTouchTarget}
            accessibilityRole="button"
            accessibilityLabel="Create one"
          >
            <Text style={styles.footerLink}>Create one</Text>
          </Pressable>
        </View>

        {/* Password Reset Modal Dialog */}
        <Portal>
          <Dialog
            visible={resetDialogOpen}
            dismissable={!resetSubmitting}
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
                <View
                  style={styles.dialogErrorBanner}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                >
                  <Text style={styles.dialogErrorText}>{resetErrorMessage}</Text>
                </View>
              )}
              <TextInput
                label="Email address"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={handleSendResetEmail}
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
    marginBottom: spacing.sm,
  },
  linkTouchTarget: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 2,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
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
