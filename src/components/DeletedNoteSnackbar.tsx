import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../constants/theme';
import { restoreNote } from '../services/notesService';
import {
  announceNotesChanged,
  DeletedNoteNotice,
  onNoteDeleted,
} from '../state/noteTrash';

/**
 * App-wide "Note deleted · Undo" bar. Mounted once in the root layout so it
 * survives the note screen closing.
 */
export default function DeletedNoteSnackbar() {
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<DeletedNoteNotice | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(
    () =>
      onNoteDeleted((n) => {
        setMessage(null);
        setNotice(n);
      }),
    []
  );

  const undo = useCallback(async () => {
    if (!notice) return;
    const { id } = notice;
    setNotice(null);
    try {
      await restoreNote(id);
      announceNotesChanged();
      setMessage('Note restored.');
    } catch {
      setMessage("Couldn't restore it here. It's still in Recently Deleted, in Settings.");
    }
  }, [notice]);

  return (
    <>
      <Snackbar
        visible={!!notice}
        onDismiss={() => setNotice(null)}
        duration={7000}
        style={[styles.snackbar, { marginBottom: insets.bottom + 56 }]}
        action={{ label: 'Undo', textColor: colors.accent.keyIdea, onPress: undo }}
      >
        <Text style={styles.text}>
          Deleted {notice?.label}. It's in Recently Deleted for 30 days.
        </Text>
      </Snackbar>
      <Snackbar
        visible={!!message}
        onDismiss={() => setMessage(null)}
        duration={4000}
        style={[styles.snackbar, { marginBottom: insets.bottom + 56 }]}
      >
        <Text style={styles.text}>{message}</Text>
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    backgroundColor: colors.bg.surfaceRaised,
  },
  text: {
    ...typography.label,
    color: colors.text.primary,
  },
});
