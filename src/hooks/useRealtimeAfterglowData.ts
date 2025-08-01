import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  // 🔄 Real-time subscription for afterglow changes
  useEffect(() => {
    if (!dateISO) return;

    const channel = supabase
      .channel(`afterglow-realtime-${dateISO}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_afterglow',
          filter: `date=eq.${dateISO}`
        },
        (payload) => {
          console.log('🔥 Afterglow real-time update:', payload);
          qc.invalidateQueries({ queryKey: ['afterglow', dateISO] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateISO, qc]);

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

  return {
    afterglow: data ?? EMPTY_STATE,
    isLoading: isFetching,
    error,
    generate     // call this from your "Generate Ripple" button
  };
}