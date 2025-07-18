import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { useRealtimeAfterglowData } from './useRealtimeAfterglowData'
import { useRealtimeAfterglowHistory } from './useRealtimeAfterglowHistory'
import { useTogglePinned } from './useOptimisticMutations'

import type { AfterglowMoment, DailyAfterglowData } from '@/types/afterglow'


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

  const togglePin = async (): Promise<void> => {
    if (!user || !afterglow) return

    // Use optimistic mutation instead
    const { mutate } = useTogglePinned()
    mutate({ 
      id: afterglow.id, 
      pinned: !afterglow.is_pinned 
    })
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