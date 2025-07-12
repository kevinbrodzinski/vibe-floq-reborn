
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getEnvironmentConfig } from '@/lib/environment';

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
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLat * Math.PI / 180) * Math.cos(floqLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = Math.round(R * c);
    
    return { ...floq, distance_meters: distance };
  });
};

export const useActiveFloqs = (options: UseActiveFloqsOptions = {}) => {
  const { limit = 20, offset = 0, includeDistance = true } = options;
  const { lat, lng } = useGeolocation();
  const env = getEnvironmentConfig();

  // Round coordinates for better cache key stability
  const roundedLat = lat ? Math.round(lat * 1000) / 1000 : null;
  const roundedLng = lng ? Math.round(lng * 1000) / 1000 : null;

  return useQuery<FloqRow[]>({
    queryKey: ['active-floqs', limit, offset, roundedLat, roundedLng, includeDistance, env.presenceMode],
    staleTime: 10_000,
    queryFn: async () => {
      // Return mock data in mock mode
      if (env.presenceMode === 'mock') {
        console.log('🎭 Returning mock floq data');
        const mockData = generateMockFloqs(
          includeDistance && lat ? lat : undefined,
          includeDistance && lng ? lng : undefined
        );
        return mockData.slice(offset, offset + limit);
      }

      // Return stub data in stub mode
      if (env.presenceMode === 'stub') {
        console.log('🎪 Returning stub floq data');
        const stubData = generateStubFloqs(
          includeDistance && lat ? lat : undefined,
          includeDistance && lng ? lng : undefined
        );
        return stubData.slice(offset, offset + limit);
      }

      // Live mode - query Supabase
      console.log('🚀 Fetching active floqs with params:', {
        p_limit: limit,
        p_offset: offset,
        p_user_lat: includeDistance && lat ? lat : null,
        p_user_lng: includeDistance && lng ? lng : null
      });

      const { data, error } = await supabase.rpc('get_active_floqs_with_members', {
        p_limit: limit,
        p_offset: offset,
        p_user_lat: includeDistance && lat ? lat : null,
        p_user_lng: includeDistance && lng ? lng : null
      });
      
      console.log('🎯 Query result:', { data, error });
      
      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map((floq: any) => ({
        ...floq,
        vibe_tag: floq.primary_vibe, // Map primary_vibe to vibe_tag for consistency
        members: Array.isArray(floq.members) ? floq.members : [],
        boost_count: floq.boost_count || 0,
        distance_meters: floq.distance_meters
      }));

      console.log(`✅ Returning ${transformedData.length} transformed floqs`);
      return transformedData;
    },
    // Always enable the query - don't wait for geolocation
    enabled: true,
  });
};
