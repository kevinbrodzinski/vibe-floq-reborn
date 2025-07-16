import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

// Hook to get check-in status for a specific stop
export function useCheckInStatus(planId: string, stopId: string) {
  return useQuery({
    queryKey: ['check-in-status', planId, stopId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('plan_check_ins')
        .select('*')
        .eq('plan_id', planId)
        .eq('stop_id', stopId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching check-in status:', error)
        throw error
      }

      return data
    },
    enabled: !!planId && !!stopId,
  })
}

// Hook to get all check-ins for a plan (for LivePlanTracker)
export function usePlanCheckIns(planId: string) {
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

// Hook to handle check-in/check-out mutations
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
        // Check out - delete record
        const { error } = await supabase
          .from('plan_check_ins')
          .delete()
          .eq('plan_id', planId)
          .eq('stop_id', stopId)
          .eq('user_id', user.id)

        if (error) throw error
        return { action: 'checked_out' }
      } else {
        // Check in - insert record
        const { error } = await supabase
          .from('plan_check_ins')
          .insert({
            plan_id: planId,
            stop_id: stopId,
            user_id: user.id,
            checked_in_at: new Date().toISOString(),
          })

        if (error) throw error
        return { action: 'checked_in' }
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
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