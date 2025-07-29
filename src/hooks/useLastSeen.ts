import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLastSeen(profileId:string){
  const { data } = useQuery({
    queryKey:['last-seen',profileId],
    queryFn: async ()=>{
      const { data, error } = await supabase
        .from('v_friend_last_seen')
        .select('last_seen_at')
        .eq('profile_id', profileId)
        .maybeSingle();
      if(error) throw error;
      return data?.last_seen_at as string|undefined;
    },
    refetchInterval:30_000
  });
  return data; // ISO timestamp | undefined
}