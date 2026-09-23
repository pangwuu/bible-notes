import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types/user';
import { FriendshipDocument, FriendItem, PendingFriendRequests } from '../types/friendship';
import { Note } from '../types/note';

/**
 * Builds the canonical deterministic doc ID for a friendship between two users.
 * Lexicographical sort ensures both users map to the exact same doc ID.
 * Throws if either UID is missing or if both UIDs are identical.
 */
export function buildFriendshipDocId(uidA: string, uidB: string): string {
  if (!uidA || !uidB) {
    throw new Error('Both user IDs are required to build friendship doc ID');
  }
  if (uidA === uidB) {
    throw new Error('Cannot create a friendship with oneself');
  }
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

/**
 * Searches users using N-gram search_tokens, exact username match, and exact email match.
 * Excludes the current authenticated user from results.
 */
export async function searchUsers(
  queryStr: string,
  currentUid: string,
  maxResults: number = 20
): Promise<UserProfile[]> {
  const clean = queryStr.trim().toLowerCase();
  if (clean.length < 3) {
    return [];
  }

  const usersRef = collection(db, 'users');
  const resultsMap = new Map<string, UserProfile>();

  try {
    // 1. N-gram token search (tokens >= 3 chars, truncated to 20 for safety)
    const tokenQuery = query(
      usersRef,
      where('search_tokens', 'array-contains', clean.slice(0, 20)),
      limit(maxResults)
    );
    const tokenSnap = await getDocs(tokenQuery);
    tokenSnap.forEach((d) => {
      if (d.id !== currentUid) {
        resultsMap.set(d.id, { ...(d.data() as UserProfile), uid: d.id });
      }
    });

    // 2. Exact username match fallback
    if (resultsMap.size < maxResults) {
      const usernameQuery = query(
        usersRef,
        where('username', '==', clean),
        limit(5)
      );
      const usernameSnap = await getDocs(usernameQuery);
      usernameSnap?.forEach?.((d) => {
        if (d.id !== currentUid) {
          resultsMap.set(d.id, { ...(d.data() as UserProfile), uid: d.id });
        }
      });
    }

    // 3. Exact email match fallback
    if (resultsMap.size < maxResults && clean.includes('@')) {
      const emailQuery = query(
        usersRef,
        where('email', '==', clean),
        limit(5)
      );
      const emailSnap = await getDocs(emailQuery);
      emailSnap?.forEach?.((d) => {
        if (d.id !== currentUid) {
          resultsMap.set(d.id, { ...(d.data() as UserProfile), uid: d.id });
        }
      });
    }
  } catch (error) {
    console.error('searchUsers error:', error);
  }

  return Array.from(resultsMap.values()).slice(0, maxResults);
}

/**
 * Checks the friendship relationship between two users.
 */
export async function getFriendshipStatus(
  currentUid: string,
  targetUid: string
): Promise<{ status: 'none' | 'pending' | 'accepted'; friendshipId?: string; isIncoming?: boolean }> {
  try {
    const docId = buildFriendshipDocId(currentUid, targetUid);
    const friendshipRef = doc(db, 'friendships', docId);
    const snap = await getDoc(friendshipRef);
    if (!snap.exists()) {
      return { status: 'none' };
    }
    const data = snap.data() as FriendshipDocument;
    return {
      status: data.status,
      friendshipId: snap.id,
      isIncoming: data.requested_by !== currentUid,
    };
  } catch {
    return { status: 'none' };
  }
}

/**
 * Sends a friend request from currentUid to targetUid.
 * Creates a doc in 'friendships' with status 'pending' and requested_by: currentUid.
 */
export async function sendFriendRequest(
  currentUid: string,
  targetUid: string
): Promise<string> {
  const docId = buildFriendshipDocId(currentUid, targetUid);
  const friendshipRef = doc(db, 'friendships', docId);

  let existing: any = null;
  try {
    existing = await getDoc(friendshipRef);
  } catch (err: any) {
    if (err?.code !== 'permission-denied') {
      throw err;
    }
  }

  if (existing && existing.exists()) {
    const data = existing.data() as FriendshipDocument;
    if (data.status === 'accepted') {
      throw new Error('You are already friends with this user');
    }
    if (data.status === 'pending') {
      if (data.requested_by === currentUid) {
        throw new Error('Friend request already sent');
      } else {
        // Target user already sent a request to current user, auto-accept
        await acceptFriendRequest(docId);
        return docId;
      }
    }
  }

  const payload: FriendshipDocument = {
    id: docId,
    user_ids: [currentUid, targetUid].sort(),
    status: 'pending',
    requested_by: currentUid,
    created_at: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
  };

  await setDoc(friendshipRef, payload);
  return docId;
}

/**
 * Accepts an incoming friend request.
 */
export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  if (!friendshipId) throw new Error('Friendship ID is required');
  const friendshipRef = doc(db, 'friendships', friendshipId);
  await updateDoc(friendshipRef, {
    status: 'accepted',
    updated_at: serverTimestamp(),
  });
}

