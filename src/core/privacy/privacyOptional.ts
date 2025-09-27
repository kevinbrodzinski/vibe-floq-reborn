import { withGate, type GateOpts } from '@/core/privacy/withGate';
import { isFeatureEnabled } from '@/constants/featureFlags';
import { edgeLog } from '@/lib/edgeLog';

export type PrivacyOptionalResult<T> = {
  result?: T;
  degrade: 'full' | 'category' | 'binary' | 'suppress';
  receiptId?: string;
  reason?: string;
};

/**
 * Privacy-Last Framework Utility
 * 
 * Runs tasks with optional privacy gates based on feature flags.
 * Always provides fallback behavior when privacy is disabled.
 */
export async function runWithPrivacyOptional<T>(
  task: () => Promise<T>,
  opts: GateOpts = {},
  featureName?: string
): Promise<PrivacyOptionalResult<T>> {
  if (!isFeatureEnabled('PRIVACY_GATES_ENABLED')) {
    // Gates off → always "full"
    try {
      const result = await task();
      logPrivacyGate('bypass', { 
        feature: featureName || 'unknown', 
        envelope: opts.envelopeId || 'none' 
      });
      return { result, degrade: 'full' };
    } catch (error) {
      logPrivacyGate('error', { 
        feature: featureName || 'unknown', 
        error: String(error) 
      });
      return { degrade: 'suppress', reason: 'execution_failed' };
    }
  }

  // Gates enabled - use actual gate
  try {
    const gate = await withGate(task, opts);
    
    if (!gate.ok) {
      logPrivacyGate('suppress', { 
        feature: featureName || 'unknown',
        envelope: opts.envelopeId || 'balanced',
        reason: gate.reason,
        receiptId: gate.receiptId
      });
      return { 
        degrade: 'suppress', 
        receiptId: gate.receiptId, 
        reason: gate.reason 
      };
    }

    logPrivacyGate(gate.degrade === 'full' ? 'ok' : 'degrade', { 
      feature: featureName || 'unknown',
      envelope: opts.envelopeId || 'balanced',
      mode: gate.degrade,
      receiptId: gate.receiptId
    });

    return { 
      result: gate.data, 
      degrade: gate.degrade, 
      receiptId: gate.receiptId 
    };
  } catch (error) {
    logPrivacyGate('error', { 
      feature: featureName || 'unknown', 
      error: String(error) 
    });
    return { degrade: 'suppress', reason: 'gate_error' };
  }
}

/**
 * Log privacy gate outcomes for rollout observability
 */
function logPrivacyGate(
  event: 'ok' | 'degrade' | 'suppress' | 'bypass' | 'error', 
  ctx: { 
    feature: string; 
    envelope?: string; 
    mode?: string; 
    receiptId?: string; 
    reason?: string; 
    error?: string;
  }
) {
  edgeLog('privacy_gate', { event, ...ctx });
}