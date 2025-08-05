import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from 'lodash-es';
import { useAfterglowVenueIntelligence } from '@/hooks/useAfterglowVenueIntelligence';

type DailyAfterglow = {
  id: string;
  profile_id: string;
  date: string;
  energy_score: number;
  social_intensity: number;
  dominant_vibe: string;
  summary_text: string;
  total_venues: number;
  total_floqs: number;
  crossed_paths_count: number;
  is_pinned: boolean;
  is_stale: boolean;
  created_at: string;
  regenerated_at: string | null;
  ai_summary: string | null;
  ai_summary_generated_at: string | null;
  emotion_journey: any[];
  moments: any[];
  vibe_path: string[];
};

const EMPTY_STATE: DailyAfterglow = {
  id: '',
  profile_id: '',
  date: '',
  energy_score: 0,
  social_intensity: 0,
  dominant_vibe: '',
  summary_text: '',
  total_venues: 0,
  total_floqs: 0,
  crossed_paths_count: 0,
  is_pinned: false,
  is_stale: false,
  created_at: '',
  regenerated_at: null,
  ai_summary: null,
  ai_summary_generated_at: null,
  emotion_journey: [],
  moments: [],
  vibe_path: []
};

// -----------------------------------
// Hook
// -----------------------------------
export function useRealtimeAfterglowData(dateISO: string | null) {
  const qc = useQueryClient();
  const [venueIntelligenceStatus, setVenueIntelligenceStatus] = useState<'ready' | 'enhancing' | 'enhanced'>('ready');
  const { 
    enhanceAfterglowMoment, 
    getVenueRecommendationsFromHistory,
    autoEnhanceRecentMoments,
    isLoading: isVenueIntelligenceLoading
  } = useAfterglowVenueIntelligence();

  // 1️⃣ – plain fetch (no generation side-effects)
  const { data, isFetching, error, refetch } = useQuery<DailyAfterglow | null>({
    queryKey: ['afterglow', dateISO],
    enabled: !!dateISO,
    staleTime: 15 * 60_000,           // 15 min
    refetchInterval: 15 * 60_000,     // background refresh
    queryFn: async () => {
      if (!dateISO) return null;

      const { data, error } = await supabase
        .from('daily_afterglow')
        .select('*')
        .eq('date', dateISO)
        .eq('profile_id', (await supabase.auth.getUser()).data.user!.id)
        .maybeSingle<DailyAfterglow>();

      if (error) throw error;
      return data ?? null;
    }
  });

  // Debounced invalidation to prevent excessive refetches
  const invalidateAfterglow = useMemo(
    () => debounce(
      () => {
        qc.invalidateQueries({ queryKey: ['afterglow', dateISO] });
        // Also invalidate venue intelligence when afterglow changes
        if (venueIntelligenceStatus === 'enhanced') {
          setVenueIntelligenceStatus('ready'); // Reset status for re-enhancement
        }
      },
      2500,
      { leading: true, trailing: true }
    ),
    [dateISO, qc, venueIntelligenceStatus]
  );

  // 🔄 Real-time subscription for afterglow changes with proper cleanup
  useEffect(() => {
    if (!dateISO) return;

    let mounted = true;
    let channel: any = null;

    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user?.id) return;

      channel = supabase
        .channel(`afterglow-realtime-${dateISO}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_afterglow',
            filter: `date=eq.${dateISO}&profile_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[afterglow] real-time update:', payload);
            invalidateAfterglow();
          }
        )
        .subscribe();
    };

    setupChannel();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      invalidateAfterglow.cancel(); // Cancel pending debounced calls
    };
  }, [dateISO, invalidateAfterglow]);

  // 2️⃣ – trigger generation ONLY once when the user clicks a button
  const generate = async () => {
    if (!dateISO) return;

    const { error } = await supabase.functions.invoke(
      'generate-intelligence',
      { body: { mode: 'daily', user_id: (await supabase.auth.getUser()).data.user!.id, date: dateISO } }
    );
    if (error) throw error;

    // poll until it appears – max 60 s
    const started = Date.now();
    const poll = async () => {
      await qc.invalidateQueries({ queryKey: ['afterglow', dateISO] });
      const fresh = qc.getQueryData<DailyAfterglow | null>(['afterglow', dateISO]);
      if (fresh && fresh.id) return;                 // 🎉 done
      if (Date.now() - started > 60_000) return;     // give up
      setTimeout(poll, 4_000);
    };
    poll();
  };

  // 3️⃣ – enhance afterglow with venue intelligence
  const enhanceWithVenueIntelligence = async () => {
    if (!data?.id || venueIntelligenceStatus === 'enhancing') return;

    setVenueIntelligenceStatus('enhancing');
    
    try {
      // Get moments for this afterglow
      const { data: moments, error: momentsError } = await supabase
        .from('afterglow_moments')
        .select('id')
        .eq('daily_afterglow_id', data.id);

      if (momentsError) throw momentsError;

      if (moments?.length) {
        const momentIds = moments.map(m => m.id);
        const result = await enhanceAfterglowMoment(momentIds[0]); // Start with first moment
        
        if (result.success) {
          setVenueIntelligenceStatus('enhanced');
          // Invalidate afterglow data to refresh with enhanced metadata
          await qc.invalidateQueries({ queryKey: ['afterglow', dateISO] });
        } else {
          setVenueIntelligenceStatus('ready');
        }
      }
    } catch (error) {
      console.error('Error enhancing afterglow with venue intelligence:', error);
      setVenueIntelligenceStatus('ready');
    }
  };

  // 4️⃣ – get venue recommendations based on afterglow history
  const getVenueRecommendations = async (lat: number, lng: number) => {
    try {
      return await getVenueRecommendationsFromHistory(lat, lng, 10);
    } catch (error) {
      console.error('Error getting venue recommendations:', error);
      return [];
    }
  };

  // 5️⃣ – auto-enhance recent moments
  const autoEnhanceRecent = async (daysBack: number = 1) => {
    try {
      setVenueIntelligenceStatus('enhancing');
      const result = await autoEnhanceRecentMoments(daysBack);
      
      if (result.success && result.enhanced_count > 0) {
        setVenueIntelligenceStatus('enhanced');
        // Refresh afterglow data
        await qc.invalidateQueries({ queryKey: ['afterglow', dateISO] });
      } else {
        setVenueIntelligenceStatus('ready');
      }
      
      return result;
    } catch (error) {
      console.error('Error auto-enhancing recent moments:', error);
      setVenueIntelligenceStatus('ready');
      return { success: false, enhanced_count: 0 };
    }
  };

  return {
    afterglow: data ?? EMPTY_STATE,
    isLoading: isFetching,
    error,
    generate,    // call this from your "Generate Ripple" button
    data: data ?? EMPTY_STATE,  // alias for compatibility
    
    // NEW: Venue intelligence methods
    enhanceWithVenueIntelligence,
    getVenueRecommendations,
    autoEnhanceRecent,
    venueIntelligenceStatus,
    isVenueIntelligenceLoading
  };
}