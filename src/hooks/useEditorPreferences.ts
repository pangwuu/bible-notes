import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/authService';
import safeStorage from '../utils/safeStorage';
import {
  DEFAULT_VERSE_TAG_PLACEMENT,
  isVerseTagPlacement,
  VerseTagPlacement,
} from '../utils/verseLinkUtils';
import type { UserSettings } from '../types/user';

export const PREF_KEYS = {
  verseTagPlacement: 'verse_tag_placement',
  autoScrollOnLink: 'auto_scroll_on_link',
  autoScrollPromptSeen: 'auto_scroll_prompt_seen',
  labelMovedSections: 'label_moved_sections',
} as const;

function parseBool(raw: string | null): boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

/**
 * Editor preferences live in two places: the Firestore profile (follows the user
 * across devices) and a local mirror (available instantly, before the profile
 * snapshot arrives, and when offline). The profile wins once it has a value.
 */
export function useEditorPreferences() {
  const { user, profile } = useAuth();

  const [localPlacement, setLocalPlacement] = useState<VerseTagPlacement | undefined>();
  const [localAutoScroll, setLocalAutoScroll] = useState<boolean | undefined>();
  const [autoScrollPromptSeen, setAutoScrollPromptSeenState] = useState<boolean>(true);
  const [localLabelMoved, setLocalLabelMoved] = useState<boolean | undefined>();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      safeStorage.getItem(PREF_KEYS.verseTagPlacement),
      safeStorage.getItem(PREF_KEYS.autoScrollOnLink),
      safeStorage.getItem(PREF_KEYS.autoScrollPromptSeen),
      safeStorage.getItem(PREF_KEYS.labelMovedSections),
    ]).then(([placement, autoScroll, promptSeen, labelMoved]) => {
      if (!mounted) return;
      if (isVerseTagPlacement(placement)) setLocalPlacement(placement);
      const parsedAuto = parseBool(autoScroll);
      if (parsedAuto !== undefined) setLocalAutoScroll(parsedAuto);
      setAutoScrollPromptSeenState(promptSeen === 'true');
      const parsedLabel = parseBool(labelMoved);
      if (parsedLabel !== undefined) setLocalLabelMoved(parsedLabel);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const profilePlacement = profile?.settings?.verse_tag_placement;
  const profileAutoScroll = profile?.settings?.auto_scroll_on_link;
  const profileLabelMoved = profile?.settings?.label_moved_sections;

  const verseTagPlacement: VerseTagPlacement = isVerseTagPlacement(profilePlacement)
    ? profilePlacement
    : localPlacement ?? DEFAULT_VERSE_TAG_PLACEMENT;

  const autoScrollOnLink: boolean =
    typeof profileAutoScroll === 'boolean' ? profileAutoScroll : localAutoScroll ?? true;

  const labelMovedSections: boolean =
    typeof profileLabelMoved === 'boolean' ? profileLabelMoved : localLabelMoved ?? true;

  const persistSetting = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!user?.uid) return;
      try {
        await updateUserProfile(user.uid, {
          settings: { ...profile?.settings, ...patch },
        });
      } catch (err) {
        console.warn('Failed to save editor preference:', err);
      }
    },
    [user?.uid, profile?.settings]
  );

  const setVerseTagPlacement = useCallback(
    async (value: VerseTagPlacement) => {
      setLocalPlacement(value);
      await safeStorage.setItem(PREF_KEYS.verseTagPlacement, value).catch(() => {});
      await persistSetting({ verse_tag_placement: value });
    },
    [persistSetting]
  );

  const setAutoScrollOnLink = useCallback(
    async (value: boolean) => {
      setLocalAutoScroll(value);
      await safeStorage.setItem(PREF_KEYS.autoScrollOnLink, String(value)).catch(() => {});
      await persistSetting({ auto_scroll_on_link: value });
    },
    [persistSetting]
  );

  const setLabelMovedSections = useCallback(
    async (value: boolean) => {
      setLocalLabelMoved(value);
      await safeStorage.setItem(PREF_KEYS.labelMovedSections, String(value)).catch(() => {});
      await persistSetting({ label_moved_sections: value });
    },
    [persistSetting]
  );

  const markAutoScrollPromptSeen = useCallback(async () => {
    setAutoScrollPromptSeenState(true);
    await safeStorage.setItem(PREF_KEYS.autoScrollPromptSeen, 'true').catch(() => {});
  }, []);

  return {
    verseTagPlacement,
    setVerseTagPlacement,
    autoScrollOnLink,
    setAutoScrollOnLink,
    autoScrollPromptSeen,
    markAutoScrollPromptSeen,
    labelMovedSections,
    setLabelMovedSections,
  };
}
