import { useEffect } from 'react'
import { useVibeDetection } from '@/store/useVibeDetection'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { supabase } from '@/integrations/supabase/client'
import { updateVibeDetectionPreference } from '@/lib/sync/updateVibeDetectionPreference'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export function useSyncedVibeDetection() {
  const { data: user } = useCurrentUser()
  const { autoMode, setAutoMode } = useVibeDetection()

  // Pull preference from Supabase on mount
  useEffect(() => {
    if (!user?.id) return

    const fetchPreference = async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('vibe_detection_enabled')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.warn('Failed to load vibe_detection_enabled:', error)
        return
      }

      if (typeof data?.vibe_detection_enabled === 'boolean') {
        setAutoMode(data.vibe_detection_enabled)
      }
    }

    fetchPreference()
  }, [user?.id, setAutoMode])

  // 🕓 Debounce Supabase writes
  const debouncedAutoMode = useDebouncedValue(autoMode, 1000)

  useEffect(() => {
    if (!user?.id) return
    updateVibeDetectionPreference(user.id, debouncedAutoMode)
  }, [debouncedAutoMode, user?.id])
}