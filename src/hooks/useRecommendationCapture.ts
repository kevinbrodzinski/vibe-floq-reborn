import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { storage } from '@/lib/storage';
import { rankTimeGate } from '@/core/privacy/RankTimeGate';
import { edgeLog } from '@/lib/edgeLog';

/** Types mirrored from your queue module (keep them in sync) */
type VibeSnapshot = { v: number; dvdt: number; momentum: number; ts: number };
type VenueOffer   = { id: string; type: string; predictedEnergy?: number; distance?: number };
export type PreferenceSignal = {
  id: string;
  ts: number;
  vibe: VibeSnapshot;
  offer: VenueOffer;
  context: { 
    dow: number; 
    tod: number; 
    weather?: string;
    plan_context?: {
      planId?: string;
      participantsCount?: number;
      predictability?: {
        spread: number;
        gain: number;
        ok: boolean;
        fallback: string | null;
      };
    };
  };
  decision: { action: 'accept'|'decline'|'modify'|'delay'; rtMs: number };
  outcome?: { satisfaction?: number; wouldRepeat?: boolean };
};

const KEY = 'pref:signals:v1';

async function saveSignal(s: PreferenceSignal) {
  const raw = (await storage.getItem(KEY)) ?? '[]';
  const arr = JSON.parse(raw) as PreferenceSignal[];
  arr.push(s);
  await storage.setItem(KEY, JSON.stringify(arr.slice(-500)));
}

async function drainQueue(batch = 50): Promise<PreferenceSignal[]> {
  const raw = (await storage.getItem(KEY)) ?? '[]';
  const arr = JSON.parse(raw) as PreferenceSignal[];
  const take = arr.splice(0, batch);
  await storage.setItem(KEY, JSON.stringify(arr));
  return take;
}

/** profiles.id === auth.uid() in your schema */
async function getAuthProfileId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Capture hook:
 * - save exposures/decisions locally for instant UX
 * - periodically drains to `preference_signals` with proper profile_id
 */
export function useRecommendationCapture(
  envelope: 'strict'|'balanced'|'permissive' = 'balanced'
) {
  const draining = useRef(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [planContext, setPlanContextState] = useState<{
    planId?: string;
    participantsCount?: number;
    predictability?: {
      spread: number;
      gain: number;
      ok: boolean;
      fallback: string | null;
    };
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    getAuthProfileId().then(pid => { if (mounted) setProfileId(pid); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      if (draining.current) return;
      draining.current = true;
      try {
        // Gate before any aggregate-related/drain operation
        const gate = rankTimeGate({
          envelopeId: envelope,
          featureTimestamps: [Date.now()],
          epsilonCost: 0.01,
        });
        if (!gate.ok) return;

        // Ensure we have a profile_id that satisfies RLS policy
        const pid = profileId ?? await getAuthProfileId();
        if (!pid) return;

        const batch = await drainQueue(25);
        edgeLog('pref_drain', { count: batch.length, degrade: gate.degrade, receiptId: gate.receiptId });
        if (!batch.length) return;

        // Insert directly into preference_signals; RLS requires profile_id=get_current_profile_id()
        const rows = batch.map(s => ({
          profile_id: pid,
          ts: new Date(s.ts).toISOString(),
          signal: s as any,
        }));

        const { error } = await supabase.from('preference_signals').insert(rows);
        if (error) {
          // If a transient network/rls issue occurs, push the batch back into queue.
          const existing = JSON.parse((await storage.getItem(KEY)) ?? '[]');
          await storage.setItem(KEY, JSON.stringify([...rows.map((r: any) => r.signal), ...existing].slice(-500)));
          // Swallow error—logging only
          edgeLog('pref_drain_error', { message: error.message, code: (error as any).code });
        }

        // Optional RPC path (toggle this if needed later):
        // const { error } = await supabase.rpc('record_preference_signal', {
        //   p_signal: s as any,
        //   p_ts: new Date(s.ts).toISOString(),
        // });

      } finally {
        draining.current = false;
      }
    }, 15_000);

    return () => clearInterval(id);
  }, [envelope, profileId]);

  const setPlanContext = useCallback((context: typeof planContext) => {
    setPlanContextState(context);
    edgeLog('pref_context_set', { 
      planId: context?.planId, 
      participantsCount: context?.participantsCount,
      predictabilityOk: context?.predictability?.ok
    });
  }, []);

  const capture = useCallback(async (payload: {
    offer: { id: string; type: string; predictedEnergy?: number; distance?: number };
    vibe:  { v: number; dvdt: number; momentum: number };
    decision: 'accept'|'decline'|'modify'|'delay';
    rtMs: number;
    context: { dow: number; tod: number; weather?: string };
  }) => {
    const id = `${payload.offer.id}:${Date.now()}`;
    await saveSignal({
      id,
      ts: Date.now(),
      vibe: { ...payload.vibe, ts: Date.now() },
      offer: payload.offer,
      context: planContext ? {
        ...payload.context,
        plan_context: planContext
      } : payload.context,
      decision: { action: payload.decision, rtMs: payload.rtMs },
    });
    edgeLog('pref_saved', { offerId: payload.offer.id, decision: payload.decision });
  }, [planContext]);

  const flushNow = useCallback(async () => {
    if (draining.current) {
      edgeLog('pref_flush_skipped', { reason: 'already_draining' });
      return;
    }
    
    draining.current = true;
    try {
      const gate = rankTimeGate({
        envelopeId: envelope,
        featureTimestamps: [Date.now()],
        epsilonCost: 0.01,
      });
      if (!gate.ok) {
        edgeLog('pref_flush_skipped', { reason: 'gate_blocked', degrade: gate.degrade });
        return;
      }

      const pid = profileId ?? await getAuthProfileId();
      if (!pid) {
        edgeLog('pref_flush_skipped', { reason: 'no_profile' });
        return;
      }

      const batch = await drainQueue(50); // Larger batch for manual flush
      edgeLog('pref_flush_manual', { count: batch.length, degrade: gate.degrade, receiptId: gate.receiptId });
      if (!batch.length) return;

      const rows = batch.map(s => ({
        profile_id: pid,
        ts: new Date(s.ts).toISOString(),
        signal: s as any,
      }));

      const { error } = await supabase.from('preference_signals').insert(rows);
      if (error) {
        const existing = JSON.parse((await storage.getItem(KEY)) ?? '[]');
        await storage.setItem(KEY, JSON.stringify([...rows.map((r: any) => r.signal), ...existing].slice(-500)));
        edgeLog('pref_flush_error', { message: error.message, code: (error as any).code });
      }
    } finally {
      draining.current = false;
    }
  }, [envelope, profileId]);

  return { capture, setPlanContext, flushNow };
}