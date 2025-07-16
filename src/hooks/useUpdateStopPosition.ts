import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface UpdateStopPositionParams {
  stopId: string
  planId: string
  startTime: string
  endTime?: string
  duration_minutes?: number
}

export function useUpdateStopPosition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      stopId, 
      planId, 
      startTime, 
      endTime, 
      duration_minutes 
    }: UpdateStopPositionParams) => {
      const updateData: any = {
        start_time: startTime,
        updated_at: new Date().toISOString()
      }

      if (endTime) {
        updateData.end_time = endTime
      }

      if (duration_minutes) {
        updateData.duration_minutes = duration_minutes
      }

      const { data, error } = await supabase
        .from('plan_stops')
        .update(updateData)
        .eq('id', stopId)
        .eq('plan_id', planId)
        .select()

      if (error) {
        console.error('Update stop position error:', error)
        throw error
      }

      return data?.[0]
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch stop data
      queryClient.invalidateQueries({ 
        queryKey: ['plan-stops', variables.planId] 
      })
      
      toast.success('Stop timing updated', {
        description: 'Changes saved successfully'
      })
    },
    onError: (error) => {
      console.error('Failed to update stop position:', error)
      toast.error('Failed to update stop', {
        description: 'Please try again or check for conflicts'
      })
    }
  })
}