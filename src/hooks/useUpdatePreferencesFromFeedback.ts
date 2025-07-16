import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UpdatePreferencesInput {
  vibe: string;
  moment: string;
}

/**
 * Hook to update user preferences based on plan feedback
 */
export function useUpdatePreferencesFromFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ vibe, moment }: UpdatePreferencesInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('update_user_preferences_from_feedback', {
        p_user_id: user.id,
        p_vibe: vibe,
        p_moment: moment,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate user preferences queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      
      // Optional: Show subtle success feedback
      console.log('User preferences updated from feedback');
    },
    onError: (error) => {
      console.error('Failed to update preferences from feedback:', error);
      // Fail silently for preferences - don't interrupt the main feedback flow
      // but could optionally show a toast for debugging
      if (process.env.NODE_ENV === 'development') {
        toast({
          title: 'Preference Update Failed',
          description: 'Unable to update your preferences, but your feedback was saved.',
          variant: 'destructive',
        });
      }
    },
  });
}