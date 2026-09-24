import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Note, PassageReference, PassageSegment, noteDocumentToNote } from '../types/note';
import { UserProfile } from '../types/user';
import { getFriends } from './friendService';
import { createNotification } from './notificationService';

export interface FriendOverlapItem {
  friendProfile: UserProfile;
  note: Note;
  overlapSegments: PassageSegment[];
}

/**
 * Checks if two passage segments within the same book intersect in chapter/verse space.
 */
export function segmentsOverlap(a: PassageSegment, b: PassageSegment): boolean {
  if (!a || !b || !a.book || !b.book) {
    return false;
  }

  if (a.book.toLowerCase() !== b.book.toLowerCase()) {
    return false;
  }

  // Defensive extraction supporting both domain (camelCase) and raw (snake_case)
  const aRaw = a as any;
  const bRaw = b as any;

  const aStartCh = Number(a.startChapter ?? aRaw.start_chapter ?? aRaw.chapter_start);
  const aStartV = Number(a.startVerse ?? aRaw.start_verse ?? aRaw.verse_start);
  const aEndCh = Number(a.endChapter ?? aRaw.end_chapter ?? aRaw.chapter_end ?? aStartCh);
  const aEndV = Number(a.endVerse ?? aRaw.end_verse ?? aRaw.verse_end ?? aStartV);

  const bStartCh = Number(b.startChapter ?? bRaw.start_chapter ?? bRaw.chapter_start);
  const bStartV = Number(b.startVerse ?? bRaw.start_verse ?? bRaw.verse_start);
  const bEndCh = Number(b.endChapter ?? bRaw.end_chapter ?? bRaw.chapter_end ?? bStartCh);
  const bEndV = Number(b.endVerse ?? bRaw.end_verse ?? bRaw.verse_end ?? bStartV);

  // If any boundary is NaN / invalid, fail closed (no overlap)
  if (
    isNaN(aStartCh) || isNaN(aStartV) || isNaN(aEndCh) || isNaN(aEndV) ||
    isNaN(bStartCh) || isNaN(bStartV) || isNaN(bEndCh) || isNaN(bEndV)
  ) {
    return false;
  }

  // Segment A span: (startChapter, startVerse) to (endChapter, endVerse)
  // Segment B span: (startChapter, startVerse) to (endChapter, endVerse)

  // Compare tuples: [chapter, verse]
  const aStartsAfterBEnds =
    aStartCh > bEndCh ||
    (aStartCh === bEndCh && aStartV > bEndV);

  const bStartsAfterAEnds =
    bStartCh > aEndCh ||
    (bStartCh === aEndCh && bStartV > aEndV);

  return !aStartsAfterBEnds && !bStartsAfterAEnds;
}

/**
 * Searches for all notes authored by accepted friends that overlap with the given passage range.
 * Only returns notes where visibility is 'friends' (or public).
 */
export async function findFriendNoteOverlaps(
  currentUid: string,
  passage: PassageReference
): Promise<FriendOverlapItem[]> {
  if (!currentUid || !passage) {
    return [];
  }

  let segments = passage.segments || [];
  if (segments.length === 0 && (passage as any).book) {
    const rawP = passage as any;
    segments = [{
      book: rawP.book,
      startChapter: rawP.startChapter ?? rawP.chapter_start ?? 1,
      startVerse: rawP.startVerse ?? rawP.verse_start ?? 1,
      endChapter: rawP.endChapter ?? rawP.chapter_end ?? 1,
      endVerse: rawP.endVerse ?? rawP.verse_end ?? 1,
    }];
  }

  if (segments.length === 0) {
    return [];
  }

  // 1. Get all accepted friends
  const friends = await getFriends(currentUid);
  if (friends.length === 0) {
    return [];
  }

  const targetBooks = passage.books && passage.books.length > 0
    ? passage.books
    : Array.from(new Set(segments.map((s) => s.book)));

  const results: FriendOverlapItem[] = [];
  const notesRef = collection(db, 'notes');

  // 2. For each friend, query notes where books array-contains target book
  for (const friend of friends) {
    for (const book of targetBooks) {
      try {
        const q = query(
          notesRef,
          where('user_id', '==', friend.friendUid),
          where('passage.books', 'array-contains', book),
          where('visibility', '==', 'friends')
        );
        const snap = await getDocs(q);

        snap.forEach((docSnap) => {
          const friendNote = noteDocumentToNote(docSnap.data(), docSnap.id);
          const intersectingSegments: PassageSegment[] = [];

          for (const fSeg of friendNote.passage.segments) {
            for (const tSeg of segments) {
              if (segmentsOverlap(fSeg, tSeg)) {
                intersectingSegments.push(fSeg);
                break;
              }
            }
          }

          if (intersectingSegments.length > 0) {
            // Ensure note not already added
            if (!results.some((r) => r.note.id === friendNote.id)) {
              results.push({
                friendProfile: friend.friendProfile,
                note: friendNote,
                overlapSegments: intersectingSegments,
              });
            }
          }
        });
      } catch (err) {
        console.warn(`Failed to query notes for friend ${friend.friendUid}:`, err);
      }
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

  const passageSummary =
    note.passage.display ||
    note.passage.displayString ||
    (note.passage.segments ? note.passage.segments.map((s) => s.book).join(', ') : (note.passage as any).book || '');

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
