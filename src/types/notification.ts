export type NotificationType =
  | 'friend_note_exists'
  | 'friend_request'
  | 'friend_accept';

export interface NotificationDocument {
  id: string;
  user_id: string; // recipient uid
  type: NotificationType;
  related_note_id?: string;
  related_user_id: string; // author or requester uid
  related_user_name: string;
  passage_summary?: string; // e.g. "Romans 8:28–30"
  read: boolean;
  created_at: any;
}

export interface NotificationItem extends NotificationDocument {
  timeAgo?: string;
}
