import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { useUserLocation } from './useUserLocation';
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
  const { data, error } = await supabase.functions.invoke('compat_clusters', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (error) {
    console.error('compat_clusters error:', error);
    throw new Error('Failed to fetch compatibility clusters');
  }

  return data || [];
};

export function useCompatGlow(): CompatGlowState {
  const vibe = useCurrentVibe();
  const { location, loading } = useUserLocation();
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
      
      // Call the edge function directly
      const urlParams = new URLSearchParams({
        lat: location!.coords.latitude.toString(),
        lng: location!.coords.longitude.toString(),
        vibe: vibe!,
      });
      
      return fetch(`https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/compat_clusters?${urlParams}`, {
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlenR5cnJhZnNtbHZ2bHF2c3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNTI5MTcsImV4cCI6MjA2NzYyODkxN30.6rCBIkV5Fk4qzSfiAR0I8biCQ-YdfdT-ZnJZigWqSck`,
          'Content-Type': 'application/json',
        },
      }).then(res => res.json());
    },
    { 
      refreshInterval: 10000, // 10 seconds
      revalidateOnFocus: false,
      errorRetryCount: 2,
    }
  );

  useEffect(() => {
    if (error) {
      console.error('CompatGlow fetch error:', error);
      setStrength(0);
      setUserCount(0);
      return;
    }

    if (!data?.length) {
      setStrength(0);
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
  }, [data, error]);

  return { strength, hue, userCount };
}