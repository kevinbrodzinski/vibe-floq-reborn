import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from './useSession'

interface DraftData {
  stops: any[]
  metadata: Record<string, any>
}

export function useAutoSaveDrafts(planId: string) {
  const [currentVersion, setCurrentVersion] = useState(0)
  const session = useSession()
  const currentUser = session?.user

  // Debounced save function
  useEffect(() => {
    if (!planId || !currentUser) return

    let timeoutId: NodeJS.Timeout

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch draft when tab becomes visible
        console.log('Tab became visible, refetching draft...')
        // queryClient.refetchQueries(['plan-draft', planId]);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(timeoutId)
    }
  }, [planId, currentUser])

  const saveDraft = useCallback(async (draftData: DraftData) => {
    if (!planId || !currentUser) {
      console.warn('Plan ID or user not available, skipping save.')
      return
    }

    try {
      const { error } = await supabase
        .from('plan_drafts')
        .upsert({
          plan_id: planId,
          user_id: currentUser.id,
          draft_data: draftData as any, // Cast to satisfy JSON type
          last_saved_at: new Date().toISOString(),
          version: currentVersion + 1,
        })

      if (error) {
        console.error('Draft save failed:', error)
        throw error
      }

      setCurrentVersion(prev => prev + 1)
      console.log('Draft saved successfully.')
    } catch (error) {
      console.error('Error during draft save:', error)
    }
  }, [planId, currentUser, currentVersion])

  const loadDraft = useCallback(async () => {
    if (!planId || !currentUser) {
      console.warn('Plan ID or user not available, cannot load draft.')
      return null
    }

    try {
      const { data } = await supabase
        .from('plan_drafts')
        .select('*')
        .eq('plan_id', planId)
        .eq('user_id', currentUser.id)
        .order('last_saved_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.draft_data) {
        // Safely parse the JSON data
        try {
          return typeof data.draft_data === 'object' ? data.draft_data as DraftData : JSON.parse(data.draft_data as string)
        } catch {
          return null
        }
      }
      return null
    } catch (error) {
      console.error('Error loading draft:', error)
      return null
    }
  }, [planId, currentUser])

  const { data: existingDraft } = useQuery({
    queryKey: ['plan-draft', planId],
    queryFn: async () => {
      const { data } = await supabase
        .from('plan_drafts')
        .select('*')
        .eq('plan_id', planId)
        .eq('user_id', currentUser?.id)
        .order('last_saved_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.draft_data) {
        // Safely parse the JSON data
        try {
          return typeof data.draft_data === 'object' ? data.draft_data as DraftData : JSON.parse(data.draft_data as string)
        } catch {
          return null
        }
      }
      return null
    },
    enabled: !!planId && !!currentUser,
  })

  return {
    saveDraft,
    loadDraft,
    existingDraft,
    currentVersion,
  }
}
