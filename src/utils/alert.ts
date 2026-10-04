import { Alert as RNAlert, AlertButton, AlertOptions, Platform } from 'react-native';

/**
 * Cross-platform alert utility.
 * - On iOS & Android: Uses native React Native Alert.alert.
 * - On Web: Uses window.confirm (for choices) or window.alert (for informational messages)
 *   so buttons and actions actually fire instead of being silent no-ops.
 */
export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ): void => {
    if (Platform.OS !== 'web') {
      RNAlert.alert(title, message, buttons, options);
      return;
    }

    const text = [title, message].filter(Boolean).join('\n\n');

    if (!buttons || buttons.length === 0) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(text);
      }
      return;
    }

    if (buttons.length === 1) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(text);
      }
      buttons[0]?.onPress?.();
      return;
    }

    // 2 or more buttons: typically [Cancel, Confirm/Action]
    // Find cancel and confirm buttons
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const confirmBtn = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm(text);
      if (confirmed) {
        confirmBtn?.onPress?.();
      } else {
        cancelBtn?.onPress?.();
      }
    } else {
      // Fallback if window.confirm is not available
      confirmBtn?.onPress?.();
    }
  },
};

export default Alert;
