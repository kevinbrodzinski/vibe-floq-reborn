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
  
  // Use the new bulk function with the enum array
  const { error } = await supabase.rpc('set_live_share_bulk', {
    _friend_ids: memberIds,
    _on: true,
    _auto_when: ['in_floq'] as any  // Cast to avoid TS enum issues
  });

  if (error) {
    console.error('Failed to enable live share for floq:', error);
    throw error;
  }
}; 