import { useEffect, useCallback, useRef } from 'react'
import { PlanStop } from '@/types/plan'
import { supabase } from '@/integrations/supabase/client'

interface AutoSaveOptions {
  planId: string
  debounceMs?: number
  maxRetries?: number
}

interface DraftData {
  stops: PlanStop[]
  metadata: {
    lastSaved: number
    version: number
    isLocal: boolean
  }
}

export const useAutoSaveDrafts = ({ planId, debounceMs = 2000, maxRetries = 3 }: AutoSaveOptions) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const retryCountRef = useRef(0)
  const lastSavedVersionRef = useRef(0)
  
  const STORAGE_KEY = `plan_draft_${planId}`

  // Save draft to localStorage as backup
  const saveToLocal = useCallback((data: DraftData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...data,
        metadata: { ...data.metadata, isLocal: true }
      }))
    } catch (error) {
      console.warn('Failed to save draft locally:', error)
    }
  }, [STORAGE_KEY])

  // Save draft to Supabase
  const saveToRemote = useCallback(async (data: DraftData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      // In a real implementation, this would save to a drafts table
      // For now, we'll use localStorage as the primary storage
      const { error } = await supabase
        .from('plan_drafts')
        .upsert({
          plan_id: planId,
          user_id: user.id,
          draft_data: data,
          version: data.metadata.version,
          last_saved_at: new Date().toISOString()
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Failed to save draft remotely:', error)
      return false
    }
  }, [planId])

  // Auto-save function with retry logic
  const autoSave = useCallback(async (stops: PlanStop[], forceImmediate = false) => {
    const currentVersion = lastSavedVersionRef.current + 1
    const draftData: DraftData = {
      stops,
      metadata: {
        lastSaved: Date.now(),
        version: currentVersion,
        isLocal: false
      }
    }

    // Clear existing timeout if not forcing immediate save
    if (!forceImmediate && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    const performSave = async () => {
      try {
        // Always save locally first for immediate backup
        saveToLocal(draftData)
        
        // Try remote save with retry logic
        const remoteSuccess = await saveToRemote(draftData)
        
        if (remoteSuccess) {
          lastSavedVersionRef.current = currentVersion
          retryCountRef.current = 0
        } else if (retryCountRef.current < maxRetries) {
          retryCountRef.current++
          // Retry after exponential backoff
          setTimeout(() => autoSave(stops, true), Math.pow(2, retryCountRef.current) * 1000)
        }
      } catch (error) {
        console.error('Auto-save failed:', error)
        // Ensure local backup exists even if remote fails
        saveToLocal(draftData)
      }
    }

    if (forceImmediate) {
      await performSave()
    } else {
      saveTimeoutRef.current = setTimeout(performSave, debounceMs)
    }
  }, [saveToLocal, saveToRemote, debounceMs, maxRetries])

  // Load existing draft
  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    try {
      // Try remote first
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('plan_drafts')
          .select('draft_data, version, last_saved_at')
          .eq('plan_id', planId)
          .eq('user_id', user.id)
          .order('last_saved_at', { ascending: false })
          .limit(1)
          .single()

        if (!error && data) {
          lastSavedVersionRef.current = data.version
          return data.draft_data as DraftData
        }
      }

      // Fallback to local storage
      const localData = localStorage.getItem(STORAGE_KEY)
      if (localData) {
        const parsed = JSON.parse(localData) as DraftData
        lastSavedVersionRef.current = parsed.metadata.version
        return parsed
      }
    } catch (error) {
      console.warn('Failed to load draft:', error)
    }
    
    return null
  }, [planId, STORAGE_KEY])

  // Clear draft when plan is finalized
  const clearDraft = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('plan_drafts')
          .delete()
          .eq('plan_id', planId)
          .eq('user_id', user.id)
      }
    } catch (error) {
      console.warn('Failed to clear draft:', error)
    }
  }, [planId, STORAGE_KEY])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    autoSave,
    loadDraft,
    clearDraft,
    isAutoSaving: !!saveTimeoutRef.current
  }
}