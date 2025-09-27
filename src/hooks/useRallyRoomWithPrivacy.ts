import { useCallback } from 'react';
import { useRallyRoomCore } from './useRallyRoomCore';
import { usePrivacyOptional } from './usePrivacyOptional';
import { useFeatureFlag } from '@/constants/featureFlags';
import { edgeLog } from '@/lib/edgeLog';

/**
 * Privacy-Enhanced Rally Room Hook
 * 
 * Extends core rally functionality with optional privacy gates.
 * Falls back to core functionality when privacy is disabled.
 */
export function useRallyRoomWithPrivacy(rallyId?: string) {
  const core = useRallyRoomCore(rallyId);
  const { executeWithGate, isPrivacyEnabled } = usePrivacyOptional();
  const realtimePrivacyEnabled = useFeatureFlag('REALTIME_PRIVACY_ENABLED');

  const ping = useCallback(async (userId: string, etaBand?: string) => {
    if (!realtimePrivacyEnabled) {
      // No privacy - use basic ping
      await core.pingBasic(userId, etaBand);
      edgeLog('rally_ping', { userId, etaBand, privacyEnabled: false });
      return;
    }

    // Privacy enabled - use privacy gate
    const result = await executeWithGate(
      async () => {
        await core.pingBasic(userId, etaBand);
        return true;
      },
      { envelopeId: 'strict', epsilonCost: 0 }
    );

    if (!result.ok) {
      edgeLog('rally_ping_blocked', { 
        userId, 
        reason: result.reason,
        degrade: result.degrade 
      });
      return;
    }

    edgeLog('rally_ping', { 
      userId, 
      etaBand, 
      privacyEnabled: true,
      degrade: result.degrade
    });
  }, [core.pingBasic, executeWithGate, realtimePrivacyEnabled]);

  return {
    ...core,
    ping,
    isPrivacyEnabled: realtimePrivacyEnabled && isPrivacyEnabled
  };
}

// Backward compatibility - this is the new default export
export function useRallyRoom(rallyId?: string) {
  return useRallyRoomWithPrivacy(rallyId);
}