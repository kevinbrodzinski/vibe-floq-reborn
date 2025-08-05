export interface FloqSearchFilters {
  query: string;
  radiusKm: number; // slider 1–100 km
  vibes: string[]; // vibe_enum values
  timeRange: [Date, Date]; // date-time picker
}

export interface FloqSearchResult {
  id: string;
  title: string;
  primary_vibe: string;
  starts_at: string;
  ends_at: string | null;
  distance_m: number;
  participant_count: number;
  friends_going_count: number;
  friends_going_avatars: string[];
  friends_going_names: string[];
  friendsGoing: {
    count: number;
    avatars: string[];
    names: string[];
  };
}