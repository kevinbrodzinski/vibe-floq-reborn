import { supabase } from '@/integrations/supabase/client'

/**
 * Ensures that required presence/status rows exist for a user profile
 * Call this after sign-up/login to prevent 406 errors from missing rows
 */
export async function ensurePresence(profile_id: string) {
  try {
    await supabase.rpc('upsert_presence', {
      p_lat: 0,
      p_lng: 0,
      p_vibe: 'chill',
      p_visibility: 'public'
    });
  } catch (error) {
    console.warn('[ensurePresence] Failed to ensure presence row:', error);
    // Don't throw - this is a "nice to have" operation
  }
}

/**
 * Ensures presence for the current authenticated user
 */
export async function ensureCurrentUserPresence() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await ensurePresence(user.id);
  }
}