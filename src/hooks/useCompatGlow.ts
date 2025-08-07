import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { useUnifiedLocation } from './location/useUnifiedLocation';
import { VIBE_RGB } from '@/constants/vibes';
import { supabase } from '@/integrations/supabase/client';

interface CompatCluster {
  gh6: string;
  centroid: any;
  dom_vibe: string;
  vibe_match: number;
  distance_m: number;
  user_count: number;
}

export interface CompatGlowState {
  strength: number; // 0-1 for ring thickness
  hue: string;      // CSS color for ring
  userCount: number;
}

const fetcher = async (url: string): Promise<CompatCluster[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('compat_clusters', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      console.error('compat_clusters error:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('compat_clusters fetch error:', error);
    // Graceful degradation - return empty array
    return [];
  }
};

export function useCompatGlow(): CompatGlowState {
  const vibe = useCurrentVibe();
  const { coords, status } = useUnifiedLocation({
    enableTracking: false,
    enablePresence: false,
    hookId: 'compat-glow'
  });
  // Compatibility - convert coords to location format
  const location = coords ? { coords: { latitude: coords.lat, longitude: coords.lng } } : null;
  const loading = status === 'loading';
  const [strength, setStrength] = useState(0);
  const [hue, setHue] = useState('#4C92FF');
  const [userCount, setUserCount] = useState(0);

  // Build fetch URL only when we have all required params
  const fetchUrl = vibe && location && !loading
    ? `compat_clusters?lat=${location.coords.latitude}&lng=${location.coords.longitude}&vibe=${vibe}`
    : null;

  const { data, error } = useSWR<CompatCluster[]>(
    fetchUrl,
    () => {
      if (!fetchUrl) return Promise.resolve([]);
      
      // Call the edge function via supabase client (more reliable than direct fetch)
      return supabase.functions.invoke('compat_clusters', {
        method: 'GET',
        body: {
          lat: location!.coords.latitude,
          lng: location!.coords.longitude,
          vibe: String(vibe || 'chill'),
        }
      }).then(({ data, error }) => {
        if (error) {
          console.warn('compat_clusters API error:', error);
          return []; // Return empty array for graceful degradation
        }
        return data || [];
      }).catch(err => {
        console.warn('compat_clusters network error:', err);
        return []; // Return empty array for graceful degradation
      });
    },
    { 
      refreshInterval: 30000, // Increased to 30 seconds to reduce server load
      revalidateOnFocus: false,
      errorRetryCount: 1, // Reduced retry count
      shouldRetryOnError: false, // Don't retry on errors to avoid spam
    }
  );

  useEffect(() => {
    if (error) {
      console.warn('CompatGlow fetch error (using fallback):', error);
      // Fallback to current vibe color with low strength
      if (vibe && VIBE_RGB[vibe as keyof typeof VIBE_RGB]) {
        const [r, g, b] = VIBE_RGB[vibe as keyof typeof VIBE_RGB];
        setHue(`rgb(${r}, ${g}, ${b})`);
        setStrength(0.1); // Very low strength to indicate fallback
      } else {
        setStrength(0);
      }
      setUserCount(0);
      return;
    }

    if (!data?.length) {
      // No nearby compatible clusters - use current vibe with minimal glow
      if (vibe && VIBE_RGB[vibe as keyof typeof VIBE_RGB]) {
        const [r, g, b] = VIBE_RGB[vibe as keyof typeof VIBE_RGB];
        setHue(`rgb(${r}, ${g}, ${b})`);
        setStrength(0.05); // Very minimal glow
      } else {
        setStrength(0);
      }
      setUserCount(0);
      return;
    }

    // Get the best match (first result is already sorted by compatibility)
    const bestMatch = data[0];
    const { vibe_match, distance_m, dom_vibe, user_count } = bestMatch;

    // Calculate distance score (closer = better)
    const distScore = Math.max(0, 1 - distance_m / 1000); // 1000m max range
    
    // Combine vibe similarity and distance for final strength
    const combinedStrength = Math.min(1, (vibe_match * 0.7) + (distScore * 0.3));
    
    setStrength(combinedStrength);
    setUserCount(user_count || 0);
    
    // Set hue based on dominant vibe of the cluster
    if (dom_vibe && VIBE_RGB[dom_vibe as keyof typeof VIBE_RGB]) {
      const [r, g, b] = VIBE_RGB[dom_vibe as keyof typeof VIBE_RGB];
      setHue(`rgb(${r}, ${g}, ${b})`);
    }
  }, [data, error, vibe]);

  return { strength, hue, userCount };
}