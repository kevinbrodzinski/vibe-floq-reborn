import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { storage } from '@/lib/storage';
import { edgeLog } from '@/lib/edgeLog';

/** Types for preference signals */
type VibeSnapshot = { v: number; dvdt: number; momentum: number; ts: number };
type VenueOffer = { id: string; type: string; predictedEnergy?: number; distance?: number };

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

async function getAuthProfileId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Core recommendation capture hook - NO PRIVACY GATES
 * This is the foundation that privacy can be added to optionally
 */
export function useRecommendationCaptureCore() {
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

  const drainToDatabase = useCallback(async (batchSize = 25): Promise<boolean> => {
    if (draining.current) {
      edgeLog('pref_drain_skipped', { reason: 'already_draining' });
      return false;
    }
    
    draining.current = true;
    try {
      const pid = profileId ?? await getAuthProfileId();
      if (!pid) {
        edgeLog('pref_drain_skipped', { reason: 'no_profile' });
        return false;
      }

      const batch = await drainQueue(batchSize);
      if (!batch.length) {
        return true;
      }

      const rows = batch.map(s => ({
        profile_id: pid,
        ts: new Date(s.ts).toISOString(),
        signal: s as any,
      }));

      const { error } = await supabase.from('preference_signals').insert(rows);
      if (error) {
        // Push batch back to queue on error
        const existing = JSON.parse((await storage.getItem(KEY)) ?? '[]');
        await storage.setItem(KEY, JSON.stringify([...rows.map((r: any) => r.signal), ...existing].slice(-500)));
        edgeLog('pref_drain_error', { message: error.message, code: (error as any).code });
        return false;
      }

      edgeLog('pref_drain_success', { count: batch.length });
      return true;
    } finally {
      draining.current = false;
    }
  }, [profileId]);

  const flushNow = useCallback(async () => {
    return await drainToDatabase(50); // Larger batch for manual flush
  }, [drainToDatabase]);

  return { 
    capture, 
    setPlanContext, 
    flushNow, 
    drainToDatabase,
    isDraining: draining.current 
  };
}