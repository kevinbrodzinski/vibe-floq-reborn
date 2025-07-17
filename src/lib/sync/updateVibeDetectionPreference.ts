import { supabase } from '@/integrations/supabase/client'

export async function updateVibeDetectionPreference(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        vibe_detection_enabled: enabled,
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('Failed to update vibe detection preference:', error)
    return false
  }

  return true
}