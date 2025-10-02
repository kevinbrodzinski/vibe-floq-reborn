import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CURRENT_ONBOARDING_VERSION, STEP_SEQUENCE, FINAL_STEP_INDEX, type StepId } from '@/constants/onboarding';

type Perms = Partial<{
  location: 'granted' | 'denied' | 'limited';
  notifications: 'granted' | 'denied' | 'provisional';
  motion: 'granted' | 'denied';
}>;

export interface OnboardingMachineState {
  currentStep: StepId;
  stepIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
  permissions: Perms;
  isAdvancing: boolean;
}

export interface OnboardingMachine extends OnboardingMachineState {
  goNext: (perms?: Perms) => Promise<void>;
  goBack: () => void;
  markComplete: (perms?: Perms) => Promise<void>;
}

export function useOnboardingMachine(initialServerIndex = 0): OnboardingMachine {
  // Clamp to a valid step (resume safety)
  const initialIndex = Math.min(Math.max(initialServerIndex, 0), FINAL_STEP_INDEX);

  const [stepIndex, setStepIndex] = useState<number>(initialIndex);
  const [permissions, setPermissions] = useState<Perms>({});
  const [isAdvancing, setIsAdvancing] = useState(false);

  const currentStep = STEP_SEQUENCE[stepIndex] ?? 'welcome';
  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < FINAL_STEP_INDEX;

  const persist = useCallback(async (nextIdx: number, perms?: Perms) => {
    try {
      const { error } = await supabase.rpc('advance_onboarding', {
        p_step_index: nextIdx,
        p_version: CURRENT_ONBOARDING_VERSION,
        p_permissions: perms ?? permissions,
      });
      if (error && process.env.NODE_ENV === 'development') {
        console.warn('[OnboardingMachine] advance_onboarding error:', error);
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.warn('[OnboardingMachine] RPC failed:', e);
    }
  }, [permissions]);

  const goNext = useCallback(async (perms?: Perms) => {
    if (!canGoNext || isAdvancing) return;
    setIsAdvancing(true);
    const nextIndex = Math.min(stepIndex + 1, FINAL_STEP_INDEX);
    const merged = { ...permissions, ...(perms ?? {}) } as Perms;
    try {
      await persist(nextIndex, merged);
      setPermissions(merged);
      setStepIndex(nextIndex);
    } finally {
      setIsAdvancing(false);
    }
  }, [canGoNext, isAdvancing, stepIndex, permissions, persist]);

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    setStepIndex(i => Math.max(i - 1, 0));
  }, [canGoBack]);

  const markComplete = useCallback(async (perms?: Perms) => {
    setIsAdvancing(true);
    const merged = { ...permissions, ...(perms ?? {}) } as Perms;
    try {
      await persist(FINAL_STEP_INDEX, merged);
      setPermissions(merged);
      setStepIndex(FINAL_STEP_INDEX);
    } finally {
      setIsAdvancing(false);
    }
  }, [permissions, persist]);

  return {
    currentStep,
    stepIndex,
    canGoBack,
    canGoNext,
    permissions,
    isAdvancing,
    goNext,
    goBack,
    markComplete,
  };
}
