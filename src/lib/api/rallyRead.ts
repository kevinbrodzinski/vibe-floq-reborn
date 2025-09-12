import { supabase } from '@/integrations/supabase/client';

export async function markRallyRead(rallyId: string) {
  try {
    const { error } = await supabase.rpc('rally_mark_seen', { _rally_id: rallyId });
    if (error) throw error;
    return;
  } catch {
    const { data: user } = await supabase.auth.getUser();
    const me = user.user?.id;
    if (!me) return;
    const when = new Date().toISOString();
    const { error } = await supabase
      .from('rally_last_seen')
      .upsert({ profile_id: me, rally_id: rallyId, last_seen_at: when }, { onConflict: 'profile_id,rally_id' });
    if (error) throw error;
  }
}

export async function markAllRalliesRead() {
  try {
    const { error } = await supabase.rpc('rally_mark_all_seen');
    if (error) throw error;
    return;
  } catch {
    const { data: user } = await supabase.auth.getUser();
    const me = user.user?.id;
    if (!me) return;
    try {
      const { data } = await supabase.rpc('get_rally_inbox');
      const rows = (data ?? []).map((x: any) => ({
        profile_id: me,
        rally_id: x.rally_id,
        last_seen_at: new Date().toISOString(),
      }));
      if (!rows.length) return;
      const { error } = await supabase.from('rally_last_seen').upsert(rows, { onConflict: 'profile_id,rally_id' });
      if (error) throw error;
    } catch {
      /* final silent fallback */
    }
  }
}

export async function setRallyLastSeen(rallyId: string, ts?: string) {
  const when = ts ?? new Date().toISOString();
  const { data: user } = await supabase.auth.getUser();
  const me = user.user?.id;
  if (!me) return;
  const { error } = await supabase
    .from('rally_last_seen')
    .upsert({ profile_id: me, rally_id: rallyId, last_seen_at: when }, { onConflict: 'profile_id,rally_id' });
  if (error) throw error;
}

export async function markRallyThreadSeen(threadId: string) {
  try {
    const { data: thread } = await supabase.from('rally_threads').select('rally_id').eq('id', threadId).maybeSingle();
    if (!thread?.rally_id) return;
    await setRallyLastSeen(thread.rally_id);
  } catch { /* no-op */ }
}