import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useRef } from "react";

interface NearbyFriend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  distance_m: number;
}

interface UseNearbyFriendsOptions {
  km?: number;             // default radius
  enabled?: boolean;
}

/**
 * Returns online friends within `km` radius of (lat,lng).
 */
export function useNearbyFriends(
  lat?: number,
  lng?: number,
  { km = 1, enabled = true }: UseNearbyFriendsOptions = {}
) {
  const debounceRef = useRef<NodeJS.Timeout>();

  const debouncedPrimeProfiles = useCallback((primeProfiles: (users: any[]) => void, users: any[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      primeProfiles(users);
    }, 300);
  }, []);

  const result = useQuery({
    queryKey: ["friends-nearby", lat, lng, km],
    enabled: enabled && !!lat && !!lng,
    staleTime: 30_000,                     // 30 s cache
    queryFn: async (): Promise<NearbyFriend[]> => {
      const { data, error } = await supabase.rpc("friends_nearby", {
        user_lat: lat,
        user_lng: lng,
        radius_km: km,
      });

      if (error) throw error;
      return (data ?? []) as NearbyFriend[];
    },
  });

  return { ...result, debouncedPrimeProfiles };
}