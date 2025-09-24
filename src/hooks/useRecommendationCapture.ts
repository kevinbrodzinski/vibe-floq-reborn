import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import { storage } from '@/lib/storage';
import { rankTimeGate } from '@/core/privacy/RankTimeGate';
import { edgeLog } from '@/lib/edgeLog';

type PlanContext = {
  planId?: string;
  participantsCount?: number;
  predictability?: { spread:number; gain:number; ok:boolean; fallback?: 'partition'|'relax_constraints'|null };
};

type VibeSnapshot = { v: number; dvdt: number; momentum: number; ts: number };
type VenueOffer   = { id: string; type: string; predictedEnergy?: number; distance?: number };

export type PreferenceSignal = {
  id: string;
  ts: number;
  vibe: VibeSnapshot;
  offer: VenueOffer;
  context: { dow:number; tod:number; weather?:string };
  decision: { action:'accept'|'decline'|'modify'|'delay'; rtMs:number };
  outcome?: { satisfaction?: number; wouldRepeat?: boolean };
  plan?: PlanContext;
};

const KEY = 'pref:signals:v1';
const EXTRA_KEY = 'pref:signals:extra:v1';

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
async function getAuthProfileId(): Promise<string|null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null; // profiles.id === auth.uid()
}
function chunkRowsBySize<T>(rows: T[], maxChars=180_000) {
  const out:T[][]=[]; let cur:T[]=[]; let size=0;
  for (const r of rows) {
    const add = JSON.stringify(r).length;
    if (size+add>maxChars && cur.length){ out.push(cur); cur=[]; size=0; }
    cur.push(r); size+=add;
  }
  if (cur.length) out.push(cur);
  return out;
}
function isProbablyOnline(){ try{ if('onLine' in navigator) return (navigator as any).onLine!==false }catch{} return true }

export function useRecommendationCapture(envelope: 'strict'|'balanced'|'permissive'='balanced') {
  const draining = useRef(false);
  const [profileId, setProfileId] = useState<string|null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const drainNowRef = useRef<(reason:'interval'|'foreground'|'visibility'|'manual')=>Promise<void>>();
  const extraPlanRef = useRef<PlanContext|null>(null);

  useEffect(() => { let mounted=true;
    getAuthProfileId().then(pid=>{ if(mounted) setProfileId(pid) });
    return ()=>{ mounted=false };
  }, []);

  useEffect(() => { let mounted=true;
    async function tick(reason:'interval'|'foreground'|'visibility'|'manual'){
      if(!mounted || draining.current) return;
      draining.current = true;
      try{
        if(!isProbablyOnline()){ schedule(45_000,'offline'); edgeLog('pref_drain_offline',{reason}); return; }

        const gate = rankTimeGate({ envelopeId:envelope, featureTimestamps:[Date.now()], epsilonCost:0.01 });
        if(!gate.ok){ schedule(45_000,'gate_suppress'); return; }

        const pid = profileId ?? await getAuthProfileId();
        if(!pid){ schedule(30_000,'no_profile'); return; }

        const batch = await drainQueue(25);
        edgeLog('pref_drain',{reason,count:batch.length,degrade:gate.degrade,receiptId:gate.receiptId});
        if(!batch.length){ schedule(45_000,'empty'); return; }

        if(!extraPlanRef.current){
          const raw = await storage.getItem(EXTRA_KEY);
          extraPlanRef.current = raw ? JSON.parse(raw) as PlanContext : null;
        }
        const rows = batch.map(s=>({
          profile_id: pid,
          ts: new Date(s.ts).toISOString(),
          signal: { ...s, plan: s.plan ?? extraPlanRef.current ?? undefined } as any,
        }));

        for(const chunk of chunkRowsBySize(rows, 180_000)){
          const { error } = await supabase.from('preference_signals').insert(chunk);
          if(error){
            const existing = JSON.parse((await storage.getItem(KEY)) ?? '[]');
            const toRestore = chunk.map((r:any)=> r.signal);
            await storage.setItem(KEY, JSON.stringify([...toRestore, ...existing].slice(-500)));
            const backoff = 10_000 + Math.floor(Math.random()*1_000);
            edgeLog('pref_drain_backoff',{ backoffMs: backoff, code:(error as any).code });
            schedule(backoff,'insert_error');
            return;
          }
        }
        schedule(batch.length>=25 ? 10_000 : 30_000,'success');
      } finally { draining.current=false; }
    }
    function schedule(ms:number, reason:string){
      edgeLog('pref_drain_schedule',{ nextDelayMs:ms, reason });
      if(timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(()=>tick('interval'), ms);
    }
    schedule(15_000,'init');

    const sub = AppState.addEventListener('change', s => { if(s==='active') drainNowRef.current?.('foreground') });
    const visHandler = () => { if(document?.visibilityState==='visible') drainNowRef.current?.('visibility') };
    document?.addEventListener?.('visibilitychange', visHandler);
    drainNowRef.current = tick;

    return () => {
      mounted=false;
      if(timer.current) clearTimeout(timer.current);
      sub?.remove?.();
      document?.removeEventListener?.('visibilitychange', visHandler);
    };
  }, [envelope, profileId]);

  const capture = useCallback(async (payload:{
    offer:{ id:string; type:string; predictedEnergy?:number; distance?:number };
    vibe:{ v:number; dvdt:number; momentum:number };
    decision:'accept'|'decline'|'modify'|'delay';
    rtMs:number;
    context:{ dow:number; tod:number; weather?:string };
    plan?: PlanContext;
  })=>{
    const id = `${payload.offer.id}:${Date.now()}`;
    await saveSignal({
      id, ts: Date.now(),
      vibe: { ...payload.vibe, ts: Date.now() },
      offer: payload.offer,
      context: payload.context,
      decision: { action: payload.decision, rtMs: payload.rtMs },
      plan: payload.plan,
    });
    edgeLog('pref_saved',{ offerId: payload.offer.id, decision: payload.decision, planId: payload.plan?.planId });
  },[]);

  (capture as any).flushNow = async () => { await drainNowRef.current?.('manual'); };
  (capture as any).setPlanContext = async (ctx: PlanContext) => {
    extraPlanRef.current = ctx ?? null;
    await storage.setItem(EXTRA_KEY, JSON.stringify(ctx ?? null));
    edgeLog('pref_context_set',{ planId: ctx?.planId, participantsCount: ctx?.participantsCount });
  };

  return capture as typeof capture & { flushNow: () => Promise<void>; setPlanContext: (ctx: PlanContext) => Promise<void> };
}