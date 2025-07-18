import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getEnvironmentConfig, isDemo } from '@/lib/environment';

interface JoinFloqParams {
  floqId: string;
  userId?: string;
}

interface LeaveFloqParams {
  floqId: string;
  userId?: string;
}

export const useFloqJoin = () => {
  const queryClient = useQueryClient();

  const joinFloq = useMutation({
    mutationFn: async ({ floqId, userId }: JoinFloqParams) => {
      const env = getEnvironmentConfig();
      
      if (env.presenceMode === 'offline') {
        toast({ 
          title: 'Offline mode', 
          description: 'Join is disabled in offline mode.' 
        });
        return;
      }

      const { data, error } = await supabase.rpc('join_floq', {
        p_floq_id: floqId,
        p_user_id: userId || undefined,
        p_use_demo: isDemo()
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Safely extract participant_count
      const result = typeof data === 'object' && data !== null ? data : {};
      const participantCount = 'participant_count' in result ? result.participant_count : 0;
      
      // Optimistically update the floqs list
      queryClient.setQueryData(['active-floqs'], (old: any[]) => {
        if (!old) return old;
        return old.map(floq => 
          floq.id === variables.floqId 
            ? { ...floq, participant_count: participantCount }
            : floq
        );
      });
      
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['active-floqs'] });
      
      toast({
        title: "Joined floq!",
        description: "You're now part of this gathering.",
      });
    },
    onError: (error: any) => {
      // Don't show destructive toast for duplicate joins - user just tapped twice
      if (error.message?.includes('duplicate') || error.message?.includes('already')) {
        return; // Silent fail for duplicate attempts
      }
      
      toast({
        title: "Failed to join floq",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  const leaveFloq = useMutation({
    mutationFn: async ({ floqId, userId }: LeaveFloqParams) => {
      const env = getEnvironmentConfig();
      
      if (env.presenceMode === 'offline') {
        toast({ 
          title: 'Offline mode', 
          description: 'Leave is disabled in offline mode.' 
        });
        return;
      }

      const { data, error } = await supabase.rpc('leave_floq', {
        p_floq_id: floqId,
        p_user_id: userId || undefined,
        p_use_demo: isDemo()
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Safely extract participant_count
      const result = typeof data === 'object' && data !== null ? data : {};
      const participantCount = 'participant_count' in result ? result.participant_count : 0;
      
      // Optimistically update the floqs list
      queryClient.setQueryData(['active-floqs'], (old: any[]) => {
        if (!old) return old;
        return old.map(floq => 
          floq.id === variables.floqId 
            ? { ...floq, participant_count: participantCount }
            : floq
        );
      });
      
      // Invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['active-floqs'] });
      
      toast({
        title: "Left floq",
        description: "You've left this gathering.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to leave floq",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  return {
    join: joinFloq.mutate,
    leave: leaveFloq.mutate,
    isPending: joinFloq.isPending || leaveFloq.isPending,
  };
};
