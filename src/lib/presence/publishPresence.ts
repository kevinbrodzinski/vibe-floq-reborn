import { supabase } from '@/integrations/supabase/client';

export async function publishPresence(
  lat: number,
  lng: number,
  vibe: 'social' | 'chill' | 'hype' | 'curious' | 'solo' | 'romantic' | 'weird' | 'down' | 'flowing' | 'open',
  visibility: 'public' | 'friends' = 'public',
) {
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[publishPresence] User not authenticated');
    throw new Error('User must be authenticated to update presence');
  }

  // Validate parameters
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    console.error('[publishPresence] Invalid latitude:', lat);
    throw new Error('Invalid latitude provided');
  }
  
  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
    console.error('[publishPresence] Invalid longitude:', lng);
    throw new Error('Invalid longitude provided');
  }
  
  if (!vibe || typeof vibe !== 'string') {
    console.error('[publishPresence] Invalid vibe:', vibe);
    throw new Error('Vibe must be a non-empty string');
  }
  
  if (!['public', 'friends'].includes(visibility)) {
    console.error('[publishPresence] Invalid visibility:', visibility);
    throw new Error('Visibility must be either "public" or "friends"');
  }

  // Log parameters being sent
  console.log('[publishPresence] Calling upsert_presence with:', {
    user_id: user.id,
    p_venue_id: null,
    p_lat: lat,
    p_lng: lng,
    p_vibe: vibe,
    p_visibility: visibility,
  });

  const { error } = await supabase.rpc('upsert_presence', {
    p_venue_id: null,
    p_lat: lat,
    p_lng: lng,
    p_vibe: vibe,
    p_visibility: visibility,
  } as any);

  if (error) {
    console.error('[publishPresence] RPC error:', error);
    // TODO: add exponential back-off + Sentry breadcrumb
    throw error;
  }

  console.log('[publishPresence] Successfully updated presence');
}