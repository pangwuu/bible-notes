import { Alert as RNAlert, AlertButton, AlertOptions, Platform } from 'react-native';

export interface WebAlertPayload {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

type WebAlertListener = (payload: WebAlertPayload) => void;

const webAlertListeners = new Set<WebAlertListener>();
let nextAlertId = 1;

export function subscribeWebAlerts(listener: WebAlertListener): () => void {
  webAlertListeners.add(listener);
  return () => {
    webAlertListeners.delete(listener);
  };
}

/**
 * Cross-platform alert utility.
 * - On iOS & Android: Uses native React Native Alert.alert.
 * - On Web: Dispatches to <WebAlertDialogHost /> so 1-, 2-, and 3+ button prompts
 *   render all button labels, preserve destructive/cancel roles, and focus the safe
 *   Cancel action by default. Falls back to window.alert/window.confirm only when
 *   no host is mounted (e.g. isolated unit tests).
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

    const normalizedButtons: AlertButton[] =
      buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];

    if (webAlertListeners.size > 0) {
      const payload: WebAlertPayload = {
        id: nextAlertId++,
        title,
        message,
        buttons: normalizedButtons,
        options,
      };
      webAlertListeners.forEach((listener) => listener(payload));
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
      confirmBtn?.onPress?.();
    }
  },
};

export default Alert;
