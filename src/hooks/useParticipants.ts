import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ParticipantRow = { profile_id: string; role: string; joined_at: string };

export function useParticipants(floqId: string) {
  const [rows, setRows] = useState<ParticipantRow[]>([]);

  async function refresh() {
    const { data } = await supabase
      .from('floq_participants')
      .select('profile_id, role, joined_at')
      .eq('floq_id', floqId)
      .order('joined_at', { ascending: false });
    setRows((data ?? []) as ParticipantRow[]);
  }

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`participants-${floqId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'floq_participants', filter: `floq_id=eq.${floqId}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [floqId]);

  return rows;
}