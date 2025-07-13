import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';

interface QueuedAction {
  id: string;
  type: 'join' | 'leave' | 'create';
  floqId: string;
  timestamp: number;
  payload?: any;
}

export function useOfflineQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addCleanup } = useMemoryOptimization();

  // Store queued actions in localStorage
  const getQueuedActions = (): QueuedAction[] => {
    try {
      const stored = localStorage.getItem('floq_offline_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const setQueuedActions = (actions: QueuedAction[]) => {
    localStorage.setItem('floq_offline_queue', JSON.stringify(actions));
  };

  const addToQueue = (action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
    const queuedAction: QueuedAction = {
      ...action,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    
    const current = getQueuedActions();
    setQueuedActions([...current, queuedAction]);
    
    toast({
      title: "Action queued",
      description: "Will sync when back online",
      variant: "default",
    });
  };

  const processQueue = async () => {
    const queue = getQueuedActions();
    if (queue.length === 0) return;

    const processed: string[] = [];
    
    for (const action of queue) {
      try {
        switch (action.type) {
          case 'join':
            await supabase.rpc('join_floq', { p_floq_id: action.floqId });
            break;
          case 'leave':
            await supabase.rpc('leave_floq', { p_floq_id: action.floqId });
            break;
          case 'create':
            await supabase.rpc('create_floq', action.payload);
            break;
        }
        processed.push(action.id);
      } catch (error) {
        console.error(`Failed to process queued action ${action.id}:`, error);
        // Keep failed actions in queue for retry
      }
    }

    // Remove successfully processed actions
    if (processed.length > 0) {
      const remaining = queue.filter(action => !processed.includes(action.id));
      setQueuedActions(remaining);
      
      // Refresh all queries after processing
      queryClient.invalidateQueries();
      
      toast({
        title: "Synced",
        description: `${processed.length} actions synced`,
        variant: "default",
      });
    }
  };

  // Enhanced join floq with offline support
  const joinFloqOffline = useMutation({
    mutationFn: async (floqId: string) => {
      try {
        const { data, error } = await supabase.rpc('join_floq', { p_floq_id: floqId });
        if (error) throw error;
        return data;
      } catch (error) {
        // If offline, add to queue
        if (!navigator.onLine) {
          addToQueue({ type: 'join', floqId });
          return { success: true, queued: true };
        }
        throw error;
      }
    },
    onSuccess: (data, floqId) => {
      if (!data.queued) {
        // Merge update instead of invalidating to preserve creator status
        queryClient.setQueryData(['floq-details', floqId], (old: any) => {
          if (old) {
            return {
              ...old,
              is_joined: true,
              participant_count: (old.participant_count || 0) + 1,
              // Preserve creator status
              is_creator: old.is_creator
            };
          }
          return old;
        });
        
        // Still invalidate lists for fresh data
        queryClient.invalidateQueries({ queryKey: ["my-floqs"] });
        queryClient.invalidateQueries({ queryKey: ["nearby-floqs"] });
        queryClient.invalidateQueries({ queryKey: ["active-floqs"] });
        
        toast({
          title: "Joined floq",
          description: "Successfully joined the floq",
          variant: "default",
        });
      }
    },
    onError: (error, floqId) => {
      // Add fallback invalidation for error cases
      queryClient.invalidateQueries({ queryKey: ['floq-details', floqId] });
      
      toast({
        title: "Failed to join",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Enhanced leave floq with offline support
  const leaveFloqOffline = useMutation({
    mutationFn: async (floqId: string) => {
      try {
        const { data, error } = await supabase.rpc('leave_floq', { p_floq_id: floqId });
        if (error) throw error;
        return data;
      } catch (error) {
        // If offline, add to queue
        if (!navigator.onLine) {
          addToQueue({ type: 'leave', floqId });
          return { success: true, queued: true };
        }
        throw error;
      }
    },
    onSuccess: (data, floqId) => {
      if (!data.queued) {
        // Merge update instead of invalidating to preserve creator status
        queryClient.setQueryData(['floq-details', floqId], (old: any) => {
          if (old) {
            return {
              ...old,
              is_joined: false,
              participant_count: Math.max((old.participant_count || 1) - 1, 0),
              // Preserve creator status
              is_creator: old.is_creator
            };
          }
          return old;
        });
        
        // Still invalidate lists for fresh data
        queryClient.invalidateQueries({ queryKey: ["my-floqs"] });
        queryClient.invalidateQueries({ queryKey: ["nearby-floqs"] });
        queryClient.invalidateQueries({ queryKey: ["active-floqs"] });
        
        toast({
          title: "Left floq",
          description: "Successfully left the floq",
          variant: "default",
        });
      }
    },
    onError: (error, floqId) => {
      // Add fallback invalidation for error cases
      queryClient.invalidateQueries({ queryKey: ['floq-details', floqId] });
      
      toast({
        title: "Failed to leave",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Listen for online events to process queue
  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };

    window.addEventListener('online', handleOnline);
    
    // Process queue on mount if online
    if (navigator.onLine) {
      processQueue();
    }

    const cleanup = () => {
      window.removeEventListener('online', handleOnline);
    };
    
    addCleanup(cleanup);
    return cleanup;
  }, []);

  return {
    joinFloq: joinFloqOffline,
    leaveFloq: leaveFloqOffline,
    processQueue,
    queueLength: getQueuedActions().length,
  };
}
