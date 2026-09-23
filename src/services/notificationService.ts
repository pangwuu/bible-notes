import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { NotificationDocument } from '../types/notification';

/**
 * Creates a new notification document.
 */
export async function createNotification(
  input: Omit<NotificationDocument, 'id' | 'created_at'>
): Promise<string> {
  const notifsRef = collection(db, 'notifications');
  const newDocRef = doc(notifsRef);

  const payload = {
    ...input,
    id: newDocRef.id,
    read: false,
    created_at: serverTimestamp(),
  };

  await setDoc(newDocRef, payload);
  return newDocRef.id;
}

/**
 * Retrieves notifications for a given user, ordered newest first.
 */
export async function getNotifications(
  userId: string,
  maxResults: number = 50
): Promise<NotificationDocument[]> {
  if (!userId) return [];

  const notifsRef = collection(db, 'notifications');
  const q = query(
    notifsRef,
    where('user_id', '==', userId),
    orderBy('created_at', 'desc'),
    limit(maxResults)
  );

  try {
    const snap = await getDocs(q);
    const notifications: NotificationDocument[] = [];
    snap.forEach((d) => {
      notifications.push({ id: d.id, ...(d.data() as any) });
    });
    return notifications;
  } catch (error) {
    // Fallback if index on created_at is building: query by user_id and sort in memory
    const fallbackQ = query(notifsRef, where('user_id', '==', userId), limit(maxResults));
    const snap = await getDocs(fallbackQ);
    const notifications: NotificationDocument[] = [];
    snap.forEach((d) => {
      notifications.push({ id: d.id, ...(d.data() as any) });
    });
    return notifications.sort((a, b) => {
      const tA = a.created_at?.toMillis ? a.created_at.toMillis() : a.created_at || 0;
      const tB = b.created_at?.toMillis ? b.created_at.toMillis() : b.created_at || 0;
      return tB - tA;
    });
  }
}

/**
 * Subscribes to real-time notifications for a user.
 */
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: NotificationDocument[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const notifsRef = collection(db, 'notifications');
  const q = query(
    notifsRef,
    where('user_id', '==', userId),
    orderBy('created_at', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: NotificationDocument[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      onUpdate(list);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to the unread notifications count for badge display.
 */
export function subscribeToUnreadCount(
  userId: string,
  onCountUpdate: (count: number) => void
): () => void {
  if (!userId) {
    onCountUpdate(0);
    return () => {};
  }

  const notifsRef = collection(db, 'notifications');
  const q = query(
    notifsRef,
    where('user_id', '==', userId),
    where('read', '==', false)
  );

  return onSnapshot(
    q,
    (snap) => {
      onCountUpdate(snap.size);
    },
    () => {
      onCountUpdate(0);
    }
  );
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  const notifRef = doc(db, 'notifications', notificationId);
  await updateDoc(notifRef, {
    read: true,
  });
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!userId) return;

  const notifsRef = collection(db, 'notifications');
  const q = query(
    notifsRef,
    where('user_id', '==', userId),
    where('read', '==', false)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.forEach((d) => {
    batch.update(d.ref, { read: true });
  });

  await batch.commit();
}

/**
 * Deletes a notification document.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  if (!notificationId) return;
  const notifRef = doc(db, 'notifications', notificationId);
  await deleteDoc(notifRef);
}
