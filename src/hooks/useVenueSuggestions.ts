import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface VenueSuggestion {
  venue: any
  match_score: number
  reasoning: string[]
  estimated_cost: number
  friend_presence: number
}

interface SuggestVenuesParams {
  plan_id: string
  budget_range?: { min: number; max: number }
  radius_km?: number
}

export function useVenueSuggestions(params: SuggestVenuesParams) {
  return useQuery({
    queryKey: ['venue-suggestions', params.plan_id, params.budget_range, params.radius_km],
    queryFn: async (): Promise<VenueSuggestion[]> => {
      const { data, error } = await supabase.functions.invoke('suggest-venues', {
        body: params
      })
      
      if (error) {
        console.error('Venue suggestions error:', error)
        const message = error?.message ?? error?.error?.message ?? 'Something went wrong on the server'
        throw new Error(message)
      }
      
      return data.suggestions || []
    },
    enabled: !!params.plan_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime in v5)
  })
}