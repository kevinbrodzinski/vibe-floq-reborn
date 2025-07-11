import { supabase } from "@/integrations/supabase/client";

// Type-safe Supabase query wrappers to handle the SelectQueryError issues

export const safeProfileUpdate = async (id: string, updates: { 
  avatar_url?: string | null;
  bio?: string;
  interests?: string[];
  custom_status?: string;
  display_name?: string;
}) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as any)
    .eq('id', id as any)
    .select()
    .single();
    
  return { data, error };
};

export const safeUserSettingsQuery = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('available_until')
    .eq('user_id', userId as any)
    .maybeSingle();
    
  return { data, error };
};

export const safeVibesNowQuery = async (userId: string) => {
  const { data, error } = await supabase
    .from('vibes_now')
    .select('vibe, expires_at')
    .eq('user_id', userId as any)
    .maybeSingle();
    
  return { data, error };
};

export const safeGetUserByUsername = async (username: string) => {
  const { data, error } = await supabase.rpc('get_user_by_username', {
    lookup_username: username
  });
  
  return { data: data as any[], error };
};