import { supabase } from '@/integrations/supabase/client';

export async function inviteToTonight(profileId: string) {
  // Try a known edge function if present; otherwise log a warning.
  try {
    const { data, error } = await supabase.functions.invoke('invite-to-tonight', { body: { profileId } });
    if (error) throw error;
    return data;
  } catch {
    console.warn('[floq] inviteToTonight: stub – wire to your plan invite flow');
  }
}

export async function dmUser(profileId: string, text = 'Want to link up tonight?') {
  try {
    const { data, error } = await supabase.functions.invoke('create-dm', { body: { to: profileId, text } });
    if (error) throw error;
    return data;
  } catch {
    console.warn('[floq] dmUser: stub – wire to your DM/create-thread flow');
  }
}

export async function addToCurrentPlan(profileId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('plan-add-participant', { body: { profileId } });
    if (error) throw error;
    return data;
  } catch {
    console.warn('[floq] addToCurrentPlan: stub – wire to your plan participants flow');
  }
}