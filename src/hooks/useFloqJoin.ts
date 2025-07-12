import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
      const { data, error } = await supabase.rpc('join_floq', {
        p_floq_id: floqId,
        p_user_id: userId || undefined
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Optimistically update the floqs list
      queryClient.setQueryData(['active-floqs'], (old: any[]) => {
        if (!old) return old;
        return old.map(floq => 
          floq.id === variables.floqId 
            ? { ...floq, participant_count: data.participant_count }
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
      toast({
        title: "Failed to join floq",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  const leaveFloq = useMutation({
    mutationFn: async ({ floqId, userId }: LeaveFloqParams) => {
      const { data, error } = await supabase.rpc('leave_floq', {
        p_floq_id: floqId,
        p_user_id: userId || undefined
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Optimistically update the floqs list
      queryClient.setQueryData(['active-floqs'], (old: any[]) => {
        if (!old) return old;
        return old.map(floq => 
          floq.id === variables.floqId 
            ? { ...floq, participant_count: data.participant_count }
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
    joinFloq: joinFloq.mutate,
    leaveFloq: leaveFloq.mutate,
    isJoining: joinFloq.isPending,
    isLeaving: leaveFloq.isPending,
  };
};