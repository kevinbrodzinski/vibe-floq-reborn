import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useSession } from '@/hooks/useSession'
import { format } from 'date-fns'
import { parse } from 'date-fns/fp'
import { to24h } from '@/utils/parseLocalTime'

/** Convert ISO to hh:mm:ss for Postgres TIME columns */
const isoToPgTime = (iso: string) => iso.slice(11, 19)  // '2025-07-17T07:00:00.000Z' -> '07:00:00'


interface CreatePlanPayload {
  title: string
  description?: string
  vibe_tag?: string
  start: string
  end: string
  duration_hours: number
  invitedUserIds: string[]
  floqId?: string | null // Optional floq to link the plan to
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  const session = useSession()

  return useMutation({
    mutationFn: async (payload: CreatePlanPayload) => {
      if (!session?.user) throw new Error('not-signed-in')
      
      // Map vibe_tag to valid enum value
      const validVibes = ['social', 'chill', 'hype', 'curious', 'solo', 'romantic', 'weird', 'down', 'flowing', 'open'] as const
      const primaryVibe = validVibes.includes(payload.vibe_tag?.toLowerCase() as any) 
        ? payload.vibe_tag.toLowerCase() as typeof validVibes[number]
        : 'chill'

      // Only create a floq if not linking to an existing one
      let floqId = payload.floqId;
      
      if (!floqId) {
        // Create a temporary floq to attach the plan to (for legacy compatibility)
        const { data: floqData, error: floqError } = await supabase
          .from('floqs')
          .insert({
            title: payload.title,
            description: payload.description,
            primary_vibe: primaryVibe,
            visibility: 'private',
            location: 'POINT(0 0)', // Default location
            flock_type: 'momentary',
            creator_id: session.user.id
          })
          .select('id')
          .single()

        if (floqError) throw floqError
        floqId = floqData.id;
      }

      // Convert 12-hour time to ISO strings
      const today = new Date().toISOString().slice(0, 10)
      const startISO = new Date(`${today}T${to24h(payload.start)}:00Z`).toISOString()
      const endISO = new Date(`${today}T${to24h(payload.end)}:00Z`).toISOString()

      // Create the plan
      const { data: planData, error: planError } = await supabase
        .from('floq_plans')
        .insert({
          floq_id: floqId,
          title: payload.title,
          description: payload.description,
          vibe_tag: payload.vibe_tag?.toLowerCase().trim() || 'chill',
          planned_at: startISO,
          start_time: isoToPgTime(startISO),
          end_time: isoToPgTime(endISO),
          creator_id: session.user.id,
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

      // Send invitations if there are any
      if (payload.invitedUserIds && payload.invitedUserIds.length > 0) {
        const { error: inviteError } = await supabase.rpc('invite_friends', {
          p_plan_id: planData.id,
          p_user_ids: payload.invitedUserIds
        })

        if (inviteError) {
          console.error('Failed to send invitations:', inviteError)
          // Don't throw here - plan was created successfully, just invites failed
          toast.error('Plan created but failed to send some invitations')
        }
      }

      // Log activity if plan is linked to a floq
      if (floqId) {
        try {
          await supabase.from('floq_activity').insert({
            floq_id: floqId,
            plan_id: planData.id,
            user_id: session.user.id,
            kind: 'created',
            content: payload.title
          });
        } catch (activityError) {
          console.warn('Failed to log activity:', activityError);
        }
      }

      return planData
    },
    onSuccess: (planData) => {
      toast.success('Plan created successfully!')
      queryClient.invalidateQueries({ queryKey: ['user-plans'] })
    },
    onError: (error) => {
      console.error('Failed to create plan:', error)
      toast.error('Failed to create plan. Please try again.')
    }
  })
}
