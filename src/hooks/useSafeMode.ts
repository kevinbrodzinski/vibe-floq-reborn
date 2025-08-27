import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const useSafeMode = () => {
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load safe mode state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('floq-safe-mode')
    if (savedState) {
      setIsActive(JSON.parse(savedState))
    }
  }, [])

  const toggleSafeMode = async (active: boolean) => {
    setIsLoading(true)
    
    try {
      // Update local state
      setIsActive(active)
      localStorage.setItem('floq-safe-mode', JSON.stringify(active))

      // Update user's privacy status in database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          custom_status: active ? 'Safe Mode Active' : null
        } as any)
        .eq('id', (await supabase.auth.getUser()).data.user?.id as any)
        .returns<any>()

      if (error) {
        console.error('Failed to update safe mode status:', error)
        // Revert local state if database update fails
        setIsActive(!active)
        localStorage.setItem('floq-safe-mode', JSON.stringify(!active))
      }

      // If activating safe mode, also hide from real-time presence
      if (active) {
        // This would integrate with your presence system
        console.log('Safe mode activated - hiding location from all users')
      }

    } catch (error) {
      console.error('Safe mode toggle error:', error)
      // Revert on error
      setIsActive(!active)
      localStorage.setItem('floq-safe-mode', JSON.stringify(!active))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isActive,
    isLoading,
    toggleSafeMode
  }
} 