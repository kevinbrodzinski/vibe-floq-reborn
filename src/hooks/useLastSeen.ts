import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLastSeen(profileId:string){
  const { data } = useQuery({
    queryKey:['last-seen',profileId],
    enabled: !!profileId, // Don't run if profileId is empty
    queryFn: async ()=>{
      const { data, error } = await supabase
        .from('v_friend_last_seen' as any)
        .select('last_seen_at')
        .eq('friend_id', profileId)
        .maybeSingle();
      if(error) throw error;
      return (data as any)?.last_seen_at as string|undefined;
    },
    refetchInterval:30_000
  });
  return data; // ISO timestamp | undefined
}