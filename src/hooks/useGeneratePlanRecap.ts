import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface GeneratePlanRecapParams {
  planId: string
}

export function useGeneratePlanRecap() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ planId }: GeneratePlanRecapParams) => {
      const { data, error } = await supabase.functions.invoke('generate-plan-recap', {
        body: { planId }
      })
      
      if (error) {
        console.error('Plan recap generation error:', error)
        throw new Error(error.message || 'Failed to generate plan recap')
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate the recap query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['plan-recap', variables.planId] })
      
      toast.success('AI recap generated successfully!')
    },
    onError: (error) => {
      console.error('Plan recap generation failed:', error)
      toast.error('Failed to generate recap', {
        description: error.message || 'Something went wrong. Please try again.',
      })
    }
  })
}