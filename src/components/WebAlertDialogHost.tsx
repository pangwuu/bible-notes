import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';
import { AlertButton } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { subscribeWebAlerts, WebAlertPayload } from '../utils/alert';

export default function WebAlertDialogHost() {
  const [queue, setQueue] = useState<WebAlertPayload[]>([]);
  const safeButtonRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    return subscribeWebAlerts((payload) => {
      setQueue((prev) => [...prev, payload]);
    });
  }, []);

  const active = queue[0] ?? null;

  const dismissCurrent = useCallback(
    (buttonToInvoke?: AlertButton, fireOnDismiss?: boolean) => {
      const current = active;
      setQueue((prev) => prev.slice(1));
      if (buttonToInvoke?.onPress) {
        buttonToInvoke.onPress();
      } else if (fireOnDismiss && current?.options?.onDismiss) {
        current.options.onDismiss();
      }
    },
    [active]
  );

  const handleCancelOrDismiss = useCallback(() => {
    if (!active) return;
    if (active.options?.cancelable === false) return;
    const cancelBtn = active.buttons.find((b) => b.style === 'cancel');
    if (cancelBtn) {
      dismissCurrent(cancelBtn);
    } else if (active.buttons.length === 1) {
      dismissCurrent(active.buttons[0]);
    } else {
      dismissCurrent(undefined, true);
    }
  }, [active, dismissCurrent]);

  // Focus the safe action (Cancel, or first non-destructive button) when opened on web
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const timer = setTimeout(() => {
      if (safeButtonRef.current && typeof safeButtonRef.current.focus === 'function') {
        safeButtonRef.current.focus({ preventScroll: true });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [active]);

  // Support Escape key dismissal on web
  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !active ||
      typeof window === 'undefined' ||
      typeof window.addEventListener !== 'function'
    ) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelOrDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, handleCancelOrDismiss]);

  if (Platform.OS !== 'web' || !active) {
    return null;
  }

  const safeIdx = (() => {
    const cancelIdx = active.buttons.findIndex((b) => b.style === 'cancel');
    if (cancelIdx >= 0) return cancelIdx;
    const nonDestructiveIdx = active.buttons.findIndex((b) => b.style !== 'destructive');
    return nonDestructiveIdx >= 0 ? nonDestructiveIdx : 0;
  })();

  return (
    <Portal>
      <Dialog
        visible={true}
        dismissable={active.options?.cancelable !== false}
        onDismiss={handleCancelOrDismiss}
        style={styles.dialog}
      >
        <Dialog.Title style={styles.title}>{active.title}</Dialog.Title>
        {active.message ? (
          <Dialog.Content>
            <Text style={styles.message}>{active.message}</Text>
          </Dialog.Content>
        ) : null}
        <Dialog.Actions style={styles.actions}>
          <View style={styles.buttonRow}>
            {active.buttons.map((btn, idx) => {
              const label = btn.text || 'OK';
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <Pressable
                  key={`${active.id}-${idx}-${label}`}
                  ref={idx === safeIdx ? safeButtonRef : undefined}
                  onPress={() => dismissCurrent(btn)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  style={({ pressed }) => [
                    styles.button,
                    isDestructive && styles.buttonDestructive,
                    !isCancel && !isDestructive && styles.buttonPrimary,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.buttonTextCancel,
                      isDestructive && styles.buttonTextDestructive,
                      !isCancel && !isDestructive && styles.buttonTextPrimary,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    maxWidth: 420,
    alignSelf: 'center',
    width: '92%',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {
    borderColor: colors.accentKeyIdea,
    backgroundColor: colors.bgSurfaceRaised,
  },
  buttonDestructive: {
    borderColor: colors.accentDanger,
    backgroundColor: colors.bgBase,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextCancel: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buttonTextPrimary: {
    color: colors.accentKeyIdea,
  },
  buttonTextDestructive: {
    color: colors.accentDanger,
  },
});
