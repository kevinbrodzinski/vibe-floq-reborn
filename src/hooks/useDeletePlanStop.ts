import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface DeletePlanStopData {
  id: string
  plan_id: string
}

export function useDeletePlanStop() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id }: DeletePlanStopData) => {
      const { error } = await supabase
        .from('plan_stops')
        .delete()
        .eq('id', id as any)

      if (error) throw error
      return { id }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-stops', variables.plan_id] })
      toast({
        title: 'Stop deleted',
        description: 'The stop has been removed from your timeline.',
      })
    },
    onError: (error) => {
      console.error('Failed to delete stop:', error)
      toast({
        title: 'Failed to delete stop',
        description: 'There was an error deleting the stop. Please try again.',
        variant: 'destructive',
      })
    },
  })
}