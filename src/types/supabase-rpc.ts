// Updated RPC function types after type regeneration
export interface SupabaseRPCTypes {
  store_push_token: {
    Args: { 
      p_device_id: string; 
      p_token: string; 
      p_platform: 'ios' | 'android' | 'web'; 
    };
    Returns: { ok: boolean };
  };
  reset_badge: {
    Args: {};
    Returns: { ok: boolean };
  };
  join_floq: {
    Args: {
      p_floq_id: string;
      p_profile_id?: string;
      p_use_demo?: boolean;
    };
    Returns: { participant_count: number };
  };
  leave_floq: {
    Args: {
      p_floq_id: string;
      p_profile_id?: string;
      p_use_demo?: boolean;
    };
    Returns: { participant_count: number };
  };
  generate_floq_suggestions: {
    Args: {
      p_profile_id: string;
      p_user_lat: number;
      p_user_lng: number;
      p_limit?: number;
    };
    Returns: any[];
  };
  suggest_friends: {
    Args: {
      p_profile_id: string;
      p_limit?: number;
    };
    Returns: any[];
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
    Returns: any[];
  };
}

// Note: These types will be used via 'as any' until official types are regenerated