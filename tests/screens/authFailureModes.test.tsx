/**
 * Integration Test for Authentication Failure Modes & Form Validation
 * Covers:
 * - app/(auth)/login.tsx: Empty fields, invalid email formatting, missing password,
 *   Firebase auth failure code propagation, password reset dialog error states.
 * - app/(auth)/register.tsx: Full name validation, username format & live collision rejection,
 *   email format, password length & confirmation mismatch, Firebase email-in-use handling.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import LoginScreen from '../../app/(auth)/login';
import RegisterScreen from '../../app/(auth)/register';
import * as authService from '../../src/services/authService';
import { Alert } from '../../src/utils/alert';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('../../src/services/authService', () => ({
  loginUser: jest.fn(),
  sendPasswordReset: jest.fn(),
  registerUser: jest.fn(),
  checkUsernameAvailable: jest.fn(),
  formatAuthError: jest.requireActual('../../src/services/authService').formatAuthError,
}));

jest.spyOn(Alert, 'alert');

const renderWithPaper = (ui: React.ReactElement) => {
  return render(<PaperProvider>{ui}</PaperProvider>);
};

describe('Area 1: Authentication & Onboarding Failure Modes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginScreen Failure Modes (app/(auth)/login.tsx)', () => {
    test('rejects submission when email is missing', async () => {
      const { getByText, getByRole } = await renderWithPaper(<LoginScreen />);

      const signInBtn = getByText('Sign in');
      await act(async () => {
        fireEvent.press(signInBtn);
      });

      expect(getByText('Please enter your email address')).toBeTruthy();
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    test('rejects submission when email format is invalid', async () => {
      const { getByText, getAllByTestId } = await renderWithPaper(<LoginScreen />);

      const inputs = getAllByTestId('text-input-outlined');
      const emailInput = inputs[0];
      await act(async () => {
        fireEvent.changeText(emailInput, 'notanemail');
      });

      const signInBtn = getByText('Sign in');
      await act(async () => {
        fireEvent.press(signInBtn);
      });

      expect(getByText('Please enter a valid email address')).toBeTruthy();
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    test('rejects submission when password is empty', async () => {
      const { getByText, getAllByTestId } = await renderWithPaper(<LoginScreen />);

      const inputs = getAllByTestId('text-input-outlined');
      const emailInput = inputs[0];
      await act(async () => {
        fireEvent.changeText(emailInput, 'user@example.com');
      });

      const signInBtn = getByText('Sign in');
      await act(async () => {
        fireEvent.press(signInBtn);
      });

      expect(getByText('Please enter your password')).toBeTruthy();
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    test('displays friendly error banner on Firebase invalid-credential rejection', async () => {
      (authService.loginUser as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid email or password.')
      );

      const { getByText, getAllByTestId } = await renderWithPaper(<LoginScreen />);

      const inputs = getAllByTestId('text-input-outlined');
      const emailInput = inputs[0];
      const passInput = inputs[1];

      await act(async () => {
        fireEvent.changeText(emailInput, 'user@example.com');
        fireEvent.changeText(passInput, 'wrongpassword');
      });

      const signInBtn = getByText('Sign in');
      await act(async () => {
        fireEvent.press(signInBtn);
      });

      await waitFor(() => {
        expect(getByText('Invalid email or password.')).toBeTruthy();
      });
      expect(authService.loginUser).toHaveBeenCalledWith('user@example.com', 'wrongpassword');
    });

    test('handles password reset failure when reset email is malformed', async () => {
      const { getByText, getAllByTestId } = await renderWithPaper(<LoginScreen />);

      // Open reset dialog
      const forgotLink = getByText('Forgot password?');
      await act(async () => {
        fireEvent.press(forgotLink);
      });

      await waitFor(() => {
        expect(getByText('Reset password')).toBeTruthy();
      });

      // Type invalid email in dialog input (3rd input on screen)
      const inputs = getAllByTestId('text-input-outlined');
      const resetEmailInput = inputs[inputs.length - 1];
      await act(async () => {
        fireEvent.changeText(resetEmailInput, 'bad-email');
      });

      const sendBtn = getByText('Send reset link');
      await act(async () => {
        fireEvent.press(sendBtn);
      });

      expect(getByText('Please enter a valid email address')).toBeTruthy();
      expect(authService.sendPasswordReset).not.toHaveBeenCalled();
    });

    test('displays dialog error message when password reset network call fails', async () => {
      (authService.sendPasswordReset as jest.Mock).mockRejectedValueOnce(
        new Error('No account found with this email address.')
      );

      const { getByText, getAllByTestId } = await renderWithPaper(<LoginScreen />);

      const forgotLink = getByText('Forgot password?');
      await act(async () => {
        fireEvent.press(forgotLink);
      });

      const inputs = getAllByTestId('text-input-outlined');
      const resetEmailInput = inputs[inputs.length - 1];
      await act(async () => {
        fireEvent.changeText(resetEmailInput, 'unknown@example.com');
      });

      const sendBtn = getByText('Send reset link');
      await act(async () => {
        fireEvent.press(sendBtn);
      });

      await waitFor(() => {
        expect(getByText('No account found with this email address.')).toBeTruthy();
      });
    });

    test('shows success banner on successful password reset dispatch', async () => {
      (authService.sendPasswordReset as jest.Mock).mockResolvedValueOnce(undefined);

      const { getByText, getAllByTestId } = await renderWithPaper(<LoginScreen />);

      const forgotLink = getByText('Forgot password?');
      await act(async () => {
        fireEvent.press(forgotLink);
      });

      const inputs = getAllByTestId('text-input-outlined');
      const resetEmailInput = inputs[inputs.length - 1];
      await act(async () => {
        fireEvent.changeText(resetEmailInput, 'valid@example.com');
      });

      const sendBtn = getByText('Send reset link');
      await act(async () => {
        fireEvent.press(sendBtn);
      });

      await waitFor(() => {
        expect(getByText('Password reset email sent to valid@example.com')).toBeTruthy();
      });
    });
  });

  describe('RegisterScreen Failure Modes (app/(auth)/register.tsx)', () => {
    test('rejects registration when full name is empty', async () => {
      const { getByText } = await renderWithPaper(<RegisterScreen />);

      const createAccBtn = getByText('Create account');
      await act(async () => {
        fireEvent.press(createAccBtn);
      });

      expect(getByText('Display name is required')).toBeTruthy();
      expect(authService.registerUser).not.toHaveBeenCalled();
    });

    test('rejects registration when username format contains illegal characters', async () => {
      const { getByText, getAllByTestId } = await renderWithPaper(<RegisterScreen />);

      const inputs = getAllByTestId('text-input-outlined');
      const nameInput = inputs[0];
      const unameInput = inputs[1];

      await act(async () => {
        fireEvent.changeText(nameInput, 'John Doe');
        fireEvent.changeText(unameInput, 'invalid user!');
      });

      expect(
        getByText('Username must contain only lowercase letters, numbers, and underscores')
      ).toBeTruthy();

      const createBtn = getByText('Create account');
      await act(async () => {
        fireEvent.press(createBtn);
      });

      expect(authService.registerUser).not.toHaveBeenCalled();
    });

    test('displays taken status and blocks submission when username is already taken', async () => {
      jest.useFakeTimers();
      (authService.checkUsernameAvailable as jest.Mock).mockResolvedValue(false);

      const { getByText, getAllByTestId } = await renderWithPaper(<RegisterScreen />);

      const inputs = getAllByTestId('text-input-outlined');
      const nameInput = inputs[0];
      const unameInput = inputs[1];

      await act(async () => {
        fireEvent.changeText(nameInput, 'John Doe');
        fireEvent.changeText(unameInput, 'existinguser');
      });

      // Fast-forward username debounce check
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(getByText('✕ Username is already taken')).toBeTruthy();
      });

      expect(authService.registerUser).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('rejects registration when password is shorter than 6 characters', async () => {
      jest.useFakeTimers();
      (authService.checkUsernameAvailable as jest.Mock).mockResolvedValue(true);

      const { getByText, getAllByTestId } = await renderWithPaper(<RegisterScreen />);

      const inputs = getAllByTestId('text-input-outlined');
      await act(async () => {
        fireEvent.changeText(inputs[0], 'John Doe');
        fireEvent.changeText(inputs[1], 'newuser');
        fireEvent.changeText(inputs[2], 'john@doe.com');
        fireEvent.changeText(inputs[3], '123');
        fireEvent.changeText(inputs[4], '123');
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await act(async () => {
        fireEvent.press(getByText('Create account'));
      });

      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
      expect(authService.registerUser).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('rejects registration when passwords do not match', async () => {
      jest.useFakeTimers();
      (authService.checkUsernameAvailable as jest.Mock).mockResolvedValue(true);

      const { getByText, getAllByTestId } = await renderWithPaper(<RegisterScreen />);

      const inputs = getAllByTestId('text-input-outlined');
      await act(async () => {
        fireEvent.changeText(inputs[0], 'John Doe');
        fireEvent.changeText(inputs[1], 'newuser');
        fireEvent.changeText(inputs[2], 'john@doe.com');
        fireEvent.changeText(inputs[3], 'password123');
        fireEvent.changeText(inputs[4], 'passwordXYZ');
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await act(async () => {
        fireEvent.press(getByText('Create account'));
      });

      expect(getByText('Passwords do not match')).toBeTruthy();
      expect(authService.registerUser).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('handles Firebase auth email-already-in-use failure during registration', async () => {
      jest.useFakeTimers();
      (authService.checkUsernameAvailable as jest.Mock).mockResolvedValue(true);
      (authService.registerUser as jest.Mock).mockRejectedValueOnce(
        new Error('This email address is already in use by another account.')
      );

      const { getByText, getAllByTestId } = await renderWithPaper(<RegisterScreen />);

      const inputs = getAllByTestId('text-input-outlined');
      await act(async () => {
        fireEvent.changeText(inputs[0], 'John Doe');
        fireEvent.changeText(inputs[1], 'newuser');
        fireEvent.changeText(inputs[2], 'inuse@doe.com');
        fireEvent.changeText(inputs[3], 'password123');
        fireEvent.changeText(inputs[4], 'password123');
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await act(async () => {
        fireEvent.press(getByText('Create account'));
      });

      await waitFor(() => {
        expect(getByText('This email address is already in use by another account.')).toBeTruthy();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Registration Failed',
          'This email address is already in use by another account.'
        );
      });

      jest.useRealTimers();
    });
  });
});
