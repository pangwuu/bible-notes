import { Note, PassageSegment } from '../types/note';
import { UserProfile } from '../types/user';
import { getFriends } from './friendService';
import { getFriendNotes } from './friendService';
import { segmentsOverlap } from './noteOverlapService';
import safeStorage from '../utils/safeStorage';

export interface FriendActivityItem {
  note: Note;
  author: UserProfile;
  isIntersecting: boolean;
  overlappingPassageSummary?: string;
}

export interface DashboardFriendActivity {
  intersectingNotes: FriendActivityItem[];
  otherFriendNotes: FriendActivityItem[];
  hasFriends: boolean;
}

/**
 * Checks if a friend note overlaps with any of the user's notes.
 */
export function checkNoteIntersection(
  friendNote: Note,
  userNotes: Note[]
): { isIntersecting: boolean; overlappingPassageSummary?: string } {
  const friendSegments = friendNote.passage?.segments || [];
  if (friendSegments.length === 0) {
    return { isIntersecting: false };
  }

  for (const userNote of userNotes) {
    const userSegments = userNote.passage?.segments || [];
    for (const fSeg of friendSegments) {
      for (const uSeg of userSegments) {
        if (segmentsOverlap(fSeg, uSeg)) {
          const summary =
            userNote.passage?.display ||
            userNote.passage?.displayString ||
            `${uSeg.book} ${uSeg.startChapter}:${uSeg.startVerse}`;
          return {
            isIntersecting: true,
            overlappingPassageSummary: summary,
          };
        }
      }
    }
  }

  return { isIntersecting: false };
}

/**
 * Loads shared friend notes and partitions them into intersecting and non-intersecting groups.
 */
export async function getDashboardFriendActivity(
  currentUid: string,
  userNotes: Note[]
): Promise<DashboardFriendActivity> {
  if (!currentUid) {
    return { intersectingNotes: [], otherFriendNotes: [], hasFriends: false };
  }

  try {
    const friends = await getFriends(currentUid);
    if (!friends || friends.length === 0) {
      return { intersectingNotes: [], otherFriendNotes: [], hasFriends: false };
    }

    const intersecting: FriendActivityItem[] = [];
    const other: FriendActivityItem[] = [];

    // Fetch notes for all accepted friends in parallel
    const friendNotesResults = await Promise.all(
      friends.map(async (f) => {
        try {
          const notes = await getFriendNotes(f.friendUid);
          return { friend: f, notes };
        } catch {
          return { friend: f, notes: [] as Note[] };
        }
      })
    );

    for (const { friend, notes } of friendNotesResults) {
      for (const note of notes) {
        const { isIntersecting, overlappingPassageSummary } = checkNoteIntersection(
          note,
          userNotes
        );

        const activityItem: FriendActivityItem = {
          note,
          author: friend.friendProfile,
          isIntersecting,
          overlappingPassageSummary,
        };

        if (isIntersecting) {
          intersecting.push(activityItem);
        } else {
          other.push(activityItem);
        }
      }
    }

    // Sort newest first by updated_at / created_at
    const getTimestamp = (n: Note): number => {
      const ts = n.updated_at || n.created_at;
      if (typeof ts === 'number') return ts;
      if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
      return 0;
    };

    intersecting.sort((a, b) => getTimestamp(b.note) - getTimestamp(a.note));
    other.sort((a, b) => getTimestamp(b.note) - getTimestamp(a.note));

    const result: DashboardFriendActivity = {
      intersectingNotes: intersecting.slice(0, 10),
      otherFriendNotes: other.slice(0, 10),
      hasFriends: true,
    };

    // Cache locally for offline resilience
    await safeStorage.setItem(
      `dashboard_friend_activity_${currentUid}`,
      JSON.stringify(result)
    );

    return result;
  } catch (err) {
    // Fallback to cache if network fails
    const cached = await safeStorage.getItem(`dashboard_friend_activity_${currentUid}`);
    if (cached) {
      try {
        return JSON.parse(cached) as DashboardFriendActivity;
      } catch {
        // ignore parse error
      }
    }
    return { intersectingNotes: [], otherFriendNotes: [], hasFriends: false };
  }
}

/**
 * Selects a random note from the user's note collection for reflection.
 * Prioritizes notes outside the excluded set (e.g. Recent Notes).
 */
export function selectRandomReflectionNote(
  allNotes: Note[],
  excludeIds: Set<string> = new Set(),
  currentNoteId?: string
): Note | null {
  if (!allNotes || allNotes.length === 0) return null;

  // First pool: notes not in recent notes and not the current random note
  const primaryPool = allNotes.filter(
    (n) => !excludeIds.has(n.id) && n.id !== currentNoteId
  );

  if (primaryPool.length > 0) {
    const idx = Math.floor(Math.random() * primaryPool.length);
    return primaryPool[idx];
  }

  // Fallback pool: any note not equal to currentNoteId
  const fallbackPool = allNotes.filter((n) => n.id !== currentNoteId);
  if (fallbackPool.length > 0) {
    const idx = Math.floor(Math.random() * fallbackPool.length);
    return fallbackPool[idx];
  }

  // If there's only 1 note in total in the app, return it
  return allNotes[0] || null;
}
