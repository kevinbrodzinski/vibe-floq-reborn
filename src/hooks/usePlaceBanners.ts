import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as geohash from 'ngeohash';

export interface PlaceBanner {
  id: string;
  venue_id: string;
  headline: string;
  expires_at: string;
  cta_type: 'join' | 'route' | 'floq';
  metadata: Record<string, any>;
  channel: string;
  created_at: string;
}

/**
 * Hook to subscribe to place-aware banners via realtime
 * Uses geohash-based channels for location filtering
 */
export function usePlaceBanners(lat?: number, lng?: number) {
  const [realtimeBanners, setRealtimeBanners] = useState<PlaceBanner[]>([]);
  const prevHash = useRef<string | null>(null);
  
  // Generate geohash4 channel for this location
  const geohash4 = lat && lng ? geohash.encode(lat, lng, 4) : null;
  
  // Query initial banners for this channel
  const { data: initialBanners } = useQuery({
    queryKey: ['place-banners', geohash4],
    queryFn: async (): Promise<PlaceBanner[]> => {
      if (!geohash4) return [];
      
      const { data, error } = await supabase
        .from('place_banners')
        .select('*')
        .eq('channel', geohash4)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) {
        console.error('Failed to fetch place banners:', error);
        return [];
      }
      
      return ((data || []) as any[]) as PlaceBanner[];
    },
    enabled: !!geohash4,
    staleTime: 90_000, // 90 seconds cache
  });

  // Subscribe to realtime updates for this geohash channel
  useEffect(() => {
    if (!geohash4 || geohash4 === prevHash.current) return;
    prevHash.current = geohash4;

    const channel = supabase
      .channel(`banners:${geohash4}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'place_banners',
          filter: `channel=eq.${geohash4}`,
        },
        (payload) => {
          const newBanner = payload.new as PlaceBanner;
          
          // Only add if not expired
          if (new Date(newBanner.expires_at) > new Date()) {
            setRealtimeBanners(prev => {
              // Deduplicate by ID
              const existing = prev.find(b => b.id === newBanner.id);
              if (existing) return prev;
              
              // Keep only latest 3 banners
              return [newBanner, ...prev].slice(0, 3);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public', 
          table: 'place_banners',
          filter: `channel=eq.${geohash4}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setRealtimeBanners(prev => prev.filter(b => b.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe().catch(console.error);
    };
  }, [geohash4]);

  // Combine initial and realtime banners, remove expired ones
  const allBanners = [...(initialBanners || []), ...realtimeBanners];
  const activeBanners = allBanners
    .filter(banner => new Date(banner.expires_at) > new Date())
    .reduce((unique, banner) => {
      // Deduplicate by ID
      if (!unique.find(b => b.id === banner.id)) {
        unique.push(banner);
      }
      return unique;
    }, [] as PlaceBanner[])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3); // Keep only latest 3

  return {
    banners: activeBanners,
    isLoading: !geohash4 ? false : initialBanners === undefined,
    channel: geohash4,
  };
}
