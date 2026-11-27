import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useNavigation } from 'expo-router';
import { colors, spacing, radius, typography } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import {
  DeletedNote,
  getDeletedNotes,
  permanentlyDeleteNote,
  restoreNote,
  TRASH_RETENTION_DAYS,
} from '../src/services/notesService';
import { formatPassageDisplay } from '../src/types/note';
import EmptyState from '../src/components/EmptyState';
import { Alert } from '../src/utils/alert';
import { announceNotesChanged } from '../src/state/noteTrash';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysLeft(deletedAt: number): number {
  const elapsedDays = Math.max(0, Math.floor((Date.now() - deletedAt) / DAY_MS));
  return Math.max(1, TRASH_RETENTION_DAYS - elapsedDays);
}

function deletedWhen(deletedAt: number): string {
  const days = Math.max(0, Math.floor((Date.now() - deletedAt) / DAY_MS));
  if (days === 0) return 'Deleted today';
  if (days === 1) return 'Deleted yesterday';
  return `Deleted ${days} days ago`;
}

function noteLabel(note: DeletedNote): string {
  return note.title || formatPassageDisplay(note.passage) || 'Untitled note';
}

export default function RecentlyDeletedScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [notes, setNotes] = useState<DeletedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emptying, setEmptying] = useState(false);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setNotes(await getDeletedNotes(user.uid));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRestore = useCallback(async (note: DeletedNote) => {
    setBusyId(note.id);
    try {
      await restoreNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      announceNotesChanged();
    } catch {
      Alert.alert('Error', "Couldn't restore this note. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleDeleteForever = useCallback((note: DeletedNote) => {
    Alert.alert(
      'Delete forever?',
      `"${noteLabel(note)}" will be gone for good. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            setBusyId(note.id);
            try {
              await permanentlyDeleteNote(note.id);
              setNotes((prev) => prev.filter((n) => n.id !== note.id));
            } catch {
              Alert.alert('Error', "Couldn't delete this note. Check your connection and try again.");
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }, []);

  const handleEmpty = useCallback(() => {
    if (notes.length === 0 || emptying) return;
    const count = notes.length;
    Alert.alert(
      'Empty Recently Deleted?',
      `${count} ${count === 1 ? 'note' : 'notes'} will be gone for good. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            setEmptying(true);
            try {
              const results = await Promise.allSettled(
                notes.map((n) => permanentlyDeleteNote(n.id))
              );
              const failed = new Set(
                notes.filter((_, i) => results[i].status === 'rejected').map((n) => n.id)
              );
              setNotes((prev) => prev.filter((n) => failed.has(n.id)));
              if (failed.size > 0) {
                Alert.alert(
                  'Error',
                  `${failed.size} couldn't be deleted. Try again when you're online.`
                );
              }
            } finally {
              setEmptying(false);
            }
          },
        },
      ]
    );
  }, [notes, emptying]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        notes.length > 0 ? (
          <Button
            compact
            disabled={emptying}
            loading={emptying}
            textColor={colors.accentDanger}
            onPress={handleEmpty}
            accessibilityLabel="Empty Recently Deleted"
          >
            Empty
          </Button>
        ) : null,
    });
  }, [navigation, notes.length, handleEmpty, emptying]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentKeyIdea} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.container}
      data={notes}
      keyExtractor={(n) => n.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.accentKeyIdea}
        />
      }
      ListHeaderComponent={
        <>
          <Text style={styles.intro}>
            Deleted notes stay here for {TRASH_RETENTION_DAYS} days, then they're removed for good.
            Friends can't see them while they're here.
          </Text>
          {loadError ? (
            <Text style={styles.error}>Couldn't load deleted notes. Pull down to try again.</Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        loadError ? null : (
          <EmptyState
            icon="trash-outline"
            title="Nothing here"
            subtitle="Notes you delete will show up here."
          />
        )
      }
      renderItem={({ item }) => {
        const busy = busyId === item.id;
        const left = daysLeft(item.deletedAt);
        return (
          <View style={styles.card}>
            <Text style={styles.title} numberOfLines={1}>
              {noteLabel(item)}
            </Text>
            {item.title ? (
              <Text style={styles.passage} numberOfLines={1}>
                {formatPassageDisplay(item.passage)}
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {deletedWhen(item.deletedAt)}, {left} {left === 1 ? 'day' : 'days'} left
            </Text>
            <View style={styles.actions}>
              <Button
                compact
                mode="text"
                disabled={busy}
                textColor={colors.accentDanger}
                onPress={() => handleDeleteForever(item)}
                accessibilityLabel={`Delete ${noteLabel(item)} forever`}
              >
                Delete forever
              </Button>
              <Button
                compact
                mode="outlined"
                disabled={busy}
                loading={busy}
                textColor={colors.accentKeyIdea}
                style={styles.restoreButton}
                onPress={() => handleRestore(item)}
                accessibilityLabel={`Restore ${noteLabel(item)}`}
              >
                Restore
              </Button>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgBase,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  error: {
    fontSize: 13,
    color: colors.accentDanger,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  passage: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  restoreButton: {
    borderColor: colors.borderHairline,
  },
});
