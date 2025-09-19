import { useCallback, useEffect, useRef } from 'react';
import { saveSignal, drainQueue } from '@/core/preferences/PreferenceSignals';
import { rankTimeGate } from '@/core/privacy/RankTimeGate';
import { supabase } from '@/integrations/supabase/client';

export function useRecommendationCapture(envelope: 'strict' | 'balanced' | 'permissive' = 'balanced') {
  const draining = useRef(false);

  // Background drain (polite)
  useEffect(() => {
    const id = setInterval(async () => {
      if (draining.current) return;
      draining.current = true;
      try {
        const gate = rankTimeGate({ 
          envelopeId: envelope, 
          featureTimestamps: [Date.now()], 
          epsilonCost: 0.01 
        });
        if (!gate.ok) return;
        
        const batch = await drainQueue(25);
        for (const s of batch) {
          const { error } = await supabase.rpc('record_preference_signal', {
            p_signal: s as any,
            p_ts: new Date(s.ts).toISOString(),
          });
          if (error) console.warn('Failed to drain preference signal:', error);
        }
      } catch (error) {
        console.warn('Error draining signals:', error);
      } finally { 
        draining.current = false; 
      }
    }, 15_000);
    
    return () => clearInterval(id);
  }, [envelope]);

  return useCallback(async (payload: {
    offer: { id: string; type: string; predictedEnergy?: number; distance?: number };
    vibe: { v: number; dvdt: number; momentum: number };
    decision: 'accept' | 'decline' | 'modify' | 'delay';
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