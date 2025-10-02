import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { CURRENT_ONBOARDING_VERSION } from '@/constants/onboarding';

export interface OnboardingGateStatus {
  needsOnboarding: boolean;
  isLoading: boolean;
  currentVersion: string;
  stepIndex: number;
  permissions: Record<string, boolean>;
}

/**
 * Server-authoritative onboarding gate check (v3)
 * Replaces old useOnboardingStatus with cleaner schema
 */
export function useOnboardingGate(): OnboardingGateStatus {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-gate-v3', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('version, step_index, permissions')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[OnboardingGate] Query error:', error);
        return null;
      }

      return data;
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // User needs onboarding if no progress record or version mismatch
  const needsOnboarding = !data || data.version !== CURRENT_ONBOARDING_VERSION;

  return {
    needsOnboarding,
    isLoading,
    currentVersion: CURRENT_ONBOARDING_VERSION,
    stepIndex: data?.step_index ?? 0,
    permissions: (data?.permissions as Record<string, boolean>) ?? {},
  };
}
