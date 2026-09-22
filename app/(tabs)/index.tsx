import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.quickJumpCard}>
          <Text style={styles.quickJumpTitle}>Quick Passage Jump</Text>
          <Pressable
            style={styles.quickJumpButton}
            onPress={() => router.push('/note/edit')}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <Text style={styles.quickJumpPlaceholder}>Jump to book, chapter, verse...</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionHeading}>Recent Notes</Text>

        <Pressable
          style={styles.noteCard}
          onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'sample-1' } })}
        >
          <View style={styles.noteHeaderRow}>
            <Text style={styles.passageRef}>John 3:16–17</Text>
            <Text style={styles.timestamp}>2h ago</Text>
          </View>
          <Text style={styles.noteSnippet} numberOfLines={2}>
            For God so loved the world, that he gave his only Son...
          </Text>
        </Pressable>
      </ScrollView>

      <FAB
        icon="plus"
        color={colors.bgBase}
        style={styles.fab}
        onPress={() => router.push('/note/edit')}
      />
    </View>
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
  quickJumpCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.lg,
  },
  quickJumpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  quickJumpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgBase,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    gap: spacing.sm,
  },
  quickJumpPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionHeading: {
    fontSize: 20,
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
  noteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  passageRef: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noteSnippet: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.accentKeyIdea,
    borderRadius: 28,
  },
});
