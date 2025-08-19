import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export async function upsertPresence({
  profile_id,
  venue_id,          // uuid | null
  vibe,              // Database['public']['Enums']['vibe_enum'] | null
  point              // { lat: number, lng: number } | null
}: {
  profile_id: string;
  venue_id?: string | null;
  vibe?: Database['public']['Enums']['vibe_enum'] | null;
  point?: { lat: number, lng: number } | null;
}) {
  const location = point
    ? `SRID=4326;POINT(${point.lng} ${point.lat})`
    : null;

  // onConflict must match unique index (profile_id, venue_id)
  const { data, error } = await supabase
    .from('presence')
    .upsert(
      { profile_id, venue_id: venue_id || null, vibe: vibe || null, location },
      { onConflict: 'profile_id,venue_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}