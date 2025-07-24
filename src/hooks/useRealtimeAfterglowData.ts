import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { Database } from '@/integrations/supabase/types'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

type DailyAfterglowRow = Database['public']['Tables']['daily_afterglow']['Row'];

interface GenerationProgress {
  step: string
  progress: number
  status: 'in_progress' | 'completed' | 'error'
  message?: string
}

export function useRealtimeAfterglowData(date: string) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [afterglow, setAfterglow] = useState<DailyAfterglowRow | null>(null)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Hoist generateAfterglowData function
  const generateAfterglowData = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('Calling generate-intelligence with daily mode')
      setIsGenerating(true)
      setGenerationProgress({
        step: 'Starting',
        progress: 10,
        status: 'in_progress',
        message: 'Initializing afterglow generation...'
      })

      const { data: result, error } = await supabase.functions.invoke('generate-intelligence', {
        body: { mode: 'daily', user_id: user.id, date }
      })

      if (error) {
        console.error('Error generating afterglow:', error)
        setGenerationProgress({
          step: 'Error',
          progress: 0,
          status: 'error',
          message: 'Failed to generate afterglow'
        })
        toast({
          title: "Generation Failed",
          description: "Failed to generate afterglow. Please try again.",
          variant: "destructive"
        })
      } else {
        console.log('Afterglow generation triggered:', result)
        setGenerationProgress({
          step: 'Processing',
          progress: 50,
          status: 'in_progress',
          message: 'Processing your day...'
        })
      }
    } catch (error) {
      console.error('Failed to trigger afterglow generation:', error)
      setIsGenerating(false)
      setGenerationProgress(null)
    }
  }, [user, date, toast])

  // Initial data fetch with debounced fetch helper
  const debouncedFetch = useCallback(async () => {
    if (!user) return;
    
    console.log('Fetching afterglow data for date:', date)
    try {
      const { data, error } = await supabase
        .from('daily_afterglow')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle()

      if (error) {
        console.error('Error fetching afterglow:', error)
      } else if (data) {
        console.log('Found existing afterglow:', data)
        setAfterglow(data)
        setIsGenerating(false)
        setGenerationProgress(null)
      } else {
        console.log('No afterglow found, triggering generation...')
        await generateAfterglowData()
      }
    } catch (err) {
      console.error('Failed to fetch afterglow:', err)
      setIsGenerating(false)
    }
  }, [user, date, generateAfterglowData])

  // Initial data fetch
  useEffect(() => {
    let mounted = true;
    
    if (!user || !date) return

    const fetchInitialData = async () => {
      if (mounted) {
        await debouncedFetch()
      }
    }

    fetchInitialData()
    
    return () => {
      mounted = false;
    }
  }, [user?.id, date, debouncedFetch])

  // Real-time subscriptions
  useEffect(() => {
    let mounted = true;
    if (!user || !date) return

    // Subscribe to daily_afterglow changes with specific filter
    const afterglowChannel = supabase
      .channel(`afterglow-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_afterglow',
          filter: `date=eq.${date},user_id=eq.${user.id}`
        },
        (payload) => {
          if (!mounted) return;
          console.log('Afterglow changed:', payload)
          setAfterglow(payload.new as DailyAfterglowRow)
          setIsGenerating(false)
          setGenerationProgress({
            step: 'Complete',
            progress: 100,
            status: 'completed',
            message: 'Afterglow ready!'
          })
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['afterglow', date, user.id] })
          
          setTimeout(() => {
            if (mounted) {
              setGenerationProgress(null)
            }
          }, 2000)
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Afterglow Ready! ✨",
              description: "Your daily afterglow has been generated and is ready to view.",
            })
          } else if (payload.eventType === 'UPDATE' && payload.new.regenerated_at !== payload.old?.regenerated_at) {
            toast({
              title: "Afterglow Updated! 🔄",
              description: "Your afterglow has been refreshed with new data.",
            })
          }
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
          if (!mounted) return;
          const progress = payload.payload as GenerationProgress
          console.log('Generation progress:', progress)
          setGenerationProgress(progress)
          
          if (progress.status === 'completed') {
            setIsGenerating(false)
            setTimeout(() => {
              if (mounted) {
                setGenerationProgress(null)
              }
            }, 2000)
          } else if (progress.status === 'error') {
            setIsGenerating(false)
            setGenerationProgress(null)
            toast({
              title: "Generation Failed",
              description: String(progress.message || "Failed to generate afterglow. Please try again."),
              variant: "destructive"
            })
          }
        }
      )
      .on(
        'broadcast',
        { event: 'ai_summary_generated' },
        (payload) => {
          if (!mounted) return;
          console.log('AI summary generated:', payload)
          
          // Update the afterglow with the new AI summary
          setAfterglow(prev => prev ? {
            ...prev,
            ai_summary: payload.payload.ai_summary,
            ai_summary_generated_at: new Date().toISOString()
          } : prev)
        }
      )
      .subscribe()

    return () => {
      mounted = false;
      afterglowChannel && void supabase.removeChannel(afterglowChannel)
      progressChannel && void supabase.removeChannel(progressChannel)
    }
  }, [user?.id, date, toast])

  // Separate effect for moments subscription that depends on afterglow.id
  useEffect(() => {
    let mounted = true;
    if (!afterglow?.id) return

    const momentsChannel = supabase
      .channel(`moments-${afterglow.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'afterglow_moments',
          filter: `daily_afterglow_id=eq.${afterglow.id}`
        },
        (payload) => {
          if (!mounted) return;
          console.log('New moment added:', payload)
          setAfterglow(prev => {
            if (!prev) return prev
            const currentMoments = Array.isArray(prev.moments) ? prev.moments : [];
            return {
              ...prev,
              moments: [...currentMoments, JSON.stringify(payload.new)]
            }
          })
          
          toast({
            title: "New Moment Added! 🎭",
            description: String(payload.new.title) + " has been added to your afterglow.",
          })
        }
      )
      .subscribe()

    return () => {
      mounted = false;
      momentsChannel && void supabase.removeChannel(momentsChannel)
    }
  }, [afterglow?.id, toast])

  const startGeneration = (): void => {
    setIsGenerating(true)
    setGenerationProgress({
      step: 'Initializing',
      progress: 0,
      status: 'in_progress',
      message: 'Starting afterglow generation...'
    })
  }

  // On-demand refresh function
  const refresh = useCallback(async () => {
    if (!user) return;

    console.log('Manually refreshing afterglow...');
    setIsGenerating(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-intelligence', {
        body: { mode: 'daily', user_id: user.id, date, force_regenerate: true }
      });

      if (error) {
        console.error('Error generating afterglow:', error);
        setIsGenerating(false);
        toast({
          title: "Generation Failed",
          description: "Failed to generate afterglow. Please try again.",
          variant: "destructive"
        });
      } else {
        console.log('Afterglow generation triggered:', result);
        toast({
          title: "Regenerating...",
          description: "Your afterglow is being refreshed with the latest data."
        });
      }
    } catch (error) {
      console.error('Failed to trigger afterglow generation:', error);
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  }, [user?.id, date, toast]);

  // Check if data is stale
  const isStale = (afterglow as any)?.is_stale || false;

  return {
    afterglow,
    setAfterglow,
    generationProgress,
    isGenerating,
    startGeneration,
    refresh,
    isStale,
    loading: isGenerating && !afterglow
  }
}