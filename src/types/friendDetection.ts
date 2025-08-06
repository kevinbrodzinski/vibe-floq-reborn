/**
 * Friend Detection System Types
 * 
 * Note: In this system, profile_id refers to profiles.id which equals auth.users.id (1:1 FK relationship).
 * The existing friendships table uses user_low/user_high referencing auth.users.id directly.
 * Since profiles.id = auth.users.id, these are interchangeable.
 */

export interface FriendshipSignal {
  type: 'co_location' | 'shared_activity' | 'venue_overlap' | 'time_sync' | 'interaction_frequency';
  strength: number; // 0-1
  confidence: number; // 0-1
  lastSeen: Date;
  metadata?: Record<string, any>;
}

export interface FriendshipScore {
  user_low: string; // UUID - matches friendships table structure (auth.users.id)
  user_high: string; // UUID - matches friendships table structure (auth.users.id)
  overall_score: number; // 0-1
  confidence_level: 'low' | 'medium' | 'high';
  signals: FriendshipSignal[];
  relationship_type: 'acquaintance' | 'friend' | 'close_friend' | 'best_friend';
  created_at: Date;
  updated_at: Date;
}

export interface FriendDetectionConfig {
  weights: {
    co_location: number;
    shared_activity: number;
    venue_overlap: number;
    time_sync: number;
    interaction_frequency: number;
  };
  thresholds: {
    friend_suggestion: number; // 0.3
    close_friend: number; // 0.7
    best_friend: number; // 0.9
  };
  time_decay_factor: number; // 0.95 per day
  min_confidence: number; // 0.2
}

export interface FriendSuggestion {
  target_profile_id: string; // UUID - the user receiving the suggestion (profiles.id = auth.users.id)
  suggested_profile_id: string; // UUID - the suggested friend (profiles.id = auth.users.id)
  score: number;
  confidence_level: 'low' | 'medium' | 'high';
  suggestion_reason: string;
  signals_summary: Record<string, any>;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: Date;
  responded_at?: Date;
  expires_at: Date;
}

// Analysis result types for SQL functions
export interface CoLocationEvent {
  profile_a: string; // UUID
  profile_b: string; // UUID
  venue_id: string;
  start_time: Date;
  end_time: Date;
  overlap_duration_minutes: number;
  proximity_score: number; // 0-1 based on how close they were
}

export interface SharedActivityEvent {
  profile_a: string; // UUID
  profile_b: string; // UUID
  activity_type: 'floq' | 'plan';
  activity_id: string;
  participation_overlap_minutes: number;
  activity_date: Date;
  interaction_quality: number; // 0-1
}

export interface VenueOverlapPattern {
  profile_a: string; // UUID
  profile_b: string; // UUID
  shared_venues: string[]; // venue IDs
  profile_a_visits: number;
  profile_b_visits: number;
  overlap_visits: number;
  jaccard_similarity: number; // overlap / union
  weighted_overlap_score: number; // considering visit frequency
}

export interface TimeSyncPattern {
  profile_a: string; // UUID
  profile_b: string; // UUID
  sync_score: number; // 0-1, how often they're active at the same times
  peak_sync_hours: number[]; // hours of day when they're most synchronized
  sync_consistency: number; // 0-1, how consistent their sync pattern is
}

// Composite analysis result
export interface FriendshipAnalysis {
  user_low: string; // UUID - canonical ordering (lower UUID first)
  user_high: string; // UUID - canonical ordering (higher UUID second)
  overall_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  relationship_type: 'acquaintance' | 'friend' | 'close_friend' | 'best_friend';
  signals_data: Record<string, any>; // JSONB storage
  created_at: Date;
  updated_at: Date;
}

// For the friend_suggestions table
export interface FriendSuggestionRecord {
  id: string; // UUID
  target_profile_id: string; // UUID - who gets the suggestion
  suggested_profile_id: string; // UUID - who is being suggested
  score: number;
  confidence_level: 'low' | 'medium' | 'high';
  suggestion_reason: string;
  signals_summary: Record<string, any>; // JSONB
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: Date;
  responded_at?: Date;
  expires_at: Date;
}