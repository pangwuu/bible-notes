import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Note, PassageReference, noteDocumentToNote } from '../types/note';
import { UserProfile } from '../types/user';
import { getFriends } from './friendService';
import { checkRangeOverlap, referenceToOrdinals, formatPassageSummary } from '../utils/bibleOrdinals';
import { createNotification } from './notificationService';

export interface FriendOverlapItem {
  friendProfile: UserProfile;
  note: Note;
  overlapRange: [number, number];
}

/**
 * Searches for all notes authored by accepted friends that overlap with the given passage range.
 * Only returns notes where visibility is 'friends' (or public).
 */
export async function findFriendNoteOverlaps(
  currentUid: string,
  passage: PassageReference
): Promise<FriendOverlapItem[]> {
  if (!currentUid || !passage || !passage.book) {
    return [];
  }

  // 1. Get all accepted friends
  const friends = await getFriends(currentUid);
  if (friends.length === 0) {
    return [];
  }

  // 2. Compute canonical ordinal range for the target passage
  let targetRange: [number, number];
  if (passage.startOrdinal && passage.endOrdinal && passage.startOrdinal <= passage.endOrdinal) {
    targetRange = [passage.startOrdinal, passage.endOrdinal];
  } else {
    try {
      targetRange = referenceToOrdinals(
        passage.book,
        passage.startChapter,
        passage.startVerse,
        passage.endChapter,
        passage.endVerse
      );
    } catch {
      return [];
    }
  }

  const results: FriendOverlapItem[] = [];
  const notesRef = collection(db, 'notes');

  // 3. For each friend, query notes for this book that have visibility == 'friends'
  for (const friend of friends) {
    try {
      const q = query(
        notesRef,
        where('user_id', '==', friend.friendUid),
        where('book', '==', passage.book),
        where('visibility', '==', 'friends')
      );
      const snap = await getDocs(q);

      snap.forEach((docSnap) => {
        const friendNote = noteDocumentToNote(docSnap.data(), docSnap.id);
        const friendStart = friendNote.start_verse_id || friendNote.passage.startOrdinal;
        const friendEnd = friendNote.end_verse_id || friendNote.passage.endOrdinal;

        if (friendStart && friendEnd) {
          const overlap = checkRangeOverlap([friendStart, friendEnd], targetRange);
          if (overlap.overlaps && overlap.overlapRange) {
            results.push({
              friendProfile: friend.friendProfile,
              note: friendNote,
              overlapRange: overlap.overlapRange,
            });
          }
        }
      });
    } catch (err) {
      console.warn(`Failed to query notes for friend ${friend.friendUid}:`, err);
    }
  }

  return results;
}

/**
 * Evaluates whether a newly created/updated note overlaps with any friends' notes.
 * If overlaps are found, creates a 'friend_note_exists' notification for each friend.
 */
export async function notifyFriendsOfNoteOverlap(
  currentUid: string,
  authorName: string,
  note: Note
): Promise<number> {
  if (note.visibility !== 'friends') {
    return 0;
  }

  const overlaps = await findFriendNoteOverlaps(currentUid, note.passage);
  if (overlaps.length === 0) {
    return 0;
  }

  const passageSummary = formatPassageSummary(
    note.passage.book,
    note.passage.startChapter,
    note.passage.startVerse,
    note.passage.endChapter,
    note.passage.endVerse
  );

  let notifiedCount = 0;
  // Deduplicate notifications by recipient UID
  const notifiedFriends = new Set<string>();

  for (const item of overlaps) {
    const friendUid = item.friendProfile.uid;
    if (!friendUid || friendUid === currentUid || notifiedFriends.has(friendUid)) {
      continue;
    }

    notifiedFriends.add(friendUid);
    try {
      await createNotification({
        user_id: friendUid,
        type: 'friend_note_exists',
        related_note_id: note.id,
        related_user_id: currentUid,
        related_user_name: authorName,
        passage_summary: passageSummary,
        read: false,
      });
      notifiedCount++;
    } catch (err) {
      console.warn(`Failed to send overlap notification to ${friendUid}:`, err);
    }
  }

  return notifiedCount;
}
