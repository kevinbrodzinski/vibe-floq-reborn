import { useFeatureFlag } from '@/constants/featureFlags';

/**
 * Privacy-Last Framework Utility
 * 
 * Provides conditional privacy gate execution based on feature flags.
 * Always provides fallback behavior when privacy is disabled.
 */

export type PrivacyGateOptions = {
  envelopeId?: 'strict' | 'balanced' | 'permissive';
  featureTimestamps?: number[];
  cohortSize?: number;
  epsilonCost?: number;
};

export type PrivacyGateResult = {
  ok: boolean;
  degrade: 'full' | 'category' | 'binary' | 'suppress';
  receiptId: string;
  reason?: string;
};

/**
 * Hook that provides optional privacy gate functionality
 * Falls back to always-allow when privacy flags are disabled
 */
export function usePrivacyOptional() {
  const privacyEnabled = useFeatureFlag('PRIVACY_GATES_ENABLED');
  
  const executeWithGate = async <T>(
    fn: () => Promise<T>,
    options: PrivacyGateOptions = {}
  ): Promise<{ ok: boolean; data?: T; reason?: string; degrade: string }> => {
    
    if (!privacyEnabled) {
      // Privacy disabled - execute without gates
      try {
        const data = await fn();
        return {
          ok: true,
          data,
          degrade: 'full'
        };
      } catch (error) {
        return {
          ok: false,
          reason: 'execution_failed',
          degrade: 'suppress'
        };
      }
    }

    // Privacy enabled - use actual gate (lazy import to avoid loading when disabled)
    const { withGate } = await import('@/core/privacy/withGate');
    return await withGate(fn, options);
  };

  const checkGate = async (options: PrivacyGateOptions = {}): Promise<PrivacyGateResult> => {
    if (!privacyEnabled) {
      // Privacy disabled - always allow
      return {
        ok: true,
        degrade: 'full',
        receiptId: `disabled_${Date.now()}`
      };
    }

    // Privacy enabled - use actual gate
    const { rankTimeGate } = await import('@/core/privacy/RankTimeGate');
    const result = rankTimeGate({
      envelopeId: options.envelopeId || 'balanced',
      featureTimestamps: options.featureTimestamps || [Date.now()],
      cohortSize: options.cohortSize,
      epsilonCost: options.epsilonCost || 0
    });

    return {
      ok: result.ok,
      degrade: result.ok ? result.degrade : 'suppress',
      receiptId: result.receiptId,
      reason: result.ok ? undefined : (result as any).reason
    };
  };

  return {
    executeWithGate,
    checkGate,
    isPrivacyEnabled: privacyEnabled
  };
}