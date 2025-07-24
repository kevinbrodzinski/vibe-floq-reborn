import { supabase } from '@/integrations/supabase/client'
import { useRealtimeAfterglowData } from './useRealtimeAfterglowData'

export interface DailyAfterglowData {
  id: string
  date: string
  user_id: string
  energy_score: number
  social_intensity: number
  dominant_vibe: string
  summary_text: string
  emotion_journey: string[]
  moments: any[]
  vibe_path: string[]
  created_at: string
  updated_at?: string
  total_venues: number
  total_floqs: number
  crossed_paths_count: number
  is_pinned: boolean
}

export function useAfterglowData(date: string) {
  const { afterglow, isGenerating, refresh } = useRealtimeAfterglowData(date);

  const generateAfterglow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.functions.invoke('generate-intelligence', {
      body: { mode: 'daily', user_id: user.id, date, force_regenerate: true }
    });
  };

  return {
    afterglow: afterglow as DailyAfterglowData | null,
    afterglowData: afterglow as DailyAfterglowData | null,
    isGenerating,
    isLoading: isGenerating,
    generateAfterglow,
    generationProgress: 0,
    error: null
  };
}
