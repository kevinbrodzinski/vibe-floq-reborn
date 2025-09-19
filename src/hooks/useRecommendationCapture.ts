import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { storage } from '@/lib/storage';
import { rankTimeGate } from '@/core/privacy/RankTimeGate';

/** Types mirrored from your queue module (keep them in sync) */
type VibeSnapshot = { v: number; dvdt: number; momentum: number; ts: number };
type VenueOffer   = { id: string; type: string; predictedEnergy?: number; distance?: number };
export type PreferenceSignal = {
  id: string;
  ts: number;
  vibe: VibeSnapshot;
  offer: VenueOffer;
  context: { dow: number; tod: number; weather?: string };
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

/** Resolve current profile_id (profiles.id), not auth user id */
async function getCurrentProfileId(): Promise<string | null> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) return null;
  
  // Use auth.uid() directly as profile_id since that's how the RLS policies work
  return uid;
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

  useEffect(() => {
    let mounted = true;
    getCurrentProfileId().then(pid => { if (mounted) setProfileId(pid); });
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
        const pid = profileId ?? await getCurrentProfileId();
        if (!pid) return;

        const batch = await drainQueue(25);
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
          // eslint-disable-next-line no-console
          console.warn('[pref-capture] insert failed:', error.message);
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

  return useCallback(async (payload: {
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
      context: payload.context,
      decision: { action: payload.decision, rtMs: payload.rtMs },
    });
  }, []);
}