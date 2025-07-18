import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useUserBoostStatus(floqId: string) {
  return useQuery({
    queryKey: ['user-boost-status', floqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_boosts')
        .select('*')
        .eq('floq_id', floqId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle()

      if (error) throw error
      return { userHasBoosted: !!data }
    }
  })
}