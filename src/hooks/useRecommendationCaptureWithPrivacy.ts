import { useCallback, useEffect } from 'react';
import { useRecommendationCaptureCore } from './useRecommendationCaptureCore';
import { usePrivacyOptional } from './usePrivacyOptional';
import { useFeatureFlag } from '@/constants/featureFlags';
import { edgeLog } from '@/lib/edgeLog';

type EnvelopeId = 'strict' | 'balanced' | 'permissive';

/**
 * Privacy-Enhanced Recommendation Capture Hook
 * 
 * Extends the core capture functionality with optional privacy gates.
 * Falls back to core functionality when privacy is disabled.
 */
export function useRecommendationCaptureWithPrivacy(
  envelopeId: EnvelopeId = 'balanced'
) {
  const core = useRecommendationCaptureCore();
  const { checkGate, isPrivacyEnabled } = usePrivacyOptional();
  const recommendationPrivacyEnabled = useFeatureFlag('RECOMMENDATION_PRIVACY_ENABLED');

  // Auto-drain with privacy gate (if enabled)
  useEffect(() => {
    if (!recommendationPrivacyEnabled) {
      // No privacy - simple interval drain
      const id = setInterval(async () => {
        await core.drainToDatabase(25);
      }, 15_000);
      return () => clearInterval(id);
    }

    // Privacy enabled - gate before drain
    const id = setInterval(async () => {
      if (core.isDraining) return;
      
      const gate = await checkGate({
        envelopeId,
        featureTimestamps: [Date.now()],
        epsilonCost: 0.01,
      });
      
      if (!gate.ok) {
        edgeLog('pref_drain_blocked', { reason: gate.reason, degrade: gate.degrade });
        return;
      }

      const success = await core.drainToDatabase(25);
      edgeLog('pref_drain', { 
        success, 
        degrade: gate.degrade, 
        receiptId: gate.receiptId,
        privacyEnabled: isPrivacyEnabled
      });
    }, 15_000);

    return () => clearInterval(id);
  }, [core, checkGate, envelopeId, recommendationPrivacyEnabled, isPrivacyEnabled]);

  const flushNow = useCallback(async () => {
    if (!recommendationPrivacyEnabled) {
      // No privacy - direct flush
      return await core.flushNow();
    }

    // Privacy enabled - gate before flush
    const gate = await checkGate({
      envelopeId,
      featureTimestamps: [Date.now()],
      epsilonCost: 0.01,
    });
    
    if (!gate.ok) {
      edgeLog('pref_flush_blocked', { reason: gate.reason, degrade: gate.degrade });
      return false;
    }

    const success = await core.flushNow();
    edgeLog('pref_flush', { 
      success, 
      degrade: gate.degrade, 
      receiptId: gate.receiptId,
      privacyEnabled: isPrivacyEnabled
    });
    return success;
  }, [core.flushNow, checkGate, envelopeId, recommendationPrivacyEnabled, isPrivacyEnabled]);

  return {
    ...core,
    flushNow,
    isPrivacyEnabled: recommendationPrivacyEnabled && isPrivacyEnabled
  };
}

// Backward compatibility - this is the new default export
export function useRecommendationCapture(envelopeId: EnvelopeId = 'balanced') {
  return useRecommendationCaptureWithPrivacy(envelopeId);
}