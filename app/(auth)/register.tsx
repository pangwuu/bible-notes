import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
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

const DEFAULT_USERNAME_HINT = '3–20 lowercase letters, numbers, or underscores';

export default function RegisterScreen() {
  const router = useRouter();
  const usernameInputRef = useRef<RNTextInput>(null);
  const emailInputRef = useRef<RNTextInput>(null);
  const passwordInputRef = useRef<RNTextInput>(null);
  const confirmPasswordInputRef = useRef<RNTextInput>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameBlurred, setUsernameBlurred] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>(DEFAULT_USERNAME_HINT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live username availability check; defer minimum-length warning until blur/submit
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!trimmed) {
      setUsernameStatus('idle');
      setUsernameMessage(DEFAULT_USERNAME_HINT);
      return;
    }

    const hasValidChars = /^[a-z0-9_]+$/.test(trimmed);
    if (!hasValidChars || trimmed.length > 20) {
      const val = validateUsername(trimmed);
      setUsernameStatus('invalid');
      setUsernameMessage(val.error || 'Invalid username format');
      return;
    }

    if (trimmed.length < 3) {
      if (usernameBlurred) {
        const val = validateUsername(trimmed);
        setUsernameStatus('invalid');
        setUsernameMessage(val.error || 'Username must be at least 3 characters');
      } else {
        setUsernameStatus('idle');
        setUsernameMessage(DEFAULT_USERNAME_HINT);
      }
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
      } catch (_err) {
        setUsernameStatus('available');
        setUsernameMessage('✓ Username format valid');
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [username, usernameBlurred]);

  const handleRegister = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setUsernameBlurred(true);

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
      setUsernameStatus('invalid');
      setUsernameMessage(uVal.error || 'Please enter a valid username');
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
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUsernameStatusColor = () => {
    switch (usernameStatus) {
      case 'available':
        return colors.accentApplication;
      case 'taken':
      case 'invalid':
        return colors.accentDanger;
      case 'checking':
      case 'idle':
      default:
        return colors.textSecondary;
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
          <View
            style={styles.errorBanner}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
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
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => usernameInputRef.current?.focus()}
            blurOnSubmit={false}
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
          />

          <Text style={[styles.helperTextAbove, { color: getUsernameStatusColor() }]}>
            {usernameMessage}
          </Text>
          <TextInput
            ref={usernameInputRef}
            label="Username"
            value={username}
            onChangeText={(text) => {
              setUsername(text.toLowerCase());
              if (errorMessage) setErrorMessage(null);
            }}
            onBlur={() => setUsernameBlurred(true)}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => emailInputRef.current?.focus()}
            blurOnSubmit={false}
            textColor={colors.textPrimary}
            style={styles.input}
            mode="outlined"
            outlineColor={colors.borderHairline}
            activeOutlineColor={colors.accentKeyIdea}
            disabled={isSubmitting}
          />

          <TextInput
            ref={emailInputRef}
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="email"
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
            secureTextEntry={securePassword}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
            blurOnSubmit={false}
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
                accessibilityLabel={securePassword ? 'Show password' : 'Hide password'}
                onPress={() => setSecurePassword(!securePassword)}
              />
            }
          />

          <TextInput
            ref={confirmPasswordInputRef}
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errorMessage) setErrorMessage(null);
            }}
            secureTextEntry={secureConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleRegister}
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
                accessibilityLabel={
                  secureConfirmPassword ? 'Show confirm password' : 'Hide confirm password'
                }
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
              usernameStatus === 'checking'
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
            style={styles.linkTouchTarget}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
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
  helperTextAbove: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  linkTouchTarget: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 2,
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
