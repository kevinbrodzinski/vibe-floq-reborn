// src/lib/api/constellationClient.ts
import { supabase } from '@/integrations/supabase/client';

export type ConstellationNode = { id: string; pos: [number, number]; mass: number; vibe: string };
export type ConstellationEdge = { a: string; b: string; strength: number; lastSync?: string };
export type ConstellationResp = { nodes: ConstellationNode[]; edges: ConstellationEdge[]; ttlSec: number };

export async function fetchConstellation(input: {
  party: { id: string; mass?: number; vibe?: string }[];
  edges?: ConstellationEdge[];
  seed?: string;
}): Promise<ConstellationResp> {
  const { data, error } = await supabase.functions.invoke<ConstellationResp>('constellation', { body: input });
  if (error) throw error;
  return data!;
}