import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MyLiveFloq = {
  id: string;
  name: string | null;
  status: 'live' | 'ending' | 'ended' | 'cancelled';
  ends_at: string | null;
  is_creator: boolean;
  participants: number;
};

export function useMyLiveFloqs() {
  const [data, setData] = useState<MyLiveFloq[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchOnce() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('rpc_my_live_floqs');
    if (error) setError(error.message);
    setData((data ?? null) as MyLiveFloq[] | null);
    setLoading(false);
  }

  useEffect(() => { fetchOnce(); }, []);

  return { data, loading, error, refetch: fetchOnce };
}