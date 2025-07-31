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

// Input validation schemas for edge functions
export interface ActivityEvent {
  floq_id: string;
  event_type: 'join' | 'leave' | 'vibe_change' | 'proximity_update';
  user_id: string;
  proximity_users?: number;
  vibe?: string;
}

export interface RelationshipPair {
  user_a_id: string;
  user_b_id: string;
  proximity_meters: number;
  shared_vibe?: string;
  venue_id?: string;
}

export interface SuggestionRequest {
  user_id?: string;
  suggestion_types?: string[];
  max_suggestions?: number;
}

export const validateActivityEvent = (event: any): event is ActivityEvent => {
  return (
    typeof event.floq_id === 'string' &&
    typeof event.user_id === 'string' &&
    ['join', 'leave', 'vibe_change', 'proximity_update'].includes(event.event_type)
  );
};

export const validateRelationshipPair = (pair: any): pair is RelationshipPair => {
  return (
    typeof pair.user_a_id === 'string' &&
    typeof pair.user_b_id === 'string' &&
    typeof pair.proximity_meters === 'number' &&
    pair.user_a_id !== pair.user_b_id
  );
};