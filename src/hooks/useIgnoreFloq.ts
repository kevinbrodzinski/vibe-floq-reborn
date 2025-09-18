import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { WalkableFloq } from '@/hooks/useNearbyFloqs';

export const useIgnoreFloq = () => {
  const queryClient = useQueryClient();

  const undoIgnoreFloq = async (floqId: string) => {
    // ... keep existing implementation
  };

  return useMutation({
    mutationFn: async ({ floqId }: { floqId: string }) => {
      const { error } = await supabase.functions.invoke('ignore-floq', {
        body: { floq_id: floqId },
      });
      if (error) throw error;
      return { floqId };
    },
    onSuccess: (data, { floqId }) => {
      // Remove floq from all cached nearby flocks lists with more specific cache invalidation
      queryClient.removeQueries({ 
        queryKey: ['nearby-flocks'], 
        predicate: (query) => {
          const queryData = query.state.data as WalkableFloq[] | undefined;
          return queryData?.some(f => f.id === floqId) ?? false;
        }
      });

      // Show success toast with undo option
      toast.success('Floq hidden from your feed', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await undoIgnoreFloq(floqId);
              toast.success('Floq restored to your feed');
            } catch (error) {
              console.error('Error undoing floq ignore:', error);
              toast.error('Failed to restore floq');
            }
          }
        },
        duration: 5000 // Give user 5 seconds to undo
      });
    },
    onError: (error: any) => {
      console.error('Error ignoring floq:', error);
      const errorMessage = error?.message || 'Failed to hide floq. Please try again.';
      toast.error(errorMessage);
      throw error; // Re-throw so react-query can handle retries/error states
    },
  });
};