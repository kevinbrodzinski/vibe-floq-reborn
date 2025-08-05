import { SupabaseClient } from '@supabase/supabase-js'

export async function bulkAddToFloqs(
  floqIds: string[],
  userIds: string[],
  supabase: SupabaseClient
) {
  if (!floqIds.length || !userIds.length) return;

  const rows = floqIds.flatMap(floq_id =>
    userIds.map(user_id => ({ floq_id, user_id, role: 'member' as const }))
  );

  const { error } = await supabase
    .from('floq_participants')
    .upsert(rows); // Use upsert instead of insert with onConflict

  if (error) throw error;
}