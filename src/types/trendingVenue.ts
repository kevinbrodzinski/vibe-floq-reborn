export interface TrendingVenue {
  venue_id:     string;
  name:         string;
  distance_m:   number;
  people_now:   number;
  last_seen_at: string;   // ISO-8601
  trend_score:  number;
} 