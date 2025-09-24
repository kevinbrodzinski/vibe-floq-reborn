// ─────────────────────────────────────────────────────────────
// 📁 src/hooks/useTransitTimes.ts
//  React Query hook that pulls transit time for a given stop pair.
// ─────────────────────────────────────────────────────────────
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { memoizeTransit } from "@/lib/cache/transitLRU";
import { calculateDistance } from "@/lib/location/standardGeo";

interface UseTransitOpts extends Partial<UseQueryOptions<TransitResult>> {
  mode?: "driving" | "walking" | "cycling";
}

export interface TransitResult {
  duration_minutes: number;
  duration_seconds: number;
  distance_meters: number;
  mode: string;
  provider: string;
  fetched_at: string;
  cached: boolean;
}

export function useTransitTime(
  planId: string,
  from: { lat: number; lng: number; stopId: string },
  to: { lat: number; lng: number; stopId: string },
  opts: UseTransitOpts = {},
) {
  const { mode = "driving", ...rqOpts } = opts;
  return useQuery<TransitResult>({
    queryKey: ["transit", mode, from.lat, from.lng, to.lat, to.lng],
    staleTime: 1000 * 60 * 60, // 1 h
    queryFn: async () => {
      const cacheKey = `transit:${planId}:${from.stopId}:${to.stopId}:${mode}`;
      
      return memoizeTransit(cacheKey, async () => {
        const { data, error } = await supabase.functions.invoke("get-transit", {
          body: { 
            planId, 
            from: { lat: from.lat, lng: from.lng }, 
            to: { lat: to.lat, lng: to.lng }, 
            mode 
          },
        });
        if (error) {
          console.error('Transit API error:', error);
          throw error;
        }
        
        // Optionally cache in database
        try {
          await supabase.from('plan_transit_cache').upsert({
            from_stop_id: from.stopId,
            to_stop_id: to.stopId,
            plan_id: planId,
            transit_data: data,
            duration_seconds: data.duration_seconds,
            distance_meters: data.distance_meters,
            from_geom: `SRID=4326;POINT(${from.lng} ${from.lat})`,
            to_geom: `SRID=4326;POINT(${to.lng} ${to.lat})`,
          } as any);
        } catch { /* ignore RLS errors */ }
        
        return data as TransitResult;
      });
    },
    ...rqOpts,
  });
}

// Helper to format transit result for display
export function formatTransit(result: TransitResult): string {
  const minutes = result.duration_minutes || Math.round(result.duration_seconds / 60);
  const km = (result.distance_meters / 1000).toFixed(1);
  
  const modeIcons = {
    walking: '🚶',
    cycling: '🚴', 
    driving: '🚗'
  };
  
  const icon = modeIcons[result.mode as keyof typeof modeIcons] || '🚗';
  return `${icon} ${minutes} min • ${km} km`;
}

// Legacy hook for backwards compatibility with simple lat/lng interface
export function useSimpleTransitTime({ from, to, mode = 'walking', enabled = true }: {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  mode?: 'walking' | 'driving' | 'cycling';
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['simple-transit', from, to, mode],
    queryFn: async () => {
      // Fallback Haversine calculation for simple cases
      return calculateHaversineTime(from, to, mode);
    },
    enabled: enabled && !!(from.lat && from.lng && to.lat && to.lng),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });
}

// Helper function to calculate straight-line distance and estimate time
export function calculateHaversineTime(from: { lat: number; lng: number }, to: { lat: number; lng: number }, mode: 'walking' | 'driving' | 'cycling' = 'walking'): TransitResult {
  const distance = calculateDistance(from, to); // Distance in meters

  // Speed assumptions (meters per minute)
  const speeds = {
    walking: 80,    // ~5 km/h
    cycling: 250,   // ~15 km/h  
    driving: 500    // ~30 km/h (city driving)
  };

  const durationSeconds = Math.max(60, Math.round(distance / speeds[mode] * 60)); // Convert to seconds

  return {
    duration_minutes: Math.round(durationSeconds / 60),
    duration_seconds: durationSeconds,
    distance_meters: Math.round(distance),
    provider: 'haversine',
    cached: false,
    mode,
    fetched_at: new Date().toISOString()
  };
}