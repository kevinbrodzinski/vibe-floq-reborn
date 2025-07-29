import { supabase } from '@/integrations/supabase/client';

export const enableLiveShareForFloq = async (floqId: string) => {
  // 1. get all member IDs
  const { data: members } = await supabase
    .from('floq_participants')
    .select('profile_id')
    .eq('floq_id', floqId);

  if (!members) return;

  // 2. bulk upsert share-on rows using the new RPC
  const memberIds = members.map(m => (m as any).profile_id).filter(Boolean);
  
  // Handle each member ID individually since RPC expects single ID
  await Promise.all(memberIds.map(id => 
    supabase.rpc('set_live_share_bulk' as any, {
      p_friend_id: id,
      _on: true,
      _auto_when: ['floq']
    })
  ));
}; 