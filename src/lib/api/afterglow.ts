import { supabase } from '@/integrations/supabase/client';

export async function listRallyAfterglow(day?: string) {
  const { data, error } = await supabase.rpc('get_rally_afterglow_timeline', { _day: day ?? null });
  if (error) throw error;
  return data ?? [];
}

export async function finalizeRallyToAfterglow(rallyId: string) {
  const { data, error } = await supabase.functions.invoke('rally-finalize', { body: { rallyId } });
  if (error) throw error;
  return data;
}