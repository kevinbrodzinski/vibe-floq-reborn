import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface CreatePlanPayload {
  title: string
  description?: string
  vibe_tag?: string
  start: string
  end: string
  duration_hours: number
  invitedUserIds: string[]
}

export function useCreatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreatePlanPayload): Promise<string> => {
      // First create a temporary floq to attach the plan to
      const { data: floqData, error: floqError } = await supabase
        .from('floqs')
        .insert({
          title: payload.title,
          description: payload.description,
          primary_vibe: payload.vibe_tag?.toLowerCase().trim() || 'chill',
          visibility: 'private',
          location: 'POINT(0 0)', // Default location
          flock_type: 'momentary'
        })
        .select('id')
        .single()

      if (floqError) throw floqError

      // Calculate planned_at from start time (today + start time)
      const today = new Date()
      const [hours, minutes] = payload.start.split(':').map(Number)
      const planned_at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)

      // Create the plan
      const { data: planData, error: planError } = await supabase
        .from('floq_plans')
        .insert({
          floq_id: floqData.id,
          title: payload.title,
          description: payload.description,
          vibe_tag: payload.vibe_tag?.toLowerCase().trim() ?? 'adventure',
          planned_at: planned_at.toISOString(),
          start_time: payload.start,
          end_time: payload.end,
          duration_hours: payload.duration_hours,
          status: 'draft'
        })
        .select('id')
        .single()

      if (planError) throw planError

      // Add current user as plan participant
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('User not authenticated')
      
      const { error: participantError } = await supabase
        .from('plan_participants')
        .insert({
          plan_id: planData.id,
          user_id: user.id
        })

      if (participantError) throw participantError

      return planData.id
    },
    onSuccess: (planId) => {
      toast.success('Plan created successfully!')
      queryClient.invalidateQueries({ queryKey: ['user-plans'] })
    },
    onError: (error) => {
      console.error('Failed to create plan:', error)
      toast.error('Failed to create plan. Please try again.')
    }
  })
}