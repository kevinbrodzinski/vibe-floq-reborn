import { supabase } from '@/integrations/supabase/client';

export async function publishPresence(
  lat: number,
  lng: number,
  vibe: string,
  visibility: 'public' | 'friends' = 'public',
) {
  const { error } = await supabase.rpc('upsert_presence', {
    p_lat: lat,
    p_lng: lng,
    p_vibe: vibe,
    // @ts-expect-error - TODO: add p_visibility to RPC types
    p_visibility: visibility,
  });

  if (error) {
    // TODO: add exponential back-off + Sentry breadcrumb
    throw error;
  }
}