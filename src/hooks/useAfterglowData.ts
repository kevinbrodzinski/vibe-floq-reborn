import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

// Import from central types to avoid duplication
import { DailyAfterglowData } from '@/types/afterglow'

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
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)  // TODO(user): Update to profile_id after database migration
          .maybeSingle()

        if (fetchError) throw fetchError

        if (data) {
          // Properly map the database row to our domain type
          const mappedData: DailyAfterglowData = {
            id: data.id,
            user_id: data.user_id,
            date: data.date,
            energy_score: data.energy_score || 0,
            social_intensity: data.social_intensity || 0,
            dominant_vibe: data.dominant_vibe || '',
            summary_text: data.summary_text || '',
            total_venues: data.total_venues || 0,
            total_floqs: data.total_floqs || 0,
            crossed_paths_count: data.crossed_paths_count || 0,
            is_pinned: data.is_pinned || false,
            created_at: data.created_at || '',
            regenerated_at: data.regenerated_at,
            ai_summary: data.ai_summary,
            ai_summary_generated_at: data.ai_summary_generated_at,
            emotion_journey: Array.isArray(data.emotion_journey) ? data.emotion_journey : [],
            moments: Array.isArray(data.moments) ? data.moments.map((item: any) => String(item)) : [],
            vibe_path: Array.isArray(data.vibe_path) ? data.vibe_path.map((item: any) => String(item)) : []
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
