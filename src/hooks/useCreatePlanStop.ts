import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface CreatePlanStopData {
  plan_id: string
  title: string
  description?: string
  venue_id?: string
  start_time: string
  end_time: string
  estimated_cost_per_person?: number
}

export function useCreatePlanStop() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreatePlanStopData) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Not authenticated')

      const { data: result, error } = await supabase
        .from('plan_stops')
        .insert({
          ...data,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
      toast({
        title: 'Stop added',
        description: 'Your stop has been added to the timeline.',
      })
    },
    onError: (error) => {
      console.error('Failed to create stop:', error)
      toast({
        title: 'Failed to add stop',
        description: 'There was an error adding your stop. Please try again.',
        variant: 'destructive',
      })
    },
  })
}