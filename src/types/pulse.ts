import type { Database } from '@/integrations/supabase/types'

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

export interface LiveActivityItem {
  id: string; // String version for UI consistency
  created_at: string;
  event_type: PulseEventType;
  profile_id?: string | null;
  floq_id?: string | null;
  venue_id?: string | null;
  vibe_tag?: string | null;
  people_count: number;
  meta: Record<string, unknown>;
}

// Database function return types
export type NearbyVenue = Database['public']['Functions']['get_nearby_venues']['Returns'][number]
export type TrendingVenueDB = Database['public']['Functions']['get_trending_venues_enriched']['Returns'][number]

export interface TrendingVenue {
  venue_id:     string; /* uuid */
  name:         string;
  distance_m:   number;
  people_now:   number;
  last_seen_at: string;
  trend_score:  number;
  vibe_tag?:    string;
}

export interface WeatherSnapshot {
  condition:    'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snow';
  temperatureF: number;
  summary:      string;
  created_at:   string;
}

// Enhanced weather types for pulse screen
export type WeatherNow = {
  condition: string
  temperatureF: number
  feelsLikeF: number
  humidity: number
  windMph: number
  precipitationChance: number
  created_at: string
}

export type WeatherForecast = {
  forecastTime: string
  temperatureF: number
  precipitationChance: number
  condition: string
}

export type LocationDisplay = { 
  city?: string; 
  neighborhood?: string 
}

export interface RecommendationItem {
  id: string
  title: string
  subtitle?: string
  type: 'venue' | 'floq'
  distance?: number
  vibe?: string
  rating?: number
  priceRange?: string
  photoUrl?: string
  liveCount?: number
  vibeMatch?: number
  weatherMatch?: number
  tags?: string[]
  friends?: any[]
  participants?: number
  maxParticipants?: number
  host?: {
    name: string
    avatar?: string
  }
  open_now?: boolean
}