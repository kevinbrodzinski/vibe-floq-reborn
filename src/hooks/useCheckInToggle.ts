import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

// Get device info for future-proofing
function getDeviceInfo() {
  return {
    device_id: navigator.userAgent,
    user_agent: navigator.userAgent
  }
}

export function useCheckInToggle() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ 
      planId, 
      stopId, 
      isCheckedIn 
    }: { 
      planId: string
      stopId: string
      isCheckedIn: boolean 
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      if (isCheckedIn) {
        // Check out - update record with checkout time
        const { error } = await supabase
          .from('plan_check_ins')
          .update({ 
            checked_out_at: new Date().toISOString()
          })
          .eq('plan_id', planId)
          .eq('stop_id', stopId)
          .eq('participant_id', user.id)

        if (error) throw error

        // Log activity
        await supabase.from('plan_activities').insert({
          plan_id: planId,
          profile_id: user.id,
          activity_type: 'check_out',
          entity_id: stopId,
          entity_type: 'stop',
          metadata: { device: getDeviceInfo().device_id }
        })

        return { action: 'checked_out' }
      } else {
        // Check in - insert record with device info
        const { error } = await supabase
          .from('plan_check_ins')
          .insert({
            plan_id: planId,
            stop_id: stopId,
            participant_id: user.id,
            checked_in_at: new Date().toISOString(),
            device_id: getDeviceInfo().device_id,
          })

        if (error) throw error

        // Log activity
        await supabase.from('plan_activities').insert({
          plan_id: planId,
          profile_id: user.id,
          activity_type: 'check_in',
          entity_id: stopId,
          entity_type: 'stop',
          metadata: { device: getDeviceInfo().device_id }
        })

        return { action: 'checked_in' }
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries for real-time sync
      queryClient.invalidateQueries({ queryKey: ['check-in-status', variables.planId, variables.stopId] })
      queryClient.invalidateQueries({ queryKey: ['plan-check-ins', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-activities', variables.planId] })

      // Show success toast
      toast({
        title: data.action === 'checked_in' ? "Checked In!" : "Checked Out",
        description: data.action === 'checked_in' 
          ? "You've successfully checked in to this stop."
          : "You've checked out of this stop.",
      })
    },
    onError: (error) => {
      console.error('Check-in error:', error)
      toast({
        title: "Error",
        description: "Failed to update check-in status. Please try again.",
        variant: "destructive",
      })
    },
  })
}