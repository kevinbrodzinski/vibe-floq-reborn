import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
};

export const useProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, created_at')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId
  });
};

export const useProfileByUsername = (username: string | undefined) => {
  return useQuery({
    queryKey: ['profile-by-username', username],
    queryFn: async () => {
      if (!username) throw new Error('Username is required');
      
      const { data, error } = await supabase.rpc('get_user_by_username', { 
        lookup_username: username 
      });
      
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('User not found');
      
      return data[0] as Profile;
    },
    enabled: !!username
  });
};