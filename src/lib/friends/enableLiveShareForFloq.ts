import { supabase } from '@/integrations/supabase/client';

export const enableLiveShareForFloq = async (floqId: string) => {
  // 1. get all member IDs
  const { data: members } = await supabase
    .from('floq_participants')
    .select('user_id')
    .eq('floq_id', floqId);

  if (!members) return;

  // 2. bulk upsert share-on rows using the new RPC
  const memberIds = members.map(m => m.user_id).filter(Boolean);
  await supabase.rpc('set_live_share_bulk', {
    _friend_ids: memberIds.join(','), // Convert array to comma-separated string
    _on: true,
    _auto_when: ['floq']
  });
}; 