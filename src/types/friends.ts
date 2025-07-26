export interface FriendRow {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

export interface FriendRequestRow {
  id: string;
  user_id: string;       // requester
  friend_id: string;     // addressee
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at: string | null;
}