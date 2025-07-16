import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface UpdatePlanData {
  id: string
  title?: string
  description?: string
  start_time?: string
  end_time?: string
  planned_at?: string
  status?: string
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePlanData) => {
      const { data, error } = await supabase
        .from('floq_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plan', data.id] })
      queryClient.invalidateQueries({ queryKey: ['plan-stops', data.id] })
      toast({
        title: 'Plan updated',
        description: 'Your plan has been updated successfully.',
      })
    },
    onError: (error) => {
      console.error('Failed to update plan:', error)
      toast({
        title: 'Failed to update plan',
        description: 'There was an error updating your plan. Please try again.',
        variant: 'destructive',
      })
    },
  })
}