import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { DailyAfterglowData, AfterglowMoment } from './useAfterglowData'
import { useToast } from '@/hooks/use-toast'

interface GenerationProgress {
  step: string
  progress: number
  status: 'in_progress' | 'completed' | 'error'
  message?: string
}

export function useRealtimeAfterglowData(date: string) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [afterglow, setAfterglow] = useState<DailyAfterglowData | null>(null)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!user || !date) return

    // Subscribe to daily_afterglow changes
    const afterglowChannel = supabase
      .channel(`afterglow-${date}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'daily_afterglow',
          filter: `user_id=eq.${user.id},date=eq.${date}`
        },
        (payload) => {
          console.log('New afterglow created:', payload)
          setAfterglow(payload.new as DailyAfterglowData)
          setIsGenerating(false)
          setGenerationProgress(null)
          
          toast({
            title: "Afterglow Ready! ✨",
            description: "Your daily afterglow has been generated and is ready to view.",
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'daily_afterglow',
          filter: `user_id=eq.${user.id},date=eq.${date}`
        },
        (payload) => {
          console.log('Afterglow updated:', payload)
          setAfterglow(payload.new as DailyAfterglowData)
          
          // If regenerated_at was updated, show notification
          if (payload.new.regenerated_at !== payload.old.regenerated_at) {
            toast({
              title: "Afterglow Updated! 🔄",
              description: "Your afterglow has been refreshed with new data.",
            })
          }
        }
      )
      .subscribe()

    // Subscribe to afterglow_moments changes
    const momentsChannel = supabase
      .channel(`moments-${date}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'afterglow_moments',
          filter: `daily_afterglow_id=eq.${afterglow?.id}`
        },
        (payload) => {
          console.log('New moment added:', payload)
          setAfterglow(prev => {
            if (!prev) return prev
            return {
              ...prev,
              moments: [...(prev.moments || []), payload.new as AfterglowMoment]
            }
          })
          
          toast({
            title: "New Moment Added! 🎭",
            description: `${payload.new.title} has been added to your afterglow.`,
          })
        }
      )
      .subscribe()

    // Subscribe to generation progress updates
    const progressChannel = supabase
      .channel(`progress-${user.id}`)
      .on(
        'broadcast',
        { event: 'afterglow_progress' },
        (payload) => {
          const progress = payload.payload as GenerationProgress
          console.log('Generation progress:', progress)
          setGenerationProgress(progress)
          
          if (progress.status === 'completed') {
            setIsGenerating(false)
            setGenerationProgress(null)
          } else if (progress.status === 'error') {
            setIsGenerating(false)
            setGenerationProgress(null)
            toast({
              title: "Generation Failed",
              description: progress.message || "Failed to generate afterglow. Please try again.",
              variant: "destructive"
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(afterglowChannel)
      supabase.removeChannel(momentsChannel) 
      supabase.removeChannel(progressChannel)
    }
  }, [user?.id, date, afterglow?.id, toast])

  const startGeneration = () => {
    setIsGenerating(true)
    setGenerationProgress({
      step: 'Initializing',
      progress: 0,
      status: 'in_progress',
      message: 'Starting afterglow generation...'
    })
  }

  return {
    afterglow,
    setAfterglow,
    generationProgress,
    isGenerating,
    startGeneration
  }
}