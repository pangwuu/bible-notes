import { UserProfile } from './user';

export type FriendshipStatus = 'pending' | 'accepted';

export interface FriendshipDocument {
  id: string; // Composite ID: `${smallerUid}_${largerUid}`
  user_ids: string[];
  status: FriendshipStatus;
  requested_by: string; // UID of user who created request
  created_at: any;
  updated_at: any;
}

export interface FriendItem {
  friendshipId: string;
  friendUid: string;
  friendProfile: UserProfile;
  status: FriendshipStatus;
  requestedBy: string;
  isIncoming: boolean;
  createdAt?: any;
}

export interface PendingFriendRequests {
  incoming: FriendItem[];
  outgoing: FriendItem[];
}
