import { supabase } from '@/integrations/supabase/client';

// Concrete shape we persist (adjust keys to your schema)
export type PrivacyPreset = 'strict' | 'balanced' | 'open';
export type Precision = 'realtime' | 'when_out' | 'area_only' | 'hidden';

export type PrivacyMatrix = {
  circle: Precision;   // Inner Circle
  friends: Precision;  // Friends
  others: Precision;   // Everyone else
};

export async function updatePrivacySettings(
  data: { share_precision_preset: PrivacyPreset; privacy_matrix: PrivacyMatrix; privacy_receipts?: boolean }
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          profile_id: user.id,
          share_precision_preset: data.share_precision_preset,
          privacy_settings: data.privacy_matrix,
          privacy_receipts: data.privacy_receipts ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      );

    if (error) {
      // 42P01 relation missing, 42703 column missing — tolerate in onboarding
      if (process.env.NODE_ENV === 'development') console.warn('[updatePrivacySettings] upsert error:', error);
      return false;
    }
    return true;
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.warn('[updatePrivacySettings] failed:', e);
    return false;
  }
}
