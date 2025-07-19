import { supabase } from '@/integrations/supabase/client'

export interface UpdateSettingsPayload {
  target: 'user' | 'floq' | 'availability' | 'preferences'
  updates?: Record<string, any>
  floq_id?: string
  available_until?: string
}

export async function callUpdateSettings(payload: UpdateSettingsPayload) {
  const { data, error } = await supabase.functions.invoke('update-settings', {
    body: payload,
  })
  
  if (error) {
    throw new Error(error.message || 'Failed to update settings')
  }
  
  return data
}

// Convenience wrappers for specific targets
export const callUpdateUserSettings = (updates: Record<string, any>) =>
  callUpdateSettings({ target: 'user', updates })

export const callUpdateAvailability = (available_until: string) =>
  callUpdateSettings({ target: 'availability', available_until })

export const callUpdateFloqSettings = (floq_id: string, updates: Record<string, any>) =>
  callUpdateSettings({ target: 'floq', floq_id, updates })

export const callUpdateUserPreferences = (updates: Record<string, any>) =>
  callUpdateSettings({ target: 'preferences', updates })