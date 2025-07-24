import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLastSeen(userId:string){
  const { data } = useQuery({
    queryKey:['last-seen',userId],
    queryFn: async ()=>{
      const { data, error } = await supabase
        .from('v_friend_last_seen')
        .select('last_seen_at')
        .eq('user_id', userId)
        .maybeSingle();
      if(error) throw error;
      return data?.last_seen_at as string|undefined;
    },
    refetchInterval:30_000
  });
  return data; // ISO timestamp | undefined
}