
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getEnvironmentConfig } from '@/lib/environment';
import { useEffect, useRef, useMemo } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

// Abstract the rounding so every geo-based hook stays consistent
export const coarse = (n: number | null, m = 20) =>
  n == null ? null : Math.round(n * m) / m;

// Keep one console.debug helper
const dbg = (...args: any[]) =>
  import.meta.env.DEV && console.log('[FLOQS]', ...args);

export interface FloqRow {
  id: string;
  title: string;
  name: string | null;
  primary_vibe: string;
  vibe_tag: string;
  type: string;
  starts_at: string;
  ends_at: string;
  participant_count: number;
  boost_count: number; // Added boost count
  starts_in_min: number;
  distance_meters: number | null; // Added distance
  lat?: number | null; // Geographic latitude
  lng?: number | null; // Geographic longitude
  members: {
    avatar_url: string | null;
    id: string;
    username: string | null;
    display_name: string | null;
  }[];
}

interface UseActiveFloqsOptions {
  limit?: number;
  offset?: number;
  includeDistance?: boolean;
}

const generateMockFloqs = (userLat?: number, userLng?: number): FloqRow[] => {
  const mockMembers = [
    { id: '1', username: 'alex_dev', display_name: 'Alex', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex' },
    { id: '2', username: 'sarah_design', display_name: 'Sarah', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah' },
    { id: '3', username: 'mike_photo', display_name: 'Mike', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike' },
    { id: '4', username: 'emma_art', display_name: 'Emma', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma' },
    { id: '5', username: 'jake_music', display_name: 'Jake', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jake' },
  ];

  const now = new Date();
  const baseFloqs = [
    {
      id: 'mock-1',
      title: 'Coffee & Code',
      name: 'Blue Bottle Coffee',
      primary_vibe: 'chill' as const,
      vibe_tag: 'chill' as const,
      type: 'auto',
      starts_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      ends_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 8,
      boost_count: 3,
      starts_in_min: 15,
      members: mockMembers.slice(0, 3),
    },
    {
      id: 'mock-2',
      title: 'Sunset Yoga',
      name: 'Mission Park',
      primary_vibe: 'social' as const,
      vibe_tag: 'social' as const,
      type: 'auto',
      starts_at: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
      ends_at: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      participant_count: 12,
      boost_count: 7,
      starts_in_min: 45,
      members: mockMembers.slice(1, 4),
    },
    {
      id: 'mock-3',
      title: 'DJ Set',
      name: 'Rooftop Lounge',
      primary_vibe: 'hype' as const,
      vibe_tag: 'hype' as const,
      type: 'auto',
      starts_at: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
      ends_at: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      participant_count: 24,
      boost_count: 15,
      starts_in_min: 90,
      members: mockMembers.slice(0, 5),
    },
    {
      id: 'mock-4',
      title: 'Book Club',
      name: 'Local Library',
      primary_vibe: 'curious' as const,
      vibe_tag: 'curious' as const,
      type: 'auto',
      starts_at: new Date(now.getTime() + 120 * 60 * 1000).toISOString(),
      ends_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 6,
      boost_count: 2,
      starts_in_min: 120,
      members: mockMembers.slice(2, 4),
    },
  ];

  // Add distance calculations if user location is available
  return baseFloqs.map((floq, index) => ({
    ...floq,
    lat: userLat ?? null,
    lng: userLng ?? null,
    distance_meters: userLat && userLng ?
      // Simulate distances between 50m and 2km
      Math.round(50 + (index * 500) + Math.random() * 200) : null,
  }));
};

const generateStubFloqs = (userLat?: number, userLng?: number): FloqRow[] => {
  const stubMembers = [
    { id: 'stub-1', username: 'taylor_swift', display_name: 'Taylor', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=taylor' },
    { id: 'stub-2', username: 'david_bowie', display_name: 'David', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=david' },
    { id: 'stub-3', username: 'nina_tech', display_name: 'Nina', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nina' },
    { id: 'stub-4', username: 'carlos_chef', display_name: 'Carlos', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos' },
    { id: 'stub-5', username: 'zoe_artist', display_name: 'Zoe', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zoe' },
  ];

  const now = new Date();
  const stubFloqs = [
    {
      id: 'stub-1',
      title: 'Morning Run Club',
      name: 'Golden Gate Park',
      primary_vibe: 'social' as const,
      vibe_tag: 'social' as const,
      type: 'auto',
      starts_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      ends_at: new Date(now.getTime() + 90 * 60 * 1000).toISOString(),
      participant_count: 15,
      boost_count: 8,
      starts_in_min: 10,
      members: stubMembers.slice(0, 4),
    },
    {
      id: 'stub-2',
      title: 'Meditation Circle',
      name: 'Peaceful Gardens',
      primary_vibe: 'chill' as const,
      vibe_tag: 'chill' as const,
      type: 'auto',
      starts_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      ends_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      participant_count: 9,
      boost_count: 4,
      starts_in_min: 30,
      members: stubMembers.slice(1, 3),
    },
    {
      id: 'stub-3',
      title: 'Tech Meetup',
      name: 'Innovation Hub',
      primary_vibe: 'curious' as const,
      vibe_tag: 'curious' as const,
      type: 'auto',
      starts_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      ends_at: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      participant_count: 32,
      boost_count: 12,
      starts_in_min: 60,
      members: stubMembers.slice(0, 5),
    },
    {
      id: 'stub-4',
      title: 'Food Truck Festival',
      name: 'Central Plaza',
      primary_vibe: 'hype' as const,
      vibe_tag: 'hype' as const,
      type: 'auto',
      starts_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      ends_at: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
      participant_count: 45,
      boost_count: 23,
      starts_in_min: 120,
      members: stubMembers.slice(2, 5),
    },
    {
      id: 'stub-5',
      title: 'Art Gallery Opening',
      name: 'Modern Art Space',
      primary_vibe: 'curious' as const,
      vibe_tag: 'curious' as const,
      type: 'auto',
      starts_at: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      ends_at: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      participant_count: 18,
      boost_count: 6,
      starts_in_min: 180,
      members: stubMembers.slice(0, 3),
    },
  ];

  // Add realistic distance calculations if user location is available
  return stubFloqs.map((floq, index) => {
    if (!userLat || !userLng) return { ...floq, distance_meters: null };

    // Simulate locations around user with realistic distances
    const offsetLat = (Math.random() - 0.5) * 0.02; // ~1km max
    const offsetLng = (Math.random() - 0.5) * 0.02;
    const floqLat = userLat + offsetLat;
    const floqLng = userLng + offsetLng;

    // Calculate distance using Haversine formula approximation
    const R = 6371000; // Earth's radius in meters
    const dLat = (floqLat - userLat) * Math.PI / 180;
    const dLng = (floqLng - userLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLat * Math.PI / 180) * Math.cos(floqLat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = Math.round(R * c);

    return { ...floq, distance_meters: distance, lat: floqLat, lng: floqLng };
  });
};

export const useActiveFloqs = (options: UseActiveFloqsOptions = {}) => {
  const { limit = 20, offset = 0, includeDistance = true } = options;
  const { lat, lng } = useGeolocation();

  // Guard with "hasGeoFix" so we debounce only real values
  const hasFix = lat !== null && lng !== null;
  const debouncedLat = useDebouncedValue(hasFix ? lat : null, 5000); // 5 second delay
  const debouncedLng = useDebouncedValue(hasFix ? lng : null, 5000);

  // 1. Memoise the environment object
  const env = getEnvironmentConfig();

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Debug logging for hook initialization (commented out to reduce noise)
  // if (import.meta.env.DEV) {
  //   console.log('[FLOQS_DEBUG] useActiveFloqs called with:', {
  //     options,
  //     lat,
  //     lng,
  //     debouncedLat,
  //     debouncedLng,
  //     env: env.presenceMode
  //   });
  // }

  // Round coordinates for better cache key stability
  const roundedLat = coarse(debouncedLat, 20);
  const roundedLng = coarse(debouncedLng, 20);

  const query = useQuery<FloqRow[]>({
    queryKey: ['active-floqs', limit, offset, roundedLat, roundedLng, includeDistance, env.presenceMode],
    staleTime: 10_000,
    refetchOnWindowFocus: false, // Disable auto-refetch on window focus since we have real-time
    queryFn: async () => {
      if (import.meta.env.DEV) {
        console.log('[FLOQS_DEBUG] Query function executing...');
      }

      // Offline mode - pure client-side generation (no network required)
      if (env.presenceMode === 'offline') {
        if (import.meta.env.DEV) {
          console.log('✈️ Returning offline mock floq data');
        }
        const mockData = generateMockFloqs(
          includeDistance && debouncedLat ? debouncedLat : undefined,
          includeDistance && debouncedLng ? debouncedLng : undefined
        );
        if (import.meta.env.DEV) {
          console.log('[FLOQS_DEBUG] Offline mode returning:', mockData.length, 'floqs');
        }
        return mockData.slice(offset, offset + limit);
      }

      // Mock mode - demo schema data via RPC
      if (env.presenceMode === 'mock') {
        if (import.meta.env.DEV) {
          console.log('🎭 Fetching demo floq data from database');
        }
        try {
          const { data, error } = await supabase.rpc('get_visible_floqs_with_members', {
            p_use_demo: true,
            p_limit: Number(limit),
            p_offset: Number(offset),
            p_user_lat: includeDistance && debouncedLat ? Number(debouncedLat) : null,
            p_user_lng: includeDistance && debouncedLng ? Number(debouncedLng) : null
          });

          if (import.meta.env.DEV) {
            console.log('[FLOQS_DEBUG] RPC response:', { data, error, dataLength: data?.length });
          }

          if (error) {
            if (import.meta.env.DEV) {
              console.warn('Demo floq function not available, using fallback data:', error);
            }
            // Return fallback data instead of throwing
            const fallbackData = generateStubFloqs(
              includeDistance && debouncedLat ? debouncedLat : undefined,
              includeDistance && debouncedLng ? debouncedLng : undefined
            );
            if (import.meta.env.DEV) {
              console.log('[FLOQS_DEBUG] Mock mode fallback returning:', fallbackData.length, 'floqs');
            }
            return fallbackData.slice(offset, offset + limit);
          }

          // If RPC returns empty data, use fallback
          if (!data || data.length === 0) {
            if (import.meta.env.DEV) {
              console.warn('Demo floq function returned empty data, using fallback');
            }
            const fallbackData = generateStubFloqs(
              includeDistance && debouncedLat ? debouncedLat : undefined,
              includeDistance && debouncedLng ? debouncedLng : undefined
            );
            if (import.meta.env.DEV) {
              console.log('[FLOQS_DEBUG] Mock mode empty data fallback returning:', fallbackData.length, 'floqs');
            }
            return fallbackData.slice(offset, offset + limit);
          }

          // Transform the data to match our interface
          const transformedData = (data || []).map((floq: any) => ({
            ...floq,
            vibe_tag: floq.primary_vibe,
            members: Array.isArray(floq.members)
              ? (floq.members as FloqRow['members'])
              : [],
            boost_count: floq.boost_count ?? 0,
            distance_meters: floq.distance_meters
          }));
          if (import.meta.env.DEV) {
            console.log('[FLOQS_DEBUG] Mock mode RPC returning:', transformedData.length, 'floqs');
          }
          return transformedData;
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('Demo floq function failed, using fallback data:', err);
          }
          // Return fallback data instead of throwing
          const fallbackData = generateStubFloqs(
            includeDistance && debouncedLat ? debouncedLat : undefined,
            includeDistance && debouncedLng ? debouncedLng : undefined
          );
          if (import.meta.env.DEV) {
            console.log('[FLOQS_DEBUG] Mock mode catch fallback returning:', fallbackData.length, 'floqs');
          }
          return fallbackData.slice(offset, offset + limit);
        }
      }

      // Live mode - production data via RPC
      if (import.meta.env.DEV) {
        console.log('🚀 Fetching live floq data from database');
      }
      try {
        const { data, error } = await supabase.rpc('get_visible_floqs_with_members', {
          p_use_demo: false,
          p_limit: Number(limit),
          p_offset: Number(offset),
          p_user_lat: includeDistance && debouncedLat ? Number(debouncedLat) : null,
          p_user_lng: includeDistance && debouncedLng ? Number(debouncedLng) : null
        });

        if (error) {
          if (import.meta.env.DEV) {
            console.warn('Live floq function not available, using fallback data:', error);
          }
          // Return fallback data instead of throwing
          const fallbackData = generateStubFloqs(
            includeDistance && debouncedLat ? debouncedLat : undefined,
            includeDistance && debouncedLng ? debouncedLng : undefined
          );
          if (import.meta.env.DEV) {
            console.log('[FLOQS_DEBUG] Live mode fallback returning:', fallbackData.length, 'floqs');
          }
          return fallbackData.slice(offset, offset + limit);
        }

        // Transform the data to match our interface
        const transformedData = (data || []).map((floq: any) => ({
          ...floq,
          vibe_tag: floq.primary_vibe,
          members: Array.isArray(floq.members)
            ? (floq.members as FloqRow['members'])
            : [],
          boost_count: floq.boost_count ?? 0,
          distance_meters: floq.distance_meters
        }));

        if (import.meta.env.DEV) {
          console.log(`✅ Returning ${transformedData.length} live floqs`);
        }
        return transformedData;
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Live floq function failed, using fallback data:', err);
        }
        // Return fallback data instead of throwing
        const fallbackData = generateStubFloqs(
          includeDistance && lat ? lat : undefined,
          includeDistance && lng ? lng : undefined
        );
        if (import.meta.env.DEV) {
          console.log('[FLOQS_DEBUG] Live mode catch fallback returning:', fallbackData.length, 'floqs');
        }
        return fallbackData.slice(offset, offset + limit);
      }
    },
    // 2. Gate the React-Query call until geolocation is ready
    enabled:
      env.presenceMode === 'offline'          // offline always allowed
        ? true
        : !!lat && !!lng,                       // wait until coords exist
  });

  // Set up real-time subscription for live mode
  useEffect(() => {
    // Only enable real-time for live mode
    if (env.presenceMode !== 'live') {
      return;
    }

    // Clean up existing channel with defensive cleanup
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (err) {
        /* no-op */
      }
      channelRef.current = null;
    }

    // Create real-time subscription for floqs table changes
    const channel = supabase
      .channel('floqs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'floqs',
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('[FLOQS_REALTIME] Received change:', payload);
          }

          // Invalidate and refetch the query to get updated data
          query.refetch();
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('[FLOQS_REALTIME] Subscription status:', status);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount with defensive cleanup
    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (err) {
          /* no-op */
        }
        channelRef.current = null;
      }
    };
  }, [env.presenceMode, query.refetch]); // 4. Stabilise the real-time effect dependencies

  return {
    ...query,
    realtime: channelRef.current !== null
  };
};
