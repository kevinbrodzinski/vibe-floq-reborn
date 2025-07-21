import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { RSVPStatus } from '@/types/enums/rsvpStatus'

interface RSVPUpdateData {
  planId: string
  status: RSVPStatus
  notes?: string
}

export function usePlanRSVP() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ planId, status, notes }: RSVPUpdateData) => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Authentication required')
      }

      if (status === 'not_attending') {
        // Remove participant when declining
        const { error } = await supabase
          .from('plan_participants')
          .delete()
          .eq('plan_id', planId)
          .eq('user_id', user.id)

        if (error) throw error
        return { action: 'removed' }
      } else {
        // Update or insert participant
        const { data, error } = await supabase
          .from('plan_participants')
          .upsert(
            {
              plan_id: planId,
              user_id: user.id,
              is_guest: false,
              role: 'participant',
              rsvp_status: status,
              notes: notes || null,
              responded_at: new Date().toISOString(),
            },
            { 
              onConflict: 'plan_id,user_id',
              ignoreDuplicates: false 
            }
          )
          .select()
          .single()

        if (error) throw error
        return { action: 'updated', data }
      }
    },
    onSuccess: (_, { planId, status }) => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] })
      
      const statusLabels = {
        attending: 'Going',
        maybe: 'Maybe',
        not_attending: 'Not Going',
        pending: 'Pending'
      }

      toast({
        title: "RSVP Updated",
        description: `You're now marked as "${statusLabels[status] || status}"`,
      })
    },
    onError: (error) => {
      console.error('RSVP update error:', error)
      toast({
        title: "Failed to update RSVP",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}