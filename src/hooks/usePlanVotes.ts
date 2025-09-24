import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface PlanVote {
  id: string
  plan_id: string
  stop_id: string
  user_id: string | null
  guest_name: string | null
  vote_type: string
  emoji_reaction: string | null
  created_at: string
  stop?: {
    title: string
  }
  user?: {
    display_name: string | null
    username: string | null
    avatar_url: string | null
  }
}

export function usePlanVotes(plan_id: string) {
  return useQuery({
    queryKey: ['plan-votes', plan_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_votes')
        .select(`
          *,
          stop:plan_stops!inner(title),
          user:profiles!profile_id(display_name, username, avatar_url)
        `)
        .eq('plan_id', plan_id as any)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Plan votes fetch error:', error)
        throw error
      }
      
      return (data || []) as unknown as PlanVote[]
    },
    enabled: !!plan_id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}