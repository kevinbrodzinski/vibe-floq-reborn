import { supabase } from '@/integrations/supabase/client';

export async function markRallyRead(rallyId: string) {
  const { data: user } = await supabase.auth.getUser();
  const me = user.user?.id;
  if (!me) throw new Error('not authenticated');
  
  const when = new Date().toISOString();
  const { error } = await supabase
    .from('rally_last_seen')
    .upsert({ profile_id: me, rally_id: rallyId, last_seen_at: when }, { onConflict: 'profile_id,rally_id' });
  if (error) throw error;
}

export async function markAllRalliesRead() {
  try {
    const { error } = await supabase.rpc('rally_mark_all_seen');
    if (error) throw error;
    return;
  } catch {
    // Fallback: derive rallies and upsert in bulk
    const { data: auth } = await supabase.auth.getUser();
    const me = auth?.user?.id;
    if (!me) return;

    try {
      const { data: inbox } = await supabase.rpc('get_rally_inbox');
      const rows = (inbox ?? []).map((x: any) => ({
        profile_id: me,
        rally_id: x.rally_id,
        last_seen_at: new Date().toISOString(),
      }));
      if (!rows.length) return;

      const { error } = await supabase.from('rally_last_seen')
        .upsert(rows, { onConflict: 'profile_id,rally_id' });
      if (error) throw error;
    } catch {
      console.warn('Mark all read fallback failed');
    }
  }
}