import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

// Preload data that will be needed during onboarding
export function usePreloadOnboarding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Preload user preferences
    queryClient.prefetchQuery({
      queryKey: ['user-preferences', user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        return data;
      },
      staleTime: 30000,
    });

    // Preload onboarding progress
    queryClient.prefetchQuery({
      queryKey: ['onboarding-progress', user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('user_onboarding_progress')
          .select('*')
          .eq('user_id', user.id)
          .single();
        return data;
      },
      staleTime: 30000,
    });

  }, [user, queryClient]);
}