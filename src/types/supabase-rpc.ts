// Local types for RPC functions until regenerated
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
}

// Note: These types will be used via 'as any' until official types are regenerated