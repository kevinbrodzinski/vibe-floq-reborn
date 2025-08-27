import { useEffect } from 'react'
import { useVibeDetection } from '@/store/useVibeDetection'
import { useCurrentUserId } from '@/hooks/useCurrentUser'
import { supabase } from '@/integrations/supabase/client'
import { updateVibeDetectionPreference } from '@/lib/sync/updateVibeDetectionPreference'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export function useSyncedVibeDetection() {
  const profileId = useCurrentUserId()             // ✅ get current user ID directly
  const { autoMode, setAutoMode } = useVibeDetection()

  // Pull preference from Supabase on mount
  useEffect(() => {
    if (!profileId) return        // user is not authenticated

    const fetchPreference = async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('vibe_detection_enabled')
        .eq('profile_id', profileId)
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
  }, [profileId, setAutoMode])

  // 🕓 Debounce Supabase writes
  const debouncedAutoMode = useDebouncedValue(autoMode, 1000)

  useEffect(() => {
    if (!profileId) return
    updateVibeDetectionPreference(profileId, debouncedAutoMode)
  }, [debouncedAutoMode, profileId])
}