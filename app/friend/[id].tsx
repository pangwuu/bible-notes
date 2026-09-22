import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{id ? id[0].toUpperCase() : 'F'}</Text>
        </View>
        <Text style={styles.displayName}>Sarah Smith</Text>
        <Text style={styles.username}>@{id}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Mutual Friend</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Shared Notes</Text>

      <Pressable
        style={styles.noteCard}
        onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'friend-note-1' } })}
      >
        <Text style={styles.noteRef}>Romans 8:28–30</Text>
        <Text style={styles.noteSnippet} numberOfLines={2}>
          💡 God works all things together for the good of those who love Him...
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    padding: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgSurfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: colors.accentSocial,
    fontSize: 24,
    fontWeight: '600',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
  },
  statusText: {
    fontSize: 12,
    color: colors.accentSocial,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  noteCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.sm,
  },
  noteRef: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  noteSnippet: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
