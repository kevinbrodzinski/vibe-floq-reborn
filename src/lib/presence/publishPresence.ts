import { supabase } from '@/integrations/supabase/client';
import { Vibe } from '@/lib/vibes';

export type PresenceResult = { ok: boolean; reason?: string; retryAfterSec?: number };

export async function publishPresence(
  lat: number,
  lng: number,
  vibe: Vibe,
  visibility: 'public' | 'friends' = 'public',
): Promise<PresenceResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('[publishPresence] not authenticated');
    return { ok:false, reason:'unauthorized' };
  }

  if (!Number.isFinite(lat) || lat < -90 || lat > 90)  return { ok:false, reason:'invalid_lat' };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { ok:false, reason:'invalid_lng' };

  const { data, error } = await supabase.functions.invoke('upsert-presence', {
    body: { lat, lng, vibe, visibility, venue_id: null }
  });

  if (error) {
    // Treat 429 like soft fail; caller will backoff
    const status = (error as any)?.status;
    if (status === 429) return { ok:false, reason:'rate_limit', retryAfterSec: 15 };
    console.warn('[publishPresence] edge error:', error);
    return { ok:false, reason:(error as any)?.message ?? 'edge_error' };
  }

  if (data?.ok === false) {
    return { ok:false, reason: data.reason, retryAfterSec: data.retryAfterSec };
  }

  return { ok:true };
}