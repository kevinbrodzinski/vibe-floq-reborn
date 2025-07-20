
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'

interface CreatePlanStopPayload {
  plan_id: string
  title: string
  description?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  venue_id?: string | null
  estimated_cost_per_person?: number | null
}

export function useCreatePlanStop() {
  const session = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreatePlanStopPayload) => {
      if (!session?.user) {
        const guestId = localStorage.getItem('guest_participant_id')
        if (!guestId) throw new Error('Not authenticated')
      }

      // Get current count first
      const { count } = await supabase
        .from('plan_stops')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', payload.plan_id)

      const { data, error } = await supabase
        .from('plan_stops')
        .insert({
          plan_id: payload.plan_id,
          created_by: session?.user?.id || localStorage.getItem('guest_participant_id'),
          title: payload.title,
          description: payload.description || '',
          start_time: payload.start_time || '19:00',
          end_time: payload.end_time || '20:00',
          duration_minutes: payload.duration_minutes || 60,
          venue_id: payload.venue_id,
          estimated_cost_per_person: payload.estimated_cost_per_person,
          stop_order: (count || 0) + 1,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
    },
  })
}
