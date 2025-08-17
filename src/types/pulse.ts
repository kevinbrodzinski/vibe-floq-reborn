export type PulseEventType =
  | 'check_in' | 'check_out'
  | 'vibe_join' | 'vibe_leave'
  | 'floq_join' | 'floq_leave';

export interface PulseEvent {
  id:           number;
  created_at:   string;
  event_type:   PulseEventType;
  profile_id?:  string | null;
  floq_id?:     string | null;
  venue_id?:    string | null; /* uuid */
  vibe_tag?:    string | null;
  people_count: number;
  meta:         Record<string, unknown>;
}

export interface TrendingVenue {
  venue_id:     string; /* uuid */
  name:         string;
  distance_m:   number;
  people_now:   number;
  last_seen_at: string;
  trend_score:  number;
  vibe_tag?:    string; // Add missing vibe_tag property
}

export interface WeatherSnapshot {
  condition:    'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snow';
  temperatureF: number;
  summary:      string;
  created_at:   string;
} 