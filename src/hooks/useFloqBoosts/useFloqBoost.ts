import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useFloqBoost() {
  return useMutation({
    mutationFn: async (floqId: string) => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')
      
      const { error } = await supabase.from('floq_boosts').insert({
        floq_id: floqId,
        boost_type: 'vibe',
        profile_id: user.user.id
      })
      if (error) throw error
    }
  })
}