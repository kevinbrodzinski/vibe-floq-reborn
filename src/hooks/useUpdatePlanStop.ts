import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface UpdatePlanStopData {
  id: string
  plan_id: string
  title?: string
  description?: string
  start_time?: string
  end_time?: string
  stop_order?: number
  estimated_cost_per_person?: number
}

export function useUpdatePlanStop() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, plan_id, ...updates }: UpdatePlanStopData) => {
      const { data, error } = await supabase
        .from('plan_stops')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
    },
    onError: (error) => {
      console.error('Failed to update stop:', error)
      toast({
        title: 'Failed to update stop',
        description: 'There was an error updating your stop. Please try again.',
        variant: 'destructive',
      })
    },
  })
}