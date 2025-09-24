import { supabase } from '@/integrations/supabase/client';

export type ConstellationEdge = { a: string; b: string; strength: number; lastSync?: string };
export type ConstellationEdgesResp = { edges: ConstellationEdge[]; ttlSec: number };

export async function fetchConstellationEdges(windowDays = 30): Promise<ConstellationEdgesResp> {
  const { data, error } = await supabase.functions.invoke<ConstellationEdgesResp>('constellation-edges', { body: { windowDays } });
  if (error) throw error;
  return data!;
}