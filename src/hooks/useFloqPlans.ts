import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useEffect } from 'react'

export function useFloqPlans(floqId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['floq-plans', floqId],
    queryFn: async () => {
      if (!floqId) return []
      
      const { data, error } = await supabase
        .from('floq_plans')
        .select(`
          *,
          plan_participants(count)
        `)
        .eq('floq_id', floqId)
        .order('planned_at', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!floqId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Subscribe to real-time updates
  useEffect(() => {
    if (!floqId) return

    const channel = supabase
      .channel(`floq-plans-${floqId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_plans',
          filter: `floq_id=eq.${floqId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['floq-plans', floqId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [floqId, queryClient])

  return query
}