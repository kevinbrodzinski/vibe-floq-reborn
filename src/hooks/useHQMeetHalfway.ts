import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRecommendationCapture } from '@/hooks/useRecommendationCapture';
import { useGroupPredictability } from '@/hooks/useGroupPredictability';
import { rankTimeGate } from '@/core/privacy/RankTimeGate';
import { edgeLog } from '@/lib/edgeLog';

export type HalfCandidate = {
  id: string; 
  name: string; 
  lat: number; 
  lng: number;
  meters_from_centroid?: number; 
  avg_eta_min?: number;
  per_member?: Array<{ profile_id: string; meters: number; eta_min: number }>;
  score?: number;
  category?: "coffee" | "bar" | "food" | "park" | "other";
};

export type HalfResult = {
  centroid: { lat: number; lng: number };
  members?: Array<{ profile_id: string; lat: number; lng: number }>;
  candidates: HalfCandidate[];
  stats?: { sample: number; avg_pair_distance_m: number };
  policy?: { privacy: "banded"; min_members: number };
};

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
  const capture = useRecommendationCapture('balanced');
  const gp = opts.memberDists ? useGroupPredictability(opts.memberDists) : { ok: true, spread: 0, gain: 0, fallback: null };
  const ch = opts.channelId ? supabase.channel(opts.channelId, { 
    config: { presence: { key: 'user' } }
  }) : null;
  const queryResult = useQuery({
    queryKey: ["hq-meet-halfway", floqId, opts],
    enabled: Boolean(floqId) && enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<HalfResult>(
        "hq-meet-halfway",
        { 
          body: { floq_id: floqId, ...opts }
        }
      );
      if (error) throw error;
      return data!;
    },
  });

  const suggestHalfway = async (payload: { midLat: number; midLng: number; windowMin: number }) => {
    const participantsCount = opts.participantsCount || 2;
    const gate = rankTimeGate({ 
      envelopeId: 'balanced', 
      featureTimestamps: [Date.now()], 
      cohortSize: participantsCount, 
      epsilonCost: 0.01 
    });
    
    if (!gate.ok) { 
      edgeLog('halfway_blocked_gate', { reason: (gate as any).reason }); 
      return { ok: false, reason: 'privacy' }; 
    }
    
    if (!gp.ok) { 
      edgeLog('halfway_blocked_pred', { fallback: gp.fallback }); 
      return { ok: false, reason: gp.fallback! }; 
    }

    if (ch) {
      await ch.subscribe();
      await ch.send({ 
        type: 'broadcast', 
        event: 'halfway_suggest', 
        payload: { ...payload, ts: Date.now() }
      });
    }
    
    edgeLog('halfway_suggest', { 
      degrade: gate.degrade, 
      receiptId: gate.receiptId 
    });

    await capture.setPlanContext({
      planId: opts.channelId || floqId,
      participantsCount,
      predictability: { 
        spread: gp.spread, 
        gain: gp.gain, 
        ok: gp.ok, 
        fallback: gp.fallback ?? null 
      }
    });

    await capture.flushNow();
    return { ok: true };
  };

  const acceptHalfway = async () => {
    if (ch) {
      await ch.send({ 
        type: 'broadcast', 
        event: 'halfway_accept', 
        payload: { ts: Date.now() }
      });
    }
    
    edgeLog('halfway_accept', {});
    await capture.flushNow();
  };

  return {
    ...queryResult,
    suggestHalfway,
    acceptHalfway,
    isPredictable: gp.ok,
    predictability: gp
  };
}