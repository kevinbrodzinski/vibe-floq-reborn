export interface NearbyVenue {
  venue_id: string;
  name: string;
  distance_m: number;
  vibe_tag: string | null;
  people_now: number;
}

export interface UserPlan {
  plan_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  vibe_tag: string | null;
  status: 'draft' | 'locked' | 'live' | 'archived';
  role: 'participant' | 'organizer' | 'viewer';
  owner: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}