import { supabase } from '@/integrations/supabase/client';

export async function typedRpc<Ret>(
  fn: any,
  args: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Ret> {
  const { data, error } = await supabase.rpc(fn, args as any);
  if (error) throw error;
  return data as Ret;
}