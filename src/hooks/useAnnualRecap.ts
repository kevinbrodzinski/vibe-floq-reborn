import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface RecapResponse {
  url: string
  stats: {
    year: number
    total_venues: number
    total_minutes: number
  }
}

export const useAnnualRecap = () => {
  return useMutation({
    mutationFn: async (year?: number): Promise<RecapResponse> => {
      const { data, error } = await supabase.functions.invoke('generate-year-recap', {
        body: { year }
      })

      if (error) {
        console.error('Annual recap error:', error)
        throw new Error(error.message || 'Failed to generate recap')
      }

      return data as RecapResponse
    },
    onSuccess: (data) => {
      toast.success('Annual recap generated successfully!')
    },
    onError: (error) => {
      console.error('Annual recap failed:', error)
      toast.error('Failed to generate recap', {
        description: error.message || 'Something went wrong. Please try again.'
      })
    }
  })
}