import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { useRealtimeAfterglowData } from './useRealtimeAfterglowData'
import { useRealtimeAfterglowHistory } from './useRealtimeAfterglowHistory'

export interface AfterglowMoment {
  timestamp: string
  moment_type: string
  title: string
  description?: string
  color: string
  metadata: Record<string, any>
}

export interface DailyAfterglowData {
  id: string
  user_id: string
  date: string
  vibe_path: string[]
  emotion_journey: any[]
  peak_vibe_time?: string
  dominant_vibe?: string
  total_venues: number
  total_floqs: number
  crossed_paths_count: number
  energy_score: number
  social_intensity: number
  summary_text: string
  moments: AfterglowMoment[]
  is_pinned: boolean
  created_at: string
  regenerated_at?: string
}

export function useAfterglowData(date: string) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use real-time hook for live updates
  const { 
    afterglow, 
    setAfterglow, 
    generationProgress, 
    isGenerating,
    startGeneration
  } = useRealtimeAfterglowData(date)
  
  

  const fetchAfterglow = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_afterglow')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle()

      if (fetchError) {
        throw fetchError
      }

      setAfterglow(data)
    } catch (err) {
      console.error('Error fetching afterglow:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch afterglow')
    } finally {
      setIsLoading(false)
    }
  }

  const generateAfterglow = async (force: boolean = false) => {
    if (!user) return

    // Don't regenerate if data exists and force is false
    if (afterglow && !force) return

    
    setError(null)
    startGeneration() // Start real-time progress tracking

    try {
      const { data, error: generateError } = await supabase.functions.invoke(
        'generate-daily-afterglow',
        {
          body: {
            user_id: user.id,
            date: date
          }
        }
      )

      if (generateError) {
        throw generateError
      }

      // Real-time hook will handle the update automatically
    } catch (err) {
      console.error('Error generating afterglow:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate afterglow')
      
    }
  }

  const togglePin = async () => {
    if (!user || !afterglow) return

    try {
      const { error: updateError } = await supabase
        .from('daily_afterglow')
        .update({ is_pinned: !afterglow.is_pinned })
        .eq('id', afterglow.id)

      if (updateError) {
        throw updateError
      }

      setAfterglow(prev => prev ? { ...prev, is_pinned: !prev.is_pinned } : null)
    } catch (err) {
      console.error('Error toggling pin:', err)
      setError(err instanceof Error ? err.message : 'Failed to update pin status')
    }
  }

  const getShareUrl = () => {
    if (!afterglow) return null
    return `${window.location.origin}/afterglow?date=${afterglow.date}&user=${afterglow.user_id}`
  }

  // Fetch data when user or date changes
  useEffect(() => {
    if (user && date) {
      fetchAfterglow()
    }
  }, [user?.id, date])

  // Auto-generate if no data exists for today
  useEffect(() => {
    if (user && date && afterglow === null && !isLoading && !isGenerating) {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      // Only auto-generate for today or yesterday
      if (date === today || date === yesterdayStr) {
        generateAfterglow()
      }
    }
  }, [user?.id, date, afterglow, isLoading, isGenerating])

  return {
    afterglow,
    isLoading,
    isGenerating,
    generationProgress,
    error,
    generateAfterglow,
    togglePin,
    getShareUrl,
    refetch: fetchAfterglow
  }
}

export function useAfterglowHistory(limit: number = 10) {
  // Use the real-time hook for live updates
  return useRealtimeAfterglowHistory(limit)
}