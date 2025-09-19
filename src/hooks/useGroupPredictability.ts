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

export function useGroupPredictability(
  memberPreferences: number[][] = [],
  omegaStar = 0.35,
  tau = 0.15
): GroupPredictabilityResult {
  return useMemo(() => {
    if (!memberPreferences.length || !memberPreferences[0]?.length) {
      return {
        ok: false,
        spread: 1,
        gain: 0,
        fallback: 'relax_constraints',
        confidence: 'low',
        suggestion: 'Need more group members or preferences'
      };
    }

    const result = predictabilityGate(memberPreferences, omegaStar, tau);
    
    // Calculate confidence based on spread and gain
    const confidence: 'high' | 'medium' | 'low' = 
      result.spread < 0.2 && result.gain > 0.3 ? 'high' :
      result.spread < 0.4 && result.gain > 0.15 ? 'medium' : 'low';

    // Generate user-friendly suggestions
    const suggestion = result.ok ? undefined : 
      result.fallback === 'partition' 
        ? 'Group preferences are too diverse. Consider splitting into smaller sub-groups.'
        : 'Group alignment is weak. Try relaxing time or location constraints.';

    return {
      ok: result.ok,
      spread: result.spread,
      gain: result.gain,
      fallback: result.fallback as 'partition' | 'relax_constraints' | null,
      confidence,
      suggestion
    };
  }, [memberPreferences, omegaStar, tau]);
}