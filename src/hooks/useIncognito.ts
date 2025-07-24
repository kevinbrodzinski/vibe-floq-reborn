import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useIncognito(uid: string) {
  return useQuery({
    queryKey: ['incog', uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_share_pref')
        .select('is_live, ends_at')
        .eq('user_id', uid).maybeSingle();
      if (error) throw error;
      if (!data) return { is_live: true };
      return data;
    },
    refetchInterval: 60_000,
  });
}