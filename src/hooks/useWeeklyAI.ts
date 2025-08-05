import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'

export interface WeeklyAISuggestion {
  text: string
  generated_at: string
  energy_score: number
  social_score: number
}

export interface WeeklyAIResponse {
  source: 'cache' | 'openai'
  suggestion: WeeklyAISuggestion
}

const fetchWeeklyAI = async (forceRefresh: boolean = false): Promise<WeeklyAIResponse> => {
  const { data, error } = await supabase.functions.invoke('generate-weekly-ai-suggestion', {
    body: { forceRefresh }
  })

  if (error) throw error
  return data as WeeklyAIResponse
}

export const useWeeklyAI = (forceRefresh: boolean = false) => {
  const { data, error, mutate } = useSWR(
    'weekly-ai-suggestion',
    () => fetchWeeklyAI(forceRefresh),
    {
      refreshInterval: 0, // Don't auto-refresh
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  )

  return {
    suggestion: data?.suggestion,
    source: data?.source,
    loading: !data && !error,
    error,
    refetch: mutate
  }
} 