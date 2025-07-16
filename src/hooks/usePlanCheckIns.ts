import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useEffect } from 'react'

export function usePlanCheckIns(planId: string) {
  const queryClient = useQueryClient()

  // Set up real-time subscription for plan check-ins
  useEffect(() => {
    if (!planId) return

    const channel = supabase
      .channel('plan-check-ins-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_check_ins',
          filter: `plan_id=eq.${planId}`,
        },
        () => {
          // Invalidate and refetch when check-ins change
          queryClient.invalidateQueries({ queryKey: ['plan-check-ins', planId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [planId, queryClient])

  return useQuery({
    queryKey: ['plan-check-ins', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_check_ins')
        .select(`
          *,
          profiles(display_name, avatar_url)
        `)
        .eq('plan_id', planId)
        .order('checked_in_at', { ascending: false })

      if (error) {
        console.error('Error fetching plan check-ins:', error)
        throw error
      }

      return data || []
    },
    enabled: !!planId,
  })
}