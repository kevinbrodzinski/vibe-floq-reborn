import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { type Vibe } from '@/lib/vibes';
import type { Database } from '@/integrations/supabase/types';
import { castSupabaseFilter, castString } from '@/lib/typeAssertions';
export const ONBOARDING_VERSION = 'v2' as const;
export const FINAL_STEP = 6 as const;

export type ProfileData = {
  username: string;
  display_name: string;
  bio?: string;
  interests?: string[];
};

type OnboardingRow = {
  profile_id: string
  onboarding_version: string
  current_step: number
  completed_steps: number[]
  selected_vibe?: string | null
  profile_data?: ProfileData | null
  avatar_url?: string | null
  started_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
  created_at: string
}

type UOPInsert = Database['public']['Tables']['user_onboarding_progress']['Insert'];
 type UOPUpdate = Database['public']['Tables']['user_onboarding_progress']['Update'];

interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  selectedVibe?: Vibe;
  profileData?: {
    username: string;
    display_name: string;
    bio?: string;
    interests?: string[];
  };
  avatarUrl?: string | null;
  startedAt: number;
}

export function useOnboardingDatabase() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async (): Promise<OnboardingState | null> => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('profile_id', castSupabaseFilter(user.id))
        .eq('onboarding_version', castString(ONBOARDING_VERSION))
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      const row = data as unknown as OnboardingRow | null;
      if (!row) return null;
      
      return {
        currentStep: row.current_step,
        completedSteps: Array.isArray(row.completed_steps) ? row.completed_steps : [],
        selectedVibe: row.selected_vibe as Vibe,
        profileData: row.profile_data as ProfileData,
        avatarUrl: row.avatar_url,
        startedAt: Date.parse(row.started_at ?? row.created_at) || Date.now()
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveProgress = useCallback(async (state: OnboardingState): Promise<boolean> => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      const progressData: UOPInsert = {
        profile_id: user.id as any,
        onboarding_version: ONBOARDING_VERSION as any,
        current_step: Math.min(state.currentStep, 10),
        completed_steps: state.completedSteps as any,
        selected_vibe: state.selectedVibe as any,
        profile_data: state.profileData as any,
        avatar_url: state.avatarUrl ?? null,
      };

      const { error: upsertError } = await supabase
        .from('user_onboarding_progress')
        .upsert(progressData as any, {
          onConflict: 'profile_id,onboarding_version'
        });
      
      if (upsertError) throw upsertError;
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save progress');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('user_onboarding_progress')
        .update({ 
          completed_at: new Date().toISOString(),
          current_step: FINAL_STEP
        } as any)
        .eq('profile_id', castSupabaseFilter(user.id))
        .eq('onboarding_version', castString(ONBOARDING_VERSION));
      
      if (updateError) throw updateError;
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearProgress = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('user_onboarding_progress')
        .delete()
        .eq('profile_id', castSupabaseFilter(user.id))
        .eq('onboarding_version', castString(ONBOARDING_VERSION));
      
      if (deleteError) throw deleteError;
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear progress');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    error,
    loadProgress,
    saveProgress,
    completeOnboarding,
    clearProgress
  };
}