import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/providers/AuthProvider'
import { Database } from '@/integrations/supabase/types'
import { useToast } from '@/hooks/use-toast'
import debounce from 'lodash.debounce'

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
  const [afterglow, setAfterglow] = useState<DailyAfterglowRow | null>(null)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // helper – fetch (or create) the row once
  const fetchOrGenerate = useCallback(async () => {
    if (!user) return;

    try {
      // 1️⃣ fetch existing
      const { data, error } = await supabase
        .from('daily_afterglow')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // 2️⃣ none?  kick off generation
        setIsGenerating(true);
        await supabase.functions.invoke('generate-intelligence', {
          body: { mode: 'daily', user_id: user.id, date, force_regenerate: true }
        });
        
        toast({
          title: "Generating Afterglow...",
          description: "Creating your daily timeline..."
        });
      } else {
        setAfterglow(data);
        setIsGenerating(false);
      }
    } catch (err) {
      console.error('Fetch or generate error:', err);
      setIsGenerating(false);
    }
  }, [date, user, toast]);

  // Initial data fetch
  useEffect(() => {
    if (!user || !date) return
    fetchOrGenerate();
  }, [fetchOrGenerate, user?.id, date])

  // Real-time subscriptions
  useEffect(() => {
    if (!user || !date) return

    // Subscribe to daily_afterglow changes
    const afterglowChannel = supabase
      .channel(`daily-afterglow-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_afterglow',
          filter: `date=eq.${date}`
        },
        debounce((payload) => {
          console.log('Afterglow changed:', payload)
          setAfterglow(payload.new as DailyAfterglowRow)
          setIsGenerating(false)
          setGenerationProgress(null)
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Afterglow Ready! ✨",
              description: "Your daily afterglow has been generated and is ready to view.",
            })
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Afterglow Updated! 🔄",
              description: "Your afterglow has been refreshed with new data.",
            })
          }
        }, 250)
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
      afterglowChannel && void supabase.removeChannel(afterglowChannel)
      progressChannel && void supabase.removeChannel(progressChannel)
    }
  }, [user?.id, date, toast])

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
    refresh,
    isStale,
    loading: isGenerating && !afterglow
  }
}