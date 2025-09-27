import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHQMeetHalfwayCore, type HalfResult, type HalfCandidate } from './useHQMeetHalfwayCore';
import { runWithPrivacyOptional } from '@/core/privacy/privacyOptional';
import { useFeatureFlag } from '@/constants/featureFlags';
import { edgeLog } from '@/lib/edgeLog';

const CATEGORY_FALLBACK_CANDIDATES: HalfCandidate[] = [
  {
    id: 'fallback-coffee',
    name: 'Coffee Shop',
    lat: 0,
    lng: 0,
    category: 'coffee'
  },
  {
    id: 'fallback-food', 
    name: 'Restaurant',
    lat: 0,
    lng: 0,
    category: 'food'
  }
];

/**
 * Privacy-Enhanced Meet Halfway Hook
 * 
 * Extends core functionality with optional privacy gates.
 * Falls back to core functionality when privacy is disabled.
 */
export function useHQMeetHalfwayWithPrivacy(
  floqId: string,
  opts: { 
    categories?: string[]; 
    max_km?: number; 
    limit?: number; 
    mode?: "walk" | "drive";
    memberDists?: number[][];
    participantsCount?: number;
    channelId?: string;
  } = {},
  enabled = true
) {
  const core = useHQMeetHalfwayCore(floqId, opts, enabled);
  const privacyEnabled = useFeatureFlag('PRIVACY_PREDICTABILITY_GATES');
  
  const ch = opts.channelId ? supabase.channel(opts.channelId, { 
    config: { presence: { key: 'user' } }
  }) : null;

  const suggestHalfway = useCallback(async (payload: { 
    midLat: number; 
    midLng: number; 
    windowMin: number 
  }) => {
    if (!privacyEnabled) {
      // No privacy - direct suggestion
      if (ch) {
        await ch.subscribe();
        await ch.send({ 
          type: 'broadcast', 
          event: 'halfway_suggest', 
          payload: { ...payload, ts: Date.now() }
        });
      }
      
      edgeLog('halfway_suggest', { privacyEnabled: false });
      return { ok: true, mode: 'full' as const };
    }

    // Privacy enabled - use gate
    const { result, degrade } = await runWithPrivacyOptional(
      async () => {
        if (ch) {
          await ch.subscribe();
          await ch.send({ 
            type: 'broadcast', 
            event: 'halfway_suggest', 
            payload: { ...payload, ts: Date.now() }
          });
        }
        return true;
      },
      { 
        envelopeId: 'balanced',
        featureTimestamps: [Date.now()],
        cohortSize: opts.participantsCount || 2,
        epsilonCost: 0.01
      },
      'halfway_suggest'
    );

    if (degrade === 'suppress') {
      return { ok: false, reason: 'privacy', mode: 'suppressed' as const };
    }

    return { 
      ok: true, 
      mode: degrade === 'full' ? 'full' as const : 'degraded' as const 
    };
  }, [ch, opts.participantsCount, privacyEnabled]);

  const acceptHalfway = useCallback(async () => {
    if (ch) {
      await ch.send({ 
        type: 'broadcast', 
        event: 'halfway_accept', 
        payload: { ts: Date.now() }
      });
    }
    
    edgeLog('halfway_accept', {});
  }, [ch]);

  // Transform core data with privacy-aware fallbacks
  const data = core.data ? {
    ...core.data,
    candidates: privacyEnabled && core.data.candidates.length === 0 
      ? CATEGORY_FALLBACK_CANDIDATES 
      : core.data.candidates
  } : undefined;

  return {
    ...core,
    data,
    suggestHalfway,
    acceptHalfway,
    isPrivacyEnabled: privacyEnabled
  };
}

// Backward compatibility - this is the new default export
export function useHQMeetHalfway(
  floqId: string,
  opts: { 
    categories?: string[]; 
    max_km?: number; 
    limit?: number; 
    mode?: "walk" | "drive";
    memberDists?: number[][];
    participantsCount?: number;
    channelId?: string;
  } = {},
  enabled = true
) {
  return useHQMeetHalfwayWithPrivacy(floqId, opts, enabled);
}