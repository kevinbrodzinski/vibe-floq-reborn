import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDeleteFloq = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (floqId: string) => {
      const { data, error } = await supabase.rpc('delete_floq', { 
        p_floq_id: floqId 
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, floqId) => {
      if (data.success) {
        // Remove from all relevant caches
        queryClient.invalidateQueries({ queryKey: ['my-floqs'] });
        queryClient.invalidateQueries({ queryKey: ['nearby-floqs'] });
        queryClient.invalidateQueries({ queryKey: ['active-floqs'] });
        queryClient.removeQueries({ queryKey: ['floq-details', floqId] });

        toast({
          title: 'Floq deleted',
          description: 'The floq has been permanently deleted.',
        });
      } else {
        throw new Error(data.error || 'Failed to delete floq');
      }
    },
    onError: (error: any) => {
      // Extract proper error message
      const errorMessage = error?.message || 
        error?.details || 
        error?.hint || 
        'Unable to delete floq. Please try again.';
      
      toast({
        title: 'Delete failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
};