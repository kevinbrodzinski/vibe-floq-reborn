import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { type Vibe } from '@/types/vibes';

export const FINAL_STEP = 6;

type ProfileData = {
  username: string;
  display_name: string;
  bio?: string;
  interests?: string[];
};

interface OnboardingProgressData {
  id: string;
  user_id: string;
  onboarding_version: 'v1' | 'v2';
  current_step: number;
  completed_steps: number[];
  selected_vibe?: string;
  profile_data?: {
    username: string;
    display_name: string;
    bio?: string;
    interests?: string[];
  };
  avatar_url?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  created_at: string;
}

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
        .eq('user_id', user.id)
        .eq('onboarding_version', 'v2')
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (!data) return null;
      
      return {
        currentStep: data.current_step,
        completedSteps: Array.isArray(data.completed_steps) ? data.completed_steps : [],
        selectedVibe: data.selected_vibe as Vibe,
        profileData: data.profile_data as any, // Type assertion for JSONB
        avatarUrl: data.avatar_url,
        startedAt: new Date(data.started_at).getTime()
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
      const progressData = {
        user_id: user.id,
        onboarding_version: 'v2' as const,
        current_step: Math.min(state.currentStep, 10),
        completed_steps: state.completedSteps || [],
        selected_vibe: state.selectedVibe,
        profile_data: state.profileData as ProfileData,
        avatar_url: state.avatarUrl,
      };

      const { error: upsertError } = await supabase
        .from('user_onboarding_progress')
        .upsert(progressData, {
          onConflict: 'user_id,onboarding_version'
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
        })
        .eq('user_id', user.id)
        .eq('onboarding_version', 'v2');
      
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
        .eq('user_id', user.id)
        .eq('onboarding_version', 'v2');
      
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