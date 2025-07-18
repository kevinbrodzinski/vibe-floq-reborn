import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface DailyAfterglowData {
  id: string
  date: string
  user_id: string
  energy_score: number
  social_intensity: number
  dominant_vibe: string
  summary_text: string
  emotion_journey: string[]
  moments: any[]
  vibe_path: string[]
  created_at: string
  updated_at: string
  total_venues: number
  total_floqs: number
  crossed_paths_count: number
  is_pinned: boolean
}

export function useAfterglowData(date?: string) {
  const [afterglowData, setAfterglowData] = useState<DailyAfterglowData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!date) return

    const fetchAfterglowData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('daily_afterglow')
          .select('*')
          .eq('date', date)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()

        if (fetchError) throw fetchError

        if (data) {
          // Properly map the database row to our domain type
          const mappedData: DailyAfterglowData = {
            ...data,
            emotion_journey: Array.isArray(data.emotion_journey) ? data.emotion_journey.map(String) : [],
            moments: Array.isArray(data.moments) ? data.moments : [],
            vibe_path: Array.isArray(data.vibe_path) ? data.vibe_path.map(String) : []
          }
          setAfterglowData(mappedData)
        } else {
          setAfterglowData(null)
        }
      } catch (err) {
        console.error('Error fetching afterglow data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAfterglowData()
  }, [date])

  return { 
    afterglow: afterglowData,
    isGenerating: isLoading,
    generationProgress: 0,
    generateAfterglow: () => {},
    afterglowData, 
    isLoading, 
    error 
  }
}
