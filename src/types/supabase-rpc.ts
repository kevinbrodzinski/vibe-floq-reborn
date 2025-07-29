// Local types for RPC functions until regenerated
export interface SupabaseRPCTypes {
  store_push_token: {
    Args: { 
      p_device_id: string; 
      p_token: string; 
      p_platform: 'ios' | 'android' | 'web'; 
    };
    Returns: undefined;
  };
  reset_badge: {
    Args: Record<PropertyKey, never>;
    Returns: undefined;
  };
  get_live_activity: {
    Args: {
      p_radius_km: number;
      p_lat: number;
      p_lng: number;
    };
    Returns: Array<{
      venue_id: string;
      people_now: number;
      vibe_tag: string;
    }>;
  };
  get_visible_floqs_with_members: {
    Args: {
      p_lat: number;
      p_lng: number;
      p_limit?: number;
      p_offset?: number;
      p_radius_km?: number;
    };
    Returns: Array<{
      id: string;
      title: string;
      name?: string;
      description?: string;
      primary_vibe: string;
      vibe_tag?: string;
      type: string;
      flock_type?: string;
      starts_at: string;
      ends_at?: string;
      participant_count: number;
      boost_count: number;
      starts_in_min: number;
      distance_meters?: number;
      members: any;
      creator_id: string;
    }>;
  };
  upsert_presence: {
    Args: { 
      p_lat: number; 
      p_lng: number; 
      p_vibe: string;
      p_visibility?: string;
    };
    Returns: undefined;
  };
  get_trending_venues: {
    Args: {
      p_lat: number;
      p_lng: number;
      p_radius_m?: number;
      p_limit?: number;
    };
    Returns: Array<{
      venue_id: string;
      name: string;
      distance_m: number;
      vibe_tag: string | null;
      people_now: number;
    }>;
  };
  get_message_reactions: {
    Args: { ids: string[] };
    Returns: Array<{
      message_id: string;
      emoji: string;
      cnt: number;
    }>;
  };
  create_floq: {
    Args: {
      p_title: string;
      p_description?: string;
      p_lat: number;
      p_lng: number;
      p_primary_vibe: string;
      p_max_participants?: number;
    };
    Returns: { floq_id: string };
  };
}

// Note: These types will be used via 'as any' until official types are regenerated