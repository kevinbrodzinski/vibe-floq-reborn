import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

export interface PlanSuggestion {
  title: string
  body: string
  emoji: string
}

export interface PlanRecapData {
  plan_id: string
  summary_md: string | null
  suggestions: PlanSuggestion[]
  status: 'pending' | 'ready' | 'error'
  error_message: string | null
  created_at: string
  updated_at: string
}

// Realtime afterglow notifications hook
export function useAfterglowNotifications() {
  const { toast } = useToast()

  useEffect(() => {
    const setupChannel = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const channel = supabase
        .channel('user_notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'app_user_notification',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            const notification = payload.new.payload as any
            if (notification.type === 'afterglow_ready') {
              toast({
                title: '✨ Afterglow Ready',
                description: notification.msg,
                duration: 5000
              })
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupChannel()
  }, [toast])
}

export function usePlanRecap(planId: string) {
  return useQuery({
    queryKey: ['plan-recap', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_ai_summaries')
        .select('*')
        .eq('plan_id', planId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      return data ? {
        ...data,
        suggestions: Array.isArray(data.suggestions) ? data.suggestions as unknown as PlanSuggestion[] : []
      } as PlanRecapData : null
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    enabled: !!planId
  })
}