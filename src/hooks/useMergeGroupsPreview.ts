import { predictabilityGate } from '@/core/group/predictability';
import { edgeLog } from '@/lib/edgeLog';
import { rankTimeGate } from '@/core/privacy/RankTimeGate';
import { supabase } from '@/integrations/supabase/client';

export function useMergeGroupsPreview() {
  async function previewMerge(a: number[][], b: number[][]) {
    const gp = predictabilityGate([...a, ...b]);
    edgeLog('merge_preview', { 
      spread: gp.spread, 
      gain: gp.gain, 
      ok: gp.ok, 
      fallback: gp.fallback ?? null 
    });
    return gp;
  }

  async function broadcastMergeProposal(mergeId: string, payload: { 
    aId: string; 
    bId: string; 
    when: number 
  }) {
    const gate = rankTimeGate({ 
      envelopeId: 'balanced', 
      featureTimestamps: [Date.now()], 
      cohortSize: 10, 
      epsilonCost: 0.01 
    });
    
    if (!gate.ok) { 
      edgeLog('merge_blocked_gate', { reason: (gate as any).reason }); 
      return { ok: false }; 
    }
    
    await supabase.channel(`merge:${mergeId}`).subscribe();
    await supabase.channel(`merge:${mergeId}`).send({ 
      type: 'broadcast', 
      event: 'merge_proposal', 
      payload 
    });
    
    edgeLog('merge_proposal', { 
      mergeId, 
      degrade: gate.degrade 
    });
    
    return { ok: true };
  }

  return { previewMerge, broadcastMergeProposal };
}