import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Participant = { profile_id: string; role: string; joined_at: string };
export type ParticipantInfo = Participant & { display_name: string | null; avatar_url: string | null };

export function useParticipants(floqId: string) {
  const [rows, setRows] = useState<ParticipantInfo[]>([]);

  async function refresh() {
    const { data: parts } = await supabase
      .from('floq_participants')
      .select('profile_id, role, joined_at')
      .eq('floq_id', floqId)
      .order('joined_at', { ascending: false });
    const p = (parts ?? []) as Participant[];

    const ids = Array.from(new Set(p.map((r) => r.profile_id)));
    if (ids.length === 0) { setRows([]); return; }

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids);

    const byId = new Map((profs ?? []).map((r: any) => [r.id, r]));
    const merged: ParticipantInfo[] = p.map((r) => ({
      ...r,
      display_name: byId.get(r.profile_id)?.display_name ?? null,
      avatar_url: byId.get(r.profile_id)?.avatar_url ?? null,
    }));
    setRows(merged);
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