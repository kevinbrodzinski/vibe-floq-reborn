import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ResonanceMatch {
  userId: string;
  partnerId: string;
  resonanceScore: number;
  factors: {
    sharedInterests: number;
    temporalCompatibility: number;
    spatialResonance: number;
    socialChemistry: number;
  };
  reasoning: string[];
  suggestedActivity: string;
  suggestedTime: string;
  suggestedLocation: string;
}

interface SerendipityEngineState {
  matches: ResonanceMatch[];
  loading: boolean;
  error: string | null;
  lastGenerated: Date | null;
}

export function useSerendipityEngine() {
  const [state, setState] = useState<SerendipityEngineState>({
    matches: [],
    loading: false,
    error: null,
    lastGenerated: null
  });

  const generateMatches = useCallback(async (options?: {
    limit?: number;
    currentLat?: number;
    currentLng?: number;
  }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Use profileId instead of userId as per project knowledge base
      const { data, error } = await supabase.functions.invoke('generate-resonance-match', {
        body: {
          profileId: user.id, // Changed from userId to profileId
          limit: options?.limit || 5,
          currentLat: options?.currentLat,
          currentLng: options?.currentLng
        }
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        matches: data.matches || [],
        loading: false,
        lastGenerated: new Date()
      }));

      return data.matches;

    } catch (error) {
      console.error('Error generating resonance matches:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to generate matches'
      }));
      return [];
    }
  }, []);

  const calculateResonanceScore = useCallback(async (partnerId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('calculate_resonance_score', {
        p_user_id: user.id,
        p_partner_id: partnerId
      });

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error calculating resonance score:', error);
      return null;
    }
  }, []);

  const recordVibePairing = useCallback(async (partnerId: string, vibeType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      // Determine current time context
      const now = new Date();
      const timeOfDay = now.getHours() >= 5 && now.getHours() <= 11 ? 'morning' :
                       now.getHours() >= 12 && now.getHours() <= 17 ? 'afternoon' :
                       now.getHours() >= 18 && now.getHours() <= 22 ? 'evening' : 'night';

      const { error } = await supabase
        .from('vibe_pairing_patterns')
        .upsert({
          user_id: user.id,
          partner_user_id: partnerId,
          vibe_type: vibeType,
          time_of_day: timeOfDay,
          day_of_week: now.getDay(),
          frequency_score: 1.0,
          last_interaction_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,partner_user_id,vibe_type,time_of_day,day_of_week'
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error recording vibe pairing:', error);
    }
  }, []);

  const clearMatches = useCallback(() => {
    setState(prev => ({ ...prev, matches: [], error: null }));
  }, []);

  return {
    ...state,
    generateMatches,
    calculateResonanceScore,
    recordVibePairing,
    clearMatches
  };
}

export default useSerendipityEngine;