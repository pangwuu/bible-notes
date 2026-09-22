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

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      } catch (_err) {
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
