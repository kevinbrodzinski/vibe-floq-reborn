import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

interface LivePosition {
  profile_id: string;
  latitude: number;
  longitude: number;
  distance_m: number;
  accuracy?: number;
  vibe?: string;
  last_updated: string;
}

interface LocationState {
  positions: LivePosition[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing live positions using PostGIS functions
 */
export function usePostGISLocation() {
  const { user } = useAuth();
  const [state, setState] = useState<LocationState>({
    positions: [],
    isLoading: false,
    error: null
  });

  /**
   * Update user's live position using PostGIS function
   */
  const updateLivePosition = useCallback(async (
    latitude: number,
    longitude: number,
    options: {
      accuracy?: number;
      vibe?: string;
      visibility?: 'public' | 'friends' | 'private';
    } = {}
  ) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('upsert_live_position', {
      p_profile_id: user.id,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: options.accuracy || null,
      p_vibe: options.vibe || null,
      p_visibility: options.visibility || 'public'
    });

    if (error) {
      console.error('Error updating live position:', error);
      throw error;
    }

    return data;
  }, [user?.id]);

  /**
   * Get nearby live positions using PostGIS function
   */
  const getNearbyPositions = useCallback(async (
    latitude: number,
    longitude: number,
    radiusMeters: number = 250,
    limit: number = 50
  ) => {
    try {
      const { data, error } = await supabase.rpc('get_nearby_live_positions', {
        p_latitude: latitude,
        p_longitude: longitude,
        p_radius_m: radiusMeters,
        p_limit: limit
      });

      if (error) {
        throw error;
      }

      // Update state only for the hook's internal positions, return data directly
      setState(prev => ({
        ...prev,
        positions: data || [],
        isLoading: false,
        error: null
      }));

      return data || [];
    } catch (error) {
      console.error('Error getting nearby positions:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
        positions: []
      }));
      throw error;
    }
  }, []);

  /**
   * Clear positions and reset state
   */
  const clearPositions = useCallback(() => {
    setState({
      positions: [],
      isLoading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    updateLivePosition,
    getNearbyPositions,
    clearPositions
  };
}