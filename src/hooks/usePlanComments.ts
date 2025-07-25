import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlanComment {
  id: string;
  plan_id: string;
  user_id: string;
  content: string;
  mentioned_users: string[];
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

export function usePlanComments(planId?: string) {
  const queryClient = useQueryClient();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!planId) return;

    const channel = supabase
      .channel(`plan_comments:${planId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'plan_comments', 
          filter: `plan_id=eq.${planId}` 
        },
        () => queryClient.invalidateQueries({ queryKey: ['plan-comments', planId] })
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'plan_comments', 
          filter: `plan_id=eq.${planId}` 
        },
        () => queryClient.invalidateQueries({ queryKey: ['plan-comments', planId] })
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'plan_comments', 
          filter: `plan_id=eq.${planId}` 
        },
        () => queryClient.invalidateQueries({ queryKey: ['plan-comments', planId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, queryClient]);

  return useQuery({
    queryKey: ['plan-comments', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_comments' as any)
        .select('*, profiles(username, avatar_url)')
        .eq('plan_id', planId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PlanComment[];
    },
    refetchOnWindowFocus: false,
  });
}

export async function sendPlanComment(
  planId: string,
  content: string,
  replyToId?: string
) {
  const { error } = await supabase.from('plan_comments' as any).insert({
    plan_id: planId,
    content,
    reply_to_id: replyToId ?? null,
  });
  
  if (error) throw error;
}