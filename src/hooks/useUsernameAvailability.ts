import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// src/hooks/useUsernameAvailability.ts
export const useUsernameAvailability = (username: string) =>
  useQuery({
    enabled : !!username?.trim(),
    queryKey: ['username-available', username.toLowerCase().trim()],
    queryFn : async () => {
      const { data, error } = await supabase.rpc('username_available', {
        p_username: username.trim().toLowerCase(),   //  ← same arg name!
      });
      if (error) throw error;
      return data as boolean;
    },
    staleTime: 15_000,
  });