// Temporary types for analytics views until Supabase types are regenerated
export interface TimeInVenueDaily {
  user_id: string;
  day: string;
  minutes_spent: number;
  venue_id?: string;
}

export interface VenueVisit {
  user_id: string;
  venue_id: string;
  created_at: string;
}