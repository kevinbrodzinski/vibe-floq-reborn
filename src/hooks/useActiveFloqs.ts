import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

// Mock implementation for missing RPC functions
export const useActiveFloqs = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-floqs', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Return empty array since RPC doesn't exist
      return [];
    },
    staleTime: 30 * 1000,
  });
};