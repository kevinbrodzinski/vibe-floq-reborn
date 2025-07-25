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

// Database table overrides for missing tables
declare module '@supabase/supabase-js' {
  interface Database {
    public: {
      Tables: {
        user_favorites: {
          Row: { 
            id: string;
            user_id: string; 
            item_id: string;
            item_type: 'venue' | 'plan';
            created_at: string;
            title?: string;
            description?: string;
            image_url?: string;
          };
          Insert: { 
            user_id: string; 
            item_id: string;
            item_type: 'venue' | 'plan';
            title?: string;
            description?: string;
            image_url?: string;
          };
          Update: Partial<Insert>;
        };
        user_watchlist: {
          Row: { 
            id: string;
            user_id: string; 
            plan_id: string;
            created_at: string;
          };
          Insert: { 
            user_id: string; 
            plan_id: string;
          };
          Update: Partial<Insert>;
        };
        venues_near_me: {
          Row: { 
            id: string;
            user_id: string; 
            venue_id: string; 
            distance_m: number;
            name: string;
            category: string;
            lat: number;
            lng: number;
            vibe_score: number;
          };
          Insert: never;
          Update: never;
        };
      };
      Functions: {
        request_floq_access: {
          Args: { floq_id: string };
          Returns: { ok: boolean };
        };
        get_cluster_venues: {
          Args: { 
            min_lng: number;
            min_lat: number;
            max_lng: number;
            max_lat: number;
            cursor_popularity?: number;
            cursor_id?: string;
            limit_rows?: number;
          };
          Returns: { 
            id: string; 
            name: string; 
            category: string;
            lat: number;
            lng: number;
            vibe_score: number;
            live_count: number;
            popularity: number;
          }[];
        };
      };
    };
  }
}