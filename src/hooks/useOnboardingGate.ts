import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_ONBOARDING_VERSION, FINAL_STEP_INDEX } from '@/constants/onboarding';

type GateRow = { version: string; step_index: number; permissions: Record<string, unknown> | null };

export type OnboardingGateStatus = {
  needsOnboarding: boolean;
  isLoading: boolean;
  currentVersion: typeof CURRENT_ONBOARDING_VERSION;
  stepIndex: number;
  permissions: Record<string, unknown>;
};

export function useOnboardingGate(): OnboardingGateStatus {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-gate-v3', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: (count, error: any) => {
      const code = error?.code;
      // Don't hammer if relation/function is missing
      if (code === '42P01' || code === '42883') return false;
      return count < 1;
    },
    queryFn: async (): Promise<GateRow | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('version, step_index, permissions')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[OnboardingGate] query error:', error);
        }
        // Tolerate missing table: treat as no progress
        // PGRST116 ("Results contain 0 rows") is already handled by maybeSingle
        return null;
      }

      return (data as GateRow) ?? null;
    },
  });

  const serverStep = data?.step_index ?? 0;
  const serverVersion = data?.version ?? 'v0';

  // Needs onboarding if:
  // 1) No row, OR
  // 2) Version mismatch, OR
  // 3) Version ok but step not at final
  const versionMismatch = serverVersion !== CURRENT_ONBOARDING_VERSION;
  const incomplete = serverStep < FINAL_STEP_INDEX;

  const needsOnboarding = !data || versionMismatch || incomplete;

  return {
    needsOnboarding,
    isLoading: !!user?.id && isLoading,
    currentVersion: CURRENT_ONBOARDING_VERSION,
    stepIndex: serverStep,
    permissions: (data?.permissions as Record<string, unknown>) ?? {},
  };
}
