import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing, radius, typography } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import {
  SUPPORTED_BIBLE_VERSIONS,
  DEFAULT_BIBLE_VERSION_ID,
  resolveVersionId,
} from '../src/constants/bibleVersions';

export default function BibleVersionsScreen() {
  const { profile } = useAuth();

  const rawPreferred =
    profile?.preferred_version_id ||
    profile?.settings?.preferred_version_id ||
    profile?.preferred_translation ||
    profile?.settings?.preferred_translation;
  const preferredVersionId = rawPreferred ? resolveVersionId(rawPreferred) : DEFAULT_BIBLE_VERSION_ID;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        Each translation takes a slightly different approach to rendering the original Hebrew,
        Aramaic, and Greek. Here is a quick guide to the versions available in the app.
      </Text>

      {SUPPORTED_BIBLE_VERSIONS.map((v) => {
        const isPreferred = v.id === preferredVersionId;
        return (
          <View
            key={v.id}
            testID={`bible-version-card-${v.code}`}
            accessibilityState={{ selected: isPreferred }}
            style={[styles.card, isPreferred && styles.cardPreferred]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.badge, isPreferred && styles.badgePreferred]}>
                <Text style={[styles.badgeText, isPreferred && styles.badgeTextPreferred]}>
                  {v.shortName}
                </Text>
              </View>
              <Text style={styles.fullName}>{v.fullName}</Text>
            </View>

            {(v.isPublicDomain || isPreferred) && (
              <View style={styles.tagRow}>
                {isPreferred && <Text style={styles.preferredTag}>Your preferred version</Text>}
                {v.isPublicDomain && <Text style={styles.tag}>Public domain</Text>}
              </View>
            )}

            <Text style={styles.summary}>{v.summary}</Text>
          </View>
        );
      })}
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
    backgroundColor: colors.bgBase,
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  intro: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.control,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    marginBottom: spacing.md,
  },
  cardPreferred: {
    borderColor: colors.accentKeyIdea,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgSurfaceRaised,
  },
  badgePreferred: {
    borderColor: colors.accentKeyIdea,
    backgroundColor: colors.accentKeyIdea,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badgeTextPreferred: {
    color: colors.bgBase,
  },
  fullName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tag: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentApplication,
  },
  preferredTag: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentKeyIdea,
  },
  summary: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
