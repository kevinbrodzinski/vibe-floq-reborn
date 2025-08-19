// src/hooks/useMyLiveFloqs.ts
import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type MyFloq = {
  id: string;
  name: string | null;
  status: 'live' | 'ending' | 'ended' | 'cancelled';
  ends_at: string | null;
  is_creator: boolean;
  participants: number;
};

export function useMyLiveFloqs(client: SupabaseClient) {
  const [data, setData] = useState<MyFloq[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<Error | null>(null);

  async function fetchOnce() {
    setLoading(true);
    setErr(null);
    const { data, error } = await client.rpc('rpc_my_live_floqs');
    if (error) setErr(new Error(error.message));
    setData((data ?? null) as MyFloq[] | null);
    setLoading(false);
  }

  useEffect(() => { fetchOnce(); }, [client]);

  return { data, loading, error, refetch: fetchOnce };
}