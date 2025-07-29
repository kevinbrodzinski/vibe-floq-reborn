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
      p_user_lat?: number;
      p_user_lng?: number;
      p_limit?: number;
      p_offset?: number;
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
}

// Note: These types will be used via 'as any' until official types are regenerated