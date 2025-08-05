import { supabase } from '@/integrations/supabase/client'

export async function updateVibeDetectionPreference(profileId: string, enabled: boolean) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        profile_id: profileId,
        vibe_detection_enabled: enabled,
      },
      { onConflict: 'profile_id' }
    )

  if (error) {
    console.error('Failed to update vibe detection preference:', error)
    return false
  }

  return true
}