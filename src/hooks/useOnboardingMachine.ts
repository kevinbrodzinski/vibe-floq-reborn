import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_ONBOARDING_VERSION } from '@/constants/onboarding';

export type OnboardingStep = 'welcome' | 'profile' | 'vibe' | 'permissions' | 'privacy' | 'nudges' | 'complete';

const STEP_SEQUENCE: OnboardingStep[] = [
  'welcome',    // 0
  'profile',    // 1
  'vibe',       // 2
  'permissions',// 3
  'privacy',    // 4
  'nudges',     // 5
  'complete',   // 6
];

export interface OnboardingMachineState {
  currentStep: OnboardingStep;
  stepIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  permissions: Record<string, boolean>;
  isAdvancing: boolean;
}

export interface OnboardingMachine extends OnboardingMachineState {
  goNext: () => Promise<void>;
  goBack: () => void;
  updatePermissions: (key: string, value: boolean) => void;
  markComplete: () => Promise<void>;
}

/**
 * State machine for onboarding v3 flow
 * Syncs with server on every NEXT via advance_onboarding RPC
 */
export function useOnboardingMachine(initialStepIndex: number = 0): OnboardingMachine {
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isAdvancing, setIsAdvancing] = useState(false);

  const currentStep = STEP_SEQUENCE[stepIndex] ?? 'welcome';
  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < STEP_SEQUENCE.length - 1;

  const goNext = useCallback(async () => {
    if (!canGoNext || isAdvancing) return;
    
    setIsAdvancing(true);
    const nextIndex = stepIndex + 1;

    try {
      const { error } = await supabase.rpc('advance_onboarding', {
        p_step_index: nextIndex,
        p_version: CURRENT_ONBOARDING_VERSION,
        p_permissions: permissions as any,
      });

      if (error) {
        console.error('[OnboardingMachine] Failed to advance:', error);
        // Allow client-side advance even if server fails (graceful degradation)
      }

      setStepIndex(nextIndex);
    } finally {
      setIsAdvancing(false);
    }
  }, [canGoNext, stepIndex, permissions, isAdvancing]);

  const goBack = useCallback(() => {
    if (canGoBack) {
      setStepIndex((prev) => prev - 1);
    }
  }, [canGoBack]);

  const updatePermissions = useCallback((key: string, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const markComplete = useCallback(async () => {
    setIsAdvancing(true);
    try {
      // Advance to final step (6 = complete)
      const { error } = await supabase.rpc('advance_onboarding', {
        p_step_index: 6,
        p_version: CURRENT_ONBOARDING_VERSION,
        p_permissions: permissions as any,
      });

      if (error) {
        console.error('[OnboardingMachine] Failed to mark complete:', error);
        throw error;
      }

      setStepIndex(6);
    } finally {
      setIsAdvancing(false);
    }
  }, [permissions]);

  return {
    currentStep,
    stepIndex,
    canGoBack,
    canGoNext,
    permissions,
    isAdvancing,
    goNext,
    goBack,
    updatePermissions,
    markComplete,
  };
}
