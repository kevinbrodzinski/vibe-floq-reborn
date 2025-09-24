import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { DailyAfterglowData } from '@/types/afterglow'
import { useToast } from '@/hooks/use-toast'

export function useRealtimeAfterglowHistory(limit: number = 10) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [history, setHistory] = useState<DailyAfterglowData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_afterglow')
        .select('*')
        .eq('profile_id', user.id as any)
        .order('date', { ascending: false })
        .limit(limit)
        .returns<any>()

      if (fetchError) {
        throw fetchError
      }

      setHistory(((data as any) || []).map((item: any) => ({
        ...item,
        updated_at: item.updated_at || item.created_at,
        emotion_journey: Array.isArray(item.emotion_journey) ? item.emotion_journey.map(String) : [],
        moments: Array.isArray(item.moments) ? item.moments.map(String) : [], // Convert moments to string array too
        vibe_path: Array.isArray(item.vibe_path) ? item.vibe_path.map(String) : []
      } as DailyAfterglowData)))
    } catch (err) {
      console.error('Error fetching afterglow history:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch afterglow history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchHistory()
    }
  }, [user?.id, limit])

  useEffect(() => {
    if (!user) return

    // Subscribe to new afterglow entries
    const channel = supabase
      .channel(`afterglow-history-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'daily_afterglow',
          filter: `profile_id=eq.${user.id}`  // TODO(user): Update to profile_id after database migration
        },
        (payload) => {
          console.log('New afterglow added to history:', payload)
          const newAfterglow = payload.new as DailyAfterglowData
          
          setHistory(prev => {
            // Insert new item and maintain sort order
            const newHistory = [newAfterglow, ...prev.filter(item => item.id !== newAfterglow.id)]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            return newHistory.slice(0, limit) // Maintain limit after sorting
          })
          
          // Show notification for newly completed afterglows
          const today = new Date().toLocaleDateString('en-CA') // Use consistent date format
          if (newAfterglow.date === today) {
            toast({
              title: "Today's Afterglow Complete! 🌟",
              description: "Your daily afterglow is now available in your archive.",
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'daily_afterglow',
          filter: `profile_id=eq.${user.id}`  // TODO(user): Update to profile_id after database migration
        },
        (payload) => {
          console.log('Afterglow updated in history:', payload)
          const updatedAfterglow = payload.new as DailyAfterglowData
          
          setHistory(prev => {
            const updated = prev.map(item => 
              item.id === updatedAfterglow.id ? updatedAfterglow : item
            ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            return updated.slice(0, limit) // Maintain limit after update
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, limit, toast])

  return {
    history,
    isLoading,
    error,
    refetch: fetchHistory
  }
}