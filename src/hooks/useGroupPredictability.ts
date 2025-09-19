import { useMemo } from 'react';
import { predictabilityGate } from '@/core/group/predictability';

export interface GroupPredictabilityResult {
  ok: boolean;
  spread: number;
  gain: number;
  fallback: 'partition' | 'relax_constraints' | null;
  confidence: 'high' | 'medium' | 'low';
  suggestion?: string;
}

export function useGroupPredictability(memberDists: number[][], omegaStar = 0.35, tau = 0.15) {
  return useMemo(() => {
    const res = predictabilityGate(memberDists, omegaStar, tau);
    const label = res.ok ? 'OK' : (res.fallback === 'partition' ? 'Suggest subgroups' : 'Relax time/radius');
    return { ...res, label };
  }, [memberDists, omegaStar, tau]);
}