/**
 * Declines a pending friend request (deletes friendship document).
 */
export async function declineFriendRequest(friendshipId: string): Promise<void> {
  if (!friendshipId) throw new Error('Friendship ID is required');
  const friendshipRef = doc(db, 'friendships', friendshipId);
  await deleteDoc(friendshipRef);
}

/**
 * Unfriends a user (deletes the friendship document).
 */
export async function unfriend(friendshipId: string): Promise<void> {
  if (!friendshipId) throw new Error('Friendship ID is required');
  const friendshipRef = doc(db, 'friendships', friendshipId);
  await deleteDoc(friendshipRef);
}

/**
 * Retrieves all accepted friends for the given user, along with their UserProfile data.
 */
export async function getFriends(currentUid: string): Promise<FriendItem[]> {
  if (!currentUid) return [];

  const friendshipsRef = collection(db, 'friendships');
  const q = query(
    friendshipsRef,
    where('user_ids', 'array-contains', currentUid),
    where('status', '==', 'accepted')
  );

  const snap = await getDocs(q);
  const friends: FriendItem[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as FriendshipDocument;
    const friendUid = data.user_ids.find((id) => id !== currentUid);
    if (!friendUid) continue;

    const userDocRef = doc(db, 'users', friendUid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userProfile = { ...(userDoc.data() as UserProfile), uid: userDoc.id };
      friends.push({
        friendshipId: docSnap.id,
        friendUid,
        friendProfile: userProfile,
        status: 'accepted',
        requestedBy: data.requested_by,
        isIncoming: data.requested_by !== currentUid,
        createdAt: data.created_at,
      });
    }
  }

  // Sort by display name / username
  return friends.sort((a, b) => {
    const nameA = a.friendProfile.display_name || a.friendProfile.username || '';
    const nameB = b.friendProfile.display_name || b.friendProfile.username || '';
    return nameA.localeCompare(nameB);
  });
}

/**
 * Retrieves incoming and outgoing pending friend requests for currentUid.
 */
export async function getPendingRequests(currentUid: string): Promise<PendingFriendRequests> {
  if (!currentUid) {
    return { incoming: [], outgoing: [] };
  }

  const friendshipsRef = collection(db, 'friendships');
  const q = query(
    friendshipsRef,
    where('user_ids', 'array-contains', currentUid),
    where('status', '==', 'pending')
  );

  const snap = await getDocs(q);
  const incoming: FriendItem[] = [];
  const outgoing: FriendItem[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as FriendshipDocument;
    const otherUid = data.user_ids.find((id) => id !== currentUid);
    if (!otherUid) continue;

    const userDocRef = doc(db, 'users', otherUid);
    const userDoc = await getDoc(userDocRef);
    const userProfile = userDoc.exists()
      ? ({ ...(userDoc.data() as UserProfile), uid: userDoc.id } as UserProfile)
      : ({ uid: otherUid, username: 'user', display_name: 'Unknown User' } as UserProfile);

    const isIncoming = data.requested_by !== currentUid;
    const item: FriendItem = {
      friendshipId: docSnap.id,
      friendUid: otherUid,
      friendProfile: userProfile,
      status: 'pending',
      requestedBy: data.requested_by,
      isIncoming,
      createdAt: data.created_at,
    };

    if (isIncoming) {
      incoming.push(item);
    } else {
      outgoing.push(item);
    }
  }

  return { incoming, outgoing };
}

/**
 * Retrieves notes shared by a friend with visibility: 'friends'.
 */
export async function getFriendNotes(friendUid: string): Promise<Note[]> {
  if (!friendUid) return [];

  const notesRef = collection(db, 'notes');
  const q = query(
    notesRef,
    where('user_id', '==', friendUid),
    where('visibility', '==', 'friends')
  );

  const snap = await getDocs(q);
  const notes: Note[] = [];

  snap.forEach((d) => {
    notes.push({ id: d.id, ...(d.data() as any) });
  });

  return notes;
}
