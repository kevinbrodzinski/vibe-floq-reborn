import { supabase } from '@/integrations/supabase/client';
import '@/types/supabase-rpc'; // Import RPC type extensions

export async function storePushToken(
  deviceId: string,
  token: string,
  platform: 'ios' | 'android' | 'web'
): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.rpc('store_push_token' as any, {
    p_device_id: deviceId,
    p_token: token,
    p_platform: platform,
  });
  
  if (error) throw error;
  return data as { ok: boolean };
}

export async function clearPlanNotifications(userId: string) {
  const { error } = await supabase
    .from('event_notifications' as any)
    .update({ seen_at: new Date().toISOString() })
    .is('seen_at', null)
    .in('kind', ['plan_comment_new', 'plan_checkin'])
    .eq('user_id', userId);
    
  if (error) throw error;
}

export async function resetBadgeCount(): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.rpc('reset_badge' as any);
  if (error) throw error;
  return data as { ok: boolean };
}