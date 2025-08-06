export interface FriendshipSignal {
  signal_type: 'co_location' | 'shared_activity' | 'venue_overlap' | 'time_sync' | 'interaction_frequency';
  strength: number; // 0-1 normalized score
  frequency: number; // How often this signal occurs
  recency: number; // How recent the signal is (0-1, 1 = very recent)
  confidence: number; // Confidence in this signal (0-1)
  metadata?: Record<string, any>;
}

export interface FriendshipScore {
  user_a: string;
  user_b: string;
  overall_score: number; // 0-100 composite score
  confidence_level: 'low' | 'medium' | 'high' | 'very_high';
  signals: FriendshipSignal[];
  last_calculated: string;
  relationship_type: 'acquaintance' | 'friend' | 'close_friend' | 'best_friend';
}

export interface FriendDetectionConfig {
  // Minimum thresholds for different signals
  min_co_location_events: number;
  min_shared_activities: number;
  co_location_radius_m: number;
  time_window_days: number;
  
  // Scoring weights for different signals
  weights: {
    co_location: number;
    shared_activity: number;
    venue_overlap: number;
    time_sync: number;
    interaction_frequency: number;
  };
  
  // Recency decay factors
  recency_decay_days: number;
  
  // Confidence thresholds
  min_confidence_for_suggestion: number;
}

export interface FriendSuggestion {
  suggested_friend_id: string;
  target_user_id: string;
  score: FriendshipScore;
  suggestion_reason: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'ignored';
}

export interface CoLocationEvent {
  user_a: string;
  user_b: string;
  venue_id: string;
  start_time: string;
  end_time?: string;
  distance_m?: number;
  duration_minutes?: number;
}

export interface SharedActivityEvent {
  user_a: string;
  user_b: string;
  activity_type: 'floq_participation' | 'plan_attendance' | 'venue_visit';
  activity_id: string;
  timestamp: string;
  interaction_type?: 'joined_together' | 'overlapping_time' | 'sequential_visits';
}

export interface VenueOverlapPattern {
  user_a: string;
  user_b: string;
  venue_id: string;
  visit_count_a: number;
  visit_count_b: number;
  overlap_coefficient: number; // Jaccard similarity or similar
  favorite_times?: string[]; // Common visit times
}

export interface TimeSyncPattern {
  user_a: string;
  user_b: string;
  sync_score: number; // How often they're active at the same times
  common_activity_windows: Array<{
    start_hour: number;
    end_hour: number;
    days_of_week: number[];
    strength: number;
  }>;
}

// Database table types for storing friend detection data
export interface FriendshipAnalysis {
  id: string;
  user_a: string;
  user_b: string;
  analysis_date: string;
  overall_score: number;
  confidence_level: string;
  signals_data: FriendshipSignal[];
  relationship_type: string;
  created_at: string;
  updated_at: string;
}

export interface FriendSuggestionRecord {
  id: string;
  target_user_id: string;
  suggested_friend_id: string;
  score: number;
  confidence_level: string;
  suggestion_reason: string;
  signals_summary: Record<string, number>;
  status: string;
  created_at: string;
  responded_at?: string;
  expires_at: string;
}