import { rankTimeGate } from '@/core/privacy/RankTimeGate';

export type GateOpts = {
  envelopeId?: 'strict' | 'balanced' | 'permissive';
  featureTimestamps?: number[];
  cohortSize?: number;
  epsilonCost?: number;
};

export async function withGate<T>(
  fn: () => Promise<T>,
  opts: GateOpts = {}
): Promise<{ ok: boolean; degrade: 'full' | 'category' | 'binary' | 'suppress'; receiptId: string; data?: T; reason?: string }> {
  const g = rankTimeGate({
    envelopeId: opts.envelopeId ?? 'balanced',
    featureTimestamps: opts.featureTimestamps ?? [Date.now()],
    cohortSize: opts.cohortSize,
    epsilonCost: opts.epsilonCost ?? 0.0,
  });
  
  if (!g.ok) return { 
    ok: false, 
    degrade: g.degrade, 
    receiptId: g.receiptId, 
    reason: (g as any).reason 
  };
  
  const data = await fn();
  return { 
    ok: true, 
    degrade: g.degrade, 
    receiptId: g.receiptId, 
    data 
  };
}