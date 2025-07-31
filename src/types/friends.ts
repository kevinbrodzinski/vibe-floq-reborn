export interface FriendRow {
  id: string;
  user_low: string;
  user_high: string;
  created_at: string;
}

export interface FriendRequestRow {
  id: string;
  profile_id: string;    // requester (updated from user_id)
  other_profile_id: string;     // addressee (updated from friend_id)
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at: string | null;
